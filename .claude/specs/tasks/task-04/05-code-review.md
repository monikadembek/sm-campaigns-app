# Code Review — Task 04: Add New Post

## Summary

- **Overall result: PASS WITH ISSUES**
- The core "Add post" flow is implemented and functional: the route is correctly registered before `campaigns/:id`, the reactive form covers all required fields, the API service creates posts, and the campaign page "Add post" button is wired up. However, the `PostAiGenerator` component — an explicit in-scope spec requirement — is entirely absent, and the `hashtags` field uses space-splitting instead of the spec-required comma-splitting. Several convention and plan deviations are also noted.

---

## Conventions Violations

### Critical (must fix before merge)

1. **`PostAiGenerator` component not implemented** (`apps/web-ng-app/src/app/features/post-create/components/post-ai-generator/` — missing entirely)
   - The spec explicitly lists AI-assisted content generation as in-scope (spec §Scope, §AI-assisted path, §Behavior). Neither the component files (`post-ai-generator.ts`, `.html`, `.css`) nor any integration with `PostCreate` or `PostCreateForm` exists. The `POST /api/ai-content/generate-content` endpoint is never called from the frontend.

2. **`PostCreateApi.generatePostContent()` method not implemented** (`apps/web-ng-app/src/app/features/post-create/services/post-create-api.ts`)
   - Service only contains `createPost()`. The `generatePostContent()` method required by spec and plan (Step 3) is missing. Corresponding test cases for AI generation in `post-create-api.spec.ts` are also absent.

3. **`hashtags` field uses space-splitting instead of comma-splitting** (`post-create-form.ts:97`, `post-create-form.html:99`)
   - Spec §Edge Cases: *"represent as a comma-separated text input; parse on submit (split by comma, trim, filter empty strings)."* The template label reads "Hashtags [separated with space]" and `submitPost()` splits on `' '` (space). This directly contradicts the spec and also breaks the `patchAiContent()` flow which would join with `', '`.

### Non-Critical (should fix)

4. **`campaignId` and `campaignName` are mutable public signals** (`post-create.ts:34-35`)
   - Convention: "Private writable, public readonly. Hold mutable signals behind `#private` fields and expose `asReadonly()` projections." Both should be `#campaignId = signal('')` / `campaignId = this.#campaignId.asReadonly()`.

5. **`submitted` flag is a plain boolean, not a signal** (`post-create.ts:37`)
   - State should use `signal()` per project conventions for `OnPush` correctness.

6. **`postCreateFormComponent` viewChild reference is public** (`post-create.ts:36`)
   - `viewChild` used only internally should be a private field (`#postCreateFormComponent`).

7. **`isFormDirty` reads a non-signal property inside `computed()`** (`post-create.ts:38-40`)
   - `postForm.dirty` is a plain boolean, not a signal. `computed()` will not re-evaluate reactively when `dirty` changes. The dirty check may return a stale value after form mutations.

8. **`console.error` left in production service** (`post-create-api.ts:16`)
   - `console.error('Service error', error)` should not ship in production code.

9. **`console.error` left in `PostCreate`** (`post-create.ts:106`)
   - Same concern.

10. **Campaign name loaded from router navigation state, not API/Store** (`post-create.ts:51-53`)
    - Spec §Behavior step 3: "a heading with the campaign name (loaded via `CampaignStore` / `CampaignApi`)." Using `router.currentNavigation()?.extras.state` is fragile — if the user navigates directly to the URL or refreshes, `campaignName()` will be `undefined`, rendering visibly broken output.

11. **No error state shown when campaign not found** (`post-create.html`)
    - Spec §Edge Cases: "If `campaignId` is not a valid UUID or the campaign is not found, show an error message and display the 'Back to campaigns list' link." The template has no `@if (error)` branch; it only shows the form unconditionally.

---

## Specification Coverage

