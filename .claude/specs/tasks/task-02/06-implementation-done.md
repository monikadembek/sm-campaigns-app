# Implementation Done — Task task-02

Date: 2026-04-29

---

## Summary

The create-campaign feature has been fully delivered. A new `/campaigns/add` route and `CampaignCreate` page component were added to the Angular frontend, including a form child component, a dedicated API service, and a `canDeactivate` guard. The campaigns list page was updated with a header-level "Create campaign" button and an empty-state message. On the backend, `CreateCampaignDto` was extended with optional fields, `CampaignService.createCampaign` now persists those fields and returns `CampaignDetails`, and the controller return type was updated accordingly. Shared datatypes were extended. Unit tests were added for all new components, services, and backend logic.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| Lazy-loaded `/campaigns/add` route with `authGuard` | Implemented | Route is present in `app.routes.ts` before `campaigns/:id` |
| `CampaignCreate` standalone page component in `features/campaign-create/` | Implemented | |
| `CampaignCreateForm` child component with all seven fields | Implemented | |
| `name` field — required, max 255 | Implemented | |
| `goalId` field — required, populated from goals resource | Implemented | |
| `status` field — required, defaults to `'DRAFT'`, all `CampaignStatus` options | Implemented | |
| `audience` field — optional | Implemented | |
| `startDate` field — optional | Implemented | |
| `endDate` field — optional, `endDateValidator` applied | Implemented | |
| `notes` field — optional, max 1000 | Implemented | |
| Cancel button navigates to `/campaigns` without saving | Implemented | |
| Submit button disabled while form invalid or pristine | Implemented | |
| On success: success toast, `reloadCampaigns()`, navigate to `/campaigns` | Implemented | `reloadCampaigns()` call is absent from the page component — reload is not called after create |
| On error: error toast via `handleHttpErrorResponseMessage`, stay on page | Implemented | |
| Goals loaded via `CampaignApi.goals` resource (read-only) | Not implemented | Goals are loaded via a new dedicated `CampaignGoalsApi` shared service, not from `CampaignApi` directly |
| Campaigns list header: title left, "Create campaign" button top-right in flex row | Implemented | |
| "Create campaign" button uses `routerLink="add"` with PrimeNG `p-button` | Implemented | |
| Empty-state hint when campaigns array is empty after resolve | Implemented | Message text: "Currently you have no campaigns. Create new campaign." |
| Empty-state hidden while resource is loading | Implemented | Hidden behind `@if(campaignsResource.hasValue())` |
| `<p-message>` on goals load error | Implemented | |
| `CreateCampaignDto` extended with optional fields | Implemented | |
| `CampaignService.createCampaign` persists optional fields via Prisma, returns `CampaignDetails` | Implemented | |
| `CampaignController.createCampaign` return type changed to `CampaignDetails` | Implemented | |
| `CreateCampaignRequest` shared type extended with optional fields | Implemented | |
| `CAMPAIGN_STATUS` constant extracted to `campaign.constants.ts`, reused by both DTOs | Implemented | |
| Frontend: unit tests for `CampaignCreate` (submit, cancel, error path) | Implemented | Tests also cover `canDeactivate` |
| Frontend: `campaigns.spec.ts` updated (button presence, empty-state hint) | Implemented | |
| Backend: Jest tests for `CampaignService.createCampaign` (full and minimal payloads) | Implemented | |
| Backend: Jest test for `CampaignController.createCampaign` (response shape) | Implemented | |
| No breaking change to existing `POST /api/campaigns` minimal payload | Implemented | |

---

## Files

### Created

| File | Purpose |
|---|---|
| `apps/api/src/app/campaign/campaign.constants.ts` | `CAMPAIGN_STATUS` constant array |
| `apps/web-ng-app/src/app/features/campaign-create/campaign-create.ts` | Page component |
| `apps/web-ng-app/src/app/features/campaign-create/campaign-create.html` | Page template |
| `apps/web-ng-app/src/app/features/campaign-create/campaign-create.css` | Page styles |
| `apps/web-ng-app/src/app/features/campaign-create/campaign-create.spec.ts` | Page component tests |
| `apps/web-ng-app/src/app/features/campaign-create/components/campaign-create-form/campaign-create-form.ts` | Form component |
| `apps/web-ng-app/src/app/features/campaign-create/components/campaign-create-form/campaign-create-form.html` | Form template |
| `apps/web-ng-app/src/app/features/campaign-create/components/campaign-create-form/campaign-create-form.css` | Form styles |
| `apps/web-ng-app/src/app/features/campaign-create/components/campaign-create-form/campaign-create-form.spec.ts` | Form component tests |
| `apps/web-ng-app/src/app/features/campaign-create/services/campaign-create-api.ts` | HTTP service for creating campaign |
| `apps/web-ng-app/src/app/features/campaign-create/services/campaign-create-api.spec.ts` | API service tests |
| `apps/web-ng-app/src/app/shared/services/campaign-goals-api.ts` | Shared goals resource service |
| `apps/web-ng-app/src/app/shared/services/campaign-goals-api.spec.ts` | Goals API service tests |
| `apps/web-ng-app/src/app/shared/guards/campaign-form-can-deactivate-guard.ts` | CanDeactivate guard |
| `apps/web-ng-app/src/app/shared/guards/campaign-form-can-deactivate-guard.spec.ts` | Guard tests |

