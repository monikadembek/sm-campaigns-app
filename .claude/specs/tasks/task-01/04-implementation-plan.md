# Implementation Plan — Task task-01

**Source spec:** `.claude/specs/tasks/task-01/02-spec.md`
**Review:** `.claude/specs/tasks/task-01/03-spec-review.md` (PASS WITH ISSUES)
**Planning mode:** `/plan-fullstack` — parallel backend + frontend specialist agents with cross-check.

---

## Backend Plan

### 1. Understanding of the spec

**Data entities involved**

- **Campaign** (`apps/api/prisma/schema.prisma` lines 79-101): already has every field required by the edit flow — `name`, `goalId`, `audience` (nullable), `startDate` (nullable `@db.Date`), `endDate` (nullable `@db.Date`), `status` (`CampaignStatus` enum default DRAFT), `notes` (nullable), `timezone`, `createdAt`, `updatedAt`. Scoped by `userId`.
- **CampaignGoal** (schema lines 52-60): `id`, `label`, `slug`, `sortOrder`. Needed for the dropdown endpoint.
- **Post** + **PostMedia** + **Media**: already fully fetched by `CampaignService.getCampaign` via nested `include`. Only the TypeScript return type needs tightening.

**Business rules (backend-visible only)**

1. Update a campaign only if `(id, userId)` matches — scoped update. Cross-user access must fail with 404.
2. Allowed editable fields: `goalId`, `name`, `audience`, `startDate`, `endDate`, `status`, `notes`. All other Campaign columns (`timezone`, `userId`, `createdAt`, `updatedAt`, `id`) are not editable.
3. `name`, when provided, must be non-empty and ≤ 255 chars.
4. `goalId`, when provided, must be an integer (FK validation delegated to Prisma — a non-existent `goalId` surfaces as Prisma `P2003`; not specially translated per the spec).
5. `startDate` / `endDate`, when provided, are ISO date strings and must be converted to `Date` before Prisma (columns are `@db.Date`).
6. The PATCH response shape equals the shape returned by `GET /api/campaigns/:id` — i.e. `CampaignDetails`.
7. Goals list is ordered by `sortOrder ASC`.

**Auth**

- Every existing endpoint in `CampaignController` is already guarded at class level by `@UseGuards(AuthGuard)`. The new PATCH handler inherits this guard automatically.
- A new `CampaignGoalController` is decorated with `@UseGuards(AuthGuard)`.
- Current user is obtained via `@CurrentUser('id') userId: string` (already used throughout `CampaignController`).

**Review findings addressed**

- **Null-vs-undefined semantics** (review issue 11): `UpdateCampaignDto` uses `undefined = "don't touch"` and `null = "clear this field"` for nullable columns (`audience`, `startDate`, `endDate`, `notes`). `goalId`, `name`, `status` are non-nullable in the DB and their DTO types reflect that (no `| null`).
- **ISO-date-string → `Date` conversion** (review issue 12): handled explicitly inside `CampaignService.updateCampaign` before calling Prisma. `null` passes through unchanged, `undefined` is omitted from the Prisma payload, strings become `new Date(value)`.
- **Invented `GET /api/campaign-goals`** (review issue 2): still part of the plan (the spec lists it as in-scope) but flagged in Risks as a derived requirement.
- **`PostStatus` shared type** (review issue 10): added per spec; existing `datatypes.ts` does not currently export one so there is no collision today.

### 2. API Contract (backend)

| Method | Route | Request DTO | Response DTO | Auth required |
|---|---|---|---|---|
| PATCH | `/api/campaigns/:id` | `UpdateCampaignDto` (body) + `:id` UUID path param | `CampaignDetails` | Yes (`AuthGuard`) |
| GET | `/api/campaigns/:id` *(existing — return type tightened only)* | `:id` UUID path param | `CampaignDetails` (was `Campaign \| null`) | Yes (`AuthGuard`) |
| GET | `/api/campaign-goals` | — | `CampaignGoal[]` | Yes (`AuthGuard`) |

**`UpdateCampaignDto`** signatures — `apps/api/src/app/campaign/dto/update-campaign.dto.ts`:

