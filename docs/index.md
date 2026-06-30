# CPQ/DMS — Documentation Index

**Generated:** 2026-05-22

## Project Overview

- **Type:** Monorepo with 2 parts (api + web)
- **Primary Language:** TypeScript (strict)
- **Architecture:** RESTful API + SPA frontend

### Part: `@cpq/api`

- **Type:** Backend (Express + Prisma + PostgreSQL)
- **Root:** `apps/api/`
- **Files:** ~49 TypeScript files

### Part: `@cpq/web`

- **Type:** Frontend (React + Vite + shadcn/ui)
- **Root:** `apps/web/`
- **Files:** ~87 TS/TSX files

## Technical Documentation

- [Project Overview](./project-overview.md) — Executive summary, tech stack, repository structure
- [Architecture](./architecture.md) — Layer design, route groups, component tree, data flow — **with Mermaid diagrams**
- [Integration Architecture](./integration-architecture.md) — Multi-part communication, REST data flow, sequence diagrams
- [Source Tree Analysis](./source-tree-analysis.md) — Annotated directory tree, critical folders
- [Component Inventory](./component-inventory.md) — All pages, components, hooks, shadcn/ui primitives
- [Development Guide](./development-guide.md) — Setup, commands, conventions, code style
- [Data Models](./data-models.md) — 12 Prisma models, enums, relationships
- [API Contracts](./api-contracts.md) — 40+ REST endpoints by route group
- [Deployment Guide](./deployment-guide.md) — Docker Compose, env vars, volumes, production considerations

## Reference

- [Project README](../README.md) — Main entry point and run instructions

## Getting Started

```bash
pnpm install
cd apps/api && npx prisma migrate dev && cd ../..
pnpm db:seed:demo
pnpm dev
```
