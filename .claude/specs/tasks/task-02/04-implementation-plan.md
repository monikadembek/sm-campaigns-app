# Implementation Plan — Task task-02

## Backend Plan

### Step 1 — API Contract

| Method | Route | Request DTO | Response DTO | Auth required |
|--------|-------|-------------|--------------|---------------|
| POST | `/api/campaigns` | `CreateCampaignDto` (extended) | `CampaignDetails` | Yes — `AuthGuard` (existing) |

**Current state:** Request accepts only `name` and `goalId`; response returns `CampaignSummary` (`id`, `name`, `status`).

**After change:** Request accepts all optional campaign fields; response returns the full `CampaignDetails` shape (campaign row + `goal` relation + `posts: []`).

HTTP status remains `201 Created` (NestJS default for `@Post()`).

---

### Step 2 — Database Changes

**None.** All target columns (`audience`, `startDate`, `endDate`, `status`, `notes`) already exist in the Prisma schema. The Prisma default for `status` is `DRAFT`. No migrations, no Prisma schema edits.

---

### Step 3 — Domain Logic Plan

#### 3.1 — `CreateCampaignDto` validation

| Field | Rule | Decorator(s) |
|-------|------|-------------|
| `name` | Required, non-empty string, max 255 chars | `@IsString`, `@IsNotEmpty`, `@MaxLength(255)` — unchanged |
| `goalId` | Required, integer | `@IsInt` — unchanged |
| `audience` | Optional, nullable string | `@IsOptional`, `@ValidateIf((_, v) => v !== null)`, `@IsString` |
| `startDate` | Optional, nullable ISO 8601 date string | `@IsOptional`, `@ValidateIf((o) => o.startDate !== null)`, `@IsDateString` |
| `endDate` | Optional, nullable ISO 8601 date string | `@IsOptional`, `@ValidateIf((o) => o.endDate !== null)`, `@IsDateString` |
| `status` | Optional, must be a valid `CampaignStatus` value | `@IsOptional`, `@IsIn(CAMPAIGN_STATUS)` |
| `notes` | Optional, nullable string, max 1000 chars | `@IsOptional`, `@ValidateIf((_, v) => v !== null)`, `@IsString`, `@MaxLength(1000)` |

The `ValidateIf` pattern is copied from `UpdateCampaignDto`. The `CAMPAIGN_STATUS` constant array is extracted to a shared `campaign.constants.ts` file and imported by both DTOs.

#### 3.2 — `CampaignService.createCampaign` logic

1. Build a `createData` object starting with `{ name, goalId, userId }`.
2. For each optional field, apply the same `'field' in data` guard used in `updateCampaign`:
   - `audience`, `status`, `notes` — assign directly when present.
   - `startDate`, `endDate` — convert to `new Date(value)` when present and non-null; assign `null` when present and null.
3. Call `prisma.campaign.create({ data: createData, include: this.campaignDetailsInclude })`.
4. Return the result typed as `CampaignDetails`.

The existing `campaignDetailsInclude` private property already covers the full include shape. No new include definition is needed.

#### 3.3 — `CampaignController.createCampaign` return type

Change `Promise<CampaignSummary>` to `Promise<CampaignDetails>`. No other controller logic changes. The `@Post()` decorator, `@CurrentUser`, `@Body`, error handling block, and Logger calls remain identical.

---

### Step 4 — Authentication & Authorization

- The controller class is already decorated with `@UseGuards(AuthGuard)`, which applies to all routes including `@Post()`.
- A 401 is returned by `AuthGuard` when the token is absent or invalid — no change required.
- The `userId` is injected from the verified token via `@CurrentUser('id')` and passed into the Prisma `create` call — always scoped to the authenticated user.

---

### Step 5 — All Backend Files to Create / Modify

