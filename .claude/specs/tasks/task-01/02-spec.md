# Task Specification

## Source

Azure DevOps Task: 01

## Goal

Add a **Campaign Details** page to `web-ng-app` at route `/campaigns/:id` that:

- Fetches and displays the details of a single campaign by id.
- Allows the user to toggle into an **edit mode**, modify a defined subset of campaign fields via a signal-based reactive form, and persist changes through a new **PATCH** endpoint on the API.
- Allows the user to delete the campaign (with confirmation) and navigates back to `/campaigns` on success.
- Displays the campaign's posts in a limited, read-only list (platform, postType, status, content snippet).
- Introduces a new shared datatype `CampaignDetails` to carry the richer post data returned by `GET /campaigns/:id`.

## Context

- Frontend: `apps/web-ng-app` — Angular 21, standalone components, signals, PrimeNG, Tailwind.
- Backend: `apps/api` — NestJS 11, Prisma, Supabase auth guard, existing `CampaignController` / `CampaignService`.
- Shared types: `packages/shared/datatypes` (alias `@sm-campaigns-app/datatypes`).
- The `GET /api/campaigns/:id` endpoint already exists and returns a campaign including posts with media. The shared `Campaign` type currently declares `posts: PostLimitedData[]`, which does not match the richer shape the endpoint returns — this inconsistency will be resolved by introducing a new `CampaignDetails` type (see Data / API).
- Entry point to the new page already exists in `apps/web-ng-app/src/app/features/campaigns/campaigns.html` — each campaign card already has `[routerLink]="['/campaigns', item.id]"`. No additional navigation sources need updating.

## Scope

### In scope

**Frontend (`apps/web-ng-app`):**

- Add a lazy-loaded route `campaigns/:id` behind `authGuard` in `app.routes.ts`, pointing to a new standalone component `CampaignDetails`.
- Create a new feature folder `apps/web-ng-app/src/app/features/campaign-details/` containing:
  - `campaign-details.ts` — smart standalone component with `ChangeDetectionStrategy.OnPush`.
  - `campaign-details.html` — template.
  - `campaign-details.css` — component styles.
  - `campaign-details.spec.ts` — Vitest unit tests.
  - `services/campaign-details-api.ts` — service using `httpResource` for reading and `HttpClient` for the PATCH and DELETE mutations.
