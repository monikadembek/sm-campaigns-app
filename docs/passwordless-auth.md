# Passwordless Authentication — Supabase OTP

## Overview

Passwordless authentication via Supabase email OTP (6-digit code).

**User preferences:**
- OTP (6-digit code), not magic link
- `shouldCreateUser: false` — only existing Supabase users can log in

---

## Implementation Plan

### Files Created

**Guards**
- `apps/web-ng-app/src/app/guards/auth-guard.ts` — `CanActivateFn`, redirects unauthenticated users to `/login`
- `apps/web-ng-app/src/app/guards/guest-guard.ts` — `CanActivateFn`, redirects authenticated users to `/`

**Pages** (standalone components, lazy-loaded)
- `apps/web-ng-app/src/app/pages/login/` — email input form
- `apps/web-ng-app/src/app/pages/verify/` — 6-digit OTP input
- `apps/web-ng-app/src/app/pages/dashboard/` — protected dashboard

**Component**
- `apps/web-ng-app/src/app/components/top-menu/` — navbar with Sign In / Sign Out button

### Files Modified

| File | Change |
|------|--------|
| `services/supabase.ts` | Major rewrite: SSR guard via `isPlatformBrowser`, signals (`currentUser`, `currentSession`, `pendingEmail`), added `verifyOtp`, `signOut`, `getSession`, `initAuth` |
| `app.routes.ts` | Added 3 lazy-loaded routes with guards + wildcard redirect |
| `app.routes.server.ts` | Changed all routes to `RenderMode.Client` |
| `app.config.ts` | Added `MessageService` provider |
| `app.ts` | Removed hardcoded login; computes `isLoggedIn` from session signal; `signOut()` calls service + navigates |
| `app.html` | Added `<app-top-menu>`, `<p-toast>`, `<router-outlet>` |

### Route Configuration

| Path | Component | Guard | Purpose |
|------|-----------|-------|---------|
| `/login` | `Login` | `guestGuard` | Email entry, OTP send |
| `/verify` | `Verify` | `guestGuard` | 6-digit code entry |
| `/` | `Dashboard` | `authGuard` | Protected dashboard |
| `/**` | redirect to `/` | — | Catch-all |

### OTP Flow

1. `/login` — user enters email → `signInWithOtp(email)` → stores email in `pendingEmail` signal → navigate to `/verify`
2. `/verify` — reads `pendingEmail`; if empty, redirects to `/login` in `ngOnInit` → user enters 6-digit code → `verifyOtp()` → on success clear `pendingEmail`, navigate to `/`
3. `/` (dashboard) — shows `currentUser().email` from Supabase signal
4. Top menu Sign Out → `supabase.signOut()` → navigate to `/login`

### SSR Safety Pattern

```typescript
constructor() {
  if (isPlatformBrowser(this.platformId)) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    this.initAuth();
  }
}
```

`createClient` is only called in the browser — `localStorage` is unavailable on the server and would throw during SSR.

### Verification Steps

1. Run `npx nx serve web-ng-app`
2. Navigate to `http://localhost:4200/` → should redirect to `/login`
3. Enter a valid email (user must exist in Supabase) → "Send Code"
4. Check email for 6-digit code → enter on `/verify` page
5. Should redirect to `/` showing the user's email
6. Click Sign Out → should redirect to `/login`
7. Navigate to `http://localhost:4200/login` while logged in → should redirect to `/`
8. Reload the dashboard while logged in → should stay on `/` (session restored from localStorage)

---

## Code Review History

### Round 1 — Initial Review

