# Code Review — Task task-02

## Summary

- **Overall result: PASS WITH ISSUES**
- The feature is functionally complete: backend DTO, service, and controller are correctly extended; the new `CampaignCreate` page and form components are wired up; routing and the campaigns list page changes are in place. However, there are several bugs — wrong validators on the create form (`status` has `maxLength`, `audience` and `notes` have wrong max values), a stale error message in the form template, missing `reloadCampaigns()` call after creation, and a stale `console.log` left in the `Campaigns` component. The test suites are incomplete (scaffold-only for the Angular components; controller delete-campaign test uses the wrong assertion). These must be fixed before merge.

---

## Conventions Violations

### Critical (must fix before merge)

1. **`campaign-create-form.ts` line 68 — wrong validator on `status` control.**
   `status` has `Validators.maxLength(1000)` applied, which is nonsensical for an enum select. Remove it.

2. **`campaign-create-form.ts` line 63 — wrong `maxLength` on `audience`.**
   `audience` carries `Validators.maxLength(255)` but the spec requires no length constraint on `audience` (the DTO has none either). Align with spec: remove the validator, or at minimum match whatever the DTO enforces.

3. **`campaign-create-form.ts` line 71 — wrong `maxLength` on `notes`.**
   `notes` carries `Validators.maxLength(255)` but the spec explicitly requires `maxLength(1000)`. Fix to `Validators.maxLength(1000)`.

4. **`campaign-create-form.html` line 95 — stale error message for `notes`.**
   Error text reads `"Name can't be longer than 100 characters"` — the field is `notes`, the limit is 1000 chars. Fix the copy.

5. **`campaign-create.ts` line 65 — missing `reloadCampaigns()` after successful create.**
   The spec and plan both require `CampaignsApi.reloadCampaigns()` to be called on success so the campaigns list refreshes. The current `saveNewCampaign()` success handler navigates without reloading. `CampaignsApi` must be injected into `CampaignCreate` and `reloadCampaigns()` called before navigation.

6. **`campaign-create.ts` line 75 — misleading error log copy.**
   `console.error('Error when deleting campaign: ', err)` — the action is *creating*, not deleting. Fix the log message.

7. **`campaign-create.ts` line 67 — success toast message doesn't include campaign name.**
   Spec requires: `"Campaign {name} was created"`. Current detail is the generic `"New campaign was created"`. The form value emitted via `saveNewCampaign` carries `form.name`; use it in the toast.

8. **`campaign.controller.spec.ts` line 231 — wrong assertion in `deleteCampaign` test.**
   `expect(result).toBe('Campaign with id: campaign-1 was successfully deleted')` — the controller returns `{ message: '...' }` (an object), not a string. This test will fail. Fix to `expect(result).toEqual({ message: 'Campaign with id: campaign-1 was successfully deleted' })`.

9. **`campaign-create.spec.ts` and `campaign-create-form.spec.ts` — scaffold tests only.**
   Both spec files contain only a single `'should create'` test. The acceptance criteria require: happy-path submit, cancel navigation, and error path tests. These must be implemented.

10. **`campaign-create-api.spec.ts` and `campaign-goals-api.spec.ts` — scaffold tests only.**
    Both are boilerplate with no actual assertions about behavior.

### Non-Critical (should fix)

1. **`campaigns.ts` lines 38–41 — debug `console.log` statements left in production code.**
   Two `console.log` calls inside an `effect()` should be removed.

2. **`campaign-create-form.ts` line 37 — `fb` exposed as `readonly` instead of `#private`.**
   `readonly fb = inject(FormBuilder)` unnecessarily exposes the injected service. Prefer `readonly #fb = inject(FormBuilder)` per conventions.

3. **`app.routes.ts` line 26 — `canDeactivate` guard added to the create route (out of scope).**
   The spec explicitly marks the unsaved-changes prompt as out of scope for this iteration. The guard is wired up anyway. If intentional, the spec needs updating; otherwise remove it.

4. **`campaign-create.html` line 4 — `[goals]` receives `undefined` when resource has no value.**
   `campaignGoals.value()` returns `undefined` before the resource resolves, but `goals` is typed as `CampaignGoal[]` (not nullable). Pass `campaignGoals.value() ?? []` to prevent the type mismatch.

5. **`campaign-create.html` — no error state shown when goals fail to load.**
   The spec requires: *"Goals fail to load — show an error message using `<p-message>` if goals resource has an error."* There is no `@if(campaignGoals.error())` block in the page template.

