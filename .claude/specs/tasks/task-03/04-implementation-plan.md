# Implementation Plan — Task 03: Post Module (NestJS API)

## Pre-implementation notes

The review flagged two critical issues that are resolved here:

1. **Constant name clash** — `CreatePostDto` will use `POST_PLATFORM_TYPES`, `POST_TYPE_VALUES`, and `POST_STATUS_VALUES` (matching the constants file). The spec's `PLATFORM_TYPES` reference was a typo.
2. **`GET` authorization pattern** — `getPost` in the service will use a compound Prisma `where: { id, campaign: { userId } }` (same pattern as update/delete), not a two-step lookup.

Additional decisions made for non-critical issues:
- `hashtags` default is applied in the service (`dto.hashtags ?? []`) on create.
- `publishedAt` is excluded from both DTOs intentionally — it is set by a future publish workflow.
- `DELETE` returns `200 OK` with `{ message: string }` — same as campaign delete.
- `UpdatePostDto` keeps `@IsNotEmpty()` on `content` when provided (same as `name` in `UpdateCampaignDto`).
- `PostModule` imports `DatabaseModule` and `AuthModule`.

---

## Files to create

| File | Purpose |
|------|---------|
| `apps/api/src/app/post/post.constants.ts` | Enum value arrays for validators |
| `apps/api/src/app/post/dto/create-post.dto.ts` | Validated DTO for POST body |
| `apps/api/src/app/post/dto/update-post.dto.ts` | Validated DTO for PATCH body |
| `apps/api/src/app/post/post.service.ts` | Prisma data access |
| `apps/api/src/app/post/post.service.spec.ts` | Jest unit tests for service |
| `apps/api/src/app/post/post.controller.ts` | HTTP layer |
| `apps/api/src/app/post/post.controller.spec.ts` | Jest unit tests for controller |
| `apps/api/src/app/post/post.module.ts` | NestJS module wiring |

## Files to modify

| File | Change |
|------|--------|
| `apps/api/src/app/app.module.ts` | Import and register `PostModule` |

---

## Step-by-step plan

### Step 1 — `post.constants.ts`

Create `apps/api/src/app/post/post.constants.ts`.

Export three typed const arrays:

- `POST_PLATFORM_TYPES: PlatformType[]` — all seven platform values (`INSTAGRAM`, `TWITTER`, `FACEBOOK`, `LINKEDIN`, `TIKTOK`, `YOUTUBE`, `PINTEREST`)
- `POST_TYPE_VALUES: PostTypeValue[]` — all eight post type values (`IMAGE`, `VIDEO`, `CAROUSEL`, `REEL`, `STORY`, `TEXT`, `LINK`, `POLL`)
- `POST_STATUS_VALUES: PostStatus[]` — all four status values (`DRAFT`, `SCHEDULED`, `PUBLISHED`, `FAILED`)

Import `PlatformType`, `PostTypeValue`, `PostStatus` from `@sm-campaigns-app/datatypes`.

---

### Step 2 — `dto/create-post.dto.ts`

Create `apps/api/src/app/post/dto/create-post.dto.ts`.

Fields and validators:

| Field | Type | Validators |
|-------|------|-----------|
| `campaignId` | `string` | `@IsUUID()` |
| `platform` | `PlatformType` | `@IsIn(POST_PLATFORM_TYPES)` |
| `postType` | `PostTypeValue` | `@IsIn(POST_TYPE_VALUES)` |
| `content` | `string` | `@IsString()`, `@IsNotEmpty()`, `@MaxLength(5000)` |
| `hashtags` | `string[] \| undefined` | `@IsOptional()`, `@IsArray()`, `@IsString({ each: true })` |
| `publishDate` | `string \| null \| undefined` | `@IsOptional()`, `@ValidateIf((_, v) => v !== null)`, `@IsDateString()` |
| `scheduledAt` | `string \| null \| undefined` | `@IsOptional()`, `@ValidateIf((_, v) => v !== null)`, `@IsDateString()` |
| `status` | `PostStatus \| undefined` | `@IsOptional()`, `@IsIn(POST_STATUS_VALUES)` |
| `ctaId` | `string \| null \| undefined` | `@IsOptional()`, `@ValidateIf((_, v) => v !== null)`, `@IsUUID()` |

