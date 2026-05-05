# Spec Review — Task 04: Add New Post

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is well-structured and covers the core requirement faithfully. Most additions beyond the raw task are reasonable elaborations grounded in the existing codebase. However, two non-trivial issues exist: (1) a routing order problem that will cause the new route to silently fail, and (2) one assumption about the AI request shape is partially incorrect. These must be resolved before implementation starts.

---

## Findings

### Critical Issues

1. **Route ordering conflict — `campaigns/:id/posts/add` will never match.**
   In `app.routes.ts`, the route `campaigns/:id` is registered before any child routes. Angular's router matches routes top-to-bottom and `campaigns/:id` will consume `campaigns/abc123/posts/add` (treating `posts` as the `:id` segment), meaning the new route will never be reached. The spec says to "add" the route but does not address the ordering or the need to restructure the `campaigns/:id` route to use `children` (or place the new route before `campaigns/:id`). This is a critical implementation-blocker that the spec must address.

2. **AI request body — `id` field in the fabricated `PostIdea` is unspecified.**
   The spec states the AI call sends `{ ideas: [{ id, title: topic, summary: topic, platform, suggestedPostType: 'TEXT' }] }` but does not specify what value `id` should have. The backend DTO validates `id` with `@IsUUID()` — a missing or non-UUID value will cause a 400 error. The spec must define what `id` value is passed (e.g., a freshly generated `crypto.randomUUID()`).

### Non-Critical Issues

1. **`addPost()` stub in `campaign.ts` — spec says to remove it, but `editPost()` and `schedulePost()` stubs remain.**
   The spec removes only `addPost()`. The two remaining stubs (`editPost`, `schedulePost`) are not covered. This is fine as out of scope, but the spec could note they are intentionally left.

2. **`campaignId` type assumption — spec uses UUID validation for the edge case.**
   The spec says "If `campaignId` from the route param is not a valid UUID…". The existing `Campaign` page already handles 404/400 errors from the API by redirecting to `/campaigns`. The new page could delegate to the same pattern rather than adding client-side UUID pre-validation, but the spec is silent on whether this validation is done client-side or server-side. Clarification would help the implementer.

3. **Success state: "form resets to empty" is underspecified.**
   The spec says "form resets to defaults" but does not clarify whether `campaignId` (derived from the route) is also reset or just the user-editable fields. The intent is clear from context, but explicit mention avoids guessing.

4. **No `canDeactivate` guard mentioned.**
   The `campaigns/add` route uses `campaignFormCanDeactivateGuard`. The spec does not mention whether `campaigns/:id/posts/add` should have similar unsaved-changes protection. Given the form can be filled and accidentally navigated away from, this is worth a conscious decision.

### Unclear or Ambiguous Sections

- **"AI-assisted path — Step 3" (`suggestedPostType: 'TEXT'`)**: The spec hard-codes `TEXT` as the suggested post type in the AI request, but the main form also has a `postType` field. It is not stated whether the returned `postType` from the AI response should overwrite the form's `postType` field, or only `content`, `hashtags`, and `platform`. Step 5 covers `platform` and the content fields, but `postType` is omitted — likely an oversight.

- **"Back to campaign" link — target URL**: The spec says "Back to campaign" but does not specify the URL target. It should link to `campaigns/:id` (the current campaign). This is implied but not stated.

### Invented or Unsupported Requirements

None. All spec requirements trace back to the original task or the existing codebase.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | The NestJS `POST /api/posts` endpoint already exists and accepts `CreatePostDto` | Yes |
| 2 | `Post`, `PlatformType`, `PostTypeValue`, `PostStatus` already exist in datatypes | Yes — verified correct |
| 3 | `CampaignApi` / `CampaignStore` can be reused to load the campaign name | Yes |
| 4 | `MessageService` (PrimeNG) is already provided in the app | Yes (implied by existing usage) |
| 5 | The AI endpoint `POST /api/ai-content/generate-content` accepts `GenerateContentRequest` with `ideas[]` | Yes — verified against `GenerateContentRequestDto` |
| 6 | A single-idea array is a valid input to the generate-content endpoint | Implicit — `@ArrayNotEmpty()` allows 1 item |
| 7 | `status` field defaults to `DRAFT` on the form | Yes |
| 8 | `postType` field defaults to `TEXT` on the form | Yes |
| 9 | `campaignId` is taken from the route param and not editable in the form | Yes |
| 10 | No `canDeactivate` guard needed for this route | Not stated — implicit omission |

---

## Recommendation

**Revise specification** — address the two critical issues before implementation:

1. Define the route registration strategy to avoid the `campaigns/:id` shadowing conflict.
2. Specify the value used for the fabricated `id` field in the AI request's `PostIdea` object.

The non-critical issues and ambiguities can be resolved inline during implementation or in a follow-up spec update.
