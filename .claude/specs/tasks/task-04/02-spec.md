# Task Specification

## Source

Azure DevOps Task: 04

## Goal

Add an "Add post" feature to the Angular `web-ng-app` so a user can create a new post inside a campaign — either by filling in the form manually or by generating content with AI and accepting it into the form.

## Context

The feature lives inside the existing `campaign` page (`campaigns/:id`). A new route `campaigns/:id/posts/add` hosts a dedicated "Add post" page. The NestJS API already has a fully working `POST /api/posts` endpoint accepting `CreatePostDto`. The shared datatypes library already has the `Post` type. No backend changes are needed.

## Scope

### In scope

- New Angular route `campaigns/:id/posts/add`
- New feature folder `apps/web-ng-app/src/app/features/post-create/`
- Post creation form with all fields (except `ctaId`): `platform`, `postType`, `content`, `hashtags`, `publishDate`, `scheduledAt`, `status`
- `campaignId` is derived from the route param — not shown in the form
- AI-assisted content generation embedded in the form: reuses existing `topic`, `tone`, `platform` inputs from the AI generator; calls `POST /api/ai-content/generate-content` to get content + hashtags; auto-fills `content` and `hashtags` fields
- "Back to campaign" link/button visible on the page at all times
- Success state: after successful save, show a success toast and stay on the form page (form resets to empty); the back link remains accessible
- Unhide the commented-out "Add post" button in `campaign.html` and wire it to navigate to `campaigns/:id/posts/add`

### Out of scope

- Editing existing post content
- `ctaId` field
- Media / file uploads
- Scheduling/publishing integration

## Behavior

### Manual path

1. User is on `campaigns/:id` and clicks "Add post" button.
2. Browser navigates to `campaigns/:id/posts/add`.
3. Page shows: a heading with the campaign name (loaded via `CampaignStore` / `CampaignApi`), a "Back to campaign" link/button, and the post form.
4. User fills in the form fields and submits.
5. On success: toast "Post created successfully", form resets to defaults, user stays on the page.
6. On error: toast with error detail, form stays populated.

### AI-assisted path

1. On the same `campaigns/:id/posts/add` page there is an "Generate with AI" section/panel (collapsible or separate card).
2. User enters `topic` (text), selects `platform` (single), selects `tone` (dropdown: PROFESSIONAL / CASUAL / HUMOROUS / INSPIRATIONAL), then clicks "Generate".
3. A single `POST /api/ai-content/generate-content` call is made with `{ ideas: [{ id, title: topic, summary: topic, platform, suggestedPostType: 'TEXT' }], tone, topic }`. The call returns the first item from `posts[]`.
4. The returned `content` and `hashtags` are written into the form fields, overwriting current values.
5. The `platform` field on the main form is also set to match the generated post's platform.
6. User reviews / edits the populated form fields and submits normally.

## Edge Cases

- If `campaignId` from the route param is not a valid UUID or the campaign is not found, show an error message and display the "Back to campaigns list" link.
- If AI generation fails, show an inline error message inside the AI section; do not touch the form fields.
- `hashtags` field: stored as a string array. In the form, represent as a comma-separated text input; parse on submit (split by comma, trim, filter empty strings).
- `publishDate` and `scheduledAt`: use PrimeNG `DatePicker` with time selection enabled (both date and time).
- `status` defaults to `DRAFT`.
- `postType` defaults to `TEXT`.

## Data / API

### Endpoints used (frontend → existing backend)

| Method | URL | Purpose |
|--------|-----|---------|
| `POST` | `/api/posts` | Create post |
| `POST` | `/api/ai-content/generate-content` | Generate post content via AI |
| `GET`  | `/api/campaigns/:id` | Load campaign name for page heading (already available via `CampaignApi`) |

### Request body — `POST /api/posts`

```ts
{
  campaignId: string;       // from route param
  platform: PlatformType;
  postType: PostTypeValue;
  content: string;          // required, max 5000 chars
  hashtags?: string[];
  publishDate?: string | null;   // ISO date string
  scheduledAt?: string | null;   // ISO date string
  status?: PostStatus;      // defaults to DRAFT
}
```

### New shared type (add to `packages/shared/datatypes`)

No new types needed — `Post`, `PlatformType`, `PostTypeValue`, `PostStatus` already exist.

### New `CreatePostRequest` type (add to datatypes)

```ts
export type CreatePostRequest = {
  campaignId: string;
  platform: PlatformType;
  postType: PostTypeValue;
  content: string;
  hashtags?: string[];
  publishDate?: string | null;
  scheduledAt?: string | null;
  status?: PostStatus;
};
```

## New files

```
apps/web-ng-app/src/app/features/post-create/
  post-create.ts                          # page component (route entry)
  post-create.html
  post-create.css
  components/
    post-create-form/
      post-create-form.ts                 # reactive form component
      post-create-form.html
      post-create-form.css
    post-ai-generator/
      post-ai-generator.ts                # AI section component
      post-ai-generator.html
      post-ai-generator.css
  services/
    post-create-api.ts                    # HTTP service: createPost(), generatePostContent()
    post-create-api.spec.ts
```

## Changes to existing files

| File | Change |
|------|--------|
| `app.routes.ts` | Add `campaigns/:id/posts/add` lazy-loaded route with `authGuard` |
| `campaign.html` | Uncomment "Add post" button; bind `routerLink` to `['/campaigns', campaignId(), 'posts', 'add']` |
| `campaign.ts` | Remove the stub `addPost()` console.log method; the button uses `routerLink` instead |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `CreatePostRequest` type |

## Acceptance (DEV)

- Build passes (`npx nx build web-ng-app`, `npx nx build datatypes`)
- Unit tests added for `post-create-api.ts` and `post-create-form.ts`
- No breaking changes to existing routes, services, or types
- Form validation: `platform`, `postType`, `content` are required; `content` max 5000 chars; `status` required (defaults to DRAFT)
- AI section shows loading state during generation and disables the Generate button
- Success and error toasts use the existing PrimeNG `MessageService`
