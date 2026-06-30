# Development Guide — CPQ/DMS

## Prerequisites

- **Node.js** >= 18
- **pnpm** >= 8
- **PostgreSQL** 14+ (local or remote)

## Environment Setup

1. Clone the repository
2. Copy `apps/api/.env.example` (or create `.env` in `apps/api/`):

```
DATABASE_URL="postgresql://user:password@host:5432/cpq_metalurgica"
PORT=3333
JWT_SECRET="your-secret-key"
FRONTEND_URL="http://localhost:5173"
```

3. Install dependencies:

```bash
pnpm install
```

4. Run database migrations:

```bash
cd apps/api
npx prisma migrate dev
```

5. Seed demo data:

```bash
pnpm db:seed:demo
```

## Development Commands

| Command             | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `pnpm dev`          | Start API + Web concurrently with hot reload         |
| `pnpm api:dev`      | API only (tsx watch, port 3333)                      |
| `pnpm web:dev`      | Web only (Vite, port 5173)                           |
| `pnpm api:build`    | Bundle API with tsup → `dist/server.js`              |
| `pnpm api:start`    | Run compiled API                                     |
| `pnpm web:build`    | `tsc -b && vite build`                               |
| `pnpm db:seed:demo` | Seed demo data (166 quotes, 15 drawings, users)      |
| `pnpm lint`         | ESLint on root + web                                 |
| `pnpm format`       | Prettier (single quotes, trailing commas, 100 width) |

## Project Structure Conventions

- **API controllers**: PascalCase (`QuoteController.ts`)
- **API services**: PascalCase (`QuoteService.ts`)
- **API routes**: kebab-case.routes (`quote.routes.ts`)
- **API middlewares**: camelCase (`authMiddleware.ts`)
- **Web pages**: PascalCase (`Quotes.tsx`)
- **Web components**: PascalCase (`Sidebar.tsx`)
- **Web hooks**: use-kebab-case (`use-mobile.ts`)
- **Zod schemas**: camelCase const (`createQuoteSchema`)

## Code Style

- **TypeScript strict** mode enabled in both apps
- **Path alias**: `@/` → `apps/web/src/`
- **Imports**: Always use `@/` aliases (no relative `../../`)
- **DB**: Always filter `isActive: true` (soft delete)
- **API errors**: `new AppError('message', statusCode)` — never `new Error()`
- **Prisma**: Import `prisma` from `../lib/prisma` — never `new PrismaClient()`
- **Logging**: Use Pino logger — never `console.log` in API
- **React Query**: Use global `queryClient` from `@/lib/queryClient`

## No Test Framework

This project currently has **no test framework installed**. The `pnpm test` command is a stub.
All verification is done via manual testing, linting, and TypeScript compilation.

## Deployment

The API is compiled to `apps/api/dist/server.js` via tsup. The web app is built to
`apps/web/dist/` via Vite. No Dockerfile is present — deployment is manual.
