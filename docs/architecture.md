# Architecture Documentation — CPQ/DMS

```mermaid
graph TD
    User["👤 User (Browser)"] --> Web["🌐 React SPA (Vite :5173)"]
    Web -->|"REST JSON"| API["⚙️ Express API (:3333)"]
    API -->|"Prisma ORM"| DB[("🐘 PostgreSQL")]
    API -->|"JWT"| Auth["🔐 JWT Auth"]
    API -->|"Multer"| Uploads["📁 uploads/"]
    Web -->|"Axios Singleton"| API

    subgraph "Monorepo (pnpm workspaces)"
        Web
        API
    end

    subgraph "External"
        DB
        Uploads
    end

```

## API Architecture (`@cpq/api`)

### Layer Structure

```mermaid
flowchart LR
    subgraph "HTTP Layer"
        direction LR
        R["express Router"] --> M1["authMiddleware<br/>(JWT)"]
        M1 --> M2["roleMiddleware<br/>(RBAC, optional)"]
        M2 --> M3["validateRequest<br/>(Zod)"]
    end

    subgraph "Application Layer"
        M3 --> C["Controller"]
        C --> S["Service"]
    end

    subgraph "Data Layer"
        S --> P["Prisma Client<br/>(singleton)"]
        P --> DB[("PostgreSQL")]
    end

```

```
HTTP Request
  → Route definition (express Router)
  → authMiddleware (JWT verification)
  → roleMiddleware (RBAC, optional)
  → validateRequest (Zod schema)
  → Controller method
  → Service method
  → Prisma Client (singleton)
  → PostgreSQL
  → HTTP Response
```

### Route Groups (11)

| Prefix        | Auth | Admin   | Description                                                          |
| ------------- | ---- | ------- | -------------------------------------------------------------------- |
| `/auth`       | No   | No      | Login, refresh, change password                                      |
| `/users`      | Yes  | Yes     | User CRUD                                                            |
| `/categories` | Yes  | Yes     | Product categories                                                   |
| `/clients`    | Yes  | No      | Client CRM with contacts                                             |
| `/catalog`    | Yes  | No      | Standard drawings (products + CAD helpers + thumbnails)              |
| `/quotes`     | Yes  | No      | Quote lifecycle (CRUD, revisions, items, status)                     |
| `/approvals`  | Yes  | Yes     | Approval workflow                                                    |
| `/search`     | Yes  | No      | Semantic similarity search (Jaccard/Dice + pg_trgm/unaccent indexes) |
| `/analytics`  | Yes  | Admin   | BI dashboards & CSV export                                           |
| `/config`     | Yes  | Partial | System & company configuration                                       |
| `/lgpd`       | Yes  | Yes     | LGPD data privacy                                                    |

### Key Design Decisions

- **Soft delete** via `isActive: Boolean` on all major models
- **Price audit trail**: `estimatedPrice → price → contractedPrice` on quotes — auto-populated
- **Custom PrismaPg adapter** (not native Prisma driver)
- **Global Prisma singleton** to prevent connection exhaustion from tsx hot reload
- **JWT auth** with Axios interceptor for silent 401 → refresh token flow
- **Similarity engine**: native Jaccard/Dice coefficient — no vector DB or external AI
- **Search indexes**: 14 GIN trigram indexes (`pg_trgm` + `unaccent`) accelerate raw SQL ILIKE queries across all searchable text columns, fixing Portuguese accent search (ç, á, é, ã)
- **Auto-revision**: snapshot-based diff — each revision stores a JSON snapshot; `GET /quotes/diff?rev1=X&rev2=Y` compares snapshots
- **Overdue filter**: `?overdue=true` on `GET /quotes` returns quoting with past delivery date in DRAFT/SENT/PENDING_APPROVAL status

### Quote Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Create quote
    DRAFT --> SENT: Send to client (auto-populates price)
    DRAFT --> PENDING_APPROVAL: Send with margin < minimum (non-ADMIN)
    SENT --> APPROVED: Client approves (auto-populates contractedPrice)
    SENT --> REJECTED: Client rejects
    SENT --> DRAFT: Revise & re-send
    SENT --> PENDING_APPROVAL: Margin below minimum
    PENDING_APPROVAL --> APPROVED: Admin approves
    PENDING_APPROVAL --> DRAFT: Revise
    PENDING_APPROVAL --> CANCELED: Cancel
    APPROVED --> SUPERSEDED: New revision
    DRAFT --> CANCELED: Cancel
    SENT --> CANCELED: Cancel
    APPROVED --> CANCELED: Cancel
    REJECTED --> DRAFT: Revise
    SUPERSEDED --> [*]
    CANCELED --> [*]
```

**Price auto-population:** On DRAFT→SENT, `price` is computed from item totals with discounts. On SENT→APPROVED, `contractedPrice` is set to `quote.price`. Both can be overridden explicitly if sent in the request body.

### Data Model Relationships

```mermaid
erDiagram
    User ||--o{ Quote : "created by"
    Client ||--o{ Quote : "belongs to"
    Client ||--o{ ClientContact : "has"
    ClientContact ||--o{ Quote : "contact for"
    Quote ||--|{ QuoteItem : "contains"
    QuoteItem }o--o| StandardDrawing : "references"
    StandardDrawing ||--|{ StandardDrawingVersion : "versioned"
    Category ||--o{ StandardDrawing : "categorized"
    Category }o--|| Category : "self-referencing (parent)"
    Quote ||--o{ ApprovalRequest : "requires approval"
    Quote ||--o{ QuoteAuditLog : "audited"
    Quote }o--o| Category : "deprecated"
```

---

```mermaid
graph LR
    subgraph "Route Groups (11)"
        Auth["/auth"]
        Users["/users</br>(ADMIN)"]
        Cat["/categories</br>(ADMIN)"]
        Clients["/clients"]
        Catalog["/catalog"]
        Quotes["/quotes"]
        Approvals["/approvals</br>(ADMIN)"]
        Search["/search"]
        Analytics["/analytics</br>(ADMIN)"]
        Config["/config"]
        Lgpd["/lgpd</br>(ADMIN)"]
    end

    API["Express App"] --> Auth
    API --> Users
    API --> Cat
    API --> Clients
    API --> Catalog
    API --> Quotes
    API --> Approvals
    API --> Search
    API --> Analytics
    API --> Config
    API --> Lgpd
```

## Web Architecture (`@cpq/web`)

### Component Tree

```mermaid
graph TD
    App["<b>App</b>"] --> AuthCtx["AuthContext<br/>(JWT state)"]
    App --> Router["React Router v7"]

    Router --> Login["/login"]
    Router --> Layout["Layout (Sidebar + Header)"]

    Layout --> Dashboard["/dashboard"]
    Layout --> QuotesRoute["/quotes/*"]
    Layout --> Catalog["/catalog"]
    Layout --> Clients["/clients"]
    Layout --> Search["/search"]
    Layout --> Admin["/admin/*"]

    QuotesRoute --> List["Quotes (list)<br/>+ row-click navigation<br/>+ overdue filter toggle"]
    QuotesRoute --> New["QuoteComposer (new)<br/>+ Contact field after Client<br/>+ Quick-create client/contact buttons"]
    QuotesRoute --> View["QuoteViewPage<br/>+ RevisionDiff component<br/>+ Send/Approve actions in header"]
    QuotesRoute --> Edit["QuoteEditPage"]
    QuotesRoute --> PrintModal["QuotePrintModal"]
    QuotesRoute --> QuoteLayout["QuoteLayout<br/>+ sticky footer with per-status actions<br/>+ overflow-auto main area"]

    Admin --> Categories["Categories"]
    Admin --> Users["Users"]
    Admin --> Settings["Settings"]
    Admin --> Analytics["Analytics"]
    Admin --> Approvals["Approvals"]
    Admin --> Lgpd["LGPD"]

    subgraph "Data Layer"
        ReactQ["TanStack Query"] --> Axios["Axios Singleton"]
        Axios --> API["Express API :3333"]
    end

    Layout --> ReactQ

```

```
App
├── AuthContext (JWT state, user, roles)
├── Header
├── Sidebar (navigation + role-based items)
├── Layout (sidebar + content)
└── Routes
    ├── /login (public)
    ├── /dashboard (protected)
    ├── /quotes/* (protected)
    │   ├── / (list with filters, overdue toggle)
    │   ├── /new (QuoteComposer)
    │   ├── /:id (QuoteViewPage + RevisionDiff)
    │   ├── /:id/edit (QuoteComposer in edit mode + auto-revision confirm)
    │   └── /:id/print (QuotePrintModal)
    ├── /catalog (protected)
    ├── /clients (protected)
    ├── /search (protected)
    └── /admin/* (ADMIN only)
```

### State Management

- **Server state**: TanStack React Query 5 (global config in `lib/queryClient.ts`)
- **Auth state**: React Context (`AuthContext.tsx`)
- **Form state**: Local `useState` + `useReducer` (quote draft via `useQuoteDraft.ts`)
- **Persisted state**: `localStorage` for cached branding (logo, system name) — written by `Sidebar`, read by `Login` to render without API call
- **No global client state library** — React Query + Context + localStorage suffice

### UI Component Architecture

- **shadcn/ui** (`radix-nova` style) — generated primitives in `components/ui/`
- **Custom app components** in `components/` (Header, Sidebar, Layout, etc.)
- **Domain-specific components** co-located in `pages/` subdirectories
- **Form components** in `components/forms/` (reusable patterns for create/edit)

### Data Flow

```
User Action
  → Page Component
  → React Query mutation/query
  → Axios singleton (lib/axios.ts)
  → API REST endpoint
  → Prisma → PostgreSQL
  → Response → Query cache invalidation
  → UI re-render
```

### Security

- **RBAC**: 3 roles — `ADMIN`, `ESTIMATOR`, `VIEWER`
- **Protected routes**: `<ProtectedRoute>` wrapper checks auth + role
- **Admin-only routes**: wrapped with `allowedRoles={['ADMIN']}`
- **JWT refresh**: Axios interceptor handles 401 → refresh → retry
