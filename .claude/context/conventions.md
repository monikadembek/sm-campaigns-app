## Project Overview

This is an **Nx monorepo** for a Social Media Campaigns application with three main projects:

- `web-ng-app` — Angular 21 frontend (standalone components, SSR, PrimeNG UI, Supabase auth)
- `api` — NestJS 11 backend (REST API, Webpack build)
- `datatypes` — Shared TypeScript types library (`packages/shared/datatypes`)

## Commands

All tasks run through Nx. The root `package.json` scripts are empty.

```bash
# Serve for development
npx nx serve web-ng-app
npx nx serve @sm-campaigns-app/api

# Build
npx nx build web-ng-app
npx nx build @sm-campaigns-app/api
npx nx build datatypes

# Test
npx nx test web-ng-app          # Vitest
npx nx test @sm-campaigns-app/api  # Jest

# Lint
npx nx lint web-ng-app
npx nx lint @sm-campaigns-app/api

# E2E
npx nx e2e web-ng-app-e2e       # Playwright

# Project dependency graph
npx nx graph

# Sync TypeScript project references (run after modifying tsconfig paths)
npx nx sync
```

## Architecture

### Shared Types (`packages/shared/datatypes`)

Path alias `@sm-campaigns-app/datatypes` is configured in `tsconfig.base.json`. Both apps import shared types through this alias. After adding/changing exports here, run `npx nx build datatypes` or `npx nx sync` to keep TypeScript project references consistent.

### Angular Frontend (`apps/web-ng-app`)

- **Bootstrap**: `src/main.ts` → standalone `AppComponent`
- **Config**: `src/app/app.config.ts` — registers PrimeNG Aura theme, client hydration with event replay, router
- **Auth**: `src/app/services/supabase.ts` — Supabase OTP magic link auth
- **Environment**: `src/environments/environment.ts` holds Supabase URL/key; SSR uses `src/environments/environment.server.ts`
- **SSR**: `src/main.server.ts` + `server.ts` — Express-based Angular Universal setup
- **Testing**: Vitest via `@analogjs/vitest-angular`

### NestJS API (`apps/api`)

- **Entry**: `src/main.ts` — listens on port 3000, global prefix `/api`
- **Build**: Webpack 5 (not `@nx/node:build`) via `webpack-cli build` with `webpack.config.js`
- **Structure**: Standard NestJS module/controller/service pattern; imports `User` from `@sm-campaigns-app/datatypes`
- **Testing**: Jest via `@nestjs/testing`

### Nx Configuration

- `nx.json` registers plugins: `@nx/angular`, `@nx/webpack`, `@nx/jest`, `@nx/vitest`, `@nx/playwright`, `@nx/eslint`, `@nx/js`
- Per-project targets are in each app's `project.json`
- The API uses its own `apps/api/package.json` (not the root one) for its Nx target configuration

---

## Passwordless Authentication — Supabase OTP

Passwordless authentication via Supabase email OTP (6-digit code).

---

## TypeScript

- Use strict type checking
- Prefer inferred types — only annotate when the inference is wrong or unclear.
- Avoid `any`; use `unknown` when the type is truly unknown and narrow it before use.
- Use optional chaining (`?.`) and nullish coalescing (`??`) instead of defensive `if` chains.

---

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection

---

## State management

- **Overview** — no external state library; everything is signals. State falls into shared (services), server (httpResource), and local (component) categories.
- **Private writable, public readonly.** Hold mutable signals behind `#private` fields and expose `asReadonly()` projections. Direction of mutation should flow through the service's public methods.
- **Prefer `computed` over manual recalculation.** Derived state should be a `computed`, never a stored signal that's kept in sync manually.
- **Use `effect` only when necessary.** Effects are for bridging signals to imperative side effects (logging, syncing one signal into another). Always wrap signal writes inside an effect in `untracked()` if the write touches a signal the effect also reads.
- **Server state lives in API services, not components.** Components hold a reference to `service.#resource.asReadonly()`; they never create `httpResource` locally. This makes the resource cache shared across navigations.
- **Mutations go through `HttpClient`, reads go through `httpResource`.** After a mutation, call the API service's `reloadXxx()` method to refresh the resource.
- **`SkipLoadingToken` for background fetches.** If a resource should not trigger the global spinner, set `context: new HttpContext().set(SkipLoadingToken, true)` in its request factory.
- **No external state libraries.** Do not introduce NgRx, NGXS, Akita, etc. for new features — follow the signal-service pattern.
