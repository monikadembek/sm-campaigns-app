# Spec Review — Task 02

Reviewer: Claude Code (automated)
Date: 2026-04-28

---

## Summary

- **Overall assessment: PASS WITH ISSUES**
- The specification is thorough, well-structured, and faithfully covers every explicit requirement in the raw task. All scope, behavior, data/API, and acceptance criteria are described with enough precision to implement from. Two issues warrant attention before implementation begins: a route ordering concern that is flagged but relies on an implicit assumption about Angular's router behavior, and a minor API-validation note (see Non-Critical Issues). One invented requirement is also noted (empty-state hint) that exceeds the raw task but is low-risk. Otherwise the spec is implementable as written.

---

## Findings

### Critical Issues

None.

---

### Non-Critical Issues

1. **Route ordering — `campaigns/add` vs `campaigns/:id` (Data/API → Routing section)**
   The spec correctly notes the new route must be placed _before_ `campaigns/:id`. The raw `app.routes.ts` already has `campaigns/:id`; inserting `campaigns/add` above it is required and the spec calls it out. However, the spec does not mention that Angular's router matches routes top-to-bottom with path segments, so a static segment (`add`) always wins over a parameterised one (`:id`) for that literal string — placing order is still important, but the note could be more precise. Low risk; correct action is stated.

2. **`endDateValidator` is a `ValidatorFn`, not a directive (Scope / Assumptions)**
   The spec refers to "the pre-existing `endDateValidator` directive" in the Assumptions section, and uses "directive" in the file path comment. Inspecting the file (`end-date-validator.directive.ts`) reveals it exports a plain `ValidatorFn` constant, not an Angular directive class. The import will work fine (it is a named export from a `.ts` file), but describing it as a "directive" is misleading for implementors. Should say "validator function exported from `end-date-validator.directive.ts`".

3. **`CampaignsApi.createCampaign` return type vs. usage (Data/API → Frontend service additions)**
   The spec states the method returns `Observable<CampaignDetails>`. However, the Behavior section states the success path calls `reloadCampaigns()` and navigates to `/campaigns` — the `CampaignDetails` response value is never consumed by the component. The type is accurate for consistency with the API response shape, but implementors may be puzzled why `CampaignDetails` is returned if nothing uses it. A brief note that it is returned for future use (e.g., optimistic UI) or that it can be typed `Observable<CampaignDetails>` but the component only subscribes to the side-effect would remove ambiguity.

4. **`submit` disabled while "pristine" (Behavior, step 6)**
   The spec states the submit button is disabled while "form invalid or pristine". A brand-new form with valid defaults (e.g., `status = 'DRAFT'`) but no user interaction will be pristine and therefore disabled — this is intentional UX, but the wording "pristine" should be confirmed as deliberate. If pristine-disable is intentional (i.e. the user must touch at least one field), it should be flagged in Behavior as a deliberate UX choice rather than implied. If not intentional, it should be removed.

5. **`notes` max-length discrepancy note (Out of scope)**
   The spec mentions fixing the pre-existing "max 255" message inside `CampaignEdit` for `notes` is explicitly out of scope. This is fine, but the spec does not state whether the new `CampaignCreate` form will also show a "max 1000" or "max 255" label for `notes`. The implementation should display "max 1000" — this is implied but not explicitly stated.

---

### Unclear or Ambiguous Sections

- **Behavior step 2 — empty-state condition**: "if the campaigns array is empty after the resource resolves" — it is unclear whether "after the resource resolves" also accounts for loading and error states. The edge case section does not address what happens to the empty-state block while the resource is still loading (should it be hidden?). Implementation will need to decide.
  Yes, it should be hidden

- **Data/API — `startDate`/`endDate` in `CreateCampaignRequest` shared type**: The spec proposes `startDate?: string | Date | null`. The existing `UpdateCampaignDto` uses `Date | null` after `@IsDateString()` processing and the `CampaignBase` type uses `Date | string | null`. Widening `CreateCampaignRequest` to `string | Date | null` is consistent with the existing `CampaignBase` pattern, but it may introduce a double-conversion issue in the service (`new Date(data.startDate)` when it is already a `Date`). The spec mentions mirroring the `'X' in data` pattern but does not explicitly address the `string | Date` dual type on the create path.

---

### Invented or Unsupported Requirements

1. **Empty-state hint on campaigns list page** — The raw task (`00-raw-task.md`) does not mention an empty-state. The spec adds a centered "No campaigns yet" message with a CTA. This is a reasonable enhancement but is not grounded in the original task. It should be confirmed with the task owner or explicitly called out as a spec-level addition.

2. **`CampaignController.createCampaign` return type widened to `CampaignDetails`** — The raw task says "add endpoint that will allow creating campaign with full data". The spec interprets this as also changing the _response_ from `CampaignSummary` to `CampaignDetails`. This interpretation is reasonable but is an assumption, not an explicit requirement. The spec does call it out in the Assumptions section, which is correct — flag remains for awareness.

---

## Assumptions Detected

| #   | Assumption                                                                                                                            | Explicitly stated in spec?                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | `endDateValidator` from `campaign-edit` can be cross-imported directly into `campaign-create` without relocation.                     | Yes (Assumptions section)                          |
| 2   | Prisma schema already has all required nullable columns (`audience`, `startDate`, `endDate`, `status`, `notes`); no migration needed. | Yes (Assumptions section)                          |
| 3   | `CampaignSummary` is not consumed by any other client of `POST /api/campaigns`; widening response to `CampaignDetails` is safe.       | Yes (Assumptions section)                          |
| 4   | No design mock-up; visual styling follows existing PrimeNG/Tailwind patterns from `CampaignEdit` and `Campaigns`.                     | Yes (Assumptions section)                          |
| 5   | Goals are fetched via existing `CampaignApi.goals` resource; cross-feature injection of `CampaignApi` is acceptable.                  | Yes (Data/API section, Frontend service additions) |
| 6   | Empty-state hint is a desirable addition even though not in the raw task.                                                             | Implicit only — not listed as an assumption.       |
| 7   | Submit button disabled while form is _pristine_ (in addition to invalid) is intentional UX.                                           | Implicit only.                                     |
| 8   | `notes` max-length label on the new create form should read "max 1000" (not "max 255").                                               | Implicit only.                                     |
| 9   | The empty-state block should be hidden while the campaigns resource is still loading.                                                 | Implicit only.                                     |

---

## Recommendation

**Revise specification** — address the following before implementation:

1. Clarify whether the empty-state hint (invented requirement #1) is confirmed in scope.
2. Explicitly state whether the submit button's "pristine" disable is intentional UX (Non-Critical Issue #4).
3. Correct the "directive" wording for `endDateValidator` to "validator function" (Non-Critical Issue #2).
4. Add a sentence clarifying the empty-state loading/error state behavior (Unclear section #1).

The remaining issues are low-risk and can be resolved during implementation without re-speccing.