```
class UpdateCampaignDto implements UpdateCampaignRequest {
  @IsOptional() @IsInt()
  goalId?: number;

  @IsOptional() @IsString() @IsNotEmpty() @MaxLength(255)
  name?: string;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  audience?: string | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString()
  startDate?: string | null;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsDateString()
  endDate?: string | null;

  @IsOptional() @IsEnum(CampaignStatusEnum)
  status?: CampaignStatus;

  @IsOptional() @ValidateIf((_, v) => v !== null) @IsString()
  notes?: string | null;
}
```

`CampaignStatusEnum` is the Prisma-generated enum (used only to drive `@IsEnum`); the TS type stays the shared `CampaignStatus` union from `@sm-campaigns-app/datatypes`.

### 3. Database changes

**None.** The Prisma schema at `apps/api/prisma/schema.prisma` already supports every field required. No migration, no schema edit, no index change.

### 4. Domain logic

**Rule 1 — PATCH scoped update (`CampaignService.updateCampaign`)**

Signature:

```
updateCampaign(id: string, userId: string, data: UpdateCampaignRequest): Promise<CampaignDetails>
```

Logic:
1. Build a Prisma update payload by copying only the keys **present** in `data` (using explicit `in` checks, not a spread) — this preserves "`undefined` = untouched" semantics and gives us a place to transform dates.
2. Convert date strings:
   - If `'startDate' in data`: value is `data.startDate === null ? null : new Date(data.startDate)`.
   - Same for `endDate`.
3. Call `prisma.campaign.update` with `where: { id, userId }`, `data: <built payload>`, and the **same `include` tree** used by `getCampaign` (`goal`, `posts.include.postMedia.include.media`) — so the returned value matches `CampaignDetails`.
4. Return the result cast to `CampaignDetails`.
5. Extract the shared `include` literal into a private `campaignDetailsInclude` constant inside `CampaignService` so `getCampaign` and `updateCampaign` stay in sync.

Error cases:
- Prisma throws `PrismaClientKnownRequestError` with `code === 'P2025'` when the composite `where` yields no row. Service **rethrows as-is**; the controller converts `P2025` to `NotFoundException`.
- Prisma `P2003` (FK violation, e.g. bad `goalId`) is not specially handled — the controller wraps it in `InternalServerErrorException`. Flagged in Risks.

**Rule 2 — `GET /api/campaigns/:id` return type tightening**

`CampaignService.getCampaign` already returns the correct shape at runtime. Changes:
- Service signature becomes `Promise<CampaignDetails | null>`.
- Controller handler signature becomes `Promise<CampaignDetails>` (null already converted to `NotFoundException` in the existing try/catch).

**Rule 3 — Campaign goals endpoint**

```
// CampaignGoalService
getAll(): Promise<CampaignGoal[]>
  → prisma.campaignGoal.findMany({ orderBy: { sortOrder: 'asc' } })
```

```
// CampaignGoalController
@UseGuards(AuthGuard)
@Controller('campaign-goals')

@Get() async getGoals(): Promise<CampaignGoal[]>
```

Wrapped in the same try/catch idiom (`this.logger.error` + rethrow `HttpException` + `InternalServerErrorException` fallback) as existing controllers.

**Rule 4 — PATCH controller idiom**

```
@Patch(':id')
async updateCampaign(
  @Param('id', ParseUUIDPipe) id: string,
  @CurrentUser('id') userId: string,
  @Body() dto: UpdateCampaignDto,
): Promise<CampaignDetails> {
  try {
    return await this.campaignService.updateCampaign(id, userId, dto);
  } catch (error) {
    this.logger.error(`Error updating campaign with id: ${id}: `, error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      throw new NotFoundException(`Campaign with id: ${id} not found`);
    }
    if (error instanceof HttpException) throw error;
    throw new InternalServerErrorException(
      `Failed updating campaign with id: ${id}`,
    );
  }
}
```

`Prisma` namespace imported from the generated client (`apps/api/src/generated/prisma`) — same source as `PrismaService`.

### 5. Auth / authorization

