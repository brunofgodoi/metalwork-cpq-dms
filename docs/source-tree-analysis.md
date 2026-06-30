# Source Tree Analysis — CPQ/DMS

## Overview

49 TypeScript files in API, 87 TS/TSX files in Web. Monorepo with pnpm workspaces.

```
project-root/
│
├── apps/
│   ├── api/                              # @cpq/api — Express + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma             # ← DB schema (11 models, 2 enums)
│   │   │   ├── seed-demo.ts              # Demo data (166 quotes, 15 drawings)
│   │   │   └── seed.ts                   # Production seed
│   │   ├── src/
│   │   │   ├── server.ts                 # ← Entry point
│   │   │   ├── @types/                   # Express type augmentation
│   │   │   ├── controllers/              # 11 controllers
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts             # Prisma singleton
│   │   │   ├── middlewares/              # 5 middleware (auth, role, validation, error, upload)
│   │   │   ├── routes/                   # 12 route files (11 groups + index)
│   │   │   ├── services/                 # 16 services (12 base + 4 similarity)
│   │   │   │   └── similarity/           # Jaccard/Dice search engine
│   │   │   └── utils/                    # AppError, logger
│   │   └── uploads/                      # CAD files, thumbnails
│   │
│   └── web/                              # @cpq/web — React + Vite
│       ├── src/
│       │   ├── main.tsx                  # ← Entry point
│       │   ├── App.tsx                   # Root component
│       │   ├── routes.tsx                # All route definitions
│       │   ├── components/
│       │   │   ├── ui/                   # 31 shadcn/ui primitives
│       │   │   ├── forms/                # 3 reusable forms
│       │   │   ├── quotes/               # Print modal + content
│       │   │   ├── Header.tsx
│       │   │   ├── Sidebar.tsx
│       │   │   ├── Layout.tsx
│       │   │   └── ...
│       │   ├── pages/
│       │   │   ├── quotes/               # Quote composer, view, edit, layout
│       │   │   ├── analytics/            # BI dashboard tabs
│       │   │   ├── catalog/              # Catalog detail panel
│       │   │   ├── Quotes.tsx            # Quote list
│       │   │   ├── Catalog.tsx           # Catalog grid
│       │   │   ├── Clients.tsx
│       │   │   ├── Settings.tsx
│       │   │   ├── Analytics.tsx
│       │   │   └── ...
│       │   ├── hooks/                    # 5 shared + 1 page hook
│       │   ├── contexts/
│       │   │   └── AuthContext.tsx
│       │   └── lib/                      # axios, queryClient, format, utils
│       └── index.html
│
├── docs/                                 # Project documentation
├── _bmad-output/                         # BMad planning artifacts
├── _bmad/                                # BMad methodology framework
└── DevelopmentPlan/                      # Dev roadmaps and plans
```

## Critical Folders

| Path                          | Purpose                            |
| ----------------------------- | ---------------------------------- |
| `apps/api/prisma/`            | Database schema, migrations, seeds |
| `apps/api/src/controllers/`   | HTTP request handlers              |
| `apps/api/src/services/`      | Business logic layer               |
| `apps/api/src/routes/`        | API route definitions              |
| `apps/api/src/middlewares/`   | Auth, validation, error handling   |
| `apps/web/src/pages/`         | Page components (one per route)    |
| `apps/web/src/components/`    | Reusable UI components             |
| `apps/web/src/components/ui/` | shadcn/ui primitives               |
| `apps/web/src/hooks/`         | Shared custom hooks                |
| `apps/web/src/contexts/`      | React contexts (auth)              |