- Read mode displays campaign details (name, goal label, status, audience, startDate, endDate, notes, timezone, createdAt/updatedAt) and a posts list.
- "Edit" button toggles the component into edit mode. In edit mode, a **reactive form** (signal-driven, built with Angular's reactive forms) renders form controls for: `name`, `goalId` (dropdown of `CampaignGoal[]`), `audience`, `startDate`, `endDate`, `status` (dropdown), `notes`. Two buttons: **Save** and **Cancel**.
  - Save calls `PATCH /api/campaigns/:id`, on success shows a success toast, reloads the `httpResource`, and switches back to read mode. Stays on the same page.
  - Cancel discards form changes and switches back to read mode without calling the API.
- "Delete" button triggers a PrimeNG `ConfirmDialog`. On confirm, calls `DELETE /api/campaigns/:id`, shows a success toast, and navigates to `/campaigns`.
- Posts list shows each post with: platform, postType, status, and a short content snippet (first N characters of `content`). No click interaction on posts.
- If the campaign is not found (HTTP 404), redirect the user to `/campaigns` and show an error toast with the message: **"Campaign with given id was not found"**.
- A `CampaignGoal[]` list must be available for the goal dropdown. If no endpoint yet exists to fetch `CampaignGoal`s, add one (see Data / API).
- Use `MessageService` / `Toast` for success and error messages. Register `MessageService` and `ConfirmationService` providers where appropriate (component-level or app config).

**Backend (`apps/api`):**

- Add `PATCH /api/campaigns/:id` endpoint in `CampaignController` that:
  - Is protected by the existing `AuthGuard`.
  - Validates `:id` via `ParseUUIDPipe`.
  - Accepts a new `UpdateCampaignDto` with the allowed optional fields: `goalId`, `name`, `audience`, `startDate`, `endDate`, `status`, `notes`.
  - Scopes the update to the current user via `@CurrentUser('id')`.
  - Returns the updated `CampaignDetails` (same shape as `GET /campaigns/:id`).
  - Returns 404 if the campaign does not exist or does not belong to the user.
- Add an `updateCampaign(id, userId, data)` method in `CampaignService` that uses Prisma's `update` (scoped by both `id` and `userId`) and returns the updated campaign including the same relations as `getCampaign`.
- Add an endpoint to fetch campaign goals if it does not already exist (required for the goal dropdown): `GET /api/campaign-goals` returning `CampaignGoal[]`. If the project does not yet have a `CampaignGoalController`, create a minimal one and register it in `AppModule` (or reuse an existing location if one exists). This endpoint must also be protected by `AuthGuard`.
- Update `GET /api/campaigns/:id` return type to `CampaignDetails` (new shape — see below). `CampaignService.getCampaign` already includes the richer relations; only the TypeScript return type needs updating.

**Shared types (`packages/shared/datatypes`):**

- Add `CampaignDetails` type representing the richer shape returned by `GET /campaigns/:id`, which includes fully-populated `Post[]` with `postMedia` (each containing nested `media`). The existing `Campaign` type keeps `posts: PostLimitedData[]` (used by `GET /campaigns/full`) — it is **not** modified.
- Add `UpdateCampaignRequest` type matching the PATCH DTO (all fields optional).
- After changes, run `npx nx build datatypes` or `npx nx sync` per project conventions.

### Out of scope

- Editing post content (explicitly excluded by the task).
- Clicking on a post — no interaction for now.
- Creating new posts from this page.
- Managing media attached to posts.
- Any changes to the `/campaigns` list page other than what is already wired up (the `routerLink` already exists).
- Pagination or filtering of the posts list.
- Bulk delete or bulk edit.
- Optimistic UI updates — the spec uses "reload after mutation" per the project's state-management conventions.

## Behavior

**Navigation in:**

1. User is on `/campaigns` and clicks a campaign card. Angular router navigates to `/campaigns/:id` (the card already has `routerLink`).
2. The new `CampaignDetails` route is matched. The `authGuard` ensures the user is authenticated.
3. The `CampaignDetails` component reads the `id` route param (as a signal), passes it to `CampaignDetailsApi`, and the `httpResource` issues a request to `GET /api/campaigns/:id`.
4. While the request is pending, the component shows a loading indicator (or leverages the existing global spinner via the default HTTP context — no `SkipLoadingToken` used).
5. On success, the component displays the campaign in **read mode**: name as the page header, a details panel (status tag, goal label, audience, start/end dates, timezone, notes), and a posts list below.
6. On HTTP 404 from the resource, the component navigates to `/campaigns` and shows an error toast with the message "Campaign with given id was not found".

**Edit flow:**

1. User clicks the **Edit** button in the details panel.
2. The component switches to **edit mode**: the details panel is replaced by a signal-based reactive form pre-populated with current campaign values. Form controls:
   - `name` (text input, required, max 255)
   - `goalId` (PrimeNG dropdown, populated from `GET /api/campaign-goals`, required)
   - `audience` (text input, optional)
   - `startDate` (date input/PrimeNG calendar, optional)
   - `endDate` (date input/PrimeNG calendar, optional)
   - `status` (dropdown of `CampaignStatus` values, required)
   - `notes` (textarea, optional)
3. User modifies fields. Save is disabled while the form is invalid or pristine.
4. User clicks **Save**:
   - The component sends `PATCH /api/campaigns/:id` via `HttpClient` with only the form value (dirty fields only is **not** required — sending all editable fields is acceptable).
   - On success: shows a success toast ("Campaign updated"), calls `reloadCampaignDetails()` on the API service to refresh the `httpResource`, and switches back to read mode. The user stays on `/campaigns/:id`.
   - On error: shows an error toast with a generic message and stays in edit mode with form values intact.
5. User clicks **Cancel**: the form is reset / discarded, and the component switches back to read mode without calling the API.

**Delete flow:**

1. User clicks the **Delete** button.
2. A PrimeNG `ConfirmDialog` appears asking for confirmation ("Are you sure you want to delete this campaign? This action cannot be undone.").
3. On confirm: the component calls `DELETE /api/campaigns/:id` via `HttpClient`.
   - On success: shows a success toast ("Campaign deleted"), navigates to `/campaigns`, and triggers `CampaignsApi.reloadCampaigns()` so the list reflects the removal.
   - On error: shows an error toast and stays on the page.
4. On cancel (of the confirm dialog): nothing happens.

**Posts display:**

1. Below the details panel, the component renders a heading "Posts" and a list of posts from the fetched campaign.
2. Each list item shows: platform (as a tag or label), postType, status, and a text snippet (e.g. the first 120 characters of `content` with ellipsis if truncated).
3. If the campaign has zero posts, show a neutral empty state message ("No posts in this campaign").
4. Clicking a post does nothing.

## Edge Cases

- **Invalid UUID in URL** (e.g. `/campaigns/not-a-uuid`) — `ParseUUIDPipe` on the API returns 400; frontend treats this as a not-found scenario and redirects to `/campaigns` with the same error toast.
- **Campaign not found / not owned by user** — API returns 404; frontend redirects to `/campaigns` with toast "Campaign with given id was not found".
- **Unauthenticated access** — `authGuard` already redirects to login before the component loads.
- **Network error on load** — show an inline error message on the details page (following existing pattern in `campaigns.html` which uses `p-message`).
- **Save fails due to validation error (400)** — show an error toast with the backend message if available, stay in edit mode.
- **Save fails due to stale data / campaign deleted elsewhere (404)** — show error toast, redirect to `/campaigns`.
- **Delete fails** — show error toast, stay on the details page in read mode.
- **Goals dropdown fails to load** — disable Save and show an inline error in the form that goals could not be loaded.
- **Empty posts array** — show empty-state message.
- **Long post content** — truncate snippet to a fixed character count with ellipsis.
- **startDate > endDate** — form-level validation error, Save disabled.
- **Leaving the page with unsaved edits** — out of scope; no unsaved-changes guard required for this task.

## Data / API

### New endpoints

**`PATCH /api/campaigns/:id`**

- Auth: `AuthGuard` required.
- Path param: `id` (UUID, validated via `ParseUUIDPipe`).
- Body (DTO `UpdateCampaignDto`, all fields optional, `class-validator`):
  - `goalId?: number` — `@IsInt() @IsOptional()`
  - `name?: string` — `@IsString() @IsNotEmpty() @MaxLength(255) @IsOptional()`
  - `audience?: string | null` — `@IsString() @IsOptional()` (nullable allowed for clearing)
  - `startDate?: string | null` — ISO date string, `@IsDateString() @IsOptional()`
  - `endDate?: string | null` — ISO date string, `@IsDateString() @IsOptional()`
  - `status?: CampaignStatus` — `@IsEnum(CampaignStatus) @IsOptional()`
  - `notes?: string | null` — `@IsString() @IsOptional()`
- Behavior: updates the campaign **scoped by both `id` and `userId`** via Prisma `update`. Returns the updated campaign with the same `include` shape as `getCampaign` (i.e. `CampaignDetails`).
- Errors:
  - 400 — invalid UUID or invalid body
  - 401 — not authenticated
  - 404 — campaign not found for this user
  - 500 — unexpected

**`GET /api/campaign-goals`** (new, if not already present)

- Auth: `AuthGuard` required.
- Returns: `CampaignGoal[]` ordered by `sortOrder`.
- Lives in a new `CampaignGoalController` / `CampaignGoalService` module, or reuses an existing one if present. Register the module in `AppModule`.

### Modified endpoints

**`GET /api/campaigns/:id`**

- No functional change. Update return type from `Campaign | null` to `CampaignDetails | null`. `CampaignService.getCampaign` already includes the richer relations.

### Shared datatypes (`packages/shared/datatypes/src/lib/datatypes.ts`)

Add the following:

```ts
export type Media = {
  id: string;
  userId: string;
  storageKey: string;
  publicUrl: string;
  filename: string;
  mimeType: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'GIF' | 'DOCUMENT';
  sizeBytes: number;
  width: number | null;
  height: number | null;
  durationSecs: number | null;
  altText: string | null;
  createdAt: Date | string;
};

export type PostMedia = {
  postId: string;
  mediaId: string;
  sortOrder: number;
  media: Media;
};

export type PostStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

export type CampaignPost = {
  id: string;
  campaignId: string;
  ctaId: string | null;
  platform: PlatformType;
  postType: PostTypeValue;
  content: string;
  hashtags: string[];
  publishDate: Date | string | null;
  scheduledAt: Date | string | null;
  publishedAt: Date | string | null;
  status: PostStatus;
  errorLog: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  postMedia: PostMedia[];
};

export type CampaignDetails = Omit<Campaign, 'posts'> & {
  posts: CampaignPost[];
};

export type UpdateCampaignRequest = {
  goalId?: number;
  name?: string;
  audience?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: CampaignStatus;
  notes?: string | null;
};
```

- `Campaign` is **not** modified — it keeps `posts: PostLimitedData[]` and is still used by `GET /campaigns/full`.
- Run `npx nx build datatypes` (or `npx nx sync`) after editing.

### Database changes

- **None.** The Prisma schema already supports all required fields.

### Frontend API service (`features/campaign-details/services/campaign-details-api.ts`)

- Injectable singleton (`providedIn: 'root'`).
- Holds a private writable `id` signal (`#id = signal<string | null>(null)`) and exposes a `setId(id: string)` method so the component can feed the current route param.
- Defines a private `#campaignDetails = httpResource<CampaignDetails | null>(...)` whose request factory returns `undefined` when `#id()` is null and otherwise builds the URL `${environment.apiUrl}/campaigns/${id}`.
- Exposes `campaignDetails = this.#campaignDetails.asReadonly()`.
- Exposes `reloadCampaignDetails()` that calls `this.#campaignDetails.reload()`.
- Exposes mutation methods using `HttpClient`:
  - `updateCampaign(id: string, data: UpdateCampaignRequest): Observable<CampaignDetails>`
  - `deleteCampaign(id: string): Observable<string>`
- The service **does not** import `CampaignsApi` directly; the component calls `CampaignsApi.reloadCampaigns()` separately after a successful delete.

### Route registration

In `apps/web-ng-app/src/app/app.routes.ts`, add (before the `'**'` wildcard):

```ts
{
  path: 'campaigns/:id',
  loadComponent: () =>
    import('./features/campaign-details/campaign-details').then(
      (m) => m.CampaignDetails,
    ),
  canActivate: [authGuard],
},
```

No route resolver — data loading happens via `httpResource` inside the feature's API service, per the project's state-management convention.

## Tests

**Frontend (Vitest):**

- `CampaignDetailsApi`
  - Resource URL is constructed correctly from the id signal.
  - `reloadCampaignDetails()` triggers a reload.
  - `updateCampaign` issues PATCH with correct URL and body.
  - `deleteCampaign` issues DELETE with correct URL.
- `CampaignDetails` component
  - Renders loading state, read mode with campaign fields, and posts list.
  - Toggles into edit mode when Edit button clicked; form is pre-populated.
  - Save calls API service, shows toast, reloads, and returns to read mode.
  - Cancel discards changes and returns to read mode without calling API.
  - Delete opens confirm dialog; on confirm, calls delete API and navigates to `/campaigns`.
  - On 404, navigates to `/campaigns` and shows error toast.
  - Posts list renders platform, postType, status, and truncated content snippet.
  - Empty posts state renders when campaign has no posts.

**Backend (Jest):**

- `CampaignService.updateCampaign`
  - Calls Prisma `update` with `where: { id, userId }` and the provided data.
  - Returns the updated campaign with correct `include` relations.
  - Throws / returns null when the campaign is not found.
- `CampaignController` PATCH handler
  - Delegates to service with the correct id, userId, and DTO.
  - Throws `NotFoundException` when service returns null / Prisma throws not-found.
  - Wraps unknown errors in `InternalServerErrorException`.
- If `GET /api/campaign-goals` is newly added, add unit tests for its controller and service.

## Assumptions

- The existing `GET /api/campaigns/:id` already returns the richer shape needed for the details page (confirmed via `CampaignService.getCampaign` include tree); only the TypeScript return type needs tightening to `CampaignDetails`.
- `MessageService` and `ConfirmationService` from PrimeNG are available as peer dependencies; they are not yet registered globally and will be registered at component or app level as part of this task.
- A `GET /api/campaign-goals` endpoint does not yet exist and will be added. (If it does already exist, skip creation and only wire up the frontend side.)
- The `CampaignDetails` component uses Angular's reactive forms package (`FormGroup` / `FormControl`) — "signal form" in this project refers to a reactive form driven by the component's signal state; Angular's experimental `@angular/forms/signal` forms API is **not** required.
- Date inputs use PrimeNG's `DatePicker` / `Calendar` and serialize to ISO date strings before sending to the API.
- No unsaved-changes guard is required when leaving the page with dirty form state.
- Tailwind utility classes are used for layout; no component-specific Tailwind config changes.

## Acceptance (DEV)

- `npx nx build web-ng-app` passes.
- `npx nx build @sm-campaigns-app/api` passes.
- `npx nx build datatypes` passes.
- `npx nx lint web-ng-app` and `npx nx lint @sm-campaigns-app/api` pass.
- `npx nx test web-ng-app` passes with new unit tests added.
- `npx nx test @sm-campaigns-app/api` passes with new unit tests added.
- No breaking changes to existing `/campaigns` list page or to `GET /api/campaigns`, `GET /api/campaigns/full`, `POST /api/campaigns`, `DELETE /api/campaigns/:id` endpoints.
- Manual smoke test:
  - Navigating to `/campaigns/:id` for an existing campaign displays details and posts.
  - Edit → modify fields → Save shows a toast, updates values, and stays on the page.
  - Edit → Cancel discards changes.
  - Delete → confirm → redirects to `/campaigns` with a success toast; campaign no longer appears in the list.
  - Navigating to `/campaigns/<non-existent-uuid>` redirects to `/campaigns` with an error toast.