| Endpoint | Guard | Ownership scoping |
|---|---|---|
| `PATCH /api/campaigns/:id` | `AuthGuard` (inherited at `CampaignController` class level) | `@CurrentUser('id')` → `where: { id, userId }` in the Prisma `update`. Cross-user update yields `P2025` → 404. |
| `GET /api/campaigns/:id` | `AuthGuard` (unchanged) | Unchanged (`where: { id, userId }`). |
| `GET /api/campaign-goals` | `AuthGuard` applied at class level on the new `CampaignGoalController` | No per-user scoping — goals are a global reference list. |

No role-based access. No Supabase RLS — auth is enforced in the NestJS layer via `AuthGuard` + explicit `userId` predicates in Prisma queries.

### 6. Backend files

| File path | Action | Purpose |
|---|---|---|
| `apps/api/src/app/campaign/dto/update-campaign.dto.ts` | create | `UpdateCampaignDto` with optional + nullable fields, class-validator decorators, implements `UpdateCampaignRequest`. |
| `apps/api/src/app/campaign/campaign.controller.ts` | modify | Add `@Patch(':id')` handler. Tighten `getSingleCampaign` return type to `Promise<CampaignDetails>`. Import `UpdateCampaignDto`, `CampaignDetails`, `Prisma` namespace, `Patch`. |
| `apps/api/src/app/campaign/campaign.service.ts` | modify | Add `updateCampaign(id, userId, data): Promise<CampaignDetails>`. Tighten `getCampaign` return type to `Promise<CampaignDetails \| null>`. Extract shared `campaignDetailsInclude` constant. |
| `apps/api/src/app/campaign/campaign.controller.spec.ts` | create or modify | Jest unit tests: PATCH delegates to service with correct args; converts `P2025` → `NotFoundException`; wraps unknown → `InternalServerErrorException`; rethrows existing `HttpException`. |
| `apps/api/src/app/campaign/campaign.service.spec.ts` | modify | Add `updateCampaign` tests: calls `prisma.campaign.update` with correct `where` + `data` (undefined vs null handling, ISO → `Date` conversion) + shared `include` tree; rethrows Prisma `P2025`. |
| `apps/api/src/app/campaign-goal/campaign-goal.module.ts` | create | New NestJS module declaring controller + service, imports `DatabaseModule` and `AuthModule`. |
| `apps/api/src/app/campaign-goal/campaign-goal.controller.ts` | create | `@Controller('campaign-goals')` + `@UseGuards(AuthGuard)`. Single `@Get()` handler returning `Promise<CampaignGoal[]>` with try/catch/logger idiom. |
| `apps/api/src/app/campaign-goal/campaign-goal.service.ts` | create | `getAll()` using `prisma.campaignGoal.findMany({ orderBy: { sortOrder: 'asc' } })`. |
| `apps/api/src/app/campaign-goal/campaign-goal.controller.spec.ts` | create | Jest tests: delegates to service, returns the array, wraps unknown errors. |
| `apps/api/src/app/campaign-goal/campaign-goal.service.spec.ts` | create | Jest tests: calls `prisma.campaignGoal.findMany` with correct `orderBy`. |
| `apps/api/src/app/app.module.ts` | modify | Register `CampaignGoalModule` in the `imports` array. |
| `packages/shared/datatypes/src/lib/datatypes.ts` | modify | Add: `Media`, `PostMedia`, `PostStatus`, `MediaType`, `CampaignPost`, `CampaignDetails`, `UpdateCampaignRequest`. Keep existing `Campaign`, `PostLimitedData` untouched. |

After editing `datatypes.ts`: run `npx nx build datatypes` or `npx nx sync`.

### Backend Risks

1. **`goalId` foreign-key validation is delegated to Prisma.** A non-existent `goalId` surfaces as Prisma `P2003` → 500. Spec does not ask for a 400 translation.
2. **No cross-field temporal validation.** Backend accepts `startDate > endDate`. Matches spec (validator explicitly dropped in review).
3. **`CampaignDetails` shared-type tree duplicates Prisma schema.** `Media`, `PostMedia`, `CampaignPost`, `PostStatus` become manual-maintenance duplicates (review finding 13). Acceptable for this task.
4. **Return type coercion.** `prisma.campaign.update(...)` with nested `include` returns a Prisma-typed result whose `Date` fields are structurally compatible with `CampaignDetails` (which accepts `Date | string`). An `as CampaignDetails` cast may be required in both service methods.
5. **`GET /api/campaign-goals` is a derived requirement** (review finding 2), added because the frontend dropdown requires it.
6. **`Prisma` namespace import path.** Generated client lives at `apps/api/src/generated/prisma`. Verify `PrismaService`'s existing imports before finalizing the import statement.
7. **Controller spec file existence.** If `apps/api/src/app/campaign/campaign.controller.spec.ts` already exists, it is modified (not created).

