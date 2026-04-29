# Task Specification

## Source

Azure DevOps Task: 03

## Goal

Add a `post` module to the NestJS API with full CRUD endpoints for posts scoped to campaigns.

## Context

The API already has a `campaign` module following the module/controller/service/dto pattern with Prisma and `AuthGuard`. The `Post` model exists in the Prisma schema and the `Post`, `PostStatus`, `PlatformType`, `PostTypeValue` types are already exported from `@sm-campaigns-app/datatypes`. This task adds a parallel `post` module following the same conventions.

## Scope

### In scope

- `POST /posts` — create a post in a given campaign
- `GET /posts/:id` — get a single post by id
- `PATCH /posts/:id` — update a post by id
- `DELETE /posts/:id` — delete a post by id
- Unit tests for controller and service (Jest)
- Register `PostModule` in `AppModule`

### Out of scope

- Listing posts (no `GET /posts` collection endpoint)
- Managing `PostMedia` attachments
- `PostAnalytics` endpoints
- Frontend changes

## Behavior

### Create post — `POST /posts`

1. Authenticated user sends campaign id and post data in request body.
2. Service verifies the campaign belongs to the authenticated user (`campaign.userId === currentUser.id`) by looking up the campaign via Prisma before creating the post; if not found/unauthorized throw `NotFoundException`.
3. Post is created with `status: DRAFT` by default (Prisma schema default).
4. Returns the created `Post` record (including `postMedia`).

### Get post — `GET /posts/:id`

1. Service fetches post by id, including `postMedia { media }`.
2. Authorization: verify the post's campaign belongs to the current user (join through `campaign.userId`). If the post does not exist or belongs to another user's campaign, throw `NotFoundException`.
3. Returns the `Post` record.

### Update post — `PATCH /posts/:id`

1. All fields are optional. Only provided fields are updated (partial update pattern, same as `UpdateCampaignDto`).
2. Authorization: verify the post's campaign belongs to the current user before updating. Use Prisma `update` with a `where` clause that joins through `campaign.userId` (compound where: `{ id, campaign: { userId } }`). On `P2025` Prisma error, throw `NotFoundException`.
3. Returns the updated `Post` record (including `postMedia`).

### Delete post — `DELETE /posts/:id`

1. Authorization: same compound where clause as update.
2. On `P2025` Prisma error, throw `NotFoundException`.
3. Returns `{ message: 'Post with id: <id> was successfully deleted' }`.

### Error handling

- All controller methods follow the existing pattern:
  - Re-throw `HttpException` instances as-is.
  - Map `PrismaClientKnownRequestError` with code `P2025` → `NotFoundException`.
  - Wrap all other errors in `InternalServerErrorException`.
  - Log errors via `Logger`.

## Edge Cases

- Post id not found → `NotFoundException`.
- Post belongs to a campaign owned by a different user → `NotFoundException` (same response as not found — do not leak ownership info).
- Campaign id in create body does not exist or belongs to another user → `NotFoundException`.
- Invalid UUID format in `:id` param → `ParseUUIDPipe` returns `400 BadRequest` automatically.

## Data / API

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/posts` | Bearer | Create post in campaign |
| GET | `/api/posts/:id` | Bearer | Get post by id |
| PATCH | `/api/posts/:id` | Bearer | Update post fields |
| DELETE | `/api/posts/:id` | Bearer | Delete post |

### CreatePostDto

```ts
class CreatePostDto {
  @IsUUID()
  campaignId: string;           // required

  @IsIn(PLATFORM_TYPES)
  platform: PlatformType;       // required

  @IsIn(POST_TYPE_VALUES)
  postType: PostTypeValue;      // required

  @IsString() @IsNotEmpty() @MaxLength(5000)
  content: string;              // required

  @IsArray() @IsString({ each: true }) @IsOptional()
  hashtags?: string[];          // default []

  @IsOptional() @ValidateIf(v => v !== null) @IsDateString()
  publishDate?: string | null;

  @IsOptional() @ValidateIf(v => v !== null) @IsDateString()
  scheduledAt?: string | null;

  @IsOptional() @IsIn(POST_STATUS_VALUES)
  status?: PostStatus;

  @IsOptional() @ValidateIf(v => v !== null) @IsUUID()
  ctaId?: string | null;
}
```

### UpdatePostDto

All fields from `CreatePostDto` marked `@IsOptional()`, except `campaignId` is excluded (posts cannot be reassigned to a different campaign).

### Return type

All endpoints return `Post` (from `@sm-campaigns-app/datatypes`), which includes `postMedia: PostMedia[]`. The Prisma include for this is:

```ts
{ postMedia: { include: { media: true } } }
```

### Constants file

Create `apps/api/src/app/post/post.constants.ts` exporting:
- `POST_PLATFORM_TYPES` — array of all `PlatformType` values
- `POST_TYPE_VALUES` — array of all `PostTypeValue` values
- `POST_STATUS_VALUES` — array of all `PostStatus` values

### No DB schema changes

The `Post` model already exists in `schema.prisma`. No migrations needed.

## Acceptance (DEV)

- `npx nx build @sm-campaigns-app/api` passes
- `npx nx test @sm-campaigns-app/api` passes
- Unit tests added for `PostController` (controller spec) and `PostService` (service spec) following the same structure as `campaign.controller.spec.ts` / `campaign.service.spec.ts`
- `PostModule` registered in `AppModule`
- No breaking changes to existing endpoints
