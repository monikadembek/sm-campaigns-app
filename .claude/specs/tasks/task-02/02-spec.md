# Task Specification

## Source

Azure DevOps Task: 02

## Goal

Allow a logged-in user to create a new campaign via a dedicated page (`/campaigns/add`) using the same field set as the existing edit form, then return them to a refreshed campaigns list. The existing `POST /api/campaigns` endpoint is extended (non-breaking) to accept the full set of optional fields, and the campaigns list page gains a "Create campaign" entry-point button and an empty-state hint.

## Context

This change spans both apps in the Nx monorepo:

- **Frontend** — `apps/web-ng-app`, in the existing campaigns area:
  - `src/app/features/campaigns/` — list page (modified: header layout, "Create campaign" button, empty-state hint).
  - `src/app/features/campaign-create/` — **new** feature folder for the create page and form (separate from `features/campaign/`, which is the detail/edit page).
  - `src/app/app.routes.ts` — register lazy-loaded `/campaigns/add` route under `authGuard`.
- **Backend** — `apps/api/src/app/campaign/`:
  - `dto/create-campaign.dto.ts` — extend with optional fields (audience, startDate, endDate, status, notes).
  - `campaign.service.ts` — pass optional fields through to Prisma `campaign.create`.
  - `campaign.controller.ts` — return shape changes from `CampaignSummary` to `CampaignDetails` (so frontend reload is unnecessary if needed elsewhere; see Q in Behavior).
- **Shared types** — `packages/shared/datatypes/src/lib/datatypes.ts`:
  - `CreateCampaignRequest` extended with the new optional fields.

Existing patterns to honour:

- Signal-based state, `httpResource` for reads, `HttpClient` for mutations, `reloadXxx()` after mutation (see `state-management.md`).
- Standalone components, `ChangeDetectionStrategy.OnPush`, `inject()`, native control flow, reactive forms (`/docs/angular-best-practices.md`).
- PrimeNG components for UI primitives (matching `CampaignEdit`).
- `MessageService` for toasts; consistent with `Campaign` page's edit/delete flows.

## Scope

### In scope

- **Route**: lazy-loaded `/campaigns/add` (auth-guarded).
- **New `CampaignCreate` standalone page component** (in `apps/web-ng-app/src/app/features/campaign-create/`) that hosts the create form, calls the API, shows toasts, and navigates back to `/campaigns` on success.
- **New form component** with fields mirroring `CampaignEdit`:
  - `name` (required, max 255)
  - `goalId` (required, populated from existing `campaign-goals` resource)
  - `status` (required, defaults to `'DRAFT'`, select with all `CampaignStatus` options)
  - `audience` (optional)
  - `startDate` (optional)
  - `endDate` (optional, must not be earlier than `startDate` — reuse existing `endDateValidator`)
  - `notes` (optional, max 1000 — aligned with API)
- **Cancel button** that navigates to `/campaigns` without saving.
- **Submit button** disabled while form invalid; on submit:
  - On success: success toast + `reloadCampaigns()` + navigate to `/campaigns`.
  - On error: error toast (using existing `handleHttpErrorResponseMessage` util), stay on page.
- **Campaigns list page changes**:
  - Header restructured: title on the left, "Create campaign" button on the top right (single flex row).
  - Button uses `routerLink="/campaigns/add"`, styled with PrimeNG `p-button`.
  - **Empty-state hint** when `campaignsResource.hasValue()` returns an empty array: a centered message ("No campaigns yet") with a CTA pointing to `/campaigns/add`.
- **API**:
  - Extend `CreateCampaignDto` with optional `audience`, `startDate`, `endDate`, `status`, `notes`.
  - Update `CampaignService.createCampaign` to persist the optional fields via Prisma and return `CampaignDetails` (with `goal` and `posts` includes), matching the edit-flow shape.
  - Update `CampaignController.createCampaign` return type to `CampaignDetails`.
- **Shared types**: extend `CreateCampaignRequest` with the same optional fields (single source of truth — non-breaking superset).
- **Tests** (per Acceptance):
  - Frontend: unit tests (Vitest) for `CampaignCreate` page (submit, cancel, error path), and updates to `Campaigns` spec covering button presence and empty-state hint.
  - Backend: Jest tests for the extended `createCampaign` controller + service (full payload, partial payload).

### Out of scope

