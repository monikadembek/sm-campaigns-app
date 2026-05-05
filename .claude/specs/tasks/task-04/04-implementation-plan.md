# Implementation Plan — Task 04: Add New Post

## Pre-implementation notes

### Critical-issue resolutions (from spec review)

1. **Route ordering** — `campaigns/:id` already sits _after_ `campaigns/add` in `app.routes.ts`, confirming that pattern works. The new route `campaigns/:id/posts/add` must be registered **before** `campaigns/:id` for the same reason. Angular matches routes top-to-bottom; placing it earlier prevents the `:id` segment from consuming `posts`.

2. **AI request `id` field** — use `crypto.randomUUID()` to generate a valid UUID for the fabricated `PostIdea.id` sent to the AI endpoint.

---

## Step 1 — Add `CreatePostRequest` to shared datatypes

**File:** `packages/shared/datatypes/src/lib/datatypes.ts`

Append the following type export at the end of the file:

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

No other changes to the datatypes file.

---

## Step 2 — Register the new route in `app.routes.ts`

**File:** `apps/web-ng-app/src/app/app.routes.ts`

Insert a new route entry **before** the `campaigns/:id` route:

```ts
{
  path: 'campaigns/:id/posts/add',
  loadComponent: () =>
    import('./features/post-create/post-create').then((c) => c.PostCreate),
  canActivate: [authGuard],
},
```

