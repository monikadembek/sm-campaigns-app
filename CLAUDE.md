# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## IMPORTANT: Docs-First Requirement

**Before generating any code, Claude Code MUST first read and refer to the relevant documentation files in the `/docs` directory.** All implementation decisions, patterns, and conventions should align with what is specified in those docs. If a relevant doc file exists for the feature or area being worked on, it takes precedence over general assumptions.

- /docs/angular-best-practices.md
- /docs/passwordless-auth.md

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
