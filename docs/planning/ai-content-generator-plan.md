# AI Content Generator — Implementation Plan

## Context

The app currently has auth (Supabase OTP), a minimal dashboard, and a full database schema for campaigns/posts — but no content creation features yet. This plan adds a standalone AI-powered wizard that lets users generate campaign post ideas and content using OpenAI GPT, then save them as draft posts.

**User flow**: Enter topic + platform + tone → AI generates post ideas → user picks favorites → AI generates full content for each → user saves as draft posts to a campaign.

---

## Phase 1: Backend Foundation

### 1.1 Install dependencies

In `apps/api/package.json`, add:
- `openai` — OpenAI API client
- `@nestjs/config` — environment variable management
- `jsonwebtoken` + `@types/jsonwebtoken` — Supabase JWT verification

### 1.2 Environment & CORS

**`apps/api/.env`** — add:
```
OPENAI_API_KEY=sk-...
SUPABASE_JWT_SECRET=<from Supabase dashboard Settings > API > JWT Secret>
```

**`apps/api/src/main.ts`** — enable CORS for `http://localhost:4200` and register `ConfigModule`.

**`apps/api/src/app/app.module.ts`** — import `ConfigModule.forRoot()`.

### 1.3 Auth Guard

Create `apps/api/src/auth/` directory:

- **`auth.module.ts`** — provides guard and PrismaService
- **`auth.guard.ts`** (`SupabaseAuthGuard`) — extracts Bearer token, verifies JWT with `SUPABASE_JWT_SECRET` (HS256), looks up user by `supabaseId` in DB, attaches to `request.user`
- **`current-user.decorator.ts`** — `@CurrentUser()` param decorator to extract `request.user` in controllers

---

## Phase 2: Shared Types

### 2.1 New file: `packages/shared/datatypes/src/lib/ai-content.ts`

```ts
export type ToneStyle = 'PROFESSIONAL' | 'CASUAL' | 'HUMOROUS' | 'INSPIRATIONAL';

// Re-export platform/post type as string unions (mirrors Prisma enums)
export type PlatformType = 'INSTAGRAM' | 'TWITTER' | 'FACEBOOK' | 'LINKEDIN' | 'TIKTOK' | 'YOUTUBE' | 'PINTEREST';
export type PostTypeValue = 'IMAGE' | 'VIDEO' | 'CAROUSEL' | 'REEL' | 'STORY' | 'TEXT' | 'LINK' | 'POLL';

// Step 1 → 2: Idea generation
export type GenerateIdeasRequest = {
  topic: string;
  platforms: PlatformType[];
  tone: ToneStyle;
  additionalContext?: string;
};

export type PostIdea = {
  id: string;
  title: string;
  summary: string;
  platform: PlatformType;
  suggestedPostType: PostTypeValue;
};

export type GenerateIdeasResponse = { ideas: PostIdea[] };

// Regenerate single idea
export type RegenerateIdeaRequest = {
  originalIdea: PostIdea;
  feedback?: string;
  topic: string;
  tone: ToneStyle;
};

export type RegenerateIdeaResponse = { idea: PostIdea };

// Step 2 → 3: Content generation
export type GenerateContentRequest = {
  ideas: PostIdea[];
  tone: ToneStyle;
  topic: string;
};

export type GeneratedPostContent = {
  ideaId: string;
  platform: PlatformType;
  postType: PostTypeValue;
  content: string;
  hashtags: string[];
};

export type GenerateContentResponse = { posts: GeneratedPostContent[] };

// Regenerate single post content
export type RegenerateContentRequest = {
  post: GeneratedPostContent;
  feedback?: string;
  tone: ToneStyle;
  topic: string;
};

export type RegenerateContentResponse = { post: GeneratedPostContent };

// Save drafts
export type SaveDraftPostsRequest = {
  campaignId: string;
  posts: {
    platform: PlatformType;
    postType: PostTypeValue;
    content: string;
    hashtags: string[];
  }[];
};

export type SaveDraftPostsResponse = { savedCount: number; postIds: string[] };

// Campaign helpers
export type CampaignSummary = { id: string; name: string; status: string };
export type CreateCampaignRequest = { name: string; goalId: number };
```

### 2.2 Export from index

Update `packages/shared/datatypes/src/index.ts` to re-export `./lib/ai-content`.

