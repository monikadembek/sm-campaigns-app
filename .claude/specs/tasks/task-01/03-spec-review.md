# Specification Review — task-01

### Summary

- **Overall assessment:** PASS WITH ISSUES
- **Justification:** The specification faithfully covers every explicit requirement from the raw task (new `/campaigns/:id` route, resolver/data loading, details display, edit, delete, posts display, edit endpoint) and has been aligned with the developer's clarifying answers. However, several items go beyond what the raw task literally states (new `GET /api/campaign-goals` endpoint, `startDate > endDate` form validation, truncation rules, confirmation dialog wording) and at least two concrete ambiguities remain (the raw task says "add resolver" but the spec uses `httpResource`; a `startDate > endDate` validation was never requested). These do not block implementation but should be acknowledged or trimmed before coding begins.

### Findings

#### Critical Issues

None.

#### Non-Critical Issues

1. **Raw task says "add resolver", spec uses `httpResource`.** The raw task explicitly states: *"add resolver to that route that will fetch data for campaign with given id."* The spec deliberately deviates and uses `httpResource` in an API service, citing project state-management conventions. This is a legitimate convention-driven decision (and was confirmed by the developer in the clarification phase), but the spec does not explicitly flag the divergence from the literal task wording in the Assumptions section — only in the Route Registration note. It would be safer to move this to an explicit assumption/deviation so a later reviewer does not flag it as a missed requirement.

2. **`GET /api/campaign-goals` endpoint is introduced without origin in the raw task.** The raw task only mentions adding an endpoint for editing a campaign. The goals endpoint is a derived requirement — it exists only because the developer's answer to Q1 said `goalId` should be editable via a dropdown of `CampaignGoal`s. The spec notes this in Assumptions, but this is a material new backend surface that should be explicitly called out as a derived/dependent requirement rather than folded into the "In scope" backend list alongside the PATCH endpoint which was directly requested.

3. **`startDate > endDate` form-level validation is invented.** This rule is not in the raw task nor in the clarification answers. It is a sensible UX guard but goes beyond what was asked. Flag as a spec-added requirement or remove.

4. **Content snippet truncation length (120 chars) is invented.** The raw task says nothing about snippet length. The developer only said "platform, postType, status, snippet" in Q5. Picking 120 characters is an implementation detail the spec introduces on its own. Acceptable as an assumption, but should be listed as such.

5. **Confirm dialog wording is invented.** The spec prescribes *"Are you sure you want to delete this campaign? This action cannot be undone."* This exact wording was not requested; only the existence of a confirmation step was. Classify as an assumption.

6. **Toast messages "Campaign updated" / "Campaign deleted" are invented.** Only the not-found toast wording ("Campaign with given id was not found") was explicitly specified by the developer. The other two toast strings are spec-added.

7. **Loading UI is underspecified.** Section "Navigation in" step 4 says *"shows a loading indicator (or leverages the existing global spinner...)"*. The "or" leaves the implementer two options without guidance. Pick one, or mark both as acceptable.

8. **Field list in read mode does not match field list in edit mode.** Read mode lists `name, goal label, status, audience, startDate, endDate, notes, timezone, createdAt/updatedAt`. Edit mode lists `name, goalId, audience, startDate, endDate, status, notes`. `timezone`, `createdAt`, `updatedAt` are read-only display fields (correctly not editable), which matches the developer's answer — but the spec should clarify that these are displayed but intentionally not editable, so the mismatch is not read as a gap.

9. **Delete flow adds a cross-service reload that was not requested.** The Delete step specifies *"triggers `CampaignsApi.reloadCampaigns()`"*. This is a reasonable consistency measure but is not in the raw task or in the clarification answers. It is a spec-added behavior. Either call it out explicitly as an assumption or remove it.

10. **`PostStatus` type is duplicated.** The raw task makes no mention of shared types, but the spec adds a top-level `PostStatus` type to `datatypes.ts`. Since the existing `datatypes.ts` already does not export a `PostStatus` (the Prisma enum lives only on the backend), adding it is reasonable — but the naming may collide with future conventions. Minor, worth flagging.

11. **`UpdateCampaignDto` field nullability vs `class-validator`.** The DTO uses `@IsString() @IsOptional()` for `audience` and `notes` and says "nullable allowed for clearing". `@IsOptional()` permits `undefined` and `null`, but the spec should clarify whether the backend should treat `null` as "clear this field" vs "don't touch". This is a behavioral gap.

12. **`class-validator` `@Transform` for dates not specified.** The spec accepts `startDate?: string | null` as ISO date strings and later hands them to Prisma which expects `Date` objects on `DateTime @db.Date` columns. The spec does not specify whether the service layer converts strings to `Date`. Implementation gap.

13. **`CampaignPost` shared type duplicates backend Prisma types.** The spec adds `CampaignPost`, `PostMedia`, and `Media` types to `packages/shared/datatypes`. The existing project currently derives the shape via Prisma `include` at the service layer. Introducing shared types for these is a new pattern in the repo — not wrong, but worth acknowledging as a convention change rather than a local addition.