| File path | Action | Purpose |
|-----------|--------|---------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Modify | Extend `CreateCampaignRequest` type with optional fields |
| `apps/api/src/app/campaign/campaign.constants.ts` | Create | Extract `CAMPAIGN_STATUS` array shared between DTOs |
| `apps/api/src/app/campaign/dto/create-campaign.dto.ts` | Modify | Add optional validated fields mirroring `UpdateCampaignDto` |
| `apps/api/src/app/campaign/dto/update-campaign.dto.ts` | Modify | Import `CAMPAIGN_STATUS` from constants file instead of defining inline |
| `apps/api/src/app/campaign/campaign.service.ts` | Modify | Update `createCampaign` to handle optional fields and return `CampaignDetails` |
| `apps/api/src/app/campaign/campaign.controller.ts` | Modify | Change `createCampaign` return type from `CampaignSummary` to `CampaignDetails` |
| `apps/api/src/app/campaign/campaign.service.spec.ts` | Modify or create | Jest tests for `createCampaign` — full payload and minimal payload |
| `apps/api/src/app/campaign/campaign.controller.spec.ts` | Modify or create | Jest test for `createCampaign` response shape (`CampaignDetails`) |

After modifying `datatypes.ts`, run `npx nx build datatypes` (or `npx nx sync`) before building or testing dependent apps.

---

### Backend Risks

1. **`'field' in data` guard reliability.** Verify the global `ValidationPipe` is configured with `whitelist: true` and does not use `skipMissingProperties` in a way that would interfere. Confirm in `main.ts`.
2. **`CreateCampaignRequest` shared type is used on the Angular frontend too.** Extending with optional fields is non-breaking, but check for type errors after rebuilding `datatypes`.
3. **`status` field default.** Tests should explicitly cover the case where `status` is omitted (Prisma applies `DRAFT`) and where it is explicitly sent.
4. **Spec file existence.** Confirm whether `campaign.service.spec.ts` and `campaign.controller.spec.ts` already exist before adding tests.

---

## Frontend Plan

### Step 1 — Expected API Contract

| Method | Route | Request shape | Response shape | Used by |
|--------|-------|---------------|----------------|---------|
| POST | `/api/campaigns` | `CreateCampaignRequest` (`name`, `goalId`, `status?`, `audience?`, `startDate?`, `endDate?`, `notes?`) | `CampaignDetails` | `CampaignsApi.createCampaign()` |
| GET | `/api/campaign-goals` | — | `CampaignGoal[]` | `CampaignApi.goals` (existing, no change) |

---

### Step 2 — Routing Plan

| Path | Page component | Auth guard | Position in routes |
|------|---------------|------------|--------------------|
| `campaigns/add` | `CampaignCreate` | `authGuard` | Inserted **before** `campaigns/:id` |
| `campaigns/:id` | `Campaign` | `authGuard` | Remains after `campaigns/add` (unchanged) |

Route entry in `app.routes.ts`:
```ts
{
  path: 'campaigns/add',
  loadComponent: () =>
    import('./features/campaign-create/campaign-create').then(c => c.CampaignCreate),
  canActivate: [authGuard],
}
```

---

### Step 3 — Component Plan

| Component | Type | File path | Inputs / Outputs / State |
|-----------|------|-----------|--------------------------|
| `CampaignCreate` | Page | `features/campaign-create/campaign-create.ts` + `.html` | No inputs. Injects `CampaignsApi`, `CampaignApi`, `MessageService`, `Router`. |
| `CampaignCreateForm` | Form child | `features/campaign-create/components/campaign-create-form/campaign-create-form.ts` + `.html` | Input: `goals: CampaignGoal[]`. Outputs: `formSubmit`, `cancel`. Owns reactive form. |

**`CampaignCreate` page responsibilities:**
- Injects `CampaignApi` to pass `goals` resource value to the form child.
- Handles `formSubmit` output: calls `CampaignsApi.createCampaign()`.
- On success: calls `CampaignsApi.reloadCampaigns()`, shows success toast, navigates to `/campaigns`.
- On error: shows error toast via `handleHttpErrorResponseMessage(err)`, does not reset form.
- Handles `cancel` output by navigating to `/campaigns`.
- Shows `<p-message severity="error">` if `goals.error()` is truthy.

