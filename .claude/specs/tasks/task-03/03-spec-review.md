# Spec Review — Task 03

Reviewer: Claude Code
Date: 2026-04-29

---

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The spec is well-structured, covers all four endpoints required by the task, and correctly inherits the existing campaign module conventions. However, there are two non-trivial issues: (1) the authorization strategy for `GET`, `PATCH`, and `DELETE` diverges between the spec narrative and how Prisma compound `where` actually works for nested relations — it needs a concrete clarification, and (2) the `CreatePostDto` references constant names (`PLATFORM_TYPES`) that don't match the names defined in the Constants file section (`POST_PLATFORM_TYPES`). These should be fixed before implementation begins to avoid ambiguity.

---

## Findings

### Critical Issues

**1. Inconsistent constant names in `CreatePostDto` vs. Constants file section**

- In `CreatePostDto`, the validator uses `@IsIn(PLATFORM_TYPES)` and `@IsIn(POST_TYPE_VALUES)`.
- The Constants file section defines `POST_PLATFORM_TYPES`, `POST_TYPE_VALUES`, and `POST_STATUS_VALUES`.
- `PLATFORM_TYPES` (used in the DTO) does not match `POST_PLATFORM_TYPES` (defined in constants). This will cause a compile error unless one of them is corrected.
- The spec must use consistent names throughout.

**2. Authorization mechanism for `GET /posts/:id` is ambiguous**

- The narrative says "join through `campaign.userId`" but the spec does not specify whether this is done via a Prisma nested `where` (like update/delete) or via a preliminary `findUnique` + manual ownership check.
- For `PATCH` and `DELETE` the spec explicitly states to use a compound `where: { id, campaign: { userId } }`. For `GET`, only "verify the post's campaign belongs to the current user (join through `campaign.userId`)" is stated — it is not clear whether this means a compound `findUnique` where or a two-step lookup.
- This inconsistency could lead to two different implementations for the same authorization pattern. The spec should state the same compound `where` pattern for `GET` explicitly, or document why it differs.

---

### Non-Critical Issues

**3. `hashtags` default value not specified in service layer**

- `CreatePostDto` documents `hashtags` as `// default []`, but the spec does not specify where this default is applied — in the DTO (class property initializer), in the service, or via Prisma schema default. This is a minor implementation detail but worth making explicit to avoid a missing field on create.

**4. `publishedAt` field not included in `UpdatePostDto`**

- The `Post` model has a `publishedAt` field (set when a post is actually published). `CreatePostDto` does not include it (correct), but the spec is silent on whether `PATCH` should allow setting it. Given that this is a REST API without a publishing workflow in scope, it is reasonable to exclude it — but the spec should state this explicitly rather than leaving it implied.

**5. HTTP status code for `DELETE` not specified**

- The campaign `DELETE` controller returns `200 OK` with a message body. The spec inherits this pattern implicitly but never states the expected HTTP response code. Not a blocker, but worth noting for test clarity.

**6. `@IsNotEmpty()` on optional string fields in `UpdatePostDto` not addressed**

- The spec says `UpdatePostDto` is "all fields from `CreatePostDto` marked `@IsOptional()`". But `content` in `CreatePostDto` has `@IsNotEmpty()`. When `content` is optional in `UpdatePostDto`, should `@IsNotEmpty()` be kept (i.e., if provided, must not be empty string)? This is the same pattern `UpdateCampaignDto` uses for `name`, but the spec does not explicitly confirm this intent.

---

### Unclear or Ambiguous Sections

**Section: "Behavior → Create post"**
- Step 2 says "Service verifies the campaign belongs to the authenticated user… by looking up the campaign via Prisma before creating the post." This implies a two-step operation (lookup, then create). It should be confirmed that this is intentional (not an atomic upsert or nested create) and that a `NotFoundException` is thrown before any post data is inserted.

**Section: "Data / API → UpdatePostDto"**
- Defined only by reference to `CreatePostDto` ("all fields … marked `@IsOptional()`"). There is no explicit field list, which means the implementer must mentally derive it. This is workable but slightly fragile if `CreatePostDto` changes.

---

### Invented or Unsupported Requirements

None. All requirements in the spec — the four endpoints, auth guard, error handling pattern, DTO structure, constants file, test requirement — are either directly stated in the raw task ("create post in given campaign", "delete post by id", "update post by id", "get post by id", "tests added") or are reasonable inferences from the existing codebase conventions that are explicitly acknowledged in the Context section.

---

## Assumptions Detected

| # | Assumption | Explicitly stated in spec? |
|---|-----------|---------------------------|
| 1 | No DB migrations are needed because the `Post` model already exists in `schema.prisma` | Yes — "No DB schema changes" section |
| 2 | Posts cannot be reassigned to a different campaign via `PATCH` (campaignId excluded from `UpdatePostDto`) | Yes — stated in `UpdatePostDto` section |
| 3 | Authorization uses the same `AuthGuard` and `@CurrentUser` decorator as the campaign module | Yes — Context section references this pattern |
| 4 | Ownership check leaks no information (not-found vs. unauthorized return the same `NotFoundException`) | Yes — Edge Cases section |
| 5 | `DELETE` returns `200 OK` with a JSON message body (not `204 No Content`) | **Not stated** — inherited silently from campaign pattern |
| 6 | `hashtags` defaults to `[]` when omitted on create | Partially — noted in DTO comment, not in service behavior |
| 7 | `publishedAt` is intentionally excluded from both create and update DTOs | **Not stated** |
| 8 | `PostModule` imports `DatabaseModule` and `AuthModule` (same as `CampaignModule`) | **Not stated** — implied by the need for Prisma and AuthGuard |

---

## Recommendation

**Revise specification** — address Critical Issue #1 (constant name mismatch) and Critical Issue #2 (authorization pattern for `GET`) before implementation. The non-critical issues can be resolved inline during implementation if the implementer is aware of them, but documenting the intent (especially for `publishedAt` exclusion and `DELETE` response code) would make the spec more self-contained.
