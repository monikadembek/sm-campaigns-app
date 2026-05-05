# Code Review — Task 04: Add New Post

## Summary

- **Overall result: PASS WITH ISSUES**
- The core functionality (new route, form, API service, datatypes update) is implemented and works end-to-end. However, the implementation deviates from the spec and plan in several important ways: the AI-assisted content generation is entirely missing, the route URL uses `post/add` instead of `posts/add`, hashtags are split by space instead of comma, `campaign.ts` still contains the `addPost()` stub, and the unit test suites are nearly empty skeletons. These issues must be fixed before the feature is considered complete.

---

## Conventions Violations

### Critical (must fix before merge)

1. **`ChangeDetectionStrategy.OnPush` missing on `PostCreate`** — `post-create.ts` line 13 has no `changeDetection` property in the `@Component` decorator. Conventions require `OnPush` on every component.

2. **`console.log` / `console.error` left in production code** — `post-create.ts` lines 35, 75, 83, 97 and `post-create-api.ts` line 16. Rules: "Write only clean, elegant, and idiomatic solutions. No hacks, no shortcuts." Debug logs must be removed before merge.

3. **Route URL mismatch — `post/add` vs `posts/add`** — `app.routes.ts` line 29 registers `campaigns/:id/post/add` (singular). The spec and implementation plan both specify `campaigns/:id/posts/add` (plural). `campaign.html` line 55 also uses the singular form, so the navigation works, but the URL is wrong relative to spec and will affect deep-links and future consistency.

4. **`campaignId` guard is always truthy** — `post-create.ts` line 76: `if (this.campaignId)` always evaluates to `true` because `campaignId` is the signal function reference itself (a function is always truthy). The correct guard is `if (this.campaignId())`.

5. **`canDeactivate` guard applied when spec says it should NOT be** — `app.routes.ts` line 33 attaches `campaignFormCanDeactivateGuard`. The implementation plan (Step 2) explicitly states: "No guards for `canDeactivate` (intentional omission per spec review finding #4)." The component does implement `CanDeactivateComponent` and the dialog logic anyway, so this is a plan deviation that adds unspecified behaviour.

### Non-Critical (should fix)

6. **Template string interpolation instead of array binding** — `campaign.html` line 55 uses `` [routerLink]="[`/campaigns/${campaignId()}/post/add`]" `` (string interpolation inside array). The implementation plan specifies `[routerLink]="['/campaigns', campaignId(), 'posts', 'add']"` (pure array form). The array form is the Angular idiomatic pattern and avoids hard-coded slashes.

7. **`post-create-form.css` uses class name `.campaign-form`** — CSS class (lines 1, 12) belongs to the campaign feature domain, not post-create. Should be renamed to `.post-form` or similar.

8. **`Pinteres` typo** — `post-create-form.ts` line 54: `{ label: 'Pinteres', value: 'PINTEREST' }` — label is missing the trailing `t`.

---

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| New route `campaigns/:id/posts/add` | Partial | Registered as `campaigns/:id/post/add` (singular) |
| `PostCreate` page component | Covered | Exists; missing `OnPush` |
| "Back to campaign" link always visible | Partial | Implemented as a "Cancel" button inside the form — not a persistent link above the form as described in spec |
| Campaign name in page heading | Missing | `post-create.html` shows a hardcoded "Create New Post" heading; no campaign name loaded |
| Post form fields (platform, postType, content, hashtags, publishDate, scheduledAt, status) | Covered | All fields present |
| `campaignId` derived from route param | Covered | Via `ActivatedRoute.params` subscription |
| AI-assisted content generation section | Missing | `PostAiGenerator` component not created; no `/api/ai-content/generate-content` call |
| `generatePostContent()` in API service | Missing | `PostCreateApi` only implements `createPost()` |
| "Add post" button in `campaign.html` wired via `routerLink` | Covered | Button present; URL uses `post/add` (singular) |
| Remove `addPost()` stub in `campaign.ts` | Missing | `campaign.ts` line 164 still contains `addPost()` with `// TODO` comment |
| Success: toast + stay on page + reset form | Partial | Toast shown, but navigates away on success instead of staying and resetting |
| Error: toast + form stays populated | Covered | Error toast shown, no navigation on error |
| `hashtags` parsed as comma-separated | Missing | `post-create-form.ts` line 85 splits by space (`' '`); spec requires `','` |
| `publishDate` / `scheduledAt` with time selection | Partial | `<p-datepicker>` used but `[showTime]="true"` not set |
| `status` defaults to `DRAFT` | Covered | Default set in form group |
| `postType` defaults to `TEXT` | Covered | Default set in form group |
| Invalid campaignId / campaign not found error | Missing | No error state shown if campaign cannot be loaded |
| `CreatePostRequest` added to datatypes | Covered | Added to `packages/shared/datatypes/src/lib/datatypes.ts` |
| Unit tests for `post-create-api.ts` | Missing | Spec file is a generated skeleton — only "should be created"; no HTTP tests |
| Unit tests for `post-create-form.ts` | Missing | Spec file is a generated skeleton — only "should create"; no form tests |
| Form validation errors displayed | Partial | Content field shows inline errors; platform/postType/status have no validation error messages |