**`CampaignCreateForm` component responsibilities:**
- Declares the reactive form group (mirrors `CampaignEdit`).
- Applies `endDateValidator` at the form-group level.
- Emits `formSubmit` with form value on Submit click when form is valid.
- Emits `cancel` on Cancel click.
- Submit button: `[disabled]="campaignForm.invalid || campaignForm.pristine"`.

---

### Step 4 — Services / Data Fetching Plan

**`CampaignsApi` additions:**

Add `HttpClient` injection (if not already injected) and `createCampaign` method:
```ts
createCampaign(payload: CreateCampaignRequest): Observable<CampaignDetails>
```
Implementation: `this.http.post<CampaignDetails>(\`${env.apiUrl}/campaigns\`, payload).pipe(catchError(...))`.

`catchError` re-throws with `throwError(() => error)` — matches the `saveEditedCampaign` pattern in `CampaignApi`.

`reloadCampaigns()` and `#campaignsFullData` are untouched.

**`CampaignApi` injection in `CampaignCreate`:**
`CampaignApi` is `providedIn: 'root'`, so no module changes needed. `CampaignCreate` calls `inject(CampaignApi)` and reads `campaignApi.goals` (readonly `httpResource` signal).

---

### Step 5 — State Management Plan

**Form state (in `CampaignCreateForm`):**

| Control | Type | Default | Validators |
|---------|------|---------|------------|
| `name` | `string` | `''` | `required`, `maxLength(255)` |
| `goalId` | `number \| null` | `null` | `required` |
| `status` | `CampaignStatus` | `'DRAFT'` | `required` |
| `audience` | `string \| null` | `null` | — |
| `startDate` | `Date \| null` | `null` | — |
| `endDate` | `Date \| null` | `null` | — |
| `notes` | `string \| null` | `null` | `maxLength(1000)` |

Form-group validator: `endDateValidator` (imported from `end-date-validator.directive.ts`).

**Local component state:** No additional signals needed in `CampaignCreate` beyond what the form and httpResource provide.

**Service state:** `#campaignsFullData` `httpResource` in `CampaignsApi` remains the single source of truth for the list. `reloadCampaigns()` is the only post-mutation refresh mechanism.

---

### Step 6 — All Frontend Files to Create / Modify

| File path | Action | Purpose |
|-----------|--------|---------|
| `apps/web-ng-app/src/app/app.routes.ts` | Modify | Insert `campaigns/add` route before `campaigns/:id` |
| `apps/web-ng-app/src/app/features/campaigns/services/campaigns-api.ts` | Modify | Add `createCampaign()` method |
| `apps/web-ng-app/src/app/features/campaigns/campaigns.ts` | Modify | Add `ButtonModule` import; wire up empty-state computed |
| `apps/web-ng-app/src/app/features/campaigns/campaigns.html` | Modify | Restructure header (flex row); add empty-state hint block |
| `apps/web-ng-app/src/app/features/campaign-create/campaign-create.ts` | Create | Page component — orchestrates data, submit, error, navigation |
| `apps/web-ng-app/src/app/features/campaign-create/campaign-create.html` | Create | Page template — goal error message + form child |
| `apps/web-ng-app/src/app/features/campaign-create/components/campaign-create-form/campaign-create-form.ts` | Create | Form component — owns reactive form, emits events |
| `apps/web-ng-app/src/app/features/campaign-create/components/campaign-create-form/campaign-create-form.html` | Create | Form template — mirrors `campaign-edit.html`, Submit + Cancel |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Modify | Expand `CreateCampaignRequest` (shared with backend plan) |
| `apps/web-ng-app/src/app/features/campaign-create/campaign-create.spec.ts` | Create | Vitest tests: happy path submit, cancel, error path |
| `apps/web-ng-app/src/app/features/campaigns/campaigns.spec.ts` | Modify | Add tests: button presence, empty-state hint |

