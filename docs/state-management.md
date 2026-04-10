# State Management

Reference documentation for how state is managed in the Angular app (`apps/web-ng-app`).

## Overview

The app does **not** use NgRx, NGXS, Akita, or any external state library. All state is built on **Angular signals** — either directly inside components or inside `@Injectable({ providedIn: 'root' })` services that act as lightweight stores. Server state is handled through `httpResource` (Angular's signal-based resource primitive) and classic `HttpClient` observables where imperative calls are needed.

State in this project falls into three categories:

1. **Shared UI / feature state** — held in singleton services, exposed as readonly signals (e.g. `Supabase`, `LoadingService`, `AiGeneratorStore`).
2. **Server state** — fetched through `httpResource` (reactive, cached, reloadable) or through `HttpClient` for explicit imperative calls.
3. **Local component state** — `signal`, `computed`, and `@angular/forms/signals` form models scoped to a single component.

The common pattern is: a private `#state = signal(...)` field with a public readonly projection (`state = this.#state.asReadonly()` or a getter returning `this.#state.asReadonly()`), plus setter methods to mutate it. Consumers read via the signal and never mutate directly.

---

## Pattern 1 — Singleton services as signal stores

Services decorated with `@Injectable({ providedIn: 'root' })` hold feature state that must survive component teardown (e.g. wizard state across steps, or global auth session).

### Example: `AiGeneratorStore`
`apps/web-ng-app/src/app/features/ai-generator/services/ai-generator-store.ts`

Shared state across the three-step AI content generator wizard (`step1` → `step2` → `step3`). Each step writes what it produces into the store and later steps read it back. Without this store the state would be lost when the user moves between steps.

```typescript
@Injectable({ providedIn: 'root' })
export class AiGeneratorStore {
  #ideas = signal<PostIdea[]>([]);
  #topic = signal<string>('');
  #tone = signal<ToneStyle>('CASUAL');
  #generatedPostsContent = signal<GeneratedPostContent[]>([]);

  ideas = this.#ideas.asReadonly();
  topic = this.#topic.asReadonly();
  tone = this.#tone.asReadonly();
  generatedPostsContent = this.#generatedPostsContent.asReadonly();

  setGeneratedIdeas(ideas: PostIdea[]) { this.#ideas.set(ideas); }
  setTopic(topic: string) { this.#topic.set(topic); }
  setTone(tone: ToneStyle) { this.#tone.set(tone); }
  setGeneratedPostsContent(posts: GeneratedPostContent[]) {
    this.#generatedPostsContent.set(posts);
  }
}
```

**How it's consumed:**

- `Step1` calls the API then writes `setGeneratedIdeas`, `setTopic`, `setTone`.
- `Step2` reads `aiGeneratorStore.ideas` to render the list of generated ideas, then writes `setGeneratedPostsContent` after the content-generation call.
- `Step3` reads `aiGeneratorStore.ideas` and `aiGeneratorStore.generatedPostsContent` to render the final preview and attach posts to a campaign.

The private `#` fields keep the mutable signal inaccessible from outside; only the methods and the readonly projections are part of the public API. This is the project's canonical store shape.

### Example: `Supabase` service (auth state)
`apps/web-ng-app/src/app/core/auth/services/supabase.ts`

Same pattern, but the setters are private and state is only updated from inside `onAuthStateChange` callbacks. Exposes `currentUser`, `currentSession`, and `pendingEmail` as readonly signals consumed by guards, the `authInterceptor`, and the app shell. See `docs/auth-setup.md` for the full auth details.

### Example: `LoadingService`
`apps/web-ng-app/src/app/core/services/loading.service.ts`

Holds a counter rather than a boolean, so it can handle concurrent in-flight HTTP requests correctly. Exposes a `computed` signal `isLoading = () => #isLoading() > 0`.

```typescript
@Injectable({ providedIn: 'root' })
export class LoadingService {
  // bc there might be multiple concurrent requests a number that counts current requests
  // is used instead of boolean
  #isLoading = signal<number>(0);
  isLoading = computed(() => this.#isLoading() > 0);

  loadingOn() { this.#isLoading.update((v) => v + 1); }
  loadingOff() { this.#isLoading.update((v) => v - 1); }
}
```

Used by:
- `loadingInterceptor` — calls `loadingOn()` before a request and `loadingOff()` in `finalize`. An `HttpContextToken` named `SkipLoadingToken` opts individual requests out of the global spinner (e.g. the background `httpResource` that fetches campaigns in the AI generator wizard).
- `App` shell — reads `spinnerService.isLoading` and binds it to `<app-spinner [spinnerLoading]="isSpinnerLoading()"/>`.

This is the pattern used when a derived boolean is computed from a numeric/aggregate signal.

---

## Pattern 2 — `httpResource` for reactive server state

`httpResource` (from `@angular/common/http`) is the preferred way to fetch data that the UI should render reactively. It returns a signal-based resource that exposes `.value()`, `.status()`, `.error()`, and `.reload()`, and re-runs the request whenever its reactive request factory changes.

The app uses two flavours:

### Flavour A — data-view component binds directly
`apps/web-ng-app/src/app/features/campaigns/services/campaigns-api.ts`

```typescript
@Injectable({ providedIn: 'root' })
export class CampaignsApi {
  #campaignsFullData = httpResource<Campaign[]>(
    () => ({ url: `${environment.apiUrl}/campaigns/full` }),
    { defaultValue: [] },
  );
  campaignsFullData = this.#campaignsFullData.asReadonly();
  reloadCampaigns() { return this.#campaignsFullData.reload(); }
}
```

The `Campaigns` component (`features/campaigns/campaigns.ts`) injects this service and stores a reference to the readonly resource:

```typescript
readonly campaignsResource = this.campaignsApi.campaignsFullData;
```

The template reads `campaignsResource.value()` and `campaignsResource.error()` directly. Because `httpResource` fires on creation and is cached in the singleton service, navigating away and back does not refetch unless `reload()` is explicitly called.

### Flavour B — store created once in the service, resource + imperative calls combined
`apps/web-ng-app/src/app/features/ai-generator/services/ai-generator-api.ts`

```typescript
#campaigns = httpResource<CampaignSummary[]>(
  () => ({
    url: `${environment.apiUrl}/campaigns`,
    context: new HttpContext().set(SkipLoadingToken, true),
  }),
  { defaultValue: [] },
);
getCampaigns() { return this.#campaigns.asReadonly(); }
reloadCampaigns() { return this.#campaigns.reload(); }
```

- The `SkipLoadingToken` context flag opts this background fetch out of the global loading spinner.
- `Step3` calls `getCampaigns()` once in a class field and wraps it in a `computed` for a sensible default: `campaigns = computed(() => this.campaignsResource.value() ?? [])`.
- After the user creates a new campaign via the imperative `createCampaign()` (`HttpClient.post`), the component calls `reloadCampaigns()` to refresh the resource-backed list.

This shows the idiomatic split: `httpResource` for the queryable list, `HttpClient` for mutating actions, and `reload()` to re-sync after a mutation.

---

## Pattern 3 — Local component state

Per-component state (form models, UI toggles, error messages) lives in the component itself using `signal`, `computed`, and `effect`.

### Signal-form models
`@angular/forms/signals` is used for forms. A `signal<T>` holds the model, and `form(model, path => …)` wires up validators. This is used throughout `features/ai-generator/components/stepN/stepN.ts`. Example from `Step1`:

```typescript
readonly firstStepModel = signal<FirstStepForm>({ topic: '...', ... });

firstStepForm = form(this.firstStepModel, (path) => {
  required(path.topic, { message: 'Topic is required' });
  minLength(path.topic, 10, { message: '...' });
  // ...
});
```

`submit(this.firstStepForm, { action: async () => {...} })` is used to trigger validation and run the submit handler. Errors surfaced from the API are held in a separate `errorMessage = signal<string | null>(null)` that the template binds to.

### Computed signals
Derived values use `computed`. Examples:
- `app.ts` — `isLoggedIn = computed(() => !!supabaseService.currentSession())` and `userEmail = computed(() => supabaseService.currentUser()?.email || '')`.
- `verify.ts` — `isEmailPending = computed(() => !!supabase.pendingEmail())`.
- `step3.ts` — `campaigns = computed(() => campaignsResource.value() ?? [])`.

### Effects for reactive cross-signal updates
`effect()` is used sparingly, primarily to push one signal's value into another when they must stay in sync. `Step3` has the most interesting example:

```typescript
effect(() => {
  const list = this.campaigns();
  if (list.length > 0 && !this.selectedCampaignId()) {
    this.selectedCampaignId.set(list[0].id);
  }
});

effect(() => {
  const campaignId = this.selectedCampaignId();
  // Wrap the write in untracked() so the effect only tracks selectedCampaignId
  // and doesn't re-trigger when thirdStepModel changes, bc it lead to an infinite loop
  untracked(() => {
    this.thirdStepModel.set({ ...this.thirdStepModel(), campaignId });
  });
});
```

The `untracked()` wrapper is important: without it the effect would read `thirdStepModel` while writing to it and loop forever. This is the canonical "write to a signal from inside an effect" pattern in the codebase.

---

## State flow diagrams

### AI generator wizard (cross-component shared state)

```
Step1                         Step2                         Step3
-----                         -----                         -----
firstStepModel (local)        secondStepModel (local)       thirdStepModel (local)
     |                              |                              |
     | signInApi.generateIdeas()    | signInApi.generateContent()  | signInApi.saveDraftPosts()
     v                              v                              v
  store.setGeneratedIdeas       store.setGeneratedPostsContent   (reads store.generatedPostsContent,
  store.setTopic                                                   store.ideas)
  store.setTone                  reads store.ideas, store.topic,
                                   store.tone
```

`AiGeneratorStore` is the bridge; each step owns its own form state but pushes the server responses into the shared store for later steps.

### Global loading spinner

```
HttpClient request --> loadingInterceptor --> loadingService.loadingOn()
                                                |
                                                v
                                     #isLoading counter ++
                                                |
                                                v
                                     isLoading computed()
                                                |
                                                v
                                     App.isSpinnerLoading
                                                |
                                                v
                                     <app-spinner [spinnerLoading]="..."/>
```

Requests carrying `SkipLoadingToken=true` in their `HttpContext` bypass the interceptor entirely.

---

## Conventions

- **Private writable, public readonly.** Hold mutable signals behind `#private` fields and expose `asReadonly()` projections. Direction of mutation should flow through the service's public methods.
- **Prefer `computed` over manual recalculation.** Derived state should be a `computed`, never a stored signal that's kept in sync manually.
- **Use `effect` only when necessary.** Effects are for bridging signals to imperative side effects (logging, syncing one signal into another). Always wrap signal writes inside an effect in `untracked()` if the write touches a signal the effect also reads.
- **Server state lives in API services, not components.** Components hold a reference to `service.#resource.asReadonly()`; they never create `httpResource` locally. This makes the resource cache shared across navigations.
- **Mutations go through `HttpClient`, reads go through `httpResource`.** After a mutation, call the API service's `reloadXxx()` method to refresh the resource.
- **`SkipLoadingToken` for background fetches.** If a resource should not trigger the global spinner, set `context: new HttpContext().set(SkipLoadingToken, true)` in its request factory.
- **No external state libraries.** Do not introduce NgRx, NGXS, Akita, etc. for new features — follow the signal-service pattern.

---

## Key files at a glance

**Signal stores / services**
- `apps/web-ng-app/src/app/features/ai-generator/services/ai-generator-store.ts` — wizard shared state
- `apps/web-ng-app/src/app/core/auth/services/supabase.ts` — auth session signals
- `apps/web-ng-app/src/app/core/services/loading.service.ts` — global loading counter

**`httpResource` usages**
- `apps/web-ng-app/src/app/features/campaigns/services/campaigns-api.ts`
- `apps/web-ng-app/src/app/features/ai-generator/services/ai-generator-api.ts`

**Loading spinner plumbing**
- `apps/web-ng-app/src/app/core/interceptors/loading-interceptor.ts`
- `apps/web-ng-app/src/app/core/interceptors/skip-loading-token.ts`
- `apps/web-ng-app/src/app/core/layout/spinner/spinner.ts`

**Signal-form examples**
- `apps/web-ng-app/src/app/features/ai-generator/components/step1/step1.ts`
- `apps/web-ng-app/src/app/features/ai-generator/components/step2/step2.ts`
- `apps/web-ng-app/src/app/features/ai-generator/components/step3/step3.ts`

**Effect + `untracked` example**
- `apps/web-ng-app/src/app/features/ai-generator/components/step3/step3.ts`