---

## Plan Deviations

1. **AI generator component not created** — Plan Steps 5 and 6 describe `PostAiGenerator` and its integration. Not implemented.

2. **Folder structure differs** — Plan specifies `components/post-create-form/post-create-form.ts` (subfolder per component). Implemented as `components/post-create-form.ts` (flat). Minor but deviates from plan.

3. **`PostCreate` does not use `CampaignStore` / `CampaignApi`** — Plan Step 8 calls for injecting these to load the campaign name for the heading. Neither is injected; the heading is hardcoded.

4. **On success: navigate away instead of reset and stay** — Plan Step 8 and spec behaviour: "show a success toast and stay on the form page (form resets to empty)". Implementation navigates to `campaigns/:id` on success (`post-create.ts` line 90).

5. **`canDeactivate` guard added** — Plan explicitly omits this; implementation adds it.

6. **`formSubmit` emits `Omit<CreatePostRequest, 'campaignId'>` not `CreatePostRequest`** — Plan Step 6 says `formSubmit` emits `CreatePostRequest`. Implementation emits without `campaignId` and merges in the page. Pragmatic but a deviation from the plan.

---

## Null Safety Issues

1. **`post-create.ts` line 76** — `if (this.campaignId)` is always truthy (signal reference). Should be `if (this.campaignId())`.

2. **`post-create.ts` line 79** — `this.campaignId() as string` casts away `undefined`. If the route param were absent, `undefined` would be sent as `campaignId`. Fix the guard first (see above) to make the cast safe.

3. **`post-create-form.ts` line 85** — `formValue.hashtags?.split(' ')` — `nonNullable.group` guarantees `hashtags` is a `string`, so the optional chain `?.` is misleading noise. Also the delimiter is wrong (space instead of comma).

---

## Code Smells

1. **`submitted` flag is a plain boolean** — `post-create.ts` line 28: `private submitted = false`. State should use `signal()` per conventions.

2. **`CreatePostFormComponent` naming** — `post-create.ts` line 27: public `viewChild` field starts with uppercase (`CreatePostFormComponent`). Should be `postCreateFormRef` or similar camelCase name.

3. **`isFormDirty` computed reads a non-signal** — `post-create.ts` line 29: `computed(() => this.CreatePostFormComponent().postForm.dirty)` — `postForm.dirty` is a plain boolean property, not a signal. `computed()` will not re-evaluate reactively when `dirty` changes.

4. **Unrelated file changed** — The diff includes `apps/web-ng-app/src/app/features/ai-generator/components/step3/step3.html`. This file is outside task-04 scope. The change should be reviewed separately or reverted if accidental.

---

## Recommendation

**Fix critical issues before merge.**

Priority fixes:
- Add `ChangeDetectionStrategy.OnPush` to `PostCreate`
- Remove all `console.log` / `console.error` calls
- Fix `if (this.campaignId)` → `if (this.campaignId())`
- Fix hashtag split delimiter: `' '` → `','`
- Add `[showTime]="true"` to both `<p-datepicker>` instances
- Fix success path: stay on page + reset form (remove `router.navigate` on success)
- Rename route `post/add` → `posts/add` and update `campaign.html` accordingly
- Remove the `addPost()` stub from `campaign.ts`
- Expand unit tests to cover the cases specified in the plan

The AI-assisted generation feature is entirely missing and is in spec scope. It should either be implemented or the task explicitly split, with the current PR scoped to manual post creation only.