---

## Frontend Plan

### 1. Understanding of the spec

**Goal.** Add a new Campaign Details page at `/campaigns/:id` behind `authGuard` that lets the user view, edit, and delete a single campaign, plus view its posts read-only.

**Pages / routes.** One new lazy-loaded route: `campaigns/:id` → `CampaignDetails` standalone component, guarded by `authGuard`. Placed before the `**` wildcard.

**UI state transitions (single component, two modes)**
- `mode = 'read'` (default): details panel + Edit and Delete buttons + posts list underneath.
- `mode = 'edit'`: details panel hidden, reactive form pre-populated with current values, Save/Cancel buttons; posts list still visible.
- **Loading**: rely on global spinner via the existing `loadingInterceptor` (default HTTP context).
- **Error 404 (or 400 from `ParseUUIDPipe`)**: navigate to `/campaigns` + error toast `"Campaign with given id was not found"`. Wired via `effect()` on resource's `error` signal.
- **Other load errors**: inline `p-message` error block.
- **Save success**: success toast → reload resource → switch to read mode → stay on page.
- **Save error 404**: error toast → navigate to `/campaigns`.
- **Save error (other)**: error toast, stay in edit mode with values intact.
- **Delete**: opens `p-confirmDialog` → on confirm → `DELETE /campaigns/:id` → success toast → call `CampaignsApi.reloadCampaigns()` → navigate to `/campaigns`.

**Data needs**
- The campaign detail (`CampaignDetails` with fully-populated posts).
- Campaign goals list (`CampaignGoal[]`) for the goal dropdown.
- Campaign status options — static client-side list derived from the `CampaignStatus` union.

### 2. Expected API contract (derived from spec)

| Method | Route | Request shape | Response shape | Used by |
|---|---|---|---|---|
| GET | `/api/campaigns/:id` | UUID path param | `CampaignDetails` (200) / 404 / 400 | `CampaignDetailsApi.#campaignDetails` (`httpResource`) |
| PATCH | `/api/campaigns/:id` | UUID path param + body `UpdateCampaignRequest` (all fields optional, dates as ISO strings, `null` clears nullable fields) | `CampaignDetails` (200) / 400 / 404 | `CampaignDetailsApi.updateCampaign()` |
| DELETE | `/api/campaigns/:id` | UUID path param | `string` (text body) / 404 | `CampaignDetailsApi.deleteCampaign()` |
| GET | `/api/campaign-goals` | — | `CampaignGoal[]` ordered by `sortOrder` | `CampaignGoalsApi.#campaignGoals` (`httpResource`) |

All endpoints guarded by `AuthGuard` backend-side; frontend attaches the auth header through the existing `authInterceptor`.

### 3. Routing

| Path | Page component | Auth guard |
|---|---|---|
| `campaigns/:id` | `CampaignDetails` (lazy-loaded via `loadComponent`) | `authGuard` |

Route object inserted **before** the `**` wildcard in `apps/web-ng-app/src/app/app.routes.ts`:

```
{
  path: 'campaigns/:id',
  loadComponent: () =>
    import('./features/campaign-details/campaign-details').then((m) => m.CampaignDetails),
  canActivate: [authGuard],
}
```

No resolver — data loading happens inside the feature's API service via `httpResource`.

### 4. Components

Angular terminology: a single **standalone feature component**. The form, details panel, and posts list are simple enough to live in one template with `@if`/`@for` blocks.

| Component | Type | File path | Signals / state |
|---|---|---|---|
| `CampaignDetails` | Standalone feature component (`OnPush`) | `apps/web-ng-app/src/app/features/campaign-details/campaign-details.ts` | Injected: `CampaignDetailsApi`, `CampaignGoalsApi`, `CampaignsApi`, `ActivatedRoute`, `Router`, `MessageService`, `ConfirmationService`, `FormBuilder`. Private writable signals: `#mode = signal<'read' \| 'edit'>('read')`, `#isSubmitting = signal(false)`. Public readonly: `mode = #mode.asReadonly()`, `isSubmitting = #isSubmitting.asReadonly()`. From services: `campaignResource = campaignDetailsApi.campaignDetails`, `goalsResource = campaignGoalsApi.campaignGoals`. Computed: `campaign = computed(() => campaignResource.value())`, `posts = computed(() => campaign()?.posts ?? [])`, `canSave = computed(() => form.valid && form.dirty && !isSubmitting() && !goalsResource.error())`. Static: `statusOptions: CampaignStatus[] = [...]`. Form: `FormGroup` built in constructor. Route id: `idParam = toSignal(route.paramMap.pipe(map(p => p.get('id'))))`. No `input()` / `output()` — this is a routed page. |

**Template blocks (`campaign-details.html`)**
- `@if (campaignResource.isLoading()) { ... }`
- `@else if (campaignResource.error()) { <p-message severity="error"> ... }` (non-404 errors; 404 already redirected via effect)
- `@else if (campaign(); as c) { ... }`:
  - `@if (mode() === 'read') { <details panel with Edit/Delete buttons> } @else { <reactive form with Save/Cancel> }`
  - Posts section heading + `@if (posts().length === 0) { <empty state> } @else { @for (post of posts(); track post.id) { <card> } }`
- `<p-toast />` and `<p-confirmDialog />` mounted at end of template.

**Template rules:** native `@if`/`@for`/`@switch` only; `class` bindings (no `ngClass`); `style` bindings (no `ngStyle`).

**Helper:** `truncateContent(content: string): string` on the component returns `content.length > 120 ? content.slice(0, 120) + '…' : content`. Constant `SNIPPET_LENGTH = 120`.

### 5. Data fetching & services

Both services are singletons (`providedIn: 'root'`). Reads use `httpResource`; mutations use `HttpClient`.

**5.1 `CampaignDetailsApi`** — `apps/web-ng-app/src/app/features/campaign-details/services/campaign-details-api.ts`

- `#http = inject(HttpClient)`
- `#id = signal<string | null>(null)` (private writable)
- `#campaignDetails = httpResource<CampaignDetails | null>(() => { const id = this.#id(); return id ? { url: \`${environment.apiUrl}/campaigns/${id}\` } : undefined; }, { defaultValue: null })`
- `campaignDetails = this.#campaignDetails.asReadonly()` (public)
- Methods:
  - `setId(id: string): void` → `this.#id.set(id)`
  - `reloadCampaignDetails(): void` → `this.#campaignDetails.reload()`
  - `updateCampaign(id: string, data: UpdateCampaignRequest): Observable<CampaignDetails>` → `this.#http.patch<CampaignDetails>(\`${environment.apiUrl}/campaigns/${id}\`, data)`
  - `deleteCampaign(id: string): Observable<string>` → `this.#http.delete(\`${environment.apiUrl}/campaigns/${id}\`, { responseType: 'text' })`

**5.2 `CampaignGoalsApi`** — `apps/web-ng-app/src/app/features/campaign-details/services/campaign-goals-api.ts`

- `#campaignGoals = httpResource<CampaignGoal[]>(() => ({ url: \`${environment.apiUrl}/campaign-goals\` }), { defaultValue: [] })`
- `campaignGoals = this.#campaignGoals.asReadonly()`
- `reloadCampaignGoals(): void` → `this.#campaignGoals.reload()`

Lives under `campaign-details/services/` because that is its only current consumer; can be promoted later if another feature needs it.

### 6. State management

All state is signal-based; no NgRx.

**Mode state.** `#mode` lives on the component (local UI state). Transitions:
- `enterEditMode()` — patches form from current campaign; `#mode.set('edit')`.
- `cancelEdit()` — resets form; `#mode.set('read')`.
- `onSaveSuccess()` — reloads resource; `#mode.set('read')`.

**Server state.** Both resources live inside singletons. The component feeds the route id into `CampaignDetailsApi.setId()` via an effect.