---

### Frontend Risks

1. **`CreateCampaignRequest` type mismatch** — Currently `{ name: string; goalId: number }` only. Must be expanded in `datatypes.ts` before any frontend service code can be written. Backend must also be updated first; this is a shared change.
2. **`goalId` default value** — Use `null` (not `0` as in `CampaignEdit`); control typed as `number | null` with `Validators.required`.
3. **`CampaignApi` has `CampaignStore` dependency** — Injecting `CampaignApi` in `CampaignCreate` will fire `#campaignResource` with an empty `campaignId`, producing a spurious HTTP request. Harmless for this task; long-term fix is to extract `goals` into a dedicated service. Note for implementation: suppress the spurious request if possible via `skipToken` on the resource, or accept the 404/error as a no-op.
4. **`notes` maxLength** — Use 1000 in the create form (not 255 as in `CampaignEdit`).
5. **Submit `pristine` guard** — Confirmed intentional per spec: user must touch at least one field before Submit enables. `status = 'DRAFT'` default does not count as user interaction.
6. **`npx nx build datatypes` must be run** after expanding `CreateCampaignRequest` before building or testing either app.

---

## API Contract

| Method | Route | Request DTO / shape | Response DTO | Auth required |
|--------|-------|---------------------|--------------|---------------|
| POST | `/api/campaigns` | `CreateCampaignDto` / `CreateCampaignRequest` (`name`, `goalId`, `status?`, `audience?`, `startDate?`, `endDate?`, `notes?`) | `CampaignDetails` (campaign + goal + posts) | Yes |
| GET | `/api/campaign-goals` | — | `CampaignGoal[]` | Yes (existing) |

---

## Integration Check

No integration gaps.

| Frontend expects | Backend provides | Gap |
|-----------------|-----------------|-----|
| `POST /api/campaigns` with `CreateCampaignRequest` (7 fields, 2 required) | `POST /api/campaigns` with extended `CreateCampaignDto` (same fields, same optionality) | None |
| Response: `CampaignDetails` (campaign + goal + posts) | Response: `CampaignDetails` via `include: { goal: true, posts: {...} }` | None |
| `GET /api/campaign-goals` → `CampaignGoal[]` | Existing endpoint, unchanged | None |
| `CreateCampaignRequest` expanded in `datatypes.ts` | Same file modified — single edit, both plans agree | None |

---

## Unified Implementation Order

1. **Shared types** — Expand `CreateCampaignRequest` in `packages/shared/datatypes/src/lib/datatypes.ts`; run `npx nx build datatypes`
2. **Backend constants** — Create `apps/api/src/app/campaign/campaign.constants.ts` (extract `CAMPAIGN_STATUS`)
3. **Backend DTO** — Modify `create-campaign.dto.ts` (add optional validated fields); update `update-campaign.dto.ts` to import from constants
4. **Backend service** — Update `CampaignService.createCampaign` to handle optional fields and return `CampaignDetails`
5. **Backend controller** — Update `CampaignController.createCampaign` return type to `CampaignDetails`
6. **Backend tests** — Add/update `campaign.service.spec.ts` and `campaign.controller.spec.ts`
7. **Frontend service** — Add `createCampaign()` to `CampaignsApi`
8. **Frontend route** — Register `campaigns/add` in `app.routes.ts` (before `campaigns/:id`)
9. **Frontend form component** — Create `CampaignCreateForm` (ts + html)
10. **Frontend page component** — Create `CampaignCreate` (ts + html)
11. **Campaigns list page** — Restructure header, add "Create campaign" button and empty-state hint
12. **Frontend tests** — Create `campaign-create.spec.ts`; update `campaigns.spec.ts`
13. **End-to-end verification** — Manual browser test: create campaign, success toast, list refresh; verify error path and cancel