- Refactoring `CampaignEdit` to support create mode.
- Extracting a shared form-fragment component between create and edit (revisit only if duplication becomes painful).
- Fixing the pre-existing "max 255" message text inside `CampaignEdit` for the `notes` field.
- Any changes to the campaign detail page (`features/campaign/`).
- Adding posts during creation, media uploads, CTAs, scheduling.
- Pagination/sorting/filtering on the campaigns list.
- Internationalisation of new strings.

## Behavior

1. User is on `/campaigns`. The page shows the centered title in a flex row with a **"Create campaign"** button on the right.
2. If the campaigns array is empty after the resource resolves, an empty-state block is shown ("No campaigns yet — click *Create campaign* to get started").
3. User clicks **"Create campaign"** → router navigates to `/campaigns/add` (auth-guarded; unauthenticated users redirected per existing `authGuard`).
4. The create page mounts the form. Goals are loaded from the same `campaign-goals` API resource the edit page uses.
   - Defaults: `name = ''`, `goalId = null` (placeholder shown), `status = 'DRAFT'`, all other fields empty/null.
5. Validation:
   - `name` required, max 255 chars; inline error shown on touch/dirty.
   - `goalId` required.
   - `status` required (defaulted, but user can change).
   - `endDate` ≥ `startDate` when both provided (form-level error from reused `endDateValidator`).
   - `notes` max 1000 chars; inline error shown on touch/dirty.
6. **Submit**:
   - Submit button disabled while form invalid or pristine.
   - On click, the page calls `CampaignsApi.createCampaign(formValue)` → `POST /api/campaigns` with the full payload (omitting `null`/empty optional fields is fine; the API treats them as optional).
   - **On 2xx**: a success toast is shown ("Campaign *{name}* was created"), `CampaignsApi.reloadCampaigns()` is invoked, and the router navigates to `/campaigns`. The list re-renders the new campaign.
   - **On error**: error toast with `handleHttpErrorResponseMessage(err)` text; the user remains on `/campaigns/add`, form values preserved.
7. **Cancel**:
   - Clicking Cancel navigates to `/campaigns` without saving and without confirmation.

## Edge Cases

- **Goals fail to load** — the goal `<select>` shows no options; submit will fail validation on `goalId`. Show an error message in the form area mirroring how the edit page already surfaces resource errors (use `<p-message>` if `goals` resource has an error).
- **Goals empty** — render an empty select (no synthetic option). Submit remains disabled because `goalId` is required.
- **End date earlier than start date** — form-level error message ("End date must be later than start date"), submit disabled.
- **Server error on submit** — toast shown, form not reset, user can retry.
- **Network failure** — handled identically to server error via the existing `catchError` pipe and `handleHttpErrorResponseMessage`.
- **Browser back navigation from the create page** — no unsaved-changes prompt in this iteration (out of scope; can be added later via `CanDeactivate`).
- **Status defaulted but field absent in DTO on submit** — DTO is treated as optional; if status is somehow omitted, Prisma's schema default (`DRAFT`) takes over. Validator on the front end ensures it's always sent in practice.
- **User is authenticated but their session expires before submit** — request returns 401; existing HTTP error handling produces the standard error toast.

## Data / API

### Endpoint changes

- **`POST /api/campaigns`** (existing — **extended, non-breaking**)
  - **Request body** (`CreateCampaignDto`):
    ```ts
    {
      name: string;          // required, non-empty, max 255
      goalId: number;        // required, integer
      audience?: string | null;            // optional
      startDate?: string | null;           // optional ISO 8601 (IsDateString)
      endDate?: string | null;             // optional ISO 8601 (IsDateString)
      status?: CampaignStatus;             // optional, one of DRAFT|ACTIVE|PAUSED|COMPLETED|ARCHIVED
      notes?: string | null;               // optional, max 1000
    }
    ```
  - Validation rules mirror `UpdateCampaignDto` (use `IsOptional` + `ValidateIf` for nullable optional fields).
  - **Response**: `CampaignDetails` (full campaign with `goal` and empty `posts: []`). Status `201 Created`.
  - **Errors**:
    - `400` on invalid payload (existing class-validator pipeline).
    - `401` if unauthenticated.
    - `500` for unexpected errors.

### Service changes (`CampaignService.createCampaign`)