6. **`create-campaign.dto.ts` lines 31–37 — `@IsString` instead of `@IsDateString` on date fields.**
   The spec, plan, and `UpdateCampaignDto` all use `@IsDateString` for `startDate`/`endDate`. `CreateCampaignDto` only applies `@IsString`, losing ISO 8601 format validation.

7. **`datatypes.ts` line 109 — `audience` not nullable in `CreateCampaignRequest`.**
   Typed as `audience?: string` but the DTO, service, and spec treat it as `string | null`. Update to `audience?: string | null`.

---

## Specification Coverage

| Requirement | Status | Note |
| --- | --- | --- |
| Route `/campaigns/add` lazy-loaded and auth-guarded | Covered | Also has `canDeactivate` (out-of-scope per spec) |
| `CampaignCreate` page component in `campaign-create/` | Covered | — |
| `CampaignCreateForm` child component | Covered | — |
| Form fields: name, goalId, status, audience, startDate, endDate, notes | Covered | — |
| `name` required + maxLength(255) | Covered | — |
| `goalId` required, default null | Covered | — |
| `status` required, default DRAFT | Covered | Has spurious `maxLength(1000)` validator |
| `notes` maxLength(1000) | Missing | Set to maxLength(255) in form TS |
| `endDateValidator` at form-group level | Covered | — |
| Submit disabled while invalid or pristine | Covered | — |
| On success: success toast with campaign name | Partial | Toast exists but omits campaign name |
| On success: `reloadCampaigns()` called | Missing | Not called in success handler |
| On success: navigate to `/campaigns` | Covered | — |
| On error: error toast via `handleHttpErrorResponseMessage` | Covered | — |
| Cancel navigates to `/campaigns` | Covered | — |
| Campaigns list: "Create campaign" button top-right | Covered | — |
| Campaigns list: empty-state hint with CTA | Covered | — |
| Goals error state shown with `<p-message>` | Missing | No `goals.error()` check in page template |
| `POST /api/campaigns` extended with optional fields | Covered | — |
| `CreateCampaignDto` optional fields validated | Partial | Date fields use `@IsString` not `@IsDateString` |
| `CampaignService.createCampaign` handles optional fields + returns `CampaignDetails` | Covered | — |
| `CampaignController.createCampaign` returns `CampaignDetails` | Covered | — |
| `CreateCampaignRequest` shared type extended | Partial | `audience` not nullable; spec requires `string \| null` |
| `campaign.constants.ts` extracted | Covered | — |
| Backend tests: `createCampaign` full and minimal payloads | Covered | — |
| Frontend tests: `CampaignCreate` happy path, cancel, error | Missing | Scaffold only |
| Frontend tests: `Campaigns` button + empty-state | Not in diff | No `campaigns.spec.ts` change found |

---

## Plan Deviations

1. **`CampaignCreateApi` is a new dedicated service (`campaign-create/services/campaign-create-api.ts`) instead of adding `createCampaign()` to the existing `CampaignsApi`.** The plan specified extending `CampaignsApi`. This split means `CampaignCreate` cannot call `reloadCampaigns()` without injecting `CampaignsApi` separately — the likely root cause of the missing reload (Critical #5).

2. **`CampaignGoalsApi` extracted to `shared/services/campaign-goals-api.ts` instead of reusing `CampaignApi.goals`.** The plan said to inject `CampaignApi` directly. The implementation is a cleaner approach that avoids the spurious campaign resource request noted as a risk in the plan. Acceptable deviation.

3. **`canDeactivate` guard added to `campaigns/add` route.** The spec explicitly marks this out of scope. Treat as a deviation until the spec is updated.

---

## Null Safety Issues

1. **`campaign-create.html` line 4 — `campaignGoals.value()` passed to a `required` input without null guard.** Before the resource resolves, `value()` returns `undefined`, but the `goals` input is typed `CampaignGoal[]`. Use `campaignGoals.value() ?? []`.

---

## Code Smells

1. **`campaignStatusSelectOptions` duplicated verbatim in both `CampaignCreateForm` and `CampaignEdit`.** Acceptable for this task per spec (shared extraction is out of scope), but flagged for future cleanup.

2. **`campaign-create-form.ts` line 96 — `this.campaignForm.value as CreateCampaignRequest` cast.** `campaignForm.value` is `Partial<...>` because nullable controls are partial. Use `getRawValue()` or construct the payload explicitly to avoid the unsafe cast.

---

## Recommendation

**Fix critical issues before merge.**

The core feature is structurally sound, but the missing `reloadCampaigns()` call means the list never refreshes after creation, the `notes` maxLength bug will cause the API to reject values the form allows, and the controller delete test assertion is wrong and will fail in CI. Scaffold-only frontend tests also need to be replaced with real coverage per acceptance criteria.
