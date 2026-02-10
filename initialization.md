# Project Initialization

## Overview

This document records every decision made during the initial project setup for the FCIT Clubs Management Platform (CMP) monorepo.

---

## Monorepo Structure

The project uses **npm workspaces** (`"workspaces": ["apps/*"]` in the root `package.json`) so both `apps/frontend` and `apps/backend` are installed together with a single `npm install` from the root. Shared tooling (ESLint, Prettier) is hoisted to the root `node_modules`.

```
package.json          ← workspace root
apps/
  frontend/           ← @fcit-cmp/frontend
  backend/            ← @fcit-cmp/backend
```

---

## Root-level packages

| Package | Version | Purpose |
|---|---|---|
| `prettier` | ^3.4.2 | Uniform code formatting across both apps |
| `eslint` | ^9.17.0 | Linting — app-specific configs extend from here |

---

## Frontend (`apps/frontend`)

**Runtime: React 19 + Vite 6 + TypeScript 5.7**

### Core framework

| Package | Version | Why |
|---|---|---|
| `react` | ^19.0.0 | Core UI library — v19 for concurrent features |
| `react-dom` | ^19.0.0 | DOM renderer for React |
| `vite` | ^6.0.5 | Build tool / dev server |
| `@vitejs/plugin-react` | ^4.3.4 | Vite plugin for React JSX transform |
| `typescript` | ^5.7.2 | Static typing |

### Styling

| Package | Version | Why |
|---|---|---|
| `tailwindcss` | ^4.0.0 | Utility-first CSS framework — v4 uses CSS-native config |
| `@tailwindcss/vite` | ^4.0.0 | Vite plugin for Tailwind v4 (replaces PostCSS approach) |
| `autoprefixer` | ^10.4.20 | Vendor prefix handling (PostCSS fallback) |
| `postcss` | ^8.5.1 | CSS transformation pipeline |
| `clsx` | ^2.1.1 | Conditional className utility |
| `tailwind-merge` | ^2.6.0 | Merge Tailwind classes without conflicts |
| `class-variance-authority` | ^0.7.1 | Type-safe component variant API (neobrutalism components) |

> **Tailwind v4 note**: `@tailwindcss/vite` is the recommended integration for Vite projects. No `tailwind.config.js` is required unless custom tokens are needed — config lives in CSS via `@theme {}`.

### Design system (Radix UI)

Neobrutalism components are built on unstyled Radix UI primitives.

| Package | Purpose |
|---|---|
| `@radix-ui/react-dialog` | Modal dialogs |
| `@radix-ui/react-dropdown-menu` | Navigation / action menus |
| `@radix-ui/react-select` | Accessible select inputs |
| `@radix-ui/react-tabs` | Tab navigation |
| `@radix-ui/react-toast` | Notification toasts |
| `@radix-ui/react-avatar` | User avatars |
| `@radix-ui/react-checkbox` | Checkbox inputs |
| `@radix-ui/react-label` | Accessible form labels |
| `@radix-ui/react-popover` | Floating popover panels |
| `@radix-ui/react-separator` | Visual dividers |
| `@radix-ui/react-slot` | Polymorphic component composition |
| `@radix-ui/react-switch` | Toggle switches |
| `@radix-ui/react-tooltip` | Accessible tooltips |

### Auth & routing

| Package | Version | Why |
|---|---|---|
| `keycloak-js` | ^26.1.0 | Official Keycloak JavaScript adapter for OIDC login flow |
| `react-router-dom` | ^7.1.1 | Client-side routing (v7 with React Router v2 API) |

### Data fetching & state

| Package | Version | Why |
|---|---|---|
| `@tanstack/react-query` | ^5.62.8 | Server state management — caching, refetching, mutations |
| `axios` | ^1.7.9 | HTTP client for API calls |

### Internationalisation

| Package | Version | Why |
|---|---|---|
| `i18next` | ^24.2.1 | i18n framework |
| `react-i18next` | ^15.4.0 | React bindings for i18next |
| `i18next-browser-languagedetector` | ^8.0.0 | Auto-detects user locale from browser |

> Arabic (RTL) and English are supported. Locale files live in `src/i18n/locales/ar/` and `src/i18n/locales/en/`.

### Charts & QR

| Package | Version | Why |
|---|---|---|
| `recharts` | ^2.15.0 | KPI dashboards and club leaderboard charts |
| `qrcode.react` | ^4.2.0 | Render QR codes for attendance check-in display |

### Dev dependencies

