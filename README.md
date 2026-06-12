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
- [docs/release-readiness.md](/d:/Besawit/docs/release-readiness.md)

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
2. Gunakan database fresh yang terpisah untuk app dan control plane.
3. Jalankan PostgreSQL lokal atau `docker compose up -d db`.
4. Install dependency: `npm install`
5. Apply migration app: `npm run db:migrate`
6. Apply migration control-plane: `npm run db:migrate:platform`
7. Seed data app: `npm run db:seed`
8. Jalankan app: `npm run dev -- --port 6001`

Nilai minimum yang harus dipisahkan:
- `DATABASE_URL`: database app/business, contoh `besawit_app`
- `CONTROL_DATABASE_URL`: database control-plane trial/provisioning, contoh `besawit_control`
- `TENANT_DATABASE_ADMIN_URL`: koneksi admin ke instance Postgres, biasanya database `postgres`

Untuk stack Docker bawaan repo ini, service `db` akan menginisialisasi database fresh `besawit_app` dan `besawit_control` saat volume masih baru.

Jika Anda sudah punya database lama yang mencampur schema app dan control-plane:
- jangan jalankan `npm run db:push`
- jangan jalankan `npm run db:push:platform`
- siapkan database baru/fresh lalu migrate ke sana
- atau buat baseline `__drizzle_migrations` secara terkontrol terlebih dahulu

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
- `npm run db:migrate:platform`
- `npm run db:push`
- `npm run db:studio`
- `npm run db:seed`
- `npm run smoke:core-api`
- `npm run smoke:trial-flow`
- `npm run verify:release`

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
2. Copy `.env.production.example` menjadi `.env.production` lalu isi domain, database, dan secret production.
3. Pastikan `DATABASE_URL` dan `CONTROL_DATABASE_URL` menunjuk ke database yang berbeda.
4. Jalankan migration app dan control-plane di release step.
5. Start stack dengan file env production:

```bash
docker compose --env-file .env.production up -d --build
```

Catatan production:
- service `worker` wajib hidup untuk provisioning trial otomatis
- branding upload disimpan ke volume Docker `branding_assets`
- untuk single VPS, volume ini sudah cukup selama backup rutin dilakukan
- database tetap ada di volume `postgres_data`

Panduan ringkas self-host:
- [docs/self-host-vps.md](/d:/Besawit/docs/self-host-vps.md)

## Catatan Implementasi
- Record finansial tidak didesain untuk hard delete.
- Stock berubah hanya melalui `stock_movements`.
- Approval stock take membentuk stock adjustment terpisah.
- WhatsApp saat ini manual-log only, provider service dapat diganti tanpa mengubah UI.
