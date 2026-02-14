# Billings Calculator

## Overview

A medical billings calculator web application that allows healthcare professionals to track weekly billing items with live totals, persistent logging, and detailed breakdowns. The app replicates Excel-based billing logic in a web interface, supporting line-item counts for various medical consultation types, automatic calculation of totals (including BBI amounts, loading, and total billings), and a persistent log of weekly entries.

The app has two main pages:
- **Calculator** (`/`) — Enter counts for billing line items, see live-calculated totals, and save weekly entries
- **Billings Log** (`/log`) — View, inspect details, and delete saved weekly billing records

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side router)
- **State/Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (new-york style) built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Build Tool**: Vite
- **Path Aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`

### Backend
- **Framework**: Express 5 (ESM modules) running on Node.js
- **API Pattern**: RESTful JSON API under `/api/` prefix
- **Key Endpoints**:
  - `GET /api/weeks` — List all saved weeks
  - `GET /api/weeks/:id` — Get week details with line items
  - `POST /api/weeks` — Save a new week (validates with Zod, prevents duplicate week-ending dates)
  - `DELETE /api/weeks/:id` — Delete a week and its line items
- **Development**: Vite dev server middleware with HMR served through Express
- **Production**: Static files served from `dist/public`, built via custom build script using esbuild (server) + Vite (client)

### Shared Code
- **Location**: `shared/schema.ts` — Contains database schema, types, validation schemas, line item definitions, and computation logic
- **Validation**: Zod schemas (generated via drizzle-zod) for input validation on both client and server
- **Business Logic**: `computeTotals` function and `LINE_ITEMS` array define billing calculation rules (total minutes, prelim with/without BBI, 6.25% loading, total billings)

### Database
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Database**: PostgreSQL (connection via `DATABASE_URL` environment variable)
- **Schema Push**: `npm run db:push` uses drizzle-kit to push schema changes
- **Tables**:
  - `weekly_totals` — Stores computed totals per week (week_ending is unique)
  - `weekly_line_items` — Stores per-item counts for each week (foreign key to weekly_totals with cascade delete, unique on weeklyTotalId + itemKey)
- **Relations**: One-to-many from weekly_totals to weekly_line_items
- **Session Storage**: connect-pg-simple available for session storage (dependency present)

### Storage Layer
- **Pattern**: Repository/storage interface (`IStorage`) with `DatabaseStorage` implementation
- **Location**: `server/storage.ts` — All database operations abstracted behind interface methods

### Seed Data
- `server/seed.ts` — Seeds the database with sample weekly entries if none exist (runs on startup)

### Build & Deploy
- **Dev**: `npm run dev` — runs tsx with Vite dev middleware
- **Build**: `npm run build` — Vite builds client to `dist/public`, esbuild bundles server to `dist/index.cjs`
- **Start**: `npm start` — runs production build with `NODE_ENV=production`
- **Type Check**: `npm run check`

## External Dependencies

### Database
- **PostgreSQL** — Required, connected via `DATABASE_URL` environment variable
- **Drizzle ORM** — Schema definition and query building
- **Drizzle Kit** — Schema migrations and push

### Key Frontend Libraries
- **@tanstack/react-query** — Server state management and caching
- **Radix UI** — Accessible UI primitives (dialog, dropdown, tabs, toast, sidebar, etc.)
- **shadcn/ui** — Pre-built component library on top of Radix
- **wouter** — Client-side routing
- **recharts** — Charting library (available for future Milestone 2 features)
- **date-fns** — Date formatting utilities
- **embla-carousel-react** — Carousel component
- **react-day-picker** — Calendar/date picker component

### Key Backend Libraries
- **Express 5** — HTTP server framework
- **Zod** — Runtime validation
- **drizzle-zod** — Generate Zod schemas from Drizzle table definitions
- **nanoid** — ID generation for Vite cache busting

### Replit-Specific
- **@replit/vite-plugin-runtime-error-modal** — Runtime error overlay in development
- **@replit/vite-plugin-cartographer** — Dev tooling (dev only)
- **@replit/vite-plugin-dev-banner** — Dev banner (dev only)