# API Contracts — CPQ/DMS

**Base URL:** `http://localhost:3333/api` (or proxied through Vite)
**Auth:** JWT Bearer token in `Authorization` header
**Response format:** JSON

All authenticated routes require `authMiddleware`. Admin routes require `roleMiddleware(['ADMIN'])`.

---

## Auth (`/auth`)

| Method | Path                    | Auth | Description                            |
| ------ | ----------------------- | ---- | -------------------------------------- |
| POST   | `/auth/login`           | No   | Login with email + password → JWT pair |
| POST   | `/auth/refresh`         | No   | Refresh expired token                  |
| POST   | `/auth/change-password` | Yes  | Change own password                    |

---

## Quotes (`/quotes`)

| Method | Path                                    | Auth | Description                                           |
| ------ | --------------------------------------- | ---- | ----------------------------------------------------- |
| GET    | `/quotes`                               | Yes  | List with pagination, sort, filters; `?overdue=true`  |
| POST   | `/quotes`                               | Yes  | Create new quote                                      |
| GET    | `/quotes/diff`                          | Yes  | Compare revision snapshots (`?rev1=X&rev2=Y`)         |
| GET    | `/quotes/:id`                           | Yes  | Get quote details with items                          |
| PATCH  | `/quotes/:id`                           | Yes  | Update quote fields                                   |
| PATCH  | `/quotes/:id/status`                    | Yes  | Transition status (send, approve, reject, cancel)     |
| POST   | `/quotes/:id/revision`                  | Yes  | Create new revision (saves snapshot before increment) |
| POST   | `/quotes/:id/copy`                      | Yes  | Copy quote (now copies discounts and totalCost)       |
| DELETE | `/quotes/:id`                           | Yes  | Soft-delete                                           |
| POST   | `/quotes/:quoteId/items`                | Yes  | Add item to quote                                     |
| PUT    | `/quotes/:quoteId/items/:id`            | Yes  | Update item                                           |
| DELETE | `/quotes/:quoteId/items/:id`            | Yes  | Remove item                                           |
| GET    | `/quotes/:id/history`                   | Yes  | Revision history                                      |
| GET    | `/quotes/:id/logs`                      | Yes  | Audit trail                                           |
| DELETE | `/quotes/revisions/:revisionId`         | Yes  | Delete a revision                                     |
| POST   | `/quotes/revisions/:revisionId/restore` | Yes  | Restore a deleted revision                            |

**Notes:** `categoryId` is optional + nullable (accepts `null` and empty string `''`). Pass `null` or omit for uncategorized quotes. `?overdue=true` on `GET /quotes` adds an `overdueCount` field to the response `meta`.

---

## Catalog (`/catalog`)

| Method | Path                                       | Auth | Description                                                            |
| ------ | ------------------------------------------ | ---- | ---------------------------------------------------------------------- |
| GET    | `/catalog/standard-drawings`               | Yes  | List with pagination, type filter, search, sort                        |
| GET    | `/catalog/standard-drawings/next-code`     | Yes  | Get next available code (e.g. "ITEM-001")                              |
| GET    | `/catalog/standard-drawings/:id`           | Yes  | Get single drawing                                                     |
| POST   | `/catalog/standard-drawings`               | Yes  | Create drawing                                                         |
| PUT    | `/catalog/standard-drawings/:id`           | Yes  | Update drawing                                                         |
| DELETE | `/catalog/standard-drawings/:id`           | Yes  | Soft-delete                                                            |
| GET    | `/catalog/standard-drawings/:id/versions`  | Yes  | List CAD versions                                                      |
| POST   | `/catalog/standard-drawings/:id/versions`  | Yes  | Upload new version (multipart)                                         |
| POST   | `/catalog/standard-drawings/:id/thumbnail` | Yes  | Upload thumbnail image (multipart, field `thumbnail`, .png/.jpg/.jpeg) |

---

## Clients (`/clients`)

| Method | Path                           | Auth | Description                     |
| ------ | ------------------------------ | ---- | ------------------------------- |
| GET    | `/clients`                     | Yes  | List with pagination and search |
| POST   | `/clients`                     | Yes  | Create client                   |
| GET    | `/clients/:id`                 | Yes  | Get client with contacts        |
| PUT    | `/clients/:id`                 | Yes  | Update client                   |
| DELETE | `/clients/:id`                 | Yes  | Soft-delete                     |
| POST   | `/clients/:id/contacts`        | Yes  | Add contact                     |
| PUT    | `/clients/contacts/:contactId` | Yes  | Update contact                  |
| DELETE | `/clients/contacts/:contactId` | Yes  | Soft-delete contact             |

---

## Search (`/search`)

| Method | Path      | Auth | Description                                                    |
| ------ | --------- | ---- | -------------------------------------------------------------- |
| GET    | `/search` | Yes  | Semantic search (Jaccard/Dice) across quotes, clients, catalog |

**Parameters:** `query` (string), `type` (ALL | CLIENT | CONTACT | QUOTE | DRAWING, default ALL), `threshold` (via system config, default 0.05)

**Notes:**

- Search is **accent-insensitive** — queries with `coração` match `coracao`, `fábrica` matches `fabrica`, etc.
- Uses `pg_trgm` + `unaccent` PostgreSQL extensions for efficient ILIKE matching before the Dice/Jaccard ranking layer

---

## Analytics (`/analytics`) — ADMIN only

| Method | Path                    | Auth  | Description                                                    |
| ------ | ----------------------- | ----- | -------------------------------------------------------------- |
| GET    | `/analytics/dashboard`  | Admin | Dashboard metrics (revenue, approval rate, categories, trends) |
| GET    | `/analytics/export`     | Admin | CSV export of analytics data                                   |
| GET    | `/analytics/quote-flow` | Admin | BI behavioral metrics (avg stage times, revisions, conversion) |

**`GET /analytics/quote-flow` returns 7 metrics:**

| Metric                      | Description                                |
| --------------------------- | ------------------------------------------ |
| `avgDaysCreateToSent`       | Average days from creation to first send   |
| `avgDaysSentToApproved`     | Average days from send to approval         |
| `avgRevisionsPerQuote`      | Average number of revisions per quote      |
| `avgDeltaEstToPrice`        | Average % change from estimated to price   |
| `avgDeltaPriceToContracted` | Average % change from price to contracted  |
| `conversionRate`            | Sent→Approved conversion rate (%)          |
| `marginByCategory`          | Array of `{ categoryName, averageMargin }` |

---

## Config (`/config`)

| Method | Path              | Auth  | Description              |
| ------ | ----------------- | ----- | ------------------------ |
| GET    | `/config`         | Yes   | Get all system configs   |
| GET    | `/config/company` | Yes   | Get company profile      |
| PUT    | `/config/company` | Admin | Update company profile   |
| GET    | `/config/:key`    | Yes   | Get single config by key |
| PUT    | `/config/:key`    | Admin | Update single config     |

---

## Admin Resources (all ADMIN)

| Method    | Path                | Description                                                       |
| --------- | ------------------- | ----------------------------------------------------------------- |
| CRUD      | `/users`            | User management                                                   |
| CRUD      | `/categories`       | Category + subcategory management                                 |
| GET/PATCH | `/approvals`        | Approval queue and decisions                                      |
| POST      | `/lgpd/client/:id`  | Anonymize client (name → "Anonimizado LGPD", contacts anonymized) |
| POST      | `/lgpd/user/:id`    | Anonymize user (name → "Usuário Anonimizado")                     |
| POST      | `/lgpd/contact/:id` | Anonymize contact (name → "Contato Anonimizado")                  |