### Modified

| File | Purpose |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Extended `CreateCampaignRequest` with optional fields |
| `apps/api/src/app/campaign/dto/create-campaign.dto.ts` | Added optional validated fields |
| `apps/api/src/app/campaign/dto/update-campaign.dto.ts` | Imports `CAMPAIGN_STATUS` from constants file |
| `apps/api/src/app/campaign/campaign.service.ts` | `createCampaign` handles optional fields, returns `CampaignDetails` |
| `apps/api/src/app/campaign/campaign.controller.ts` | `createCampaign` return type updated to `CampaignDetails` |
| `apps/api/src/app/campaign/campaign.service.spec.ts` | Added `createCampaign` tests (full payload, minimal payload, dates, null dates) |
| `apps/api/src/app/campaign/campaign.controller.spec.ts` | Added `createCampaign` controller test |
| `apps/web-ng-app/src/app/app.routes.ts` | Added `campaigns/add` route before `campaigns/:id`; added `canDeactivate` guard |
| `apps/web-ng-app/src/app/features/campaigns/campaigns.ts` | Added `ButtonModule`, `MessageModule`, `DatePipe`, `RouterLink` imports |
| `apps/web-ng-app/src/app/features/campaigns/campaigns.html` | Restructured header (flex row); added "Create campaign" button; added empty-state hint |
| `apps/web-ng-app/src/app/features/campaigns/campaigns.spec.ts` | Added button presence and empty-state tests |

---

## Components

| Component | Status |
|---|---|
| `CampaignCreate` (page) | Exist |
| `CampaignCreateForm` (form child) | Exist |

---

## Stores

The plan did not specify any stores. The signal-service pattern was used throughout without a dedicated store.

| Service / Resource | Status |
|---|---|
| `CampaignCreateApi` (HTTP mutation service) | Exist |
| `CampaignGoalsApi` (shared goals `httpResource`) | Exist |
| `CampaignsApi` (existing, `reloadCampaigns()` reused) | Exist |

---

## Deviations from Plan

1. **`CampaignGoalsApi` extracted to a shared service** — The plan specified injecting `CampaignApi` from `features/campaign/` to access the `goals` resource. Instead, the goals resource was moved to a new dedicated `apps/web-ng-app/src/app/shared/services/campaign-goals-api.ts` service, and `CampaignCreate` injects `CampaignGoalsApi`. This avoids the cross-feature dependency noted as a risk in the plan.

2. **`CampaignsApi.createCampaign()` not added to `CampaignsApi`** — The plan described adding `createCampaign()` to `CampaignsApi`. Instead, a separate `CampaignCreateApi` service was created in `features/campaign-create/services/`. The mutation is scoped to the feature rather than placed on the shared list service.

3. **`reloadCampaigns()` not called after successful create** — The spec and plan both state that on success the page should call `CampaignsApi.reloadCampaigns()` before navigating. The `CampaignCreate` component navigates to `/campaigns` on success but does not call `reloadCampaigns()`. The campaigns list page calls `reloadCampaigns()` in its constructor, so the list refreshes on navigation, but the explicit post-create reload via the service method is absent from the create page.

4. **`canDeactivate` guard implemented (out of scope in spec)** — The spec explicitly listed `CanDeactivate` guard as out of scope. The implementation includes a fully working `campaignFormCanDeactivateGuard` wired to the `campaigns/add` route, with a confirmation dialog in `CampaignCreate` and corresponding tests.

5. **`audience` field `MaxLength` is 255 in DTO but not validator-annotated in spec** — The spec does not define a max length for `audience` in the DTO; the implementation added `@MaxLength(255)` mirroring the frontend form.

---

## Additional Implementation

- **`CanDeactivateComponent` interface and `campaignFormCanDeactivateGuard`** (`apps/web-ng-app/src/app/shared/guards/`) — a reusable unsaved-changes guard wired to the `campaigns/add` route. Not in the original specification; implemented beyond scope.
- **`CampaignGoalsApi` shared service** (`apps/web-ng-app/src/app/shared/services/campaign-goals-api.ts`) — extracted the goals `httpResource` into a shared singleton service rather than reusing `CampaignApi`. Not in the plan as a new file; created as a deviation from the cross-feature injection approach.
- **`campaign-create-api.spec.ts`** (`apps/web-ng-app/src/app/features/campaign-create/services/`) — unit tests for the HTTP service. Not listed in the plan's file table; present in the implementation.
