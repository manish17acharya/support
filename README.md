# STMS Developer Documentation

Support Ticket Management System — full-stack web application built with React 18 + Vite (frontend) and Laravel 12 (backend API) backed by MySQL 8.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Repository Structure](#2-repository-structure)
3. [Tech Stack](#3-tech-stack)
4. [Local Development Setup](#4-local-development-setup)
5. [Docker Setup](#5-docker-setup)
6. [Database Schema](#6-database-schema)
7. [Backend — Laravel API](#7-backend--laravel-api)
8. [Frontend — React SPA](#8-frontend--react-spa)
9. [Authentication & Authorization](#9-authentication--authorization)
10. [Roles & Permissions](#10-roles--permissions)
11. [Ticket Lifecycle](#11-ticket-lifecycle)
12. [SLA System](#12-sla-system)
13. [API Reference](#13-api-reference)
14. [Frontend Architecture](#14-frontend-architecture)
15. [Environment Variables](#15-environment-variables)
16. [Seeding & Demo Data](#16-seeding--demo-data)
17. [Deployment](#17-deployment)

---

## 1. Project Overview

STMS is a multi-role support ticket management system. Clients raise support tickets; CSR agents handle them; escalations flow through Bridge → Developer → QA pipelines; managers and admins monitor analytics and user activity.

**Core capabilities:**
- Multi-role ticket ownership (CSR, Bridge, Developer, QA)
- Escalation and sprint-based dev workflows
- SLA tracking with breach alerts
- Knowledge base with draft/publish workflow
- Client self-service portal with CSAT feedback
- Full audit log
- Docker-ready for production deployment

---

## 2. Repository Structure

```
support-ticket-system/
├── backend/                    # Laravel 12 REST API
│   ├── app/
│   │   ├── Http/Controllers/   # API controllers
│   │   └── Models/             # Eloquent models
│   ├── config/                 # Laravel config (cors, sanctum, etc.)
│   ├── database/
│   │   ├── migrations/         # Schema migrations
│   │   └── seeders/            # Demo data seeders
│   ├── routes/
│   │   └── api.php             # All API routes
│   ├── Dockerfile              # PHP-FPM image
│   └── docker/
│       └── entrypoint.sh       # Container startup script
│
├── frontend/                   # React 18 + Vite SPA
│   ├── src/
│   │   ├── App.jsx             # Root component, routing, theme
│   │   ├── AuthContext.jsx     # Auth state (token, user, login/logout/register)
│   │   ├── LoginPage.jsx       # Login + client self-registration
│   │   ├── api.js              # Axios instance + interceptors
│   │   ├── adapters.js         # API → UI shape transformers
│   │   ├── hooks.js            # Data-fetching React hooks
│   │   ├── components.jsx      # Shared UI components
│   │   ├── icons.jsx           # Icon wrappers
│   │   ├── styles.css          # Global CSS (custom properties, utilities)
│   │   ├── views-dashboard.jsx # CSR/Supervisor ticket list
│   │   ├── views-ticket.jsx    # Ticket detail page
│   │   ├── views-other.jsx     # Bridge, Dev/QA work queues
│   │   └── views-admin.jsx     # Admin views (KB, Companies, Users, Audit, Analytics)
│   ├── .dockerignore
│   └── package.json
│
├── docker/
│   ├── nginx.conf              # Nginx: SPA + FastCGI proxy to PHP-FPM
│   └── web.Dockerfile          # Multi-stage: Node build → Nginx serve
│
├── docker-compose.yml          # 3-service stack: db + app + web
├── .env.docker.example         # Env template for Docker deployment
└── .gitignore
```

---

## 3. Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + Vite 6 |
| Frontend routing | React Router DOM v7 |
| HTTP client | Axios 1.x |
| Icons | Lucide React |
| Styling | Tailwind CSS 3 + custom CSS properties |
| Backend framework | Laravel 12 (PHP 8.2+) |
| Authentication | Laravel Sanctum (Bearer tokens) |
| Database | MySQL 8.0 |
| Web server | Nginx (Alpine) |
| PHP runtime | PHP 8.2-FPM (Alpine) |
| Containerisation | Docker + Docker Compose |

---

## 4. Local Development Setup

### Prerequisites

- PHP 8.2+ with extensions: `pdo_mysql`, `zip`, `opcache`
- Composer 2
- Node 18+ and npm
- MySQL 8 (XAMPP, Laragon, or standalone)

### Backend

```bash
cd backend

# Install PHP dependencies
composer install

# Copy and configure environment
cp .env.example .env
# Edit .env: set DB_DATABASE=stms, DB_USERNAME=root, DB_PASSWORD=

# Generate app key
php artisan key:generate

# Run migrations
php artisan migrate

# Seed demo data
php artisan db:seed

# Start API server (default: http://localhost:8000)
php artisan serve
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server (default: http://localhost:5173)
npm run dev
```

The frontend `api.js` defaults to `http://localhost:8000/api` when `VITE_API_URL` is not set.

---

## 5. Docker Setup

### Build and Run

```bash
# Copy and fill in the env file
cp .env.docker.example .env.docker
# Edit .env.docker — set APP_KEY, DB_ROOT_PASSWORD, APP_URL

# Build all images
docker compose --env-file .env.docker build

# Start the stack
docker compose --env-file .env.docker up -d

# App is available at http://localhost (or the PORT you configured)
```

### Services

| Service | Image | Role |
|---|---|---|
| `db` | mysql:8.0 | MySQL database |
| `app` | Custom PHP 8.2-FPM | Laravel API |
| `web` | Custom Nginx Alpine | SPA + API proxy |

### How Nginx Routes Traffic

```
Browser → :80 (web container)
  /api/*  → FastCGI → app:9000 (PHP-FPM)
  /*      → /var/www/frontend/index.html (React SPA)
```

The frontend is pre-built into the `web` image at build time with `VITE_API_URL=/api` (same-origin, no CORS in production).

### Container Startup (entrypoint.sh)

On every `app` container start:
1. `php artisan config:cache`
2. `php artisan route:cache`
3. `php artisan migrate --force`
4. Start PHP-FPM

Migrations run automatically on every deploy — safe because Laravel skips already-run migrations.

---

## 6. Database Schema

### Lookup / Reference Tables

**`ticket_statuses`** — 13 statuses in lifecycle order:

| Name | Used When |
|---|---|
| New | Just created, no one assigned yet |
| Open | Assigned to CSR, being worked |
| Waiting for Client | Pending info from client — SLA paused |
| Escalated to Dev | Handed off to Bridge for dev escalation |
| Under Review | Bridge reviewing before sprint assignment |
| Deferred to Sprint | Scheduled in a sprint |
| In Development | Developer actively working |
| In QA/Testing | Developer pushed to QA |
| Ready for Deployment | QA approved |
| Deployed | Released to production |
| Resolved | Solution confirmed |
| Closed | Ticket archived |
| Reopened | Closed ticket reopened by client |

**`ticket_priorities`**

| Name | Response SLA | Resolution SLA |
|---|---|---|
| Critical | 30 min | 4 hr |
| High | 1 hr | 8 hr |
| Medium | 4 hr | 24 hr |
| Low | 8 hr | 48 hr |

**`ticket_categories`**: Bug Report, Feature Request, Service Request, Complaint, General Inquiry, Other

**`intake_channels`**: Email, Web Form, Phone, WhatsApp, Walk-in

### Core Tables

**`users`**

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| name | varchar(255) | |
| email | varchar(255) | unique |
| password | varchar(255) | bcrypt hashed |
| role | enum | See roles section |
| client_company_id | FK → client_companies | Clients only |
| is_vip | boolean | default false |
| is_active | boolean | default true — soft deactivation |

**`client_companies`**

| Column | Type |
|---|---|
| id | bigint PK |
| name | varchar(255) unique |
| primary_email | varchar(255) nullable |
| phone | varchar(50) nullable |
| is_vip | boolean |

**`tickets`** — main ticket table

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| ticket_id | varchar(30) unique | Format: `SUP-YYYY-MMDD-NNN` |
| title | varchar(255) | |
| description | text | |
| status_id | FK → ticket_statuses | |
| priority_id | FK → ticket_priorities | |
| category_id | FK → ticket_categories | nullable |
| intake_channel_id | FK → intake_channels | nullable |
| contact_email | varchar(255) | not null |
| client_company_id | FK → client_companies | nullable |
| raised_by_csr | boolean | true if staff created it on behalf of client |
| assigned_csr_id | FK → users | nullable |
| bridge_person_id | FK → users | nullable |
| assigned_developer_id | FK → users | nullable |
| assigned_qa_id | FK → users | nullable |
| sprint_id | FK → sprints | nullable |
| sla_response_breached | boolean | |
| sla_resolution_breached | boolean | |
| sla_paused_at | timestamp | set when Waiting for Client |
| first_responded_at | timestamp | set on first Client_Facing comment |
| resolved_at | timestamp | set when status → Resolved |
| deployed_at | timestamp | set when status → Deployed |
| closed_at | timestamp | set when status → Closed |
| reopened_count | int | |
| csat_score | tinyint(1–5) | nullable |
| csat_comment | text | nullable |
| deleted_at | timestamp | soft deletes |

**`ticket_comments`**

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | |
| ticket_id | FK → tickets | |
| author_id | FK → users | |
| content | text | |
| comment_type | enum | Client_Facing, Internal_Note, System |
| channel | enum | Email, WhatsApp, Phone, Portal, Internal |
| created_at | timestamp | no updated_at |

**`ticket_status_history`**

| Column | Type |
|---|---|
| ticket_id | FK → tickets |
| changed_by | FK → users |
| from_status | varchar |
| to_status | varchar |
| created_at | timestamp |

**`sprints`**

| Column | Type |
|---|---|
| id | bigint PK |
| name | varchar(255) |
| status | enum: Planned, Active, Completed |
| start_date | date nullable |
| end_date | date nullable |
| notes | text nullable |

**`knowledge_base_articles`**

| Column | Type |
|---|---|
| id | bigint PK |
| title | varchar(255) |
| content | mediumtext — FULLTEXT indexed |
| category | varchar(100) nullable |
| status | enum: Draft, Published, Archived |
| author_id | FK → users |
| approved_by | FK → users nullable |
| approved_at | timestamp nullable |
| view_count | int default 0 |

**`audit_logs`**

| Column | Type |
|---|---|
| id | bigint PK |
| user_id | FK → users nullable |
| action | varchar(100) |
| entity_type | varchar(100) nullable |
| entity_id | bigint nullable |
| old_values | JSON nullable |
| new_values | JSON nullable |
| ip_address | varchar(45) nullable |
| created_at | timestamp |

---

## 7. Backend — Laravel API

### Directory Layout

```
backend/app/
├── Http/Controllers/
│   ├── Auth/
│   │   └── AuthController.php      # login, logout, register, me
│   ├── TicketController.php        # full ticket CRUD + comments, status, assign, rate
│   ├── UserController.php          # user CRUD
│   ├── CompanyController.php       # company CRUD
│   ├── SprintController.php        # sprint CRUD
│   ├── KnowledgeBaseController.php # KB article CRUD
│   ├── LookupController.php        # statuses, priorities, categories, channels
│   ├── DashboardController.php     # my tickets + new queue
│   └── AnalyticsController.php     # stats, charts
└── Models/
    ├── User.php
    ├── Ticket.php
    ├── TicketComment.php
    ├── TicketStatus.php / TicketPriority.php / TicketCategory.php
    ├── TicketStatusHistory.php
    ├── ClientCompany.php
    ├── Sprint.php
    ├── KnowledgeBaseArticle.php
    ├── IntakeChannel.php
    └── Tag.php
```

### Key Controller Behaviours

**TicketController — `index()`**

Accepts query parameters:
- `status` — single status name
- `statuses` — comma-separated status names (used by tab filters)
- `priority_id` — priority ID
- `csr` — assigned CSR user ID
- `developer_id` — assigned developer ID
- `qa_id` — assigned QA ID
- `sprint_id` — sprint ID
- `company_id` — client company ID
- `category_id` — category ID
- `search` — full-text search on title and ticket_id
- `created_after` / `created_before` — date range (YYYY-MM-DD)
- `per_page` — results per page (default 25)

Returns paginated JSON with `data`, `meta.total`, `meta.current_page`, `meta.last_page`.

**TicketController — `store()`**

Auto-generates `ticket_id` in format `SUP-YYYY-MMDD-NNN` (sequential per day).
Auto-sets `contact_email` from the authenticated user if not provided.
Creates first status history entry.

**TicketController — `updateStatus()`**

Sets status, records history, and auto-populates timestamp columns:
- `resolved_at` when status → Resolved
- `deployed_at` when status → Deployed
- `closed_at` when status → Closed
- `sla_paused_at` when status → Waiting for Client
- Clears `sla_paused_at` when leaving Waiting for Client

**TicketController — `addComment()`**

Sets `first_responded_at` on the parent ticket when the first `Client_Facing` comment is added by a staff user.

### CORS Configuration (`config/cors.php`)

```php
'allowed_origins' => array_filter(array_unique([
    env('FRONTEND_URL', 'http://localhost:5173'),
    env('APP_URL', ''),
])),
'supports_credentials' => true,
```

In production with Docker (same-origin), CORS is irrelevant since the frontend is served by the same Nginx.

---

## 8. Frontend — React SPA

### Entry Point and Routing (`App.jsx`)

The app has no URL-based router — navigation is state-driven. `currentView` in `App` determines what to render.

**Role → default view mapping:**

| Role | Default View |
|---|---|
| Client | `client-home` |
| CSR | `dashboard` |
| Supervisor | `dashboard` |
| Bridge | `bridge` |
| Developer | `dev` |
| QA | `dev` |
| Admin | `analytics` |
| Manager | `analytics` |
| SuperAdmin | `users` |

**View → Component mapping:**

| View key | Component | Description |
|---|---|---|
| `dashboard` | DashboardView | Ticket list with filters + bulk actions |
| `ticket` | TicketDetail | Full ticket detail |
| `tickets` | TicketsList | All tickets (manager view) |
| `new-ticket` | NewTicketForm | Create ticket form |
| `bridge` | BridgeView | Escalation kanban board |
| `sprints` | SprintsView | Sprint management |
| `dev` | DevWorkView | Dev/QA work queue |
| `analytics` | AnalyticsView | Charts and stats |
| `kb` | KnowledgeBase | KB articles CRUD |
| `client-home` | ClientPortal | Client's own tickets |
| `companies` | CompaniesView | Company management |
| `users` | UsersView | User management |
| `audit` | AuditLog | Audit trail |
| `settings` | SettingsView | SLA and system settings |

### Theme System (`App.jsx`)

Three CSS custom properties control the UI:
- `--accent` — oklch base color (default `0.6 0.2 250`)
- `data-theme` on `<html>` — `light` or `dark`
- `data-density` on `<html>` — `compact`, `comfortable`, or `spacious`

These are persisted to `localStorage` and applied immediately on load.

---

## 9. Authentication & Authorization

### Flow

1. User submits email + password to `POST /api/auth/login`
2. API returns `{ user, token }` — 30-day Sanctum Bearer token
3. Frontend stores token in `localStorage` under key `stms_token`
4. All subsequent requests include `Authorization: Bearer <token>` header (set by Axios interceptor)
5. On 401, the interceptor clears localStorage and redirects to `/`

### AuthContext (`AuthContext.jsx`)

```jsx
const { user, login, logout, register, loading } = useAuth()
```

- `user` — `{ id, name, email, role, is_vip, client_company_id }` or `null`
- `login(email, password)` — calls API, stores token, sets user
- `logout()` — calls API, clears token, clears user
- `register(payload)` — client self-registration, same result shape as login
- `loading` — true while checking stored token on initial load

### Client Self-Registration

`POST /api/auth/register` accepts:

```json
{
  "name": "string",
  "email": "string",
  "password": "string (min 8)",
  "company_name": "string"
}
```

Uses `ClientCompany::firstOrCreate(['name' => ...])` — two clients from the same company share the company record automatically.

Returns `201` with `{ user, token }` same as login.

---

## 10. Roles & Permissions

Nine roles in total:

| Role | Type | Description |
|---|---|---|
| SuperAdmin | Staff | Full access, user management |
| Admin | Staff | Analytics, KB, companies |
| Manager | Staff | Analytics, team oversight |
| Supervisor | Staff | Dashboard, ticket overview |
| CSR | Staff | Primary ticket handlers |
| Bridge | Staff | Escalation managers, sprint assignment |
| Developer | Staff | Dev work queue, push to QA |
| QA | Staff | QA queue, approve/reject deploys |
| Client | External | Self-service portal only |

**Role enforcement** is currently frontend-only (UI shows role-appropriate views). Backend validation is enforced at the Sanctum middleware level (authenticated vs unauthenticated) but per-role endpoint guards are not yet implemented.

---

## 11. Ticket Lifecycle

```
[Client creates]
       ↓
     New
       ↓
     Open ←────────────────────── Reopened
       ↓                               ↑
  ┌────┴────────────────┐         Resolved/Closed
  │                     │
Waiting for Client   Escalated to Dev
  │                     ↓
  │               Under Review
  │                     ↓
  │             Deferred to Sprint
  │                     ↓
  │              In Development
  │                     ↓
  │               In QA/Testing
  │                     ↓
  │           Ready for Deployment
  │                     ↓
  └──────────────→  Deployed
                        ↓
                    Resolved
                        ↓
                     Closed
```

**Assignee chain:**
- CSR owns the ticket throughout
- Bridge takes escalated tickets and assigns sprints
- Developer is assigned when ticket enters In Development
- QA is assigned when ticket enters In QA/Testing

---

## 12. SLA System

SLA targets are defined per priority:

| Priority | Response | Resolution |
|---|---|---|
| Critical | 30 min | 4 hr |
| High | 1 hr | 8 hr |
| Medium | 4 hr | 24 hr |
| Low | 8 hr | 48 hr |

**Response SLA** is met when `first_responded_at` is set (first Client_Facing comment by staff).

**Resolution SLA** is met when `resolved_at` is set.

**Pause:** When status becomes "Waiting for Client", `sla_paused_at` is set. The frontend adapter subtracts this pause time from elapsed calculations.

**Breach flags** (`sla_response_breached`, `sla_resolution_breached`) are boolean columns. The adapter calculates remaining time and breach status dynamically from timestamps.

---

## 13. API Reference

Base URL: `http://localhost:8000/api` (dev) or `/api` (production Docker)

All authenticated endpoints require: `Authorization: Bearer <token>`

### Auth

| Method | Endpoint | Auth | Body | Response |
|---|---|---|---|---|
| POST | `/auth/login` | No | `{ email, password }` | `{ user, token }` |
| POST | `/auth/register` | No | `{ name, email, password, company_name }` | `201 { user, token }` |
| POST | `/auth/logout` | Yes | — | `200` |
| GET | `/auth/me` | Yes | — | `{ user }` |

### Tickets

| Method | Endpoint | Auth | Notes |
|---|---|---|---|
| GET | `/tickets` | Yes | Filters: status, statuses, priority_id, csr, search, category_id, created_after, created_before, per_page |
| POST | `/tickets` | Yes | Create ticket |
| GET | `/tickets/{id}` | Yes | Full detail with relations |
| PUT | `/tickets/{id}` | Yes | Update title, description, priority, category, sprint |
| DELETE | `/tickets/{id}` | Yes | Soft delete |
| POST | `/tickets/{id}/comments` | Yes | `{ content, comment_type, channel }` |
| PATCH | `/tickets/{id}/status` | Yes | `{ status_id }` |
| PATCH | `/tickets/{id}/assign` | Yes | `{ role: 'csr'|'bridge'|'developer'|'qa', user_id }` |
| POST | `/tickets/{id}/rate` | Yes | `{ score: 1-5, comment? }` |

### Users

| Method | Endpoint | Body |
|---|---|---|
| GET | `/users` | Optional `?role=CSR` |
| POST | `/users` | `{ name, email, password, role }` |
| PATCH | `/users/{id}` | Any user fields |
| DELETE | `/users/{id}` | Soft-deactivates (sets is_active=false) |

### Knowledge Base

| Method | Endpoint | Body |
|---|---|---|
| GET | `/kb-articles` | Optional `?search=` |
| POST | `/kb-articles` | `{ title, content, category, status }` |
| PUT | `/kb-articles/{id}` | Any KB fields |
| DELETE | `/kb-articles/{id}` | Hard delete |

### Other Endpoints

| Method | Endpoint | Returns |
|---|---|---|
| GET | `/lookups` | `{ statuses[], priorities[], categories[], channels[] }` |
| GET | `/dashboard` | `{ my_tickets[], new_queue[] }` |
| GET | `/analytics` | Stats and chart data |
| GET | `/companies` | Company list |
| POST | `/companies` | Create company |
| PUT | `/companies/{id}` | Update company |
| DELETE | `/companies/{id}` | Delete company |
| GET | `/sprints` | Sprint list |
| POST | `/sprints` | Create sprint |
| PATCH | `/sprints/{id}` | Update sprint |
| DELETE | `/sprints/{id}` | Delete sprint |
| GET | `/audit-logs` | Audit trail |

---

## 14. Frontend Architecture

### Data Layer

**`api.js`** — Axios instance

```js
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
})
```

Request interceptor adds `Authorization: Bearer <token>` from localStorage.
Response interceptor catches `401` → clears token → redirects to `/`.

**`hooks.js`** — Custom React hooks (all use `useEffect` + `useState` pattern)

| Hook | Purpose | Returns |
|---|---|---|
| `useTickets(params)` | Paginated ticket list with filters | `{ tickets, meta, loading, error, reload }` |
| `useTicket(id)` | Single ticket detail | `{ ticket, loading, error, reload }` |
| `useDashboard()` | My tickets + new queue | `{ data, loading, error, reload }` |
| `useUsers(role?)` | User list, optional role filter | `{ users, loading, error, reload }` |
| `useLookups()` | Statuses, priorities, categories, channels | `{ lookups, loading }` |
| `useEscalatedTickets()` | Escalation pipeline tickets | `{ tickets, loading, error, reload }` |
| `useSprints()` | All sprints | `{ sprints, loading, error, reload }` |
| `useAnalytics()` | Analytics stats | `{ data, loading, error }` |
| `useCompanies()` | Company list | `{ companies, loading, error, reload }` |
| `useKbArticles(search?)` | KB articles with optional search | `{ articles, loading, error, reload }` |

**`adapters.js`** — API shape → UI shape transformers

`adaptTicket(apiTicket, lookups)` maps:
- DB status names → UI keys (e.g., `"In QA/Testing"` → `"InQA"`)
- Calculates SLA elapsed/remaining/breached from timestamps
- Normalises assignee objects to `{ id, name, email, initials, color }`
- Converts ISO timestamps to relative labels (e.g., "2h ago")

`STATUS_KEY_MAP` — used in adapters:
```js
{
  'New': 'New', 'Open': 'Open', 'Waiting for Client': 'WaitingClient',
  'Resolved': 'Resolved', 'Closed': 'Closed',
  'Escalated to Dev': 'EscalatedDev', 'Under Review': 'UnderReview',
  'Deferred to Sprint': 'DeferredSprint', 'In Development': 'InDevelopment',
  'In QA/Testing': 'InQA', 'Ready for Deployment': 'ReadyDeploy',
  'Deployed': 'Deployed', 'Reopened': 'Reopened',
}
```

`STATUS_UI_TO_DB` — used when sending status updates to API:
```js
{
  New: 'New', Open: 'Open', WaitingClient: 'Waiting for Client',
  Resolved: 'Resolved', Closed: 'Closed', EscalatedDev: 'Escalated to Dev',
  UnderReview: 'Under Review', DeferredSprint: 'Deferred to Sprint',
  InDevelopment: 'In Development', InQA: 'In QA/Testing',
  ReadyDeploy: 'Ready for Deployment', Deployed: 'Deployed', Reopened: 'Reopened',
}
```

### View Files

| File | Contains |
|---|---|
| `views-dashboard.jsx` | `DashboardView` — ticket list, filter bar, bulk action bar, tab counts |
| `views-ticket.jsx` | `TicketDetail` — full ticket view, reply composer, status dropdown, all tabs |
| `views-other.jsx` | `BridgeView`, `DevWorkView`, `NewTicketForm`, `ClientPortal`, `SprintsView` |
| `views-admin.jsx` | `AnalyticsView`, `KnowledgeBase`, `CompaniesView`, `UsersView`, `AuditLog`, `SettingsView` |

### Dashboard Filter Bar (`views-dashboard.jsx`)

Server-side filters — passed as query params to `useTickets(params)`:

| Filter | API param | Source |
|---|---|---|
| Priority | `priority_id` | `useLookups().priorities` |
| Category | `category_id` | `useLookups().categories` |
| Assignee | `csr` | `useUsers()` filtered to CSR role |
| From date | `created_after` | Date input |
| To date | `created_before` | Date input |

Tab-based status filtering uses `statuses` (comma-separated):

```js
const TAB_STATUSES = {
  new: 'New',
  open: 'Open',
  waiting: 'Waiting for Client',
  escalated: 'Escalated to Dev,Under Review,Deferred to Sprint',
  'in-dev': 'In Development,In QA/Testing,Ready for Deployment,Deployed',
  resolved: 'Resolved,Closed',
}
```

### Bulk Actions (`views-dashboard.jsx`)

Appears when `selected.size > 0`. Uses `Promise.all()` for parallel API calls:

```js
// Assign CSR to all selected tickets
bulkAssignCsr(csrId) → Promise.all([...selected].map(id =>
  api.patch(`/tickets/${id}/assign`, { role: 'csr', user_id: +csrId })
))

// Change status of all selected tickets
bulkSetStatus(statusName) → Promise.all([...selected].map(id =>
  api.patch(`/tickets/${id}/status`, { status_id })
))
```

---

## 15. Environment Variables

### Backend (`.env`)

| Variable | Default | Notes |
|---|---|---|
| `APP_KEY` | — | Generate with `php artisan key:generate` |
| `APP_URL` | `http://localhost` | Public URL |
| `DB_HOST` | `127.0.0.1` | `db` in Docker |
| `DB_PORT` | `3306` | |
| `DB_DATABASE` | `stms` | |
| `DB_USERNAME` | `root` | |
| `DB_PASSWORD` | — | |
| `FRONTEND_URL` | `http://localhost:5173` | Added to CORS allowed origins |
| `SANCTUM_STATEFUL_DOMAINS` | `localhost:5173` | Cookie-based auth domains |

### Frontend (`.env` / Vite)

| Variable | Default | Notes |
|---|---|---|
| `VITE_API_URL` | `http://localhost:8000/api` | Set to `/api` in Docker build |

### Docker (`.env.docker`)

| Variable | Notes |
|---|---|
| `APP_KEY` | `base64:...` — generate with `php artisan key:generate --show` |
| `DB_ROOT_PASSWORD` | MySQL root password |
| `APP_URL` | Public URL of server (e.g., `http://yourdomain.com`) |
| `PORT` | Host port to expose (default `80`) |
| `SANCTUM_DOMAIN` | Sanctum stateful domain (same hostname as APP_URL) |

---

## 16. Seeding & Demo Data

Run all seeders:
```bash
php artisan db:seed
```

Or individual seeders:
```bash
php artisan db:seed --class=AdminUserSeeder    # Staff accounts
php artisan db:seed --class=ContentSeeder       # Tickets, KB articles, companies
php artisan db:seed --class=EscalationSeeder    # Escalated tickets in dev pipeline
php artisan db:seed --class=SystemTestSeeder    # Full system test dataset
```

### Default Staff Accounts (password: `password`)

| Email | Role |
|---|---|
| `superadmin@stms.local` | SuperAdmin |
| `admin@stms.local` | Admin |
| `manager@stms.local` | Manager |
| `supervisor@stms.local` | Supervisor |
| `csr@stms.local` | CSR |
| `bridge@stms.local` | Bridge |
| `dev1@stms.local` | Developer |
| `dev2@stms.local` | Developer |
| `qa@stms.local` | QA |

### SystemTestSeeder Dataset

- 5 CSR users
- 1 Bridge
- 3 Developers, 2 QA
- 15 registered client accounts (10 with active tickets)
- 3 escalated tickets in dev pipeline
- 23 resolved/closed tickets

---

## 17. Deployment

### GitHub

Remote: `https://github.com/manish17acharya/support.git`

```bash
git push origin main
```

### Production Docker Deployment

On any Linux server with Docker installed:

```bash
git clone https://github.com/manish17acharya/support.git
cd support

cp .env.docker.example .env.docker
# Edit .env.docker with production values

docker compose --env-file .env.docker build
docker compose --env-file .env.docker up -d
```

The database is persisted in a Docker named volume (`stms_db_data`). Migrations run automatically on startup.

### First-Time Production Setup

After first `up -d`, seed the admin user:

```bash
docker compose exec app php artisan db:seed --class=AdminUserSeeder
```

Then log in with `superadmin@stms.local` / `password` and change the password immediately.

### Updating Production

```bash
git pull origin main
docker compose --env-file .env.docker build app web
docker compose --env-file .env.docker up -d --no-deps app web
```

The `db` service is not rebuilt on code changes — only `app` and `web`.