---

## Phase 3: Backend AI Feature

### 3.1 OpenAI Service — `apps/api/src/ai-content/openai.service.ts`

- Wraps `openai` SDK
- Injects `ConfigService` for `OPENAI_API_KEY`
- Method: `generateCompletion(systemPrompt, userPrompt): Promise<string>`
- Uses `gpt-4o` model, `max_tokens: 4096`, `response_format: { type: "json_object" }` for reliable JSON parsing
- Error handling: maps OpenAI errors to NestJS HttpExceptions (429, 503, etc.)

### 3.2 Prompt Templates — `apps/api/src/ai-content/prompts/`

**`idea-generation.prompt.ts`**
- System prompt: social media marketing expert, return valid JSON array
- User prompt: includes topic, platforms, tone, optional context
- Requests 5-8 ideas with title, summary, platform, suggestedPostType

**`content-generation.prompt.ts`**
- System prompt: includes platform-specific rules:
  - TWITTER: ≤280 chars, 2-5 hashtags
  - INSTAGRAM: up to 2200 chars, 15-30 hashtags
  - LINKEDIN: professional, up to 3000 chars, 3-5 hashtags
  - FACEBOOK: conversational, ~500 chars, 1-3 hashtags
  - TIKTOK: casual/trendy, 3-5 hashtags
  - YOUTUBE: description-style, SEO keywords
  - PINTEREST: keyword-rich, 2-5 hashtags
- User prompt: includes idea details, tone, requests content + hashtags as JSON

### 3.3 AI Content Service — `apps/api/src/ai-content/ai-content.service.ts`

Methods:
- `generateIdeas(dto)` — builds prompt, calls OpenAI, parses JSON, assigns UUIDs
- `regenerateIdea(dto)` — includes original idea + feedback in prompt
- `generateContent(dto)` — generates content for each selected idea (parallel OpenAI calls)
- `regenerateContent(dto)` — regenerates single post with feedback
- `saveDraftPosts(userId, dto)` — creates Post records via Prisma with status=DRAFT

### 3.4 AI Content Controller — `apps/api/src/ai-content/ai-content.controller.ts`

All endpoints protected by `@UseGuards(SupabaseAuthGuard)`:

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/ai-content/generate-ideas` | Generate post ideas from topic |
| `POST` | `/api/ai-content/regenerate-idea` | Regenerate a single idea |
| `POST` | `/api/ai-content/generate-content` | Generate full content for selected ideas |
| `POST` | `/api/ai-content/regenerate-content` | Regenerate single post content |
| `POST` | `/api/ai-content/save-drafts` | Save selected posts as drafts |

### 3.5 Campaigns Controller — `apps/api/src/campaigns/`

Lightweight module for the "select/create campaign" dropdown:

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/campaigns` | List user's campaigns |
| `POST` | `/api/campaigns` | Quick-create a campaign |

### 3.6 Module Registration

**`apps/api/src/ai-content/ai-content.module.ts`** — provides OpenAiService, AiContentService, PrismaService
**`apps/api/src/campaigns/campaigns.module.ts`** — provides CampaignsService, PrismaService
**`apps/api/src/app/app.module.ts`** — import ConfigModule, AuthModule, AiContentModule, CampaignsModule

---

## Phase 4: Frontend Infrastructure

### 4.1 HTTP Client Setup

**`apps/web-ng-app/src/app/app.config.ts`** — add:
```ts
provideHttpClient(withInterceptors([authInterceptor]))
```

### 4.2 Auth Interceptor — `apps/web-ng-app/src/app/interceptors/auth.interceptor.ts`

Functional interceptor that injects `Supabase` service, gets `currentSession()?.access_token`, and adds `Authorization: Bearer <token>` header.

### 4.3 Environment Update

**`apps/web-ng-app/src/environments/environment.ts`** — add `apiUrl: 'http://localhost:3000/api'`

### 4.4 Frontend Services

**`apps/web-ng-app/src/app/services/ai-content.ts`** — `AiContentService`
- Injectable, providedIn root
- Methods for each backend endpoint, returning `Observable<T>`

**`apps/web-ng-app/src/app/services/campaigns.ts`** — `CampaignsService`
- `getCampaigns()`, `createCampaign()`

---

## Phase 5: Frontend UI

### 5.1 Route

