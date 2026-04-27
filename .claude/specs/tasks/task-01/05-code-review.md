# Code Review — Task task-01

## Summary

- **Overall result:** PASS WITH ISSUES
- The feature is functionally complete: the page loads details, edits via PATCH, deletes via DELETE, and the new `CampaignGoalsController` plus `CampaignDetails` shared type are in place. However, several convention violations need to be addressed before merge — three child components are missing `ChangeDetectionStrategy.OnPush`, an `httpResource` is created inside a component instead of a service, debug `console.log` statements are scattered through the production code, and the `null` → `''` coercion in the edit form silently mutates persisted data on every save. There are also a number of smaller spec deviations (toast wording, confirm-dialog wording, missing snippet truncation, untruncated post content, scope-creep "Add post" / "Edit post" / "Schedule" buttons, naming and parameter-order drift from the plan).

## Conventions Violations

### Critical (must fix before merge)

1. **Missing `ChangeDetectionStrategy.OnPush` on child components** (conventions.md "Components", role.md). Both `CampaignDetailsComponent` and `CampaignEdit` omit it.
   - `apps/web-ng-app/src/app/features/campaign/components/campaign-details/campaign-details.ts:5-10`
   - `apps/web-ng-app/src/app/features/campaign/components/campaign-edit/campaign-edit.ts:18-30`

2. **`httpResource` created inside a component, not a singleton service** (state-management.md: *"Server state lives in API services, not components. Components hold a reference to `service.#resource.asReadonly()`; they never create `httpResource` locally."*). The goals resource is constructed inline in `CampaignEdit`.
   - `apps/web-ng-app/src/app/features/campaign/components/campaign-edit/campaign-edit.ts:38-45`
   - The plan called this out explicitly as `CampaignGoalsApi` under `features/campaign-details/services/`.