Import `PlatformType`, `PostTypeValue`, `PostStatus` from `@sm-campaigns-app/datatypes`. Import constants from `./post.constants` (relative path). Use `class-validator` decorators.

`publishedAt` is NOT included — it is managed by a future publish workflow.

---

### Step 3 — `dto/update-post.dto.ts`

Create `apps/api/src/app/post/dto/update-post.dto.ts`.

Same fields as `CreatePostDto` with these differences:

- `campaignId` is **excluded** (posts cannot be reassigned).
- Every field is `@IsOptional()`.
- `content` keeps `@IsNotEmpty()` so that if provided it cannot be an empty string.
- `publishDate` and `scheduledAt` type widens to `Date | string | null | undefined` to match `PostUncheckedUpdateInput`.

---

### Step 4 — `post.service.ts`

Create `apps/api/src/app/post/post.service.ts`.

Inject `PrismaService` via constructor injection.

#### Private helper

```ts
private postInclude = { postMedia: { include: { media: true } } }
```

This is the consistent Prisma include for all returning methods.

#### `createPost(userId: string, dto: CreatePostDto): Promise<Post>`

1. Call `prisma.campaign.findUnique({ where: { id: dto.campaignId, userId } })`.
2. If result is `null`, throw `NotFoundException('Campaign not found')`.
3. Build `PostUncheckedCreateInput`:
   - Map all DTO fields directly.
   - `hashtags`: `dto.hashtags ?? []`
   - `publishDate`: if present and non-null → `new Date(dto.publishDate)`, else pass through (`null` or omit).
   - `scheduledAt`: same conversion pattern as `publishDate`.
   - `ctaId`: pass through as-is (nullable UUID).
4. Call `prisma.post.create({ data, include: this.postInclude })`.
5. Return the result typed as `Post`.

Import `PostUncheckedCreateInput` from `../../generated/prisma/models/Post.js`.

#### `getPost(id: string, userId: string): Promise<Post | null>`

1. Call `prisma.post.findUnique({ where: { id, campaign: { userId } }, include: this.postInclude })`.
2. Return the result (may be `null`).

Note: Prisma's nested `where` on a relation field requires the relation to be filtered — this uses `{ campaign: { userId } }` which acts as a join condition. If the post exists but belongs to another user's campaign, Prisma returns `null`.

#### `updatePost(id: string, userId: string, dto: UpdatePostDto): Promise<Post>`

1. Build `PostUncheckedUpdateInput` — only include fields that are present in `dto` (use `'field' in dto` checks, same pattern as `updateCampaign`).
2. Convert `publishDate` and `scheduledAt` strings to `Date` objects when non-null; pass `null` through.
3. Call `prisma.post.update({ where: { id, campaign: { userId } }, data, include: this.postInclude })`.
4. Return result typed as `Post`.

#### `deletePost(id: string, userId: string): Promise<void>`

1. Call `prisma.post.delete({ where: { id, campaign: { userId } } })`.
2. Return void (discard result).

---

### Step 5 — `post.controller.ts`

Create `apps/api/src/app/post/post.controller.ts`.

Decorate class with `@UseGuards(AuthGuard)` and `@Controller('posts')`.

Add `private readonly logger = new Logger(PostController.name)`.

Inject `PostService` via constructor.

#### `POST /` — `createPost`

- `@Post()`
- Params: `@CurrentUser('id') userId: string`, `@Body() dto: CreatePostDto`
- Return type: `Promise<Post>`
- Error handling: re-throw `HttpException`; wrap others in `InternalServerErrorException('Failed creating post')`.

#### `GET /:id` — `getSinglePost`

- `@Get(':id')`
- Params: `@Param('id', ParseUUIDPipe) id: string`, `@CurrentUser('id') userId: string`
- Return type: `Promise<Post>`
- Call `postService.getPost(id, userId)`. If result is `null`, throw `NotFoundException('Post with id: ${id} not found')`.
- Error handling: re-throw `HttpException`; wrap others in `InternalServerErrorException`.

#### `PATCH /:id` — `editPost`

