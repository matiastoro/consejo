# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev            # Dev server on port 3006
npm run build          # Production build
npm run start          # Production server on port 3006
npm run lint           # ESLint
npm test               # Jest unit tests
npm run test:watch     # Jest watch mode
npx playwright test    # E2E tests
npx prisma generate    # Regenerate Prisma client (after schema changes)
npx prisma db push     # Push schema to database
npx prisma studio      # Database GUI
```

## Architecture

**Stack**: Next.js 16 (App Router) + React 19 + TypeScript + PostgreSQL + Prisma 7 + MUI 9

**Purpose**: Council discussion and voting platform for DCC (Departamento de Ciencias de la Computacion, Universidad de Chile). Members propose topics, vote (A_FAVOR/EN_CONTRA/MAS_DATOS), comment, and directors resolve them.

### Key directories

- `src/app/` — App Router pages and API routes
- `src/lib/auth.ts` — NextAuth config (JWT strategy, credentials provider)
- `src/lib/session.ts` — Server-side auth helpers (`getAuthUser`, role checks)
- `src/lib/prisma.ts` — Prisma singleton with PrismaPg adapter over `pg` Pool
- `src/lib/theme.ts` — MUI theme (light/dark/cozy modes)
- `src/lib/i18n/` — i18n provider with ES/EN translations
- `src/components/` — Shared layout and provider components
- `prisma/schema.prisma` — Database schema

### Auth flow

Two login methods:
1. **Local credentials** — email/password with bcrypt, via NextAuth CredentialsProvider
2. **VTI SSO** — university SSO redirects to `/api/plogin`, JWT verified with jose, auto-creates users

Session uses JWT strategy (not database sessions). Roles and isAdmin are baked into the JWT token at login time — they are NOT refreshed from DB on subsequent requests. The `getAuthUser()` helper in `session.ts` does fetch the full user from DB on each API call, so API routes use fresh roles.

### Role system

Roles: `DIRECTOR`, `JEFE_DOCENTE`, `CONSEJERO`, `INVITADO`, `PROFESOR`

- **Can vote/create topics**: DIRECTOR, JEFE_DOCENTE, CONSEJERO
- **Can approve/close/reorder topics**: DIRECTOR only
- **Admin panel** (`/admin`): requires `isAdmin` flag (separate from roles)

### Topic workflow

PENDING_APPROVAL → DISCUSSING → APROBADO | RECHAZADO

Directors auto-approve their own topics. Non-directors need director approval.

### Database

PostgreSQL via `pg` Pool + PrismaPg adapter (not the default Prisma driver). Connection string in `DATABASE_URL` env var. The `prisma.config.ts` configures the adapter for migrations/generation.

### UI

MUI 9 with Emotion. React Compiler enabled (`reactCompiler: true` in next.config.ts). Drag-and-drop topic reordering uses `@hello-pangea/dnd`.
