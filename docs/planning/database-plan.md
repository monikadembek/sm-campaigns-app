# Database Planning: Supabase PostgreSQL + Prisma

## Context
The app currently has only Supabase OTP (passwordless) auth implemented. This document outlines the database schema design for campaigns, posts, media, CTAs, and related entities using Prisma ORM against Supabase PostgreSQL.

### Confirmed Design Decisions
- **Media**: Separate `Media` table storing Supabase Storage metadata; many-to-many with Post via junction table
- **CTAs**: User-scoped reusable library (one CTA can be attached to many posts)
- **Campaign goals**: Fixed lookup table, seeded at deploy time (not user-defined)
- **Posts**: One row per platform (e.g. a post targeting Instagram + Twitter = 2 Post rows)

---

## Enums

```prisma
enum Platform       { INSTAGRAM TWITTER FACEBOOK LINKEDIN TIKTOK YOUTUBE PINTEREST }
enum CampaignStatus { DRAFT ACTIVE PAUSED COMPLETED ARCHIVED }
enum PostType       { IMAGE VIDEO CAROUSEL REEL STORY TEXT LINK POLL }
enum PostStatus     { DRAFT SCHEDULED PUBLISHED FAILED }
enum MediaType      { IMAGE VIDEO GIF DOCUMENT }
```

---

## Tables

### `CampaignGoal` — fixed lookup, seeded at deploy

| Field | Type | Notes |
|---|---|---|
| id | Int PK autoincrement | |
| label | String unique | e.g. "Brand Awareness" |
| slug | String unique | e.g. "brand_awareness" |
| sortOrder | Int default 0 | UI sort order |

**Seed values:** Brand Awareness, Lead Generation, Engagement, Traffic, Conversions, App Installs

---

### `User`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| supabaseId | String unique | References Supabase `auth.users.id` (not enforced by Prisma — cross-schema) |
| email | String unique | |
| displayName | String? | Optional profile name |
| avatarUrl | String? | Supabase Storage URL |
| createdAt | DateTime | |
| updatedAt | DateTime | |

> No `password` or `name` field — authentication is fully delegated to Supabase OTP.

---

### `Campaign`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| userId | String FK → User | Cascade delete |
| goalId | Int FK → CampaignGoal | |
| name | String | |
| audience | String? | Free-text audience description |
| startDate | Date? | |
| endDate | Date? | |
| timezone | String default "UTC" | IANA timezone string — needed for accurate scheduling |
| status | CampaignStatus default DRAFT | |
| notes | String? | Internal notes |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### `Cta` — call-to-action, user library

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| userId | String FK → User | Cascade delete |
| name | String | User-assigned label, e.g. "Summer Sale CTA" |
| content | String | CTA text, e.g. "Shop now →" |
| url | String? | Optional destination URL |
| createdAt | DateTime | |
| updatedAt | DateTime | |

---

### `Media` — Supabase Storage references

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| userId | String FK → User | Cascade delete (owner) |
| storageKey | String unique | Supabase Storage object path, e.g. `uploads/user-uuid/image.png` |
| publicUrl | String | CDN-accessible URL returned by Supabase Storage |
| filename | String | Original filename for display |
| mimeType | String | e.g. `image/jpeg`, `video/mp4` |
| mediaType | MediaType enum | |
| sizeBytes | Int | |
| width | Int? | Pixels — for images/video |
| height | Int? | Pixels — for images/video |
| durationSecs | Float? | Seconds — for video/GIF |
| altText | String? | Accessibility alt text |
| createdAt | DateTime | |

---

### `Post`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| campaignId | String FK → Campaign | Cascade delete |
| ctaId | String? FK → Cta | SetNull on delete (preserves post history) |
| platform | Platform enum | One post per platform |
| postType | PostType enum | |
| content | String | Post body text |
| hashtags | String[] | PostgreSQL text array |
| publishDate | Date? | User-intended publish date (date only) |
| scheduledAt | DateTime? | Exact UTC datetime for the scheduler |
| publishedAt | DateTime? | Stamped when platform API confirms delivery |
| status | PostStatus default DRAFT | |
| errorLog | String? | Last error message if status = FAILED |
| createdAt | DateTime | |
| updatedAt | DateTime | |

> `publishDate` (date only) is what the user sets in the UI. `scheduledAt` is the precise UTC datetime the scheduler uses. `publishedAt` is stamped on successful delivery.

---

### `PostMedia` — junction table (Post ↔ Media, many-to-many)

| Field | Type | Notes |
|---|---|---|
| postId | String FK → Post | Cascade delete |
| mediaId | String FK → Media | Cascade delete |
| sortOrder | Int default 0 | Carousel/asset ordering within a post |

**Composite PK:** `(postId, mediaId)` — prevents attaching the same asset twice to the same post.

---