14. **Providers registration location is ambiguous.** The spec says *"Register `MessageService` and `ConfirmationService` providers where appropriate (component-level or app config)."* This leaves the choice open. Pick one location.

#### Unclear or Ambiguous Sections

- **Scope → Frontend, bullet on loading indicator** ("loading indicator (or leverages the existing global spinner...)") — ambiguous choice.
- **Scope → Backend, bullet on `GET /api/campaign-goals`** ("reuse an existing one if present" / "If the project does not yet have a `CampaignGoalController`...") — the spec does not definitively state whether such a controller exists. This should have been verified by reading the codebase before writing the spec.
- **Edit flow, step 4 bullet**: *"sends `PATCH /api/campaigns/:id` via `HttpClient` with only the form value (dirty fields only is **not** required — sending all editable fields is acceptable)"* — the double negative + parenthetical makes it unclear whether the implementer should send all fields or dirty only. Rephrase.
- **Posts display, step 2**: "a text snippet (e.g. the first 120 characters...)" — "e.g." signals it is an example, not a requirement. Make it definitive.
- **Edge Cases, "Save fails due to validation error (400)"** — says "show an error toast with the backend message if available". The format of the backend error message is not specified, and the spec does not say how to extract it from the NestJS error response shape.
- **Assumptions, "signal form"** — the spec explicitly reinterprets the developer's phrase "signal form" as "reactive form driven by signal state" rather than Angular's experimental signal forms API. This is a reasonable interpretation, but should ideally have been confirmed with the developer rather than assumed.

#### Invented or Unsupported Requirements

Not grounded in the raw task or clarification answers:

1. `GET /api/campaign-goals` endpoint (derived from Q1 answer, not from raw task).
2. `startDate > endDate` form-level validation.
3. 120-character content snippet truncation.
4. Specific confirm dialog wording ("Are you sure you want to delete this campaign? This action cannot be undone.").
5. Specific toast strings "Campaign updated" and "Campaign deleted".
6. `CampaignsApi.reloadCampaigns()` call after successful delete.
7. `MessageService` + `ConfirmationService` registration (indirectly implied by the PrimeNG confirm dialog and toast decisions, but not explicitly requested by the developer).
8. The definition of new shared types `Media`, `PostMedia`, `CampaignPost`, `PostStatus` (the developer said "introduce new type", singular — `CampaignDetails`; the spec expands this into a tree of supporting types).

None of these are unreasonable, but per the review rules they should be called out as spec-added rather than task-driven.

### Assumptions Detected

Explicitly stated in the spec's "Assumptions" section:

- `GET /api/campaigns/:id` already returns the richer shape (stated).
- PrimeNG `MessageService` / `ConfirmationService` are available and will be registered as part of this task (stated).
- `GET /api/campaign-goals` does not yet exist and will be added (stated).
- "Signal form" = reactive form driven by signal state, not Angular experimental signal forms API (stated).
- Date inputs use PrimeNG `DatePicker` / `Calendar` and serialize to ISO date strings (stated).
- No unsaved-changes guard when navigating away with dirty form state (stated).
- Tailwind utility classes used for layout (stated).

Implicit / undocumented assumptions that should have been in the Assumptions list:

- Using `httpResource` in an API service is treated as equivalent to the raw task's "add resolver" wording. (Mentioned only in Route Registration note, not in Assumptions.)
- Post snippet length of 120 characters.
- Confirm dialog wording.
- Success toast strings ("Campaign updated" / "Campaign deleted").
- `startDate > endDate` validation is an added UX guard.
- Triggering `CampaignsApi.reloadCampaigns()` after delete is a spec-added consistency step.
- Null vs undefined handling in `UpdateCampaignDto` (the "clear this field" semantics).
- Date string → `Date` conversion responsibility at the service layer.

### Recommendation

**Revise specification.**

Specifically:

1. Move the "httpResource vs resolver" decision into the Assumptions section as an explicit deviation from the raw task wording.
2. Reclassify `GET /api/campaign-goals` as a derived/dependent requirement under the Q1 answer, not as a sibling of the PATCH endpoint.
3. Either drop the `startDate > endDate` validation or list it as an added UX guard.
4. List the invented defaults (snippet length, confirm/toast wording) under Assumptions.
5. Disambiguate the loading indicator choice, the "dirty fields only" wording, and the providers registration location.
6. Clarify null vs undefined semantics in `UpdateCampaignDto` and the date string → `Date` conversion in the service layer.
7. Verify whether a `CampaignGoalController` / `CampaignGoalService` already exists in `apps/api/src/app/` and pin the spec to the actual state rather than "if not present".

None of the above are blocking — the spec is implementable as-is — but fixing them will prevent scope creep and reviewer churn during implementation.