- Accept the extended DTO; pass optional fields to Prisma `campaign.create` only when present (mirror the `'X' in data` pattern used in `updateCampaign`).
- Convert `startDate` / `endDate` strings to `Date` when present.
- Return record with `include: { goal: true, posts: { ... } }` so the response is `CampaignDetails`.

### Controller changes (`CampaignController.createCampaign`)

- Return type changes from `Promise<CampaignSummary>` to `Promise<CampaignDetails>`.
- No new method — only the existing `@Post()` is updated.
- Auth and error handling unchanged.

### Shared types (`packages/shared/datatypes`)

- `CreateCampaignRequest` extended:
  ```ts
  export type CreateCampaignRequest = {
    name: string;
    goalId: number;
    audience?: string | null;
    startDate?: string | Date | null;
    endDate?: string | Date | null;
    status?: CampaignStatus;
    notes?: string | null;
  };
  ```
- After change, run `npx nx build datatypes` (or `npx nx sync`) to refresh project references.

### Frontend service additions

- **`CampaignsApi`** (`apps/web-ng-app/src/app/features/campaigns/services/campaigns-api.ts`) gains:
  ```ts
  createCampaign(payload: CreateCampaignRequest): Observable<CampaignDetails>;
  ```
  Implementation: `this.http.post<CampaignDetails>(`${env.apiUrl}/campaigns`, payload).pipe(catchError(...))` — matches the `saveEditedCampaign` pattern in `CampaignApi`.
- The existing `#campaignsFullData` resource and its `reloadCampaigns()` are reused for the post-create refresh.
- Goals are fetched via the existing `CampaignApi.goals` resource (reused, not re-implemented). Inject `CampaignApi` from `features/campaign/services/campaign-api.ts`. (Acceptable cross-feature dependency; long-term it can move to a campaigns-shared service, but that's out of scope.)

### DB / migrations

- **None.** All target columns (`audience`, `startDate`, `endDate`, `status`, `notes`) already exist on the `Campaign` model — currently used by update. The Prisma schema default for `status` (`DRAFT`) covers the case where it's omitted.

### Routing

- `app.routes.ts`: add **before** the `campaigns/:id` route to avoid `add` matching the `:id` param:
  ```ts
  {
    path: 'campaigns/add',
    loadComponent: () =>
      import('./features/campaign-create/campaign-create').then(
        (c) => c.CampaignCreate,
      ),
    canActivate: [authGuard],
  },
  ```

## Acceptance (DEV)

- `npx nx build web-ng-app` passes.
- `npx nx build @sm-campaigns-app/api` passes.
- `npx nx build datatypes` passes.
- `npx nx lint web-ng-app` and `npx nx lint @sm-campaigns-app/api` pass.
- `npx nx test web-ng-app` passes, including new tests for `CampaignCreate` (happy path submit, cancel, error path) and updated `Campaigns` spec (button present, empty-state hint shown when list empty).
- `npx nx test @sm-campaigns-app/api` passes, including new/updated tests for `CampaignService.createCampaign` (full and minimal payloads) and `CampaignController.createCampaign` (response shape).
- Manual verification:
  - From `/campaigns`, the "Create campaign" button is visible top-right and reachable by keyboard (Tab focus, Enter activates).
  - Empty-state hint appears when the user has no campaigns.
  - Form validation errors render inline; submit disabled while invalid.
  - Cancel returns to `/campaigns` without saving.
  - Submit creates the campaign, success toast appears, list refreshes and shows the new entry.
  - Server error produces an error toast and keeps the user on the form.
- AXE: no new violations on `/campaigns` or `/campaigns/add` (form labels, focus order, contrast).
- No breaking change to existing `POST /api/campaigns` behaviour for the minimal `{ name, goalId }` payload.

## Assumptions

- The pre-existing `endDateValidator` directive at `features/campaign/components/campaign-edit/end-date-validator.directive.ts` can be imported from the new `campaign-create` feature directly. (No need to relocate; if Angular ESLint flags the cross-feature import we'll move it to a shared location, but that's deferred.)
- The Prisma schema already enforces `status` default `DRAFT` and existing nullable columns — no migration is required.
- `CampaignSummary` is not consumed by any other client of `POST /api/campaigns`; widening the response to `CampaignDetails` is safe. (Verified in repo.)
- No design mock-up provided — visual styling follows existing PrimeNG/Tailwind patterns from `CampaignEdit` and `Campaigns`.