| Package | Purpose |
|---|---|
| `@types/react`, `@types/react-dom` | TypeScript types for React |

---

## Backend (`apps/backend`)

**Runtime: Node.js 20 + Express 4 + TypeScript 5.7 + SQLite**

### Core framework

| Package | Version | Why |
|---|---|---|
| `express` | ^4.21.2 | HTTP framework |
| `@types/express` | ^4.17.21 | TypeScript types |
| `typescript` | ^5.7.2 | Static typing |
| `tsx` | ^4.19.2 | Run/watch TypeScript directly without pre-compiling (dev) |

### Database

| Package | Version | Why |
|---|---|---|
| `better-sqlite3` | ^11.8.1 | Synchronous SQLite bindings — fast, no async overhead, ARM64-safe |
| `@types/better-sqlite3` | ^7.6.12 | TypeScript types |

> `better-sqlite3` compiles native bindings at install time. The Dockerfile uses `node:20-alpine` which includes `python3`, `make`, and `g++` for this.

### Auth

| Package | Version | Why |
|---|---|---|
| `keycloak-connect` | ^26.1.0 | Keycloak Node.js adapter — session and token management |
| `jsonwebtoken` | ^9.0.2 | JWT sign / verify |
| `jwks-rsa` | ^3.1.0 | Fetches Keycloak's public keys (JWKS endpoint) for token verification |
| `@types/jsonwebtoken` | ^9.0.7 | TypeScript types |

### Security & middleware

| Package | Version | Why |
|---|---|---|
| `cors` | ^2.8.5 | CORS headers for SPA → API requests |
| `helmet` | ^8.0.0 | Security HTTP headers |
| `express-validator` | ^7.2.1 | Request validation and sanitization |
| `dotenv` | ^16.4.7 | Load `.env` into `process.env` |
| `@types/cors` | ^2.8.17 | TypeScript types |

### Services

| Package | Version | Why |
|---|---|---|
| `qrcode` | ^1.5.4 | Generate QR code images for attendance events |
| `pdfkit` | ^0.15.1 | PDF generation for achievement reports — no Chromium dependency, ARM64-safe |
| `nodemailer` | ^6.9.16 | Send notification emails |
| `winston` | ^3.17.0 | Structured logging (console + file transports) |
| `@types/qrcode`, `@types/pdfkit`, `@types/nodemailer` | latest | TypeScript types |
| `@types/node` | ^22.10.7 | Node.js built-in types |

### Testing

| Package | Version | Why |
|---|---|---|
| `jest` | ^29.7.0 | Test runner |
| `ts-jest` | ^29.2.5 | TypeScript preprocessor for Jest |
| `supertest` | ^7.0.0 | HTTP integration testing for Express routes |
| `@types/jest`, `@types/supertest` | latest | TypeScript types |

---

## Configuration files created

| File | Purpose |
|---|---|
| `package.json` (root) | Workspace root — defines workspaces and shared scripts |
| `apps/frontend/package.json` | Frontend dependencies and scripts |
| `apps/backend/package.json` | Backend dependencies and scripts |
| `apps/frontend/tsconfig.json` | Frontend TS config — `bundler` module resolution, `react-jsx`, strict mode |
| `apps/backend/tsconfig.json` | Backend TS config — `commonjs` module, outputs to `dist/`, strict mode |
| `apps/frontend/vite.config.ts` | Vite config — React plugin, Tailwind v4 plugin, `@` alias, `/api` proxy |
| `apps/backend/.env.example` | Template for required environment variables |

---

## Install result

```
added 857 packages
4 vulnerabilities (3 low, 1 moderate)
```

The 4 vulnerabilities are in transitive dependencies of `pdfkit` (`jpeg-exif`) and legacy glob versions used by Jest internals. None are in direct runtime dependencies. Run `npm audit` for details.

---

## Available scripts

### Root
```bash
npm run dev:frontend     # start Vite dev server (port 5173)
npm run dev:backend      # start Express with tsx watch (port 3000)
npm run build            # build both apps
npm run lint             # lint both apps
npm run test             # test both apps
```

### Backend only
```bash
cd apps/backend
npm run migrate          # run SQL migrations
npm run seed             # seed development data
```

---

## Next steps

1. Set up `infra/docker/docker-compose.yml` for local full-stack development (frontend + backend + Keycloak)
2. Export Keycloak realm and place in `infra/keycloak/realm-export.json`
3. Copy `apps/backend/.env.example` → `apps/backend/.env` and fill in values
4. Begin coding — start with `apps/backend/src/app.ts` and `apps/backend/migrations/`