**Reactive form.** Built with `FormBuilder` once in the component constructor — plain reactive form, NOT the experimental signal forms API. Signal integration = the form is patched from signal state via an `effect()` watching `campaignResource.value()`.

```
form = this.fb.nonNullable.group({
  name: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(255)]),
  goalId: this.fb.control<number | null>(null, [Validators.required]),
  audience: this.fb.control<string | null>(null),
  startDate: this.fb.control<Date | null>(null),
  endDate: this.fb.control<Date | null>(null),
  status: this.fb.nonNullable.control<CampaignStatus>('DRAFT', [Validators.required]),
  notes: this.fb.control<string | null>(null),
});
```

**No cross-field `startDate > endDate` validator** per the review drop.

**Save disabled condition:** `form.invalid || form.pristine || isSubmitting() || goalsResource.error()`.

**Serialization before PATCH:** convert `Date | null` for `startDate`/`endDate` to ISO date strings (`date.toISOString().slice(0, 10)` for `@db.Date` date-only columns) or `null`.

**Three effects in the constructor:**

1. **Route id → service id:**
   ```
   effect(() => {
     const id = this.idParam();
     if (id) this.campaignDetailsApi.setId(id);
   });
   ```
2. **404 detection / redirect:**
   ```
   effect(() => {
     const err = this.campaignResource.error() as HttpErrorResponse | undefined;
     if (err && (err.status === 404 || err.status === 400)) {
       this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Campaign with given id was not found' });
       this.router.navigate(['/campaigns']);
     }
   });
   ```
3. **Form pre-population on successful load (read mode only):**
   ```
   effect(() => {
     const c = this.campaignResource.value();
     if (c && this.#mode() === 'read') {
       untracked(() => {
         this.form.patchValue({ /* from c */ });
         this.form.markAsPristine();
       });
     }
   });
   ```

**Providers.** `MessageService` is already globally provided in `app.config.ts`; just `inject()`. `ConfirmationService` is provided at the component level via `providers: [ConfirmationService]` on `CampaignDetails`.

### 7. Frontend files

| File path | Action | Purpose |
|---|---|---|
| `apps/web-ng-app/src/app/app.routes.ts` | modify | Add lazy-loaded `campaigns/:id` route before the wildcard, guarded by `authGuard`. |
| `apps/web-ng-app/src/app/features/campaign-details/campaign-details.ts` | create | Standalone component with `OnPush`, mode signal, reactive form, three effects. Provides `ConfirmationService`. Imports needed PrimeNG modules, `ReactiveFormsModule`, `RouterLink`. |
| `apps/web-ng-app/src/app/features/campaign-details/campaign-details.html` | create | Template with `@if` branches for loading / error / loaded, read panel, edit form, posts list with empty state, `<p-toast />`, `<p-confirmDialog />`. Native control flow, class bindings only. |
| `apps/web-ng-app/src/app/features/campaign-details/campaign-details.css` | create | Minor component-scoped styles (most layout via Tailwind utilities). |
| `apps/web-ng-app/src/app/features/campaign-details/campaign-details.spec.ts` | create | Vitest tests: loading state, read mode render, toggle to edit + form pre-population, Save happy path, Cancel path, Delete confirm → API → navigate, 404 effect → navigate + toast, posts list with truncation, empty posts state. |
| `apps/web-ng-app/src/app/features/campaign-details/services/campaign-details-api.ts` | create | Singleton `providedIn: 'root'` service with `#id` signal, `#campaignDetails` resource, `asReadonly()` projection, `setId`, `reload`, `updateCampaign`, `deleteCampaign`. |
| `apps/web-ng-app/src/app/features/campaign-details/services/campaign-details-api.spec.ts` | create | Vitest tests: URL built from id signal (skipped when null), `reloadCampaignDetails` calls `reload`, `updateCampaign` issues PATCH with correct URL/body, `deleteCampaign` issues DELETE. Uses `HttpTestingController`. |
| `apps/web-ng-app/src/app/features/campaign-details/services/campaign-goals-api.ts` | create | Singleton `providedIn: 'root'` service with `#campaignGoals` resource, `asReadonly()` projection, `reloadCampaignGoals`. |
| `apps/web-ng-app/src/app/features/campaign-details/services/campaign-goals-api.spec.ts` | create | Vitest tests: URL correct, resource returns array, reload triggers refetch. |