| Requirement | Status | Note |
|---|---|---|
| New route `campaigns/:id/posts/add` with `authGuard` | Covered | Route correctly placed before `campaigns/:id`; also has `canDeactivate` (addition beyond spec) |
| Post creation form: platform, postType, content, hashtags, publishDate, scheduledAt, status | Covered | All fields present and validated |
| `campaignId` derived from route param | Covered | Done in `PostCreate` constructor |
| `content` max 5000 chars validator | Covered | `Validators.maxLength(5000)` present |
| `status` defaults to `DRAFT` | Covered | Default set on form init |
| `postType` defaults to `TEXT` | Covered | |
| `hashtags` as comma-separated string, split on submit | **Missing** | Uses space-split instead of comma-split |
| `publishDate` / `scheduledAt` as PrimeNG DatePicker with `[showTime]="true"` | Covered | `[showTime]="true"` is set on both pickers |
| Success: toast + stay on page + reset form | Covered | `postForm.reset()` called; `submitted = true`; page stays |
| Error: toast + form stays populated | Covered | |
| "Back to campaign" button visible | Covered | Via `goBack` output on form, handled by page |
| Campaign name in page heading | Partial | Loaded from nav state only; breaks on direct URL navigation |
| AI-assisted content generation (`PostAiGenerator` component) | **Missing** | Component entirely absent |
| `generatePostContent()` in `PostCreateApi` | **Missing** | Method not implemented |
| Auto-fill `content` and `hashtags` from AI result | **Missing** | No `patchAiContent()` method on form |
| Set `platform` on form from AI result | **Missing** | |
| Unhide "Add post" button in `campaign.html` | Covered | Button present with `routerLink` and `[state]` |
| `[state]={campaignName}` passed to nav | Covered | |
| Remove `addPost()` stub from `campaign.ts` | Covered | `addPost()` is absent; `editPost()` / `schedulePost()` stubs remain (correct per plan) |
| `CreatePostRequest` type added to datatypes | Covered | Added to `datatypes.ts` |
| Unit tests for `PostCreateApi` | Partial | `createPost` fully tested; `generatePostContent` untested (not implemented) |
| Unit tests for `PostCreateForm` | Covered | Comprehensive coverage of validation, submission, getters |
| Invalid `campaignId` / campaign not found error state | **Missing** | No error branch in `post-create.html`; no CampaignApi/Store integrated |

---

## Plan Deviations

1. **Step 5 (PostAiGenerator component) entirely skipped** — No files created, no integration.
2. **Step 3 (generatePostContent in PostCreateApi) skipped** — Second method not added to service.
3. **Step 6: `campaignId` as `input.required<string>()` on PostCreateForm** — Not implemented. `PostCreateForm` emits `Omit<CreatePostRequest, 'campaignId'>` and the page merges the ID. Functional workaround but a plan deviation.
4. **Step 8: campaign details via `CampaignStore`/`CampaignApi`** — Not done; name comes from router navigation state only.
5. **Step 8: error state in `post-create.html`** — The `@if (campaignDetails.error())` block from the plan's template is absent.
6. **`canDeactivate` guard added** — Plan Step 2 explicitly omits this. Implementation adds it with a full confirm-dialog flow. Not a harmful deviation, but it is a deviation.
7. **`post-create.spec.ts` added** — Not in plan's file list but provides useful page-level coverage. Welcome addition.

---

## Null Safety Issues

1. **`router.currentNavigation()?.extras.state?.['campaignName']`** (`post-create.ts:51-53`) — Returns `undefined` on direct navigation or page refresh. `campaignName` signal is typed as `string` but holds `undefined` silently.
2. **`formValue.hashtags?.split(' ')`** (`post-create-form.ts:97`) — `nonNullable.group` guarantees `hashtags` is a `string`; the optional chain `?.` is misleading. Also the delimiter is wrong (space instead of comma).

---

## Code Smells

1. **Unnecessary type casts in `submitPost()`** (`post-create-form.ts:99-100`) — `as PlatformType`, `as PostTypeValue`, `as string` are redundant when using `nonNullable.group`; TypeScript infers these correctly.
2. **Magic color values in CSS** (`post-create-form.css:1,6,8`) — Raw hex values (`#fff`, `#e2e8f0`, `#94a3b8`, `rgba(...)`) mix paradigms with Tailwind utility classes used in templates. Should use Tailwind tokens or CSS variables.

---

## Recommendation

**Fix critical issues before merge.**

The three blocking gaps are:
1. `PostAiGenerator` component and its integration are entirely missing — this is an explicit in-scope spec requirement.
2. `PostCreateApi.generatePostContent()` method is absent.
3. `hashtags` parsing uses space-split instead of the spec-required comma-split.

All three must be resolved before this branch can be considered complete.
