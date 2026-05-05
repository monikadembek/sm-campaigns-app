# Implementation Done — Task 04: Add New Post

## Summary

The "Add post" feature was delivered for the Angular `web-ng-app`. A new route `campaigns/:id/posts/add` was registered and a `PostCreate` page component created, containing a reactive form (`PostCreateForm`) for manual post entry. The `PostCreateApi` service handles the HTTP call to `POST /api/posts`. The shared datatypes library received the new `CreatePostRequest` type. The "Add post" button was activated in the campaign page. Unit tests cover the API service and the form component. The `PostAiGenerator` component was not implemented.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| New route `campaigns/:id/posts/add` | Implemented | Added before `campaigns/:id` in `app.routes.ts` |
| New feature folder `post-create/` | Implemented | |
| Post creation form with fields: `platform`, `postType`, `content`, `hashtags`, `publishDate`, `scheduledAt`, `status` | Implemented | |
| `campaignId` derived from route param, not shown in form | Implemented | |
| AI-assisted content generation section (`PostAiGenerator`) | **Not implemented** | Component, template, and styles are absent; no `generatePostContent()` method in `PostCreateApi` |
| "Back to campaign" link/button visible at all times | Implemented | Rendered as a button inside `PostCreateForm`; triggers navigation via `goBack` output |
| Success toast after save, form resets, stays on page | Implemented | Toast via `MessageService`; `postForm.reset()` called on success |
| Error toast stays form populated | Implemented | |
| Unhide "Add post" button in `campaign.html` | Implemented | Button uses `[routerLink]` binding |
| Wire "Add post" button to `campaigns/:id/posts/add` | Implemented | |
| Remove `addPost()` stub from `campaign.ts` | Implemented | Method removed |
| Add `CreatePostRequest` type to shared datatypes | Implemented | Appended to `datatypes.ts` |
| `content` max 5000 chars validation | Implemented | `Validators.maxLength(5000)` |
| `platform`, `postType`, `content`, `status` required validation | Implemented | |
| `status` defaults to `DRAFT` | Implemented | |
| `postType` defaults to `TEXT` | Implemented | |
| `hashtags` as comma/space-separated input, parsed on submit | Implemented | Parsed by space (not comma) — see Deviations |
| `publishDate` and `scheduledAt` using PrimeNG `DatePicker` with time | Implemented | `[showTime]="true"` |
| `canActivate: [authGuard]` on new route | Implemented | |
| Unit tests for `post-create-api.ts` | Implemented | `post-create-api.spec.ts` covers `createPost` success, 400, 500 |
| Unit tests for `post-create-form.ts` | Implemented | `post-create-form.spec.ts` covers validation, defaults, submit, getters |
| Edge case: invalid `campaignId` / campaign not found → error + back link | Implemented | Redirects to `/campaigns` if no `id` param; no client-side UUID validation |
| Edge case: AI generation failure — inline error in AI section | **Not implemented** | AI section not implemented |
| AI section: `topic`, `platform`, `tone` inputs + "Generate" button | **Not implemented** | |
| AI section: auto-fills `content`, `hashtags`, `platform` on success | **Not implemented** | |
| AI section: loading state and disabled Generate button during call | **Not implemented** | |
| Labels associated via `for`/`id` (WCAG AA) | Implemented | All form labels use `for`/`id` pairs |

---

## Files

### Created

| Path | Description |
|---|---|
| `apps/web-ng-app/src/app/features/post-create/post-create.ts` | Page component |
| `apps/web-ng-app/src/app/features/post-create/post-create.html` | Page template |
| `apps/web-ng-app/src/app/features/post-create/post-create.css` | Page styles |
| `apps/web-ng-app/src/app/features/post-create/post-create.spec.ts` | Page component test (not in plan) |
| `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.ts` | Reactive form component |
| `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.html` | Form template |
| `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.css` | Form styles |
| `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.spec.ts` | Form unit tests |
| `apps/web-ng-app/src/app/features/post-create/services/post-create-api.ts` | HTTP service |
| `apps/web-ng-app/src/app/features/post-create/services/post-create-api.spec.ts` | Service unit tests |

### Modified

| Path | Change |
|---|---|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Added `CreatePostRequest` type |
| `apps/web-ng-app/src/app/app.routes.ts` | Added `campaigns/:id/posts/add` route; added `canDeactivate: [campaignFormCanDeactivateGuard]` |
| `apps/web-ng-app/src/app/features/campaign/campaign.html` | Uncommented "Add post" button; added `[routerLink]` and `[state]` bindings |
| `apps/web-ng-app/src/app/features/campaign/campaign.ts` | Removed `addPost()` stub |

---

## Components

| Component | Status |
|---|---|
| `PostCreate` (page component) | Exist |
| `PostCreateForm` | Exist |
| `PostAiGenerator` | Missing |

---

## Stores

No new stores were planned or implemented for this task. The plan referenced `CampaignStore` and `CampaignApi` for loading the campaign name; the implementation resolved campaign name differently (passed via router state, not via `CampaignStore`/`CampaignApi`).

---

## Deviations from Plan

| # | Deviation |
|---|---|
| 1 | **`PostAiGenerator` component not created.** The plan specified a full AI generator component with its own template, styles, service method, and outputs. None of these were implemented. |
| 2 | **`PostCreateApi.generatePostContent()` not implemented.** The plan specified this method; the delivered service has only `createPost()`. |
| 3 | **`CampaignStore` / `CampaignApi` not used in `PostCreate`.** The plan specified loading the campaign name via `CampaignStore.setCampaignId()` and `CampaignApi.campaignResource`. Instead, the campaign name is read from `router.currentNavigation()?.extras.state?.['campaignName']` (passed as navigation state from `campaign.html`). |
| 4 | **`canDeactivate: [campaignFormCanDeactivateGuard]` added to route.** The plan explicitly stated no `canDeactivate` guard; the implementation adds one and the component implements `CanDeactivateComponent`. |
| 5 | **`PostCreate` does not expose a `#submitting` signal.** The plan described a `#submitting` signal; the implementation does not track submission state with a signal. |
| 6 | **`PostCreateForm` emits `Omit<CreatePostRequest, 'campaignId'>` (not full `CreatePostRequest`).** The plan described `formSubmit` emitting `CreatePostRequest`; `campaignId` is merged in the parent component. |
| 7 | **Hashtag separator is space, not comma.** The spec states "comma-separated"; the implementation splits by space (`hashtags?.split(' ')`). |
| 8 | **`PostCreateForm` has a `goBack` output.** The plan did not include this output; navigation from the form is delegated to the parent via this event instead of using `RouterLink` in the page template. |
| 9 | **Misplaced spec file.** A file `apps/web-ng-app/src/app/features/post-create/components/post-create-form.spec.ts` was staged in the last commit (outside the form subfolder) alongside the correct `post-create-form/post-create-form.spec.ts`; the misplaced file is a duplicate artifact. |
| 10 | **`platform` form default is `FACEBOOK`, not `INSTAGRAM`.** The plan specified `'INSTAGRAM'` as the default platform value; the implementation defaults to `'FACEBOOK'`. |

---

## Additional Implementation

- `post-create.spec.ts` — a page-level component test file was created; it was not listed in the plan.
- `canDeactivate` guard wired to `PostCreate` via `CanDeactivateComponent` interface and a confirmation dialog — not in plan or spec.
- Navigation state (`[state]="{campaignName: ...}"]`) passed from `campaign.html` to pre-populate the campaign name heading without an API call.
