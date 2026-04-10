# Authentication Setup

Reference documentation for the current authentication implementation across the frontend (`web-ng-app`) and backend (`api`).

## Overview

The app uses **Supabase email OTP** (6-digit code) for passwordless authentication. Only users that already exist in Supabase can sign in (`shouldCreateUser: false`). The frontend holds the session and attaches the Supabase-issued JWT to every API request; the backend validates that JWT against Supabase's JWKS endpoint and lazily provisions a corresponding row in the app database.

High-level flow:

1. User enters email on `/login` → frontend calls `supabase.auth.signInWithOtp`.
2. User enters the 6-digit code on `/verify` → frontend calls `supabase.auth.verifyOtp`, Supabase returns a session with an `access_token` (JWT).
3. The Angular `authInterceptor` attaches `Authorization: Bearer <access_token>` to outgoing API calls.
4. The NestJS `AuthGuard` validates the JWT using Supabase's JWKS, extracts `sub`/`email`, and ensures a matching `User` row exists in the local database.
5. Controllers receive the resolved user via the `@CurrentUser()` parameter decorator.

---

## Frontend (`apps/web-ng-app`)

### Supabase service
`apps/web-ng-app/src/app/core/auth/services/supabase.ts`

- `@Injectable({ providedIn: 'root' })` singleton wrapping `@supabase/supabase-js`.
- The `SupabaseClient` is created only in the browser, gated by `isPlatformBrowser(platformId)`. This avoids `localStorage` access during SSR.
- State is exposed as readonly signals:
  - `currentUser: Signal<User | null>`
  - `currentSession: Signal<Session | null>`
  - `pendingEmail: Signal<string | null>` — the email entered at `/login`, consumed by `/verify`.
- Public methods:
  - `signInWithOtp(email)` — sends the OTP email. Uses `shouldCreateUser: false`.
  - `verifyOtp(code, email)` — verifies the OTP with `type: 'email'`.
  - `signOut()` — calls `supabase.auth.signOut()`.
  - `getSession()` — proxy to `supabase.auth.getSession()`, used by route guards.
  - `setPendingEmail(email)` — used by the login page to hand off the email to the verify page.
- `initAuth()` is called from the constructor (browser only) and subscribes to `onAuthStateChange`. It updates the signals on `INITIAL_SESSION`, `SIGNED_IN`, and `SIGNED_OUT` events. `pendingEmail` is cleared on successful sign-in.

### Route guards
- `apps/web-ng-app/src/app/core/auth/guards/auth-guard.ts` — `CanActivateFn`. Returns `true` if `getSession()` yields a session, otherwise returns a `UrlTree` redirecting to `/login`.
- `apps/web-ng-app/src/app/core/auth/guards/guest-guard.ts` — inverse of `authGuard`. Redirects authenticated users to `/` so they cannot revisit `/login` or `/verify`.

### HTTP interceptor
`apps/web-ng-app/src/app/core/auth/interceptors/auth-interceptor.ts`

Functional `HttpInterceptorFn`. Reads `supabase.currentSession()?.access_token` and, if present, clones the request with `Authorization: Bearer <token>`. Registered in `app.config.ts` via `provideHttpClient(withInterceptors([authInterceptor, loadingInterceptor]))`.

### Routes
`apps/web-ng-app/src/app/app.routes.ts`

| Path | Component | Guard |
|------|-----------|-------|
| `/login` | `Login` (lazy) | `guestGuard` |
| `/verify` | `Verify` (lazy) | `guestGuard` |
| `/` | `Dashboard` (lazy) | `authGuard` |
| `/ai-content-generator` | `AiGenerator` (lazy) | `authGuard` |
| `/campaigns` | `Campaigns` (lazy) | `authGuard` |
| `/**` | redirect to `/` | — |

### Auth pages
- **Login** (`core/auth/pages/login/login.ts`) — signal-based standalone component. On submit: calls `signInWithOtp`, shows a PrimeNG toast on success, stores the email via `setPendingEmail`, and navigates to `/verify`. On error, surfaces a message via the `errorMessage` signal.
- **Verify** (`core/auth/pages/verify/verify.ts`) — signal-based standalone component using PrimeNG `InputOtpModule` (6 digits). In `ngOnInit`, if no `pendingEmail` is set, it redirects to `/login`. On submit: calls `verifyOtp`; on success clears `pendingEmail` and navigates to `/`.

### App shell
`apps/web-ng-app/src/app/app.ts`

- Derives `isLoggedIn` and `userEmail` as `computed` signals from the `Supabase` service's session and user signals.
- `signOut()` awaits `supabaseService.signOut()` and then navigates to `/login`.
- Renders `<app-top-menu>` which receives `isLoggedIn` / `userEmail` as signal inputs and emits a `signOut` output handled by `App.signOut()`.

### SSR
`apps/web-ng-app/src/app/app.routes.server.ts` sets all routes to `RenderMode.Client`. Combined with the `isPlatformBrowser` guard in the `Supabase` constructor, this keeps Supabase auth off the server and avoids `localStorage` errors during SSR.

### Environment
`apps/web-ng-app/src/environments/environment.ts` holds `supabaseUrl` and `supabaseKey` (the publishable key). `environment.server.ts` is used for SSR.

---

## Backend (`apps/api`)

### Auth module
`apps/api/src/app/auth/auth.module.ts`

Exports `AuthService` and `AuthGuard`. Imports `DatabaseModule` so `AuthService` can use `PrismaService`.

