# Besawit Architecture

## Principles
- App Router Next.js as the delivery layer for frontend and backend handlers.
- Domain modules separated into `modules`, `services`, and `repositories`.
- Business rules live in services, not in pages or route handlers.
- Stock and finance changes are append-only through movement and payment logs.
- Sensitive records are voided or cancelled, never hard deleted.

## Layers
- `src/app`: routes, layouts, and API handlers.
- `src/modules`: domain-specific UI, configs, and screen composition.
- `src/services`: orchestration and business rules.
- `src/repositories`: database access with Drizzle ORM.
- `src/lib`: cross-cutting concerns such as auth, db, env, validation, and utils.
- `src/components`: reusable UI and layout primitives.

## Domain Modules
- Authentication & RBAC
- Dashboard
- Master Data
- Palm Agent
- Store
- Inventory
- Finance
- Reports
- Documents & WhatsApp hooks

## Deployment
- Containerized Next.js standalone server
- PostgreSQL in Docker for local and VPS deployments
- Drizzle migrations executed during release flow