**Not modified:**
- `apps/web-ng-app/src/app/app.config.ts` — no changes; `MessageService` already global, `ConfirmationService` provided at component level.
- `apps/web-ng-app/src/app/features/campaigns/*` — no changes; `routerLink` to `/campaigns/:id` already exists.
- `apps/web-ng-app/src/environments/environment.ts` — no changes; `apiUrl` already present.

### Frontend Risks

1. **`httpResource` error typing.** The error signal exposes an `HttpErrorResponse`, but may require a cast. Mitigation: cast through `HttpErrorResponse` and guard on `status`.
2. **Id signal + resource coupling across navigation.** If the user navigates between detail pages, the singleton `#id` signal mutates and the resource refetches — desirable, but the form patching effect must guard on `mode === 'read'` to avoid clobbering unsaved edits.
3. **Shared singleton cache.** Navigating between campaign detail pages reuses the cached resource. Because the URL is driven by `#id()`, `httpResource` refetches automatically when the id changes.
4. **`CampaignGoalsApi` placement.** Only named explicitly under `campaign-details/services/` because this task is its only current consumer. Promote later if reused.
5. **PrimeNG DatePicker vs Calendar naming.** Verify which is installed and stay consistent.
6. **SSR + `httpResource`.** The id-driven effect runs after hydration, so the detail page briefly shows its loading state on first paint. Acceptable.
7. **Date serialization mismatch.** DTO expects ISO date strings; PrimeNG `DatePicker` yields `Date` objects. Component must serialize before submit.
8. **Save-disabled-when-goals-fail UX.** Couples form validity to another resource's error state via the `canSave` computed.
9. **File length.** Keep `campaign-details.ts` under the 1000-line limit by inlining small helpers rather than extracting sub-components.

---

## API Contract (unified)

| Method | Route | Request shape | Response shape | Auth | Source |
|---|---|---|---|---|---|
| GET | `/api/campaigns/:id` | UUID path param | `CampaignDetails` / 404 / 400 | `AuthGuard` | existing, return type tightened |
| PATCH | `/api/campaigns/:id` | UUID path param + `UpdateCampaignDto` body (`UpdateCampaignRequest` shape) | `CampaignDetails` / 400 / 404 | `AuthGuard` | new |
| DELETE | `/api/campaigns/:id` | UUID path param | `string` (text) / 404 | `AuthGuard` | existing |
| GET | `/api/campaign-goals` | — | `CampaignGoal[]` ordered by `sortOrder` | `AuthGuard` | new |

**Shared-type additions** to `packages/shared/datatypes/src/lib/datatypes.ts`: `Media`, `MediaType`, `PostMedia`, `PostStatus`, `CampaignPost`, `CampaignDetails = Omit<Campaign, 'posts'> & { posts: CampaignPost[] }`, `UpdateCampaignRequest`.

---

## Integration Check

| Frontend expects | Backend provides | Gap |
|---|---|---|
| `GET /api/campaigns/:id` → `CampaignDetails` | `GET /api/campaigns/:id` → `CampaignDetails` (existing endpoint, return type tightened) | none |
| `PATCH /api/campaigns/:id` with `UpdateCampaignRequest` body → `CampaignDetails` | `PATCH /api/campaigns/:id` with `UpdateCampaignDto` (implements `UpdateCampaignRequest`) → `CampaignDetails` | none |
| `DELETE /api/campaigns/:id` → `string` via `responseType: 'text'` | `DELETE /api/campaigns/:id` → `string` (existing endpoint, unchanged) | none |
| `GET /api/campaign-goals` → `CampaignGoal[]` | `GET /api/campaign-goals` → `CampaignGoal[]` via new `CampaignGoalController` | none |
| Shared types: `CampaignDetails`, `UpdateCampaignRequest`, `CampaignGoal`, `CampaignPost`, `PostMedia`, `Media`, `PostStatus`, `MediaType` | Same additions planned in `packages/shared/datatypes/src/lib/datatypes.ts` | none |
| Null semantics: `undefined` = unchanged, `null` = clear (for `audience`, `startDate`, `endDate`, `notes`) | Same semantics honored in `CampaignService.updateCampaign` (explicit `in` checks when building Prisma payload) | none |
| Date format: `Date → toISOString()` before submit | `@IsDateString()` validation + `new Date(value)` conversion in service before Prisma | none |