### AuthGuard
`apps/api/src/app/auth/auth.guard.ts`

NestJS `CanActivate` guard that validates every incoming JWT against Supabase's JWKS and attaches a local `User` record to the request.

Flow per request:

1. **Extract token** — `extractTokenFromHeader` parses `Authorization: Bearer <token>`. Missing token → `UnauthorizedException`.
2. **Validate JWT** — `validateJWT`:
   - Decodes the token header to read `kid`.
   - Fetches the matching public key from the JWKS endpoint via `jwks-rsa` (`JwksClient` is cached, `cacheMaxAge: 600000` ms).
   - Verifies the token with `jsonwebtoken` using `algorithms: ['ES256']`.
   - Returns the decoded `JwtPayload`.
3. **Check required claims** — `sub` (Supabase user id) and `email` must be present. Otherwise throws `UnauthorizedException`.
4. **Resolve user** — `addUserToRequest`:
   - Calls `authService.getUserBySupabaseAuthId(sub)` to look up the local user.
   - If no row exists, calls `addUserToDb` which creates one via `authService.createUser({ supabaseId, email })`.
   - If `createUser` fails, the guard retries `getUserBySupabaseAuthId` once to handle the race where a parallel request just created the same user. If that also returns nothing, it throws `InternalServerErrorException`.
   - Sets `request.user` to the resolved `User`.

Lazy provisioning means the first authenticated API call for a new Supabase user automatically creates the matching row in the local database.

### AuthService
`apps/api/src/app/auth/auth.service.ts`

Thin Prisma wrapper:
- `getUserBySupabaseAuthId(supabaseId)` — `user.findUnique({ where: { supabaseId } })`.
- `createUser({ supabaseId, email, displayName?, avatarUrl? })` — `user.create(...)`. Optional fields default to `null`.

### CreateUserDto
`apps/api/src/app/auth/dto/create-user.dto.ts`

class-validator DTO with required `supabaseId` and `email` (validated as an email), and optional `displayName` / `avatarUrl`.

### CurrentUser decorator
`apps/api/src/app/shared/current-user.decorator.ts`

`@CurrentUser()` returns the full `User` object from `request.user`; `@CurrentUser('id')`, `@CurrentUser('email')`, etc. return a single field. Typed so the key must be a property of `User` (from `@sm-campaigns-app/datatypes`).

`apps/api/src/types/express.d.ts` augments `Express.Request` with `user?: User | null`.

### Applying the guard
Guards are applied per controller using `@UseGuards(AuthGuard)`. Current callers:
- `apps/api/src/app/campaign/campaign.controller.ts`
- `apps/api/src/app/ai-content/ai-content.controller.ts`
- `apps/api/src/app/app.controller.ts`

Controllers then inject the resolved user id via `@CurrentUser('id') userId: string` and pass it to the service layer for ownership scoping.

### Configuration
`apps/api/config/configuration.ts` maps env vars onto a config object; `apps/api/config/validation.ts` enforces them with Joi. Required auth-related env vars:

- `SUPABASE_SECRET_KEY` — Supabase secret key (not currently consumed by `AuthGuard`, but required by validation).
- `JWKS_DISCOVERY_URL` — Supabase JWKS URL used by `AuthGuard` to fetch signing keys.

Env files live at `apps/api/config/env/<NODE_ENV>.env` and are loaded by `ConfigModule` in `apps/api/src/app/app.module.ts`.

---

## End-to-end token lifecycle

1. User authenticates via OTP → Supabase returns a session containing an `access_token` (JWT signed with Supabase's private key, `ES256`).
2. Frontend stores the session in `localStorage` (default Supabase persistence) and mirrors it into the `currentSession` signal.
3. Every HTTP call from Angular passes through `authInterceptor`, which attaches `Authorization: Bearer <access_token>`.
4. NestJS `AuthGuard` fetches Supabase's public signing key from `JWKS_DISCOVERY_URL` (cached for 10 minutes), verifies the JWT, and extracts `sub` + `email`.
5. The guard upserts a local `User` row (lookup first, create on miss) and attaches it to `request.user`.
6. Controllers read it via `@CurrentUser(...)`.
7. On sign-out, the frontend calls `supabase.auth.signOut()`, which clears the local session; subsequent API calls will not have an `Authorization` header and will be rejected by `AuthGuard`.

---

## Key files at a glance

**Frontend**
- `apps/web-ng-app/src/app/core/auth/services/supabase.ts`
- `apps/web-ng-app/src/app/core/auth/guards/auth-guard.ts`
- `apps/web-ng-app/src/app/core/auth/guards/guest-guard.ts`
- `apps/web-ng-app/src/app/core/auth/interceptors/auth-interceptor.ts`
- `apps/web-ng-app/src/app/core/auth/pages/login/login.ts`
- `apps/web-ng-app/src/app/core/auth/pages/verify/verify.ts`
- `apps/web-ng-app/src/app/app.routes.ts`
- `apps/web-ng-app/src/app/app.config.ts`
- `apps/web-ng-app/src/app/app.routes.server.ts`

**Backend**
- `apps/api/src/app/auth/auth.module.ts`
- `apps/api/src/app/auth/auth.guard.ts`
- `apps/api/src/app/auth/auth.service.ts`
- `apps/api/src/app/auth/dto/create-user.dto.ts`
- `apps/api/src/app/shared/current-user.decorator.ts`
- `apps/api/src/types/express.d.ts`
- `apps/api/config/configuration.ts`
- `apps/api/config/validation.ts`
