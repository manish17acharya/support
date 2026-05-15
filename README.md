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