No guards for `canDeactivate` (intentional omission per spec review finding #4).

---

## Step 3 — Create `PostCreateApi` service

**File:** `apps/web-ng-app/src/app/features/post-create/services/post-create-api.ts`

- `@Injectable({ providedIn: 'root' })`
- Inject `HttpClient`
- Method `createPost(payload: CreatePostRequest): Observable<Post>` — POSTs to `${environment.apiUrl}/posts`, pipes `catchError` that re-throws `HttpErrorResponse`
- Method `generatePostContent(topic: string, platform: PlatformType, tone: ToneStyle): Observable<GeneratedPostContent>` — builds a single `PostIdea` with `id: crypto.randomUUID()`, `title: topic`, `summary: topic`, `platform`, `suggestedPostType: 'TEXT'`; POSTs to `${environment.apiUrl}/ai-content/generate-content` with `{ ideas: [idea], tone, topic }`; maps response to `res.data.posts[0]`; pipes `catchError`

Imports from `@sm-campaigns-app/datatypes`: `CreatePostRequest`, `Post`, `PlatformType`, `ToneStyle`, `PostIdea`, `GeneratedPostContent`.

---

## Step 4 — Create `PostCreateApi` unit tests

**File:** `apps/web-ng-app/src/app/features/post-create/services/post-create-api.spec.ts`

Follow the same pattern as `campaign-create-api.spec.ts`:

- Use `provideHttpClient(withInterceptorsFromDi())` + `provideHttpClientTesting()`
- `describe('createPost')`: success case (POST to `/posts`, returns `Post`), 400 error propagation, 500 error propagation
- `describe('generatePostContent')`: success case (POST to `/ai-content/generate-content`, returns first `GeneratedPostContent`), error propagation, verify request body includes a valid-UUID `id` field in `ideas[0]`

---

## Step 5 — Create `PostAiGenerator` component

**File:** `apps/web-ng-app/src/app/features/post-create/components/post-ai-generator/post-ai-generator.ts`

- `ChangeDetectionStrategy.OnPush`, selector `app-post-ai-generator`
- Inputs (via `input()`): none — the component is self-contained
- Outputs (via `output()`): `contentGenerated` emitting `{ content: string; hashtags: string[]; platform: PlatformType }`
- Inject `PostCreateApi`
- Local signals:
  - `#topic = signal('')`
  - `#platform = signal<PlatformType>('INSTAGRAM')`
  - `#tone = signal<ToneStyle>('PROFESSIONAL')`
  - `#loading = signal(false)`
  - `#errorMessage = signal<string | null>(null)`
  - expose readonly projections: `topic`, `platform`, `tone`, `loading`, `errorMessage`
- Reactive form (`FormBuilder.nonNullable.group`):
  - `topic: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]]`
  - `platform: ['INSTAGRAM', Validators.required]`
  - `tone: ['PROFESSIONAL', Validators.required]`
- `generate()` method: guard `form.invalid`, set `#loading(true)`, `#errorMessage(null)`, call `postCreateApi.generatePostContent(topic, platform, tone)`, on success emit `contentGenerated` and reset `#loading`, on error set `#errorMessage` from `handleHttpErrorResponseMessage`, reset `#loading`
- Static option arrays: `platforms: PlatformType[]`, `tones: ToneStyle[]`

**File:** `apps/web-ng-app/src/app/features/post-create/components/post-ai-generator/post-ai-generator.html`

- Collapsible card/panel using `<p-panel [toggleable]="true">` with header "Generate with AI"
- Reactive form bound to the form group
- `topic` input: `<textarea pTextarea>` with validation error display
- `platform` select: `<p-select>` binding to `platforms` array
- `tone` select: `<p-select>` binding to `tones` array
- "Generate" `<p-button>` — `[disabled]="loading()"`, `[loading]="loading()"`, `(onClick)="generate()"`
- Inline error message: `@if (errorMessage()) { <p-message severity="error"> }`

**File:** `apps/web-ng-app/src/app/features/post-create/components/post-ai-generator/post-ai-generator.css`

- Minimal scoped styles only; no utility that conflicts with Tailwind.

---

## Step 6 — Create `PostCreateForm` component

**File:** `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.ts`

- `ChangeDetectionStrategy.OnPush`, selector `app-post-create-form`
- Output: `formSubmit` emitting `CreatePostRequest`
- Inject `FormBuilder`
- Reactive form (`FormBuilder.nonNullable.group`):
  - `platform: ['' as PlatformType, Validators.required]`
  - `postType: ['TEXT' as PostTypeValue, Validators.required]`
  - `content: ['', [Validators.required, Validators.maxLength(5000)]]`
  - `hashtags: ['']` — free text; parsed on submit
  - `publishDate: this.#fb.control<Date | null>(null)`
  - `scheduledAt: this.#fb.control<Date | null>(null)`
  - `status: ['DRAFT' as PostStatus, Validators.required]`
- Public method `patchAiContent(data: { content: string; hashtags: string[]; platform: PlatformType })`: calls `postForm.patchValue({ content: data.content, hashtags: data.hashtags.join(', '), platform: data.platform })`
- `submit()` method: guard `postForm.invalid`; build payload:
  - Parse `hashtags` field: `value.split(',').map(s => s.trim()).filter(Boolean)`
  - Serialize `publishDate` and `scheduledAt` as ISO strings or `null`
  - `campaignId` is passed via `input.required<string>()`
  - Emit `formSubmit` with `CreatePostRequest`
- `reset()` method: resets form to initial defaults (does not reset `campaignId` input, which is a component input — not part of the form)
- Static arrays: `platforms`, `postTypes`, `statuses`

**File:** `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.html`

- Reactive form bound to `postForm`
- `platform` select: `<p-select>` with `platforms` options; validation error shown if `touched && invalid`
- `postType` select: `<p-select>` with `postTypes` options
- `content` textarea: `<textarea pTextarea>` with char count and max-5000 validation error
- `hashtags` input: `<input pInputText>` with placeholder "e.g. marketing, growth"
- `publishDate` and `scheduledAt`: `<p-datepicker [showTime]="true" [showSeconds]="false">`
- `status` select: `<p-select>` with `statuses` options
- Submit `<p-button label="Save post">` — `[disabled]="postForm.invalid"`
- All field labels must be associated via `for`/`id` (WCAG AA)

**File:** `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.css`

- Minimal scoped layout styles.

---

## Step 7 — Create `PostCreateForm` unit tests

**File:** `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.spec.ts`

- Use `TestBed.configureTestingModule` with `imports: [PostCreateForm]`; provide `FormBuilder`
- Test: form invalid when `platform`, `postType`, or `content` is empty
- Test: form valid when all required fields filled
- Test: `content` max-5000 validator rejects strings exceeding 5000 chars
- Test: `submit()` emits nothing when form invalid
- Test: `submit()` emits `CreatePostRequest` with parsed hashtags array when form valid
- Test: `patchAiContent()` updates `content`, `hashtags` text, and `platform` fields
- Test: `reset()` returns form to defaults

---

## Step 8 — Create `PostCreate` page component

**File:** `apps/web-ng-app/src/app/features/post-create/post-create.ts`

- `ChangeDetectionStrategy.OnPush`, selector `app-post-create`
- Inject: `ActivatedRoute`, `CampaignStore`, `CampaignApi`, `PostCreateApi`, `MessageService`
- `campaignId` signal: derived from `ActivatedRoute.params` via `takeUntilDestroyed()` → `campaignStore.setCampaignId(params['id'])`, expose `campaignStore.campaignId`
- `campaignDetails = campaignApiService.campaignResource`
- `#submitting = signal(false)`; expose readonly
- `viewChild` reference to `PostCreateForm` component for calling `reset()` and `patchAiContent()`
- `onAiContentGenerated(data)` method: calls `postCreateFormRef().patchAiContent(data)`
- `onFormSubmit(payload: CreatePostRequest)` method:
  - Set `#submitting(true)`
  - Call `postCreateApi.createPost({ ...payload, campaignId: campaignId() })`
  - On success: `messageService.add({ severity: 'success', summary: 'Success', detail: 'Post created successfully' })`, call `postCreateFormRef().reset()`, set `#submitting(false)`
  - On error: `messageService.add({ severity: 'error', ... detail: handleHttpErrorResponseMessage(err) })`, set `#submitting(false)`
- `constructor`: subscribe to `ActivatedRoute.params` with `takeUntilDestroyed()` to set campaign id in store; wire error `effect` to detect 404/400 from `campaignDetails.error()` and show error message (page stays; no redirect — user can use "Back" link)
- Imports: `PostCreateForm`, `PostAiGenerator`, `RouterLink`, `ButtonModule`, `MessageModule`

**File:** `apps/web-ng-app/src/app/features/post-create/post-create.html`

Layout:
```
[breadcrumb nav]   Campaigns / {campaign name} / Add post
[back link]        ← Back to campaign   (routerLink="['/campaigns', campaignId()]")

@if (campaignDetails.error()) {
  <p-message severity="error">Campaign not found.</p-message>
  <a routerLink="/campaigns">Back to campaigns list</a>
} @else if (campaignDetails.hasValue()) {
  <h1>Add post to "{{ campaignDetails.value().name }}"</h1>
  <app-post-ai-generator (contentGenerated)="onAiContentGenerated($event)" />
  <app-post-create-form
    [campaignId]="campaignId()"
    [disabled]="submitting()"
    (formSubmit)="onFormSubmit($event)"
  />
}
```

**File:** `apps/web-ng-app/src/app/features/post-create/post-create.css`

- Page-level layout styles (max-width container, spacing between sections).

---

## Step 9 — Update `campaign.html` (unhide "Add post" button)

**File:** `apps/web-ng-app/src/app/features/campaign/campaign.html`

Replace the commented-out `<p-button label="Add post" ...>` block with:

```html
<p-button
  label="Add post"
  size="small"
  variant="outlined"
  severity="success"
  [routerLink]="['/campaigns', campaignId(), 'posts', 'add']"
/>
```

The `routerLink` binding replaces the `(onClick)="addPost()"` event binding. No other template changes.

---

## Step 10 — Update `campaign.ts` (remove `addPost()` stub)

**File:** `apps/web-ng-app/src/app/features/campaign/campaign.ts`

Remove the `addPost()` method (lines 163-166). The `editPost()` and `schedulePost()` stubs remain — they are explicitly out of scope and still used as console stubs for future development.

---

## Step 11 — Verify builds

Run in order:

```bash
npx nx build datatypes
npx nx build web-ng-app
```

Fix any TypeScript errors before marking complete.

---

## Step 12 — Run unit tests

```bash
npx nx test web-ng-app
```

All new tests in `post-create-api.spec.ts` and `post-create-form.spec.ts` must pass. No regressions in existing tests.

---

## Summary of planned files

### New files (created)

| Path | Description |
|------|-------------|
| `apps/web-ng-app/src/app/features/post-create/post-create.ts` | Page component (route entry) |
| `apps/web-ng-app/src/app/features/post-create/post-create.html` | Page template |
| `apps/web-ng-app/src/app/features/post-create/post-create.css` | Page styles |
| `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.ts` | Reactive form component |
| `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.html` | Form template |
| `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.css` | Form styles |
| `apps/web-ng-app/src/app/features/post-create/components/post-create-form/post-create-form.spec.ts` | Form component unit tests |
| `apps/web-ng-app/src/app/features/post-create/components/post-ai-generator/post-ai-generator.ts` | AI section component |
| `apps/web-ng-app/src/app/features/post-create/components/post-ai-generator/post-ai-generator.html` | AI section template |
| `apps/web-ng-app/src/app/features/post-create/components/post-ai-generator/post-ai-generator.css` | AI section styles |
| `apps/web-ng-app/src/app/features/post-create/services/post-create-api.ts` | HTTP service |
| `apps/web-ng-app/src/app/features/post-create/services/post-create-api.spec.ts` | HTTP service unit tests |

### Modified files

| Path | Change |
|------|--------|
| `packages/shared/datatypes/src/lib/datatypes.ts` | Add `CreatePostRequest` type |
| `apps/web-ng-app/src/app/app.routes.ts` | Add `campaigns/:id/posts/add` route before `campaigns/:id` |
| `apps/web-ng-app/src/app/features/campaign/campaign.html` | Uncomment "Add post" button; use `routerLink` binding |
| `apps/web-ng-app/src/app/features/campaign/campaign.ts` | Remove `addPost()` stub method |
