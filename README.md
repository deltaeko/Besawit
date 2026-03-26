# Besawit

Besawit adalah aplikasi operasional untuk:
- pembelian TBS dari petani
- penjualan TBS ke pabrik
- toko pertanian
- inventory dan stock take
- hutang, piutang, payment, dan cash ledger
- log dokumen dan WhatsApp manual

## Stack
- Next.js
- Node.js runtime
- PostgreSQL
- Drizzle ORM
- Tailwind CSS
- shadcn/ui style components
- React Hook Form + Zod
- TanStack Table dependency ready
- Docker deployment target

## Struktur
- [docs/architecture.md](/d:/Besawit/docs/architecture.md)
- [docs/folder-structure.md](/d:/Besawit/docs/folder-structure.md)
- [docs/implementation-plan.md](/d:/Besawit/docs/implementation-plan.md)

## Fitur Utama
- Auth berbasis session cookie dengan RBAC
- Dashboard KPI dan warning area
- Master data modular
- Palm purchase dan sale dengan deduction, return, margin, payable, receivable
- Store purchase dan sale dengan stock movement
- Inventory stock balance, stock take, adjustment
- Finance payables, receivables, payments, cash ledger
- Document log dan WhatsApp manual hook
- Audit log pada service inti

## Setup Lokal
1. Copy `.env.example` menjadi `.env`.
2. Jalankan PostgreSQL lokal atau `docker compose up -d db`.
3. Install dependency: `npm install`
4. Generate migration: `npm run db:generate`
5. Apply migration: `npm run db:migrate`
6. Seed data: `npm run db:seed`
7. Jalankan app: `npm run dev -- --port 6001`

## Login Seed
- Email: `owner@besawit.local`
- Password: `password123`

## Scripts
- `npm run dev -- --port 6001`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`
- `npm run check`
- `npm run db:generate`
- `npm run db:migrate`
- `npm run db:push`
- `npm run db:studio`
- `npm run db:seed`

## Docker
Untuk menjalankan stack lokal:

```bash
docker compose up --build
```

Port default:
- App: `http://localhost:6001`
- PostgreSQL host mapping: `localhost:7000`

Untuk VPS:
1. Deploy source ke server.
2. Isi environment production dengan secret yang kuat.
3. Jalankan migration di release step.
4. Build dan start container dengan `docker compose up -d --build`.

## Catatan Implementasi
- Record finansial tidak didesain untuk hard delete.
- Stock berubah hanya melalui `stock_movements`.
- Approval stock take membentuk stock adjustment terpisah.
- WhatsApp saat ini manual-log only, provider service dapat diganti tanpa mengubah UI.