- `@Patch(':id')`
- Params: `@CurrentUser('id') userId: string`, `@Param('id', ParseUUIDPipe) id: string`, `@Body() dto: UpdatePostDto`
- Return type: `Promise<Post>`
- Error handling: map `PrismaClientKnownRequestError` with `error.code === 'P2025'` → `NotFoundException('Post with id: ${id} not found')`; re-throw `HttpException`; wrap others in `InternalServerErrorException`.

#### `DELETE /:id` — `deletePost`

- `@Delete(':id')`
- Params: `@CurrentUser('id') userId: string`, `@Param('id', ParseUUIDPipe) id: string`
- Return type: `Promise<{ message: string }>`
- Returns `{ message: 'Post with id: ${id} was successfully deleted' }` on success.
- Error handling: same P2025 mapping as editPost.

Import `Prisma` from `../../generated/prisma/client` for `PrismaClientKnownRequestError`.

---

### Step 6 — `post.module.ts`

Create `apps/api/src/app/post/post.module.ts`.

```
imports: [DatabaseModule, AuthModule]
controllers: [PostController]
providers: [PostService]
```

---

### Step 7 — Register in `app.module.ts`

In `apps/api/src/app/app.module.ts`:

- Add `import { PostModule } from './post/post.module';`
- Add `PostModule` to the `imports` array (after `CampaignModule`).

---

### Step 8 — `post.service.spec.ts`

Create `apps/api/src/app/post/post.service.spec.ts` following `campaign.service.spec.ts` structure.

Mock `PrismaService` with a `post` object containing jest mock functions: `findUnique`, `create`, `update`, `delete`. Also include `campaign` with `findUnique` for the create ownership check.

Test cases to cover:

**`createPost`**
- Creates post and returns it when campaign exists.
- Throws `NotFoundException` when campaign not found (prisma campaign.findUnique returns null).
- Passes `hashtags: []` when hashtags not provided in dto.
- Converts `publishDate` string to `Date` object.
- Converts `scheduledAt` string to `Date` object.
- Passes `null` for nullable date fields when null provided.

**`getPost`**
- Returns post when found (prisma returns record).
- Returns `null` when post not found (prisma returns null).

**`updatePost`**
- Updates and returns post with only provided fields in data.
- Converts date strings to Date objects.
- Allows setting dates to null.
- Propagates Prisma error when post not found.

**`deletePost`**
- Calls `prisma.post.delete` with compound where clause.
- Propagates error when post not found.

---

### Step 9 — `post.controller.spec.ts`

Create `apps/api/src/app/post/post.controller.spec.ts` following `campaign.controller.spec.ts` structure.

Mock `AuthGuard` at module level. Mock `PostService` with jest mock functions: `createPost`, `getPost`, `updatePost`, `deletePost`.

Test cases to cover:

**`createPost`**
- Returns created post when service succeeds.
- Throws `InternalServerErrorException` when service throws generic error.

**`getSinglePost`**
- Returns post when service returns a record.
- Throws `NotFoundException` when service returns `null`.
- Throws `InternalServerErrorException` when service throws generic error.

**`editPost`**
- Returns updated post on success.
- Throws `NotFoundException` on `PrismaClientKnownRequestError` P2025.
- Throws `InternalServerErrorException` on unexpected error.

**`deletePost`**
- Returns success message on delete.
- Throws `NotFoundException` on P2025.
- Throws `InternalServerErrorException` on unexpected error.

---

### Step 10 — Verify build and tests

```bash
npx nx build @sm-campaigns-app/api
npx nx test @sm-campaigns-app/api
```

Both must pass with no errors or failing tests.

---

## Resolved spec issues summary

| Issue | Resolution |
|-------|-----------|
| Constant name mismatch (`PLATFORM_TYPES` vs `POST_PLATFORM_TYPES`) | Use `POST_PLATFORM_TYPES` everywhere |
| `GET` authorization ambiguity | Use compound `where: { id, campaign: { userId } }` — same as PATCH/DELETE |
| `hashtags` default location | Applied in service: `dto.hashtags ?? []` |
| `publishedAt` exclusion | Excluded from both DTOs; not updatable via this API |
| `DELETE` response code | `200 OK` with `{ message: string }` body |
| `@IsNotEmpty()` on `UpdatePostDto.content` | Kept — if provided, must be non-empty string |
| `PostModule` imports | `DatabaseModule` + `AuthModule` |