**No integration gaps.**

---

## Pre-flight decisions (locked from review)

- **Data loading:** `httpResource` in a singleton API service, not a route resolver. Explicit deviation from raw task wording.
- **`GET /api/campaign-goals`:** derived dependency, new module (no existing `CampaignGoalController`).
- **`startDate > endDate` validation:** **dropped** (invented in spec, removed here).
- **Snippet length:** 120 chars with trailing ellipsis.
- **Confirm dialog wording:** `"Are you sure you want to delete this campaign? This action cannot be undone."`
- **Toast strings:**
  - Update success: `"Campaign updated"` (severity `success`)
  - Delete success: `"Campaign deleted"` (severity `success`)
  - Not-found: `"Campaign with given id was not found"` (severity `error`)
  - Update error: `"Failed to update campaign"` (severity `error`)
  - Delete error: `"Failed to delete campaign"` (severity `error`)
- **Loading indicator:** global spinner via existing `loadingInterceptor`.
- **Providers:** `MessageService` already global in `app.config.ts`; `ConfirmationService` at component level.
- **Campaigns list reload after delete:** yes — component calls `CampaignsApi.reloadCampaigns()` after successful delete.
- **PATCH body:** send all 7 editable fields on save; no dirty-field filtering.
- **Null semantics:** `undefined` = unchanged, `null` = clear.
- **Date conversion:** frontend serializes `Date → ISO string`; backend converts `string → Date` in service before Prisma.
- **Signal form:** standard reactive forms (`FormGroup`/`FormControl`) driven by signals, NOT experimental signal forms API.

---

## Unified Implementation Order

1. **Shared types** — add `Media`, `MediaType`, `PostMedia`, `PostStatus`, `CampaignPost`, `CampaignDetails`, `UpdateCampaignRequest` to `packages/shared/datatypes/src/lib/datatypes.ts`. Run `npx nx sync` (or `npx nx build datatypes`).
2. **Backend DTO** — create `apps/api/src/app/campaign/dto/update-campaign.dto.ts` (`UpdateCampaignDto`).
3. **Backend service** — extend `CampaignService` with `campaignDetailsInclude` constant + `updateCampaign` method, and tighten `getCampaign` return type.
4. **Backend controller** — extend `CampaignController` with `@Patch(':id')` handler and tighten `getSingleCampaign` return type.
5. **Backend campaign-goal module** — create `CampaignGoalService`, `CampaignGoalController`, `CampaignGoalModule`, and register it in `AppModule`.
6. **Backend tests** — extend `campaign.service.spec.ts` and `campaign.controller.spec.ts` for PATCH; create `campaign-goal.*.spec.ts` suites.
7. **Backend verification** — `npx nx lint @sm-campaigns-app/api`, `npx nx test @sm-campaigns-app/api`, `npx nx build @sm-campaigns-app/api`.
8. **Frontend services** — create `CampaignGoalsApi` and `CampaignDetailsApi` under `features/campaign-details/services/`.
9. **Frontend component** — create `CampaignDetails` standalone component (`.ts`, `.html`, `.css`) with mode signal, reactive form, three effects, Save/Cancel/Delete handlers.
10. **Frontend route** — register `campaigns/:id` in `apps/web-ng-app/src/app/app.routes.ts` before the wildcard.
11. **Frontend tests** — create `campaign-details.spec.ts`, `campaign-details-api.spec.ts`, `campaign-goals-api.spec.ts`.
12. **Frontend verification** — `npx nx lint web-ng-app`, `npx nx test web-ng-app`, `npx nx build web-ng-app`.
13. **End-to-end smoke test in the browser** — manual checklist (see Section "Manual smoke test" in the spec): navigate to a campaign, read mode, Edit → Save, Cancel, Delete → confirm → redirect, 404 redirect path.
