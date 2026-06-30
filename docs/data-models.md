# Data Models — CPQ/DMS

**ORM:** Prisma + PrismaPg adapter on PostgreSQL

## Enums

### Role

`ADMIN | ESTIMATOR | VIEWER`

### QuoteStatus

`DRAFT | SENT | APPROVED | REJECTED | CANCELED | SUPERSEDED | PENDING_APPROVAL`

## Models (12)

### User (`users`)

Core identity, JWT auth via bcryptjs. Soft-deleted.

| Field                   | Type      | Notes                      |
| ----------------------- | --------- | -------------------------- |
| id                      | UUID      | PK                         |
| name                    | String    |                            |
| email                   | String    | Unique                     |
| password                | String    | bcrypt hash                |
| role                    | Role enum | ADMIN / ESTIMATOR / VIEWER |
| isActive                | Boolean   | Soft delete                |
| changePasswordNextLogin | Boolean   | Force password change      |

**LGPD rules:** Creating or updating _any_ user with name `'Usuário Anonimizado'` is blocked. Existing anonymized users cannot be updated or reactivated.

### Client (`clients`), ClientContact (`client_contacts`)

CRM for customer companies with multiple contacts per client. Soft-deleted.

**LGPD rules (clients):** Creating or restoring a client with name `'Anonimizado LGPD'` is blocked.

**LGPD rules (contacts):** Adding or restoring a contact with name `'Contato Anonimizado'` is blocked. Editing existing anonymized contacts is rejected.

### Category (`categories`)

Self-referencing tree (parent → subcategories). Soft-deleted.

### Quote (`quotes`)

Core domain entity — a commercial proposal.

| Field                     | Type        | Notes                                                |
| ------------------------- | ----------- | ---------------------------------------------------- |
| id                        | UUID        | PK                                                   |
| quoteNumber               | Int         | Autoincrement via `nextQuoteNumber` counter          |
| revision                  | String      | Default "A"                                          |
| isLatest                  | Boolean     | Current version flag                                 |
| clientId → Client         | FK          |                                                      |
| contactId → ClientContact | FK?         | Contact person                                       |
| categoryId → Category     | FK?         | Deprecated (multi-category via items)                |
| createdById → User        | FK          |                                                      |
| status                    | QuoteStatus | Lifecycle: DRAFT → SENT → APPROVED/REJECTED/CANCELED |
| estimatedPrice            | Decimal?    | Initial estimate                                     |
| price                     | Decimal?    | Auto-populated on send (computed from items)         |
| contractedPrice           | Decimal?    | Auto-populated on approve (= quote.price)            |
| totalCost                 | Decimal?    | Sum of item costs (unitCost \* quantity)             |
| discountPercent           | Decimal?    | Global discount %                                    |
| discountFixed             | Decimal?    | Global discount fixed amount                         |
| snapshot                  | Json?       | JSON snapshot of items/discounts at revision time    |
| deliveryDate              | DateTime?   | Expected delivery date                               |
| validUntil                | DateTime?   | Quote expiration date                                |
| wasProduced               | Boolean?    | Flag for CANCELED quotes that were produced          |
| rejectionReason           | String?     | Reason for rejection/cancellation                    |
| notes                     | Text?       | Free observations                                    |
| items                     | QuoteItem[] | Line items                                           |
| isActive                  | Boolean     | Soft delete                                          |

### QuoteItem (`quote_items`)

Line items within a quote.

| Field                | Type    | Notes                   |
| -------------------- | ------- | ----------------------- |
| project              | String  | Item name               |
| description          | Text    | Used in semantic search |
| quantity             | Int     |                         |
| unitCost / unitPrice | Decimal | Cost vs list price      |
| discountPercent      | Decimal | Per-item discount       |
| drawingId            | String? | FK to StandardDrawing   |
| process / material   | String? | Manufacturing info      |

### StandardDrawing (`standard_drawings`)

Catalog of standard products and CAD helpers.

| Field                 | Type                     | Notes                  |
| --------------------- | ------------------------ | ---------------------- |
| code                  | String                   | Unique, e.g. "CAT-001" |
| name                  | String                   |                        |
| type                  | String                   | "PRODUCT" or "HELPER"  |
| categoryId → Category | FK                       |                        |
| basePrice             | Decimal?                 |                        |
| versions              | StandardDrawingVersion[] | Version history        |

### StandardDrawingVersion (`standard_drawing_versions`)

Versioned CAD/document files per drawing.

### ApprovalRequest (`approval_requests`)

Workflow for quote approval by ADMIN users.

### QuoteAuditLog (`quote_audit_logs`)

Audit trail tracking all changes to quotes with JSON snapshots.

### SystemConfig (`system_configs`)

Key-value store for app configuration (session expiry, search settings, margins).

### CompanyConfig (`company_configs`)

Singleton (id = "default") with company info: name, document, address, phone, email, website, logo, footer.

## Conventions

- **Soft delete**: All major models use `isActive: Boolean @default(true)`
- **Timestamps**: All models have `createdAt` and `updatedAt`
- **Indexes**: Foreign keys and `isActive` are indexed for query performance
- **Search indexes**: 14 GIN trigram indexes on text columns (clients, contacts, quotes, items, drawings, categories) using `pg_trgm` + `unaccent` for accent-insensitive fuzzy search