**`apps/web-ng-app/src/app/app.routes.ts`** — add:
```ts
{
  path: 'ai-content-generator',
  loadComponent: () => import('./pages/ai-content-generator/ai-content-generator')
    .then(m => m.AiContentGenerator),
  canActivate: [authGuard],
}
```

### 5.2 Navigation

**`apps/web-ng-app/src/app/components/top-menu/top-menu.ts`** — add menu item:
```ts
{ label: 'AI Content Generator', icon: 'pi pi-sparkles', routerLink: '/ai-content-generator' }
```

### 5.3 Component Architecture

All in `apps/web-ng-app/src/app/pages/ai-content-generator/`:

#### Main component: `ai-content-generator.ts`
- Uses PrimeNG **Stepper** for 3-step wizard
- Owns all state via signals:
  - Step 1: `topic`, `selectedPlatforms`, `selectedTone`
  - Step 2: `generatedIdeas`, `selectedIdeaIds`
  - Step 3: `generatedPosts`, `selectedPostIds`
  - UI: `currentStep`, `isLoading`, `errorMessage`
- Orchestrates child components via inputs/outputs

#### Child components (in `components/` subdirectory):

**`topic-input.ts`** — Step 1
- PrimeNG: InputTextarea (topic), MultiSelect (platforms), Select (tone)
- Reactive form with validators (topic required, ≥1 platform)
- Emits `generate` event

**`idea-list.ts`** — Step 2
- Receives `ideas: PostIdea[]` via input
- Renders grid of `idea-card` components
- "Generate Content" button (enabled when ≥1 idea selected)

**`idea-card.ts`** — Single idea card
- PrimeNG Card with Tag (platform badge), title, summary
- Checkbox for selection
- Regenerate button with optional feedback Dialog/inline input
- Inputs: `idea`, `isSelected` — Outputs: `toggleSelect`, `regenerate`

**`content-list.ts`** — Step 3
- Receives `posts: GeneratedPostContent[]` via input
- Renders grid of `content-card` components
- Campaign selector + Save button

**`content-card.ts`** — Single generated post
- Shows content preview, character count, hashtag chips (PrimeNG Tag), platform badge
- Checkbox for selection, Regenerate button with feedback
- Inputs: `post`, `isSelected` — Outputs: `toggleSelect`, `regenerate`

**`campaign-selector.ts`** — Campaign dropdown
- PrimeNG Select with user's campaigns + "Create new" option
- Inline dialog for quick campaign creation (name + goal dropdown)

### 5.4 PrimeNG Components Used
- StepperModule, InputTextareaModule, MultiSelectModule, SelectModule
- CardModule, ButtonModule, TagModule, CheckboxModule
- ProgressSpinnerModule, DialogModule, MessageModule
- ChipModule (hashtags)

---

## Phase 6: Polish
- Loading spinners during AI generation with messaging ("Generating ideas...")
- Toast notifications for success/error
- Accessibility: ARIA labels, focus management between steps

---

## Implementation Order

1. **Backend foundation** — deps, env, CORS, ConfigModule, auth guard
2. **Shared types** — ai-content.ts DTOs, rebuild datatypes
3. **Backend AI** — OpenAiService → prompts → AiContentService → controller → CampaignsModule
4. **Frontend infra** — HttpClient, interceptor, env update, services
5. **Frontend UI** — route → main wizard component → Step 1 (topic-input) → Step 2 (idea-list/card) → Step 3 (content-list/card, campaign-selector) → navigation link
6. **Polish** — loading states, error handling, accessibility

---

## No Prisma Schema Changes Needed

The existing `Post` model already has `content`, `hashtags (String[])`, `platform`, `postType`, `status (DRAFT default)`, and `campaignId` — everything needed for saving draft posts.

---

## Verification

1. Start API (`npx nx serve @sm-campaigns-app/api`) and Angular app (`npx nx serve web-ng-app`)
2. Log in via OTP
3. Navigate to `/ai-content-generator`
4. Enter a topic, select platforms and tone → verify ideas are generated
5. Select ideas, regenerate one with feedback → verify regeneration works
6. Generate content → verify platform-appropriate content with hashtags
7. Select/create a campaign, save drafts → verify posts appear in DB with status=DRAFT
8. Run tests: `npx nx test web-ng-app` and `npx nx test @sm-campaigns-app/api`