3. **`console.log` / `console.error` left in production code** (rules.md *"High quality: Write only clean, elegant, and idiomatic solutions. No hacks, no shortcuts."*).
   - `apps/web-ng-app/src/app/features/campaign/campaign.ts:68, 77-79, 92, 121, 130, 147, 156, 168, 172, 176`
   - `apps/web-ng-app/src/app/features/campaign/components/campaign-edit/campaign-edit.ts:112`
   - `apps/web-ng-app/src/app/features/campaigns/campaigns.ts:28-29` (added in this task's diff)
   - `apps/web-ng-app/src/app/features/campaign/services/campaign-api.ts:40, 57`

4. **Unsubscribed `route.params.subscribe(...)`** in a routed component leaks the subscription on navigation away. Use `toSignal` (as the plan suggested) or `takeUntilDestroyed`.
   - `apps/web-ng-app/src/app/features/campaign/campaign.ts:56-58`

5. **Nullable fields silently coerced from `null` → `''` and re-saved.** `setFormValues` patches `audience` and `notes` with `''` when the source is `null`. Because the form is then submitted as-is, a save round-trip persistently overwrites a real `null` with an empty string in the database, breaking the documented `undefined` = unchanged / `null` = clear semantics from spec §"Data / API" and plan "Pre-flight decisions" → "Null semantics".
   - `apps/web-ng-app/src/app/features/campaign/components/campaign-edit/campaign-edit.ts:117, 120`
   - Either keep `null` in the form value, or strip `''` back to `null` before PATCH.

### Non-Critical (should fix)

1. **Debug console statements in tests/runtime** (see Critical 3 list above; downgrade applies if the team treats logs as non-blocking).

2. **Public mutable signal `mode = signal<'edit' | 'read'>('read')`** instead of `#mode` writable + `mode = #mode.asReadonly()` per state-management.md "Private writable, public readonly".
   - `apps/web-ng-app/src/app/features/campaign/campaign.ts:53`

3. **`assignment to component field inside an `effect()`** (`this.campaignDetails = this.campaignApiService.campaignResource;`) runs on every effect tick and is also needlessly imperative — assign once in the field initializer.
   - `apps/web-ng-app/src/app/features/campaign/campaign.ts:60-61`

4. **Effect writes signal-derived state without `untracked()`.** Same effect calls `this.router.navigate(...)` which is acceptable, but `setFormValues()` inside `CampaignEdit`'s effect writes form state while reading the goals signal (state-management.md "Use `effect` only when necessary … wrap signal writes inside an effect in `untracked()`").
   - `apps/web-ng-app/src/app/features/campaign/components/campaign-edit/campaign-edit.ts:101-107`

5. **Invalid CSS color `background: fff;`** (missing `#`). Effectively defaults to no background.
   - `apps/web-ng-app/src/app/features/campaign/components/campaign-details/campaign-details.css:2`
   - `apps/web-ng-app/src/app/features/campaign/components/campaign-edit/campaign-edit.css:2`

6. **Hard-coded `width: 600px` on `.post__content-short`** breaks responsive layout.
   - `apps/web-ng-app/src/app/features/campaign/campaign.css:112`

7. **DTO field types misrepresent the wire format.** `startDate?: Date | null` and `endDate?: Date | null` are validated by `@IsDateString()` (which only accepts strings). The TS type should be `string | null` to match runtime.
   - `apps/api/src/app/campaign/dto/update-campaign.dto.ts:40, 45`

8. **Dead/scope-creep handlers and buttons** kept as `console.log` stubs ("Add post", "Edit", "Schedule"). Spec §"Out of scope" explicitly excludes post creation, editing, scheduling.
   - `apps/web-ng-app/src/app/features/campaign/campaign.ts:167-177` and `campaign.html:46-91`.

9. **Inconsistent parameter order between `getSingleCampaign(id, userId)` and `editCampaign(userId, id, dto)`** in the same controller.
   - `apps/api/src/app/campaign/campaign.controller.ts:62-65, 96-100`
   - Same drift in service: `getCampaign(id, userId)` vs `updateCampaign(userId, campaignId, data)` (`campaign.service.ts:55-57, 84-88`).

10. **Toast severity drift from spec.** Spec uses `severity: 'success'` for save/delete success; code uses `severity: 'info'` with summary `'Saved'` / `'Confirmed'`.
    - `apps/web-ng-app/src/app/features/campaign/campaign.ts:122-125, 148-152`

11. **`p-confirmDialog` config passes `target: event.target`** which is a `p-confirmPopup` concept. Harmless but misleading.
    - `apps/web-ng-app/src/app/features/campaign/campaign.ts:93-95`

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Lazy-loaded route `campaigns/:id` behind `authGuard` | Covered | `app.routes.ts:18-23` |
| Smart standalone component with `OnPush` | Partial | `Campaign` itself uses `OnPush`; child components do not |
| Read mode: name, goal label, status, audience, startDate, endDate, notes | Covered | `campaign-details.html` |
| Read mode also shows: timezone, createdAt/updatedAt | Missing | Spec §Scope explicitly lists timezone, createdAt, updatedAt |
| Edit toggle button with reactive form pre-populated | Covered | `campaign-edit.ts` |
| Form fields: name, goalId, audience, startDate, endDate, status, notes | Covered | `campaign-edit.ts:57-75` |
| `notes` rendered as a **textarea** | Missing | Spec §Behavior step 2 — code uses `pInputText` (`campaign-edit.html:68`) |
| Save → PATCH `/api/campaigns/:id` → success toast → reload → back to read | Covered | `campaign.ts:141-166` |
| Cancel discards changes and returns to read mode | Covered | `campaign-edit.ts:130-132`, `campaign.ts:36` |
| Delete button + PrimeNG ConfirmDialog | Covered | `campaign.ts:91-116`, template line 103 |
| Confirm dialog wording per spec ("Are you sure you want to delete this campaign? This action cannot be undone.") | Missing | Code uses "Do you want to delete this campaign?" (`campaign.ts:95`) |
| Delete success → toast "Campaign deleted" + navigate `/campaigns` | Partial | Navigates and toasts, but message is "Campaign with id … was deleted" with severity `info` |
| Delete success triggers `CampaignsApi.reloadCampaigns()` | Partial | Not called in the delete handler; instead `Campaigns` page reloads on its own constructor (`campaigns.ts:26`). End-result is similar, but plan asked for explicit call after delete |
| Posts list: platform, postType, status, content snippet | Partial | Snippet truncation not implemented in code — full content rendered (`campaign.html:70, 93`); spec asks for truncation to ~120 chars with ellipsis |
| Empty posts state | Covered | `campaign.html:97-99` |
| 404 → redirect `/campaigns` + error toast "Campaign with given id was not found" | Covered | `campaign.ts:67-75` |
| Inline `p-message` for non-404 load errors | Covered | `campaign.html:1-4` |
| `MessageService` / `ConfirmationService` providers registered | Covered | Both global in `app.config.ts:13, 24-26` (deviation from plan, acceptable) |
| `CampaignGoalsApi` singleton service | Missing | `httpResource` lives in component (`campaign-edit.ts:38-45`) |
| Save disabled when goals failed to load | Missing | Save disabled only on `invalid \|\| pristine` (`campaign-edit.html:88`) |
| Backend `PATCH /api/campaigns/:id` with `UpdateCampaignDto`, `AuthGuard`, `ParseUUIDPipe`, `@CurrentUser` | Covered | `campaign.controller.ts:95-120` |
| Service scopes update by `(id, userId)`, returns `CampaignDetails` | Covered | `campaign.service.ts:84-114` |
| `GET /api/campaigns/:id` return type tightened to `CampaignDetails` | Partial | Service is `CampaignDetails \| null`; controller still typed `CampaignDetails \| null` instead of `CampaignDetails` |
| `GET /api/campaign-goals` endpoint behind `AuthGuard`, ordered by `sortOrder` | Covered | `campaign-goals.controller.ts`, `campaign-goals.service.ts` |
| Backend ISO date string → `Date` conversion | Covered | `campaign.service.ts:97-103` |
| `null = clear` / `undefined = unchanged` semantics | Partial | Service uses correct `'in' data` checks, but frontend coerces `null` → `''` before save (see Critical #5) |
| Shared types: `Media`, `MediaType`, `PostMedia`, `PostStatus`, `CampaignPost`, `CampaignDetails`, `UpdateCampaignRequest` | Partial | Added except `UpdateCampaignRequest` (missing). `CampaignPost` was renamed to `Post` |
| Frontend Vitest unit tests | Covered | `campaign.spec.ts`, `campaign-details.spec.ts`, `campaign-edit.spec.ts`, `campaign-api.spec.ts`, `campaign-store.spec.ts` |
| Backend Jest unit tests for `updateCampaign`, PATCH controller, goals controller/service | Covered | `campaign.service.spec.ts:210-324`, `campaign.controller.spec.ts:104-167`, `campaign-goals.controller.spec.ts`, `campaign-goals.service.spec.ts` |

## Plan Deviations

- **Folder/file names diverge.** Plan called for `features/campaign-details/` containing `campaign-details.ts`, `services/campaign-details-api.ts`, `services/campaign-goals-api.ts`. Implementation uses `features/campaign/` with sub-components `components/campaign-details/`, `components/campaign-edit/`, plus `services/campaign-api.ts` and `services/campaign-store.ts`. (Structural rework, not a regression.)
- **Extra `CampaignStore` introduced.** Plan colocated the `#id` signal inside `CampaignDetailsApi`. Implementation extracted it into a separate `CampaignStore` service.
- **`CampaignGoalsApi` not implemented.** Goals resource is a local `httpResource` in `CampaignEdit` (Critical #2).
- **Backend `editCampaign` signature is `(userId, id, dto)`** instead of plan's `(id, userId, dto)`. Same drift in `CampaignService.updateCampaign(userId, campaignId, data)`.
- **Backend nest module folder is `campaign-goals/` (plural)** instead of plan's `campaign-goal/`. Module class is `CampaignGoalsModule`. Acceptable but inconsistent with plan's naming.
- **`ConfirmationService` registered globally** in `app.config.ts:26` instead of plan's component-level provider.
- **`UpdateCampaignRequest` shared type missing.** Plan listed it under "Shared-type additions". Backend DTO does **not** declare `implements UpdateCampaignRequest` — there is therefore no compile-time integration check.
- **`CampaignPost` renamed to `Post`** in `packages/shared/datatypes/src/lib/datatypes.ts:149`. Plan, spec §Data/API, and review-finding #10 used `CampaignPost`.
- **`getSingleCampaign` return type left as `Promise<CampaignDetails | null>`** instead of tightening to `Promise<CampaignDetails>` per plan §"Rule 2".
- **No snippet truncation helper / `SNIPPET_LENGTH` constant.** Plan §Frontend "Helper" called for `truncateContent(content)` returning the first 120 chars + ellipsis. Code only relies on CSS `text-overflow: ellipsis` and additionally renders the full content again in the panel body.
- **Reload-on-mount in `Campaigns` instead of explicit `reloadCampaigns()` after delete.** Plan §Frontend §6 had the delete handler calling `CampaignsApi.reloadCampaigns()` directly; implementation calls `reloadCampaigns()` from the `Campaigns` constructor (`campaigns.ts:26`).
- **`endDateValidator` cross-field validator added.** Plan §"Pre-flight decisions" explicitly dropped this validation. Reintroduced in `campaign-edit/end-date-validator.directive.ts` and applied at form level.
- **Toast wording diverges from spec/plan.** Plan §"Pre-flight decisions" → "Toast strings" specified short messages with severity `success`. Implementation uses verbose, id-bearing messages with severity `info`.

## Null Safety Issues

1. **`campaignDetails.value().name` accessed unguarded** — the template guard is `@if(campaignDetails.hasValue())`, so this works at template scope, but `campaign.ts:111-113` reads `this.campaignDetails.value()?.name as string` and casts a possible `undefined` to `string`. If the resource value briefly becomes `undefined` between confirm-click and accept, the toast/delete will pass `undefined` as a string.
2. **`CampaignDetailsComponent.campaignData = input.required<CampaignDetails | undefined>()`** — `required<T | undefined>` undermines `input.required`'s purpose. Pick one: `input.required<CampaignDetails>()` (and provide only when defined) or `input<CampaignDetails | undefined>(undefined)`. Same pattern in `CampaignEdit`.
3. **`saveCampaignChanges` cast `as CampaignForm`** masks that `startDate`/`endDate` may be `null` while `CampaignForm` declares them as `Date | string` (no `null`). The form value can be sent with `null` dates, which the DTO accepts at runtime but TS does not catch.
   - `apps/web-ng-app/src/app/features/campaign/components/campaign-edit/campaign-edit.ts:124-128`, `campaign.model.ts:5-6`
4. **`CampaignDetailsComponent` template** does `campaignData()?.startDate || 'Not set'` — `0`-like falsy strings would also map to "Not set". Acceptable for ISO strings, but defensive.
5. **`Campaign.campaignDetails!: Resource<CampaignDetails | undefined>`** uses the definite-assignment operator (`!`). The field is then assigned inside an effect — until the effect first runs, dereferencing `this.campaignDetails` would throw. (`campaign.ts:51, 61`)

## Code Smells

- **Duplicate post content rendering.** `campaign.html:70` shows the snippet, then `campaign.html:93` renders the full content again. The "snippet" is identical to the full content (no JS truncation), so the visual difference is purely the CSS `text-overflow: ellipsis` clipping the header copy.
- **`campaignDetailsInclude` duplicated** in `campaign.service.spec.ts:211-222` instead of importing or referencing the service's private constant — the test will silently drift from the production include shape. (Acceptable for a black-box test, but flagged.)
- **`get name() { return this.campaignForm.get('name'); }` getters** mix loosely-typed `AbstractControl` access with the strongly typed form. Prefer `this.campaignForm.controls.name`.
- **Magic value 255** repeated in form maxLength (DTO `name`), DTO `notes` (1000), and the form's `notes` validator (`Validators.maxLength(255)`). Backend allows 1000 for notes; UI rejects at 255.
- **Stub buttons + handlers** ("Add post", "Edit", "Schedule") that `console.log` and serve no purpose. See Specification Coverage §Out of scope.
- **`mockReload` shared at module scope** in `campaign-api.spec.ts:22` is reset via `vi.clearAllMocks()` — works but is fragile when running tests in parallel watch mode.
- **`Campaign.confirmDelete` accepts an `Event`** purely to pass `event.target` to `ConfirmationService.confirm` even though `<p-confirmDialog />` does not use a `target`. Either drop the parameter or use `<p-confirmPopup />`.
- **`<p-confirmdialog />`** lowercase tag works due to Angular's case-insensitive matching but PrimeNG's official selector is `p-confirmDialog`.

## Recommendation

**Fix critical issues before merge.**

The five Critical items are concrete, low-effort fixes (add `OnPush`, move the goals `httpResource` into a service, strip `console.log`s, replace `route.params.subscribe` with `toSignal`/`takeUntilDestroyed`, and stop coercing `null` → `''` for nullable fields). The Specification Coverage gaps — confirm-dialog wording, snippet truncation, missing timezone/createdAt/updatedAt fields, missing textarea for notes, save-disabled-on-goals-error — should also be addressed in the same pass since they are all spec-explicit. Plan deviations (folder/file naming, extra `CampaignStore`, parameter-order drift) are tolerable and do not need to be reverted, but the missing `UpdateCampaignRequest` shared type should be added so the backend DTO can `implements UpdateCampaignRequest` and give us a compile-time integration check.
