# Besawit Critical Security & Integrity Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the audited security and data-integrity gaps without redesigning the application.

**Architecture:** Keep the existing App Router, service, and repository structure. Add a small reusable API guard layer, add transaction context support in the DB client so existing repositories can participate in shared transactions, harden tenant provisioning by replacing plaintext onboarding credentials with one-time setup tokens, and add minimal regression coverage.

**Tech Stack:** Next.js App Router, PostgreSQL, Drizzle ORM, jose, bcryptjs, Node test runner

---

### Task 1: Backend Auth Guard Coverage

**Files:**
- Create: `src/lib/auth/api-guard.ts`
- Modify: `src/app/api/master/[entity]/route.ts`
- Modify: `src/app/api/master/[entity]/[id]/route.ts`
- Modify: `src/app/api/palm/purchases/route.ts`
- Modify: `src/app/api/palm/purchases/[id]/route.ts`
- Modify: `src/app/api/palm/sales/route.ts`
- Modify: `src/app/api/palm/sales/[id]/route.ts`
- Modify: `src/app/api/store/purchases/route.ts`
- Modify: `src/app/api/store/purchases/[id]/route.ts`
- Modify: `src/app/api/store/sales/route.ts`
- Modify: `src/app/api/inventory/adjustments/route.ts`
- Modify: `src/app/api/inventory/stock-takes/route.ts`
- Modify: `src/app/api/dashboard/layout/route.ts`
- Modify: `src/app/api/documents/route.ts`
- Modify: `src/app/api/whatsapp/send/route.ts`
- Modify: `src/app/api/support/whatsapp-click/route.ts`

- [ ] Add a shared guard helper that returns `401` for missing session and `403` for missing permission.
- [ ] Add entity-to-permission mapping for master-data writes.
- [ ] Apply the guard to every mutating operational route except intentional public endpoints (`auth`, `trial-requests`).

### Task 2: One-Time Trial Setup Token Flow

**Files:**
- Modify: `src/lib/platform/schema.ts`
- Modify: `src/services/trial-service.ts`
- Modify: `src/services/provisioning-service.ts`
- Modify: `src/services/platform-service.ts`
- Modify: `src/app/api/trial-requests/route.ts`
- Create: `src/app/api/auth/setup/route.ts`
- Create: `src/app/(auth)/setup/page.tsx`
- Create: `src/modules/auth/setup-form.tsx`
- Modify: `src/lib/validation/auth.ts`
- Modify: `src/services/auth-service.ts`
- Modify: `src/lib/db/tenant-seed.ts`
- Add migration: `drizzle-platform/*`

- [ ] Add a platform table for one-time setup tokens with hash, expiry, and consumed timestamp.
- [ ] Replace temporary password creation/storage/response with a setup token and setup URL.
- [ ] Seed tenant owners with a random secret that is never returned and only usable after setup resets it.
- [ ] Add setup completion API/page that verifies token, sets password hash in the tenant DB, and marks the token consumed.

### Task 3: Transaction Context for Core Flows

**Files:**
- Modify: `src/lib/db/client.ts`
- Modify: `src/services/palm-service.ts`
- Modify: `src/services/store-service.ts`
- Modify: `src/services/finance-service.ts`

- [ ] Add transaction-context helpers in the DB client.
- [ ] Wrap palm purchase and sale flows in a shared transaction.
- [ ] Wrap store purchase, sale, return, and finance payment posting flows in a shared transaction.

### Task 4: Concurrency-Safe Inventory Mutation

**Files:**
- Modify: `src/repositories/inventory-repository.ts`
- Modify: `src/services/inventory-service.ts`

- [ ] Replace read-compute-write balance updates with a lock/atomic update flow inside a transaction.
- [ ] Preserve negative-stock validation while making concurrent writes deterministic.

### Task 5: Cash Sale Finance Consistency

**Files:**
- Modify: `src/services/store-service.ts`
- Modify: `src/services/finance-service.ts`

- [ ] Ensure cash store sales create a finance document, payment row, and cash ledger row in the same transaction.
- [ ] Ensure sale status cannot become `paid` without the finance side effects succeeding.

### Task 6: Tenant Pool Reuse and Query Indexes

**Files:**
- Modify: `src/lib/db/client.ts`
- Modify: `src/lib/db/schema.ts`
- Add migration: `drizzle/*`
- Modify: `docker-compose.yml`

- [ ] Reuse tenant pools safely in production.
- [ ] Add missing composite indexes for payable/receivable aging and dashboard queries.
- [ ] Remove insecure production fallbacks that should not be silently relied upon.

### Task 7: Minimal Regression Coverage

**Files:**
- Modify: `package.json`
- Create: `tests/api-guard.test.ts`
- Create: `tests/trial-setup-token.test.ts`
- Create: `tests/stock-balance-rules.test.ts`

- [ ] Add a minimal test script using the built-in Node test runner.
- [ ] Add focused tests for auth guard behavior, setup-token behavior, and stock mutation validation helpers.