### `PostAnalytics` — daily engagement snapshots

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| postId | String FK → Post | Cascade delete |
| recordedDate | Date | The day these metrics represent |
| impressions | Int default 0 | |
| reach | Int default 0 | |
| likes | Int default 0 | |
| comments | Int default 0 | |
| shares | Int default 0 | |
| clicks | Int default 0 | |
| saves | Int default 0 | |
| createdAt | DateTime | |

**Unique constraint:** `(postId, recordedDate)` — one snapshot per post per day.

> Populated by a scheduled sync job calling each platform's API. Kept separate from `Post` to avoid wide rows and support time-series queries.

---

## Indexes

| Index | Reason |
|---|---|
| `User.supabaseId` | Every API request looks up app User by Supabase JWT `sub` claim |
| `Campaign(userId)` | "List my campaigns" — most frequent dashboard query |
| `Campaign(userId, status)` | "List my active campaigns" — covers both filters |
| `Campaign(startDate, endDate)` | Calendar / date-range filtering |
| `Post(campaignId)` | All posts for a campaign |
| `Post(campaignId, platform)` | "All Instagram posts for this campaign" |
| `Post(campaignId, status)` | Filter by publish state |
| `Post(scheduledAt)` | Scheduler polling for posts due to publish |
| `PostMedia(mediaId)` | "Where is this asset used?" — reverse lookup |
| `PostAnalytics(postId, recordedDate)` unique | Prevents duplicate daily snapshots; doubles as lookup index |

---

## Prisma Schema (`apps/api/prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL") // Required by Supabase: bypasses PgBouncer for migrations
}

enum Platform {
  INSTAGRAM
  TWITTER
  FACEBOOK
  LINKEDIN
  TIKTOK
  YOUTUBE
  PINTEREST
}

enum CampaignStatus {
  DRAFT
  ACTIVE
  PAUSED
  COMPLETED
  ARCHIVED
}

enum PostType {
  IMAGE
  VIDEO
  CAROUSEL
  REEL
  STORY
  TEXT
  LINK
  POLL
}

enum PostStatus {
  DRAFT
  SCHEDULED
  PUBLISHED
  FAILED
}

enum MediaType {
  IMAGE
  VIDEO
  GIF
  DOCUMENT
}

model CampaignGoal {
  id        Int        @id @default(autoincrement())
  label     String     @unique
  slug      String     @unique
  sortOrder Int        @default(0)
  campaigns Campaign[]

  @@map("campaign_goal")
}

model User {
  id          String   @id @default(uuid())
  supabaseId  String   @unique
  email       String   @unique
  displayName String?
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  campaigns Campaign[]
  ctas      Cta[]
  media     Media[]

  @@index([supabaseId])
  @@map("user")
}

model Campaign {
  id        String         @id @default(uuid())
  userId    String
  goalId    Int
  name      String
  audience  String?
  startDate DateTime?      @db.Date
  endDate   DateTime?      @db.Date
  timezone  String         @default("UTC")
  status    CampaignStatus @default(DRAFT)
  notes     String?
  createdAt DateTime       @default(now())
  updatedAt DateTime       @updatedAt

  user  User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  goal  CampaignGoal @relation(fields: [goalId], references: [id])
  posts Post[]

  @@index([userId])
  @@index([userId, status])
  @@index([startDate, endDate])
  @@map("campaign")
}

model Cta {
  id        String   @id @default(uuid())
  userId    String
  name      String
  content   String
  url       String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user  User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  posts Post[]

  @@index([userId])
  @@map("cta")
}

model Media {
  id           String    @id @default(uuid())
  userId       String
  storageKey   String    @unique
  publicUrl    String
  filename     String
  mimeType     String
  mediaType    MediaType
  sizeBytes    Int
  width        Int?
  height       Int?
  durationSecs Float?
  altText      String?
  createdAt    DateTime  @default(now())

  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  postMedia PostMedia[]

  @@index([userId])
  @@map("media")
}

model Post {
  id          String     @id @default(uuid())
  campaignId  String
  ctaId       String?
  platform    Platform
  postType    PostType
  content     String
  hashtags    String[]
  publishDate DateTime?  @db.Date
  scheduledAt DateTime?
  publishedAt DateTime?
  status      PostStatus @default(DRAFT)
  errorLog    String?
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  campaign  Campaign        @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  cta       Cta?            @relation(fields: [ctaId], references: [id], onDelete: SetNull)
  postMedia PostMedia[]
  analytics PostAnalytics[]

  @@index([campaignId])
  @@index([campaignId, platform])
  @@index([campaignId, status])
  @@index([scheduledAt])
  @@map("post")
}

model PostMedia {
  postId    String
  mediaId   String
  sortOrder Int    @default(0)

  post  Post  @relation(fields: [postId], references: [id], onDelete: Cascade)
  media Media @relation(fields: [mediaId], references: [id], onDelete: Cascade)

  @@id([postId, mediaId])
  @@index([mediaId])
  @@map("post_media")
}