| File | Severity | Issue | Status |
|------|----------|-------|--------|
| `supabase.ts` | 🔴 Critical | `onAuthStateChange` unsubscribed immediately — listener was killed after first event | ✅ Fixed |
| `supabase.ts` | 🔴 Critical | `signOut()` didn't call `supabase.auth.signOut()` — only cleared local state | ✅ Fixed |
| `supabase.ts` | 🔴 Critical | `SIGNED_IN` / `INITIAL_SESSION` events didn't update signals | ✅ Fixed |
| `supabase.ts` | 🟡 Medium | `verifyOtp` returned void, callers couldn't check for errors | ✅ Fixed |
| `auth-guard.ts` | 🔴 Critical | Guard logic inverted — `getSession()` never rejects, so `.catch()` never ran; all routes were unprotected | ✅ Fixed |
| `guest-guard.ts` | 🔴 Critical | Guard logic inverted — `/login` was permanently inaccessible | ✅ Fixed |
| `verify.html` | 🔴 Critical | OTP `[length]="8"` — Supabase sends 6-digit codes | ✅ Fixed |
| `verify.ts` | 🔴 Critical | Always navigated to dashboard in `finally` even on wrong code | ✅ Fixed |
| `login.ts` | 🟡 Medium | Navigated to `/verify` in `finally` even when OTP send failed | ✅ Fixed |
| `login.html` | 🟡 Medium | Nested `<p-message>` inside `<p-message>` | ✅ Fixed |
| `login.html` | 🟡 Medium | `<label for="over_label">` — wrong `id` reference, should be `for="email"` | ✅ Fixed |
| `app.ts` | 🟡 Medium | `signOut()` was a no-op (`console.log` only) | ✅ Fixed |
| `app.ts` | 🟢 Minor | Leftover hardcoded `login()` method with hardcoded email | ✅ Fixed |
| `app.routes.server.ts` | 🟡 Medium | Still on `RenderMode.Prerender` — should be `RenderMode.Client` | ✅ Fixed |

---

### Round 2 — Second Review

| File | Severity | Issue | Status |
|------|----------|-------|--------|
| `verify.html` | 🔴 Critical | OTP `[length]="8"` still not corrected — must be `6` | ✅ Fixed |
| `supabase.ts` | 🟡 Medium | `signInWithOtp` swallowed errors, didn't return `{ error }` to caller | ✅ Fixed |
| `supabase.ts` | 🟡 Medium | `INITIAL_SESSION` event didn't update `currentUser` signal | ✅ Fixed |
| `supabase.ts` | 🟢 Minor | `currentUser` typed as `undefined`, `currentSession` as `null` — inconsistent sentinel | ✅ Fixed |
| `supabase.ts` | 🟢 Minor | Method named `onAuthStateChange` but also did session init — misleading | ✅ Fixed (renamed to `initAuth`) |
| `auth-guard.ts` / `guest-guard.ts` | 🟢 Minor | Used `router.navigate()` instead of returning `UrlTree` | ✅ Fixed |
| `login.ts` | 🟡 Medium | No visible error shown to user when OTP send failed | ✅ Fixed |
| `verify.ts` | 🟡 Medium | No visible error shown to user when code wrong/expired | ✅ Fixed |
| `app.ts` | 🟢 Minor | Constructor `console.log` always printed `null` (async session not yet resolved) | ✅ Fixed |
| `app.routes.server.ts` | 🟡 Medium | Still on `RenderMode.Prerender` (carried over from Round 1) | ✅ Fixed |

---

### Round 3 — Third Review

| File | Severity | Issue | Status |
|------|----------|-------|--------|
| `login.ts` | 🔴 Critical | `if (data)` always truthy — Supabase returns `{ user: null, session: null }` on success, so both success and error paths ran | Open |
| `supabase.ts` | 🟡 Medium | Race condition: redundant `getSession()` call alongside `INITIAL_SESSION` event — both race to update signals | Open |
| `verify.ts` | 🟡 Medium | `errorMessage` not cleared at start of new submission attempt | Open |
| `verify.html` | 🟢 Minor | Outer `@if(isEmailPending())` may be unnecessary given `ngOnInit` already redirects | Open |
| `supabase.ts` | 🟢 Minor | Stale `console.log` message still says `"onAuthStateChange"` after rename to `initAuth` | Open |
| `app.ts` | 🟢 Minor | Empty `constructor() {}` — should be removed | Open |
| `app.ts` | 🟢 Minor | `console.log('sign out')` debug log left in `signOut()` | Open |
| `auth-guard.ts` / `guest-guard.ts` | 🟢 Minor | Unused `route` and `state` parameters — should be prefixed with `_` or removed | Open |
