# Implementation Plan

## 1. Platform Foundation
- Finalize Next.js App Router structure.
- Configure environment loading, typed utilities, and standalone build output.
- Add session-based auth and RBAC middleware.

## 2. Data Layer
- Define Drizzle schema for master, transactions, inventory, finance, and audit tables.
- Generate migrations and add seed data for realistic onboarding.
- Prepare repository layer per domain.

## 3. Core Modules
- Master Data CRUD APIs and listing pages.
- Palm purchase and sales services with deduction, return, margin, hutang, and piutang logic.
- Store purchase and sales services with stock movement creation.
- Inventory stock movement, stock take, and stock adjustment approval flow.
- Finance payables, receivables, payments, and cash ledger posting.

## 4. Operations UI
- Build app shell, KPI dashboard, enterprise-style tables, and section-based forms.
- Add sticky summary panels on transactional pages.
- Provide responsive layouts for desktop and mobile.

## 5. Operational Hooks
- Add document log hooks for printable/PDF workflows.
- Add manual WhatsApp dispatch logging abstraction.
- Add audit logging across transactional services.

## 6. Deployment
- Add Dockerfile, docker-compose, and environment template.
- Document local setup, DB migration, seed flow, and VPS deployment steps.