model PostAnalytics {
  id           String   @id @default(uuid())
  postId       String
  recordedDate DateTime @db.Date
  impressions  Int      @default(0)
  reach        Int      @default(0)
  likes        Int      @default(0)
  comments     Int      @default(0)
  shares       Int      @default(0)
  clicks       Int      @default(0)
  saves        Int      @default(0)
  createdAt    DateTime @default(now())

  post Post @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@unique([postId, recordedDate])
  @@index([postId])
  @@map("post_analytics")
}
```

---

## Seed File (`apps/api/prisma/seed.ts`)

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const goals = [
    { slug: 'brand_awareness', label: 'Brand Awareness', sortOrder: 1 },
    { slug: 'lead_generation', label: 'Lead Generation', sortOrder: 2 },
    { slug: 'engagement',      label: 'Engagement',      sortOrder: 3 },
    { slug: 'traffic',         label: 'Traffic',          sortOrder: 4 },
    { slug: 'conversions',     label: 'Conversions',      sortOrder: 5 },
    { slug: 'app_installs',    label: 'App Installs',     sortOrder: 6 },
  ];

  for (const goal of goals) {
    await prisma.campaignGoal.upsert({
      where: { slug: goal.slug },
      update: { label: goal.label, sortOrder: goal.sortOrder },
      create: goal,
    });
  }

  console.log('Seeded campaign goals');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

Add to `apps/api/package.json`:
```json
"prisma": {
  "seed": "ts-node prisma/seed.ts"
}
```

---

## Implementation Steps

1. **Install Prisma** in `apps/api`:
   ```bash
   npm install @prisma/client
   npm install --save-dev prisma
   npx prisma init --datasource-provider postgresql
   ```

2. **Configure `.env`** (project root):
   ```
   DATABASE_URL="postgresql://..."   # Supabase pooled (Transaction mode)
   DIRECT_URL="postgresql://..."     # Supabase direct (for migrations)
   ```

3. **Write `apps/api/prisma/schema.prisma`** — full schema above

4. **Write `apps/api/prisma/seed.ts`** — seed CampaignGoal rows

5. **Run migration**:
   ```bash
   cd apps/api && npx prisma migrate dev --name init
   ```

6. **Run seed**:
   ```bash
   npx prisma db seed
   ```

7. **Update shared `User` type** in `packages/shared/datatypes/src/lib/datatypes.ts`:
   - Remove `password` and `name`
   - Add `supabaseId`, `displayName?`, `avatarUrl?`, `createdAt`, `updatedAt`

8. **Fix `AppService` stub** in `apps/api/src/app/app.service.ts` — remove hardcoded User with old shape

9. **Create `PrismaService`** at `apps/api/src/app/prisma.service.ts`:
   ```typescript
   import { Injectable, OnModuleInit } from '@nestjs/common';
   import { PrismaClient } from '@prisma/client';

   @Injectable()
   export class PrismaService extends PrismaClient implements OnModuleInit {
     async onModuleInit() {
       await this.$connect();
     }
   }
   ```

10. **Register `PrismaService`** in `apps/api/src/app/app.module.ts`

11. **Rebuild datatypes**:
    ```bash
    npx nx build datatypes && npx nx sync
    ```

---

## Critical Files

| File | Action |
|---|---|
| `apps/api/prisma/schema.prisma` | Create new |
| `apps/api/prisma/seed.ts` | Create new |
| `apps/api/src/app/prisma.service.ts` | Create new |
| `apps/api/src/app/app.module.ts` | Add PrismaService to providers |
| `apps/api/src/app/app.service.ts` | Remove hardcoded User stub |
| `apps/api/package.json` | Add Prisma deps + seed script |
| `packages/shared/datatypes/src/lib/datatypes.ts` | Update User type |
| `.env` (root) | Add DATABASE_URL and DIRECT_URL |

---

## Verification

1. `npx prisma migrate status` — all migrations applied
2. `npx prisma studio` — browse tables, verify columns and relations
3. `npx nx build @sm-campaigns-app/api` — no TypeScript errors
4. `npx nx build datatypes` — shared types compile cleanly
5. Supabase dashboard → Table Editor — confirm all tables exist with correct columns

---

## Notes

### Supabase `directUrl`
Supabase uses PgBouncer connection pooling on `DATABASE_URL`. Prisma migrations require a direct (non-pooled) connection via `DIRECT_URL`. Without this, `prisma migrate deploy` will hang against Supabase.

### Row Level Security (RLS)
Prisma does not generate RLS policies. For production, enable RLS on all tables in Supabase with policies checking `auth.uid()` against the `supabaseId` chain. The NestJS API uses the `postgres` superuser role (via `DIRECT_URL`) which bypasses RLS — authorization is enforced at the service layer instead.

### Updating the shared `User` type
The existing `User` type in `datatypes.ts` has `password` and `name` fields. `AppService.getData()` returns a hardcoded User with these fields — it will fail to compile once the type is updated. That method is scaffolding and should be replaced when building the real user module.
