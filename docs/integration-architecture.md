# Integration Architecture — CPQ/DMS

## Overview

Monorepo with 2 parts communicating over HTTP REST.

```mermaid
graph LR
    subgraph "Web App (:5173)"
        Vite["Vite Dev Server"]
        React["React SPA"]
        Axios["Axios Singleton"]
    end

    subgraph "API (:3333)"
        Express["Express Server"]
        Routes["11 Route Groups"]
        Auth["JWT Auth"]
    end

    subgraph "Infrastructure"
        DB[("PostgreSQL")]
        Uploads["📁 uploads/"]
    end

    React --> Vite
    Vite -->|"Proxy /api → :3333"| Express
    Axios -->|"REST JSON"| Express
    Express --> Routes
    Auth --> Express
    Routes --> DB
    Routes --> Uploads

    style React fill:#e1f5fe
    style Express fill:#fff3e0
    style DB fill:#f3e5f5
```

## Integration Points

| From                  | To            | Type             | Details                             |
| --------------------- | ------------- | ---------------- | ----------------------------------- |
| Web `Axios Singleton` | API `Express` | HTTP REST (JSON) | All data operations                 |
| Web `Vite Dev Server` | API `Express` | HTTP Proxy       | `/api/*` → `localhost:3333/api/*`   |
| API `Routes`          | `PostgreSQL`  | Prisma ORM       | Typed queries via Prisma Client     |
| API `Routes`          | `uploads/`    | File system      | Multer stores CAD/doc files to disk |

## Data Flow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant W as React SPA
    participant A as Express API
    participant D as PostgreSQL

    U->>W: Login (email + password)
    W->>A: POST /auth/login
    A->>D: Find user by email
    D-->>A: User record
    A->>A: bcrypt.compare(password)
    A-->>W: { accessToken, refreshToken }
    W->>W: Store tokens (localStorage)
    Note over W,A: Axios interceptor attaches Bearer token

    U->>W: Create quote with items
    W->>A: POST /quotes { client, items }
    A->>A: validateRequest (Zod)
    A->>D: INSERT quote + items
    D-->>A: Quote with items
    A-->>W: 201 Created

    U->>W: Search catalog drawings
    W->>A: GET /catalog/standard-drawings?type=&sort=
    A->>D: SELECT with filters + pagination
    D-->>A: Drawings with versions
    A-->>W: { data, meta }

    U->>W: Semantic search
    W->>A: GET /search?q=termo
    A->>D: Raw SQL with unaccent ILIKE + GIN trigram indexes
    D-->>A: Filtered candidates
    A->>A: Jaccard/Dice scoring & ranking
    A-->>W: Ranked results
```

## Shared Dependencies

Both apps share the root `package.json` for:

- **ESLint** — root `.eslintrc.js` + web `eslint.config.js`
- **Prettier** — root `.prettierrc` (single quotes, trailing commas, 100 width)
- **TypeScript** — root `tsconfig.json` (strict, ES2022)

## CORS Configuration

The API allows `FRONTEND_URL` (default `http://localhost:5173`) with credentials.
All API responses include CORS headers matching this single origin.
