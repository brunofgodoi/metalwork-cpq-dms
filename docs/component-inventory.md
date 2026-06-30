# Component Inventory — CPQ/DMS Web

## Application Components (`components/`)

| Component               | Purpose                                      | Routes            |
| ----------------------- | -------------------------------------------- | ----------------- |
| `Header.tsx`            | Top bar with user info, theme toggle, logout | All layout routes |
| `Sidebar.tsx`           | Collapsible navigation with role-based items | All layout routes |
| `Layout.tsx`            | Sidebar + Header + content wrapper           | All layout routes |
| `ProtectedRoute.tsx`    | Auth + RBAC guard                            | Protected routes  |
| `QuickCreateModals.tsx` | Inline create: client, contact, category     | Quotes, Clients   |
| `QuoteTimeline.tsx`     | Revision history timeline                    | Quotes view       |

## Form Components (`components/forms/`)

| Component          | Entity               | Used In                            |
| ------------------ | -------------------- | ---------------------------------- |
| `ClientForm.tsx`   | Client create/edit   | Clients page, QuickCreateModals    |
| `ContactForm.tsx`  | Client contact       | Clients page, QuickCreateModals    |
| `CategoryForm.tsx` | Category create/edit | Categories page, QuickCreateModals |

## Print Components (`components/quotes/`)

| Component               | Purpose                                                       |
| ----------------------- | ------------------------------------------------------------- |
| `QuotePrintContent.tsx` | Reusable A4 proposal layout with logo, conditions, signatures |
| `QuotePrintModal.tsx`   | Dialog wrapper for print preview with toolbar                 |

## shadcn/ui Primitives (`components/ui/` — 31 files)

| Category       | Components                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| **Layout**     | `card`, `sheet`, `dialog`, `sidebar`, `tabs`, `collapsible`                                                  |
| **Form**       | `input`, `select`, `combobox`, `command`, `field`, `label`, `masked-input`, `textarea`, `network-path-input` |
| **Feedback**   | `badge`, `button`, `skeleton`, `empty`, `api-error`, `toast` (sonner), `alert`, `alert-dialog`               |
| **Navigation** | `pagination`, `sortable-table-head`, `table`, `tooltip`                                                      |
| **Data**       | `chart` (Recharts wrapper), `separator`                                                                      |
| **Utility**    | `input-group`, `custom-button`, `custom-dialog`, `toggle`                                                    |

## Page Components (`pages/`)

| Page                             | Route                             | Description                                              |
| -------------------------------- | --------------------------------- | -------------------------------------------------------- |
| `Login.tsx`                      | `/login`                          | Auth form                                                |
| `Dashboard.tsx`                  | `/dashboard`                      | KPI summary cards                                        |
| `Quotes.tsx`                     | `/quotes`                         | Quote list with inline actions, sorting, pagination      |
| `quotes/QuoteComposer.tsx`       | `/quotes/new`, `/quotes/:id/edit` | Full quote editor with catalog library sidebar           |
| `quotes/QuoteViewPage.tsx`       | `/quotes/:id`                     | Quote detail view                                        |
| `Catalog.tsx`                    | `/catalog`                        | Catalog grid with cards, type filter, sort, code gen     |
| `catalog/CatalogDetailPanel.tsx` | —                                 | Drawing detail sheet with version history                |
| `Clients.tsx`                    | `/clients`                        | Client CRM with contacts                                 |
| `Search.tsx`                     | `/search`                         | Semantic similarity search UI                            |
| `Settings.tsx`                   | `/admin/settings`                 | Company profile, security, search, commercial goals      |
| `Analytics.tsx`                  | `/admin/analytics`                | BI dashboard with 3 tabs (overview, process, efficiency) |
| `Approvals.tsx`                  | `/admin/approvals`                | Approval queue                                           |
| `Categories.tsx`                 | `/admin/categories`               | Category tree management                                 |
| `Users.tsx`                      | `/admin/users`                    | User CRUD                                                |
| `ChangePassword.tsx`             | `/change-password`                | Password change form                                     |
| `Lgpd.tsx`                       | `/admin/lgpd`                     | LGPD privacy operations                                  |
| `QuotePrint.tsx`                 | `/quotes/:id/print`               | Standalone print page (legacy, replaced by modal)        |

## Hooks (`hooks/`)

| Hook                             | Purpose                              |
| -------------------------------- | ------------------------------------ |
| `use-analytics.ts`               | BI data fetching and filter state    |
| `use-mobile.ts`                  | Responsive breakpoint detection      |
| `use-network-paths.ts`           | Recent network paths for file picker |
| `useKeyboardShortcuts.ts`        | Global keyboard shortcuts            |
| `useSortable.ts`                 | Sortable table column state          |
| `useQuoteDraft.ts` (page-scoped) | Quote draft CRUD with useReducer     |
