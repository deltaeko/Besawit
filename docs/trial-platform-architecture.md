# Trial Platform Architecture

Dokumen ini menjelaskan fondasi trial otomatis untuk Besawit tanpa mengubah aplikasi inti menjadi multi-tenant shared-table.

## Pendekatan

- `1 website publik` untuk landing page dan pendaftaran trial.
- `1 control database` untuk menyimpan request trial, instance, dan antrean provisioning.
- `1 customer/trial = 1 database PostgreSQL terpisah`.
- Aplikasi operasional Besawit tetap berjalan sebagai single-company per database.

## Komponen yang sudah ditambahkan

- Landing page publik di `/`
- Form trial publik
- API `POST /api/trial-requests`
- Worker provisioning: `npm run worker:provision`
- Resolver host/subdomain ke instance tenant
- Dynamic database selection via `getDb()`
- Owner panel internal di `/platform/trials`
- Schema control-plane:
  - `trial_requests`
  - `app_instances`
  - `provision_jobs`
  - `platform_notifications`
  - `platform_admin_events`
- Drizzle config terpisah untuk control-plane: `drizzle.platform.config.ts`
- Migration control-plane awal: `drizzle-platform/0000_high_vapor.sql`
- Migration notifikasi/panel: `drizzle-platform/0001_plain_black_cat.sql`
- Migration audit trail admin: `drizzle-platform/0002_fast_wildside.sql`

## Alur saat ini

1. Calon customer mengisi form trial.
2. Request disimpan ke `trial_requests`.
3. Sistem menyiapkan `app_instances` dengan status `queued`.
4. Sistem menambahkan job `trial_provision` ke `provision_jobs`.
5. Worker mengambil job `queued`.
6. Worker membuat database baru per trial.
7. Worker menjalankan migration utama Besawit ke database baru.
8. Worker melakukan seed dasar dan membuat akun owner trial.
9. Worker mengubah status instance dan request menjadi `ready`.
10. Request dari subdomain tenant yang `ready` otomatis memakai database customer tersebut.
11. Sistem membuat log notifikasi `trial_ready` dan mencoba kirim webhook otomatis bila dikonfigurasi.
12. Owner dapat melihat trial, resend notification, convert instance ke paid, menyimpan metadata billing, dan meninjau audit trail admin dari panel internal.

## Langkah berikutnya

1. Tambahkan retry dan dead-letter strategy untuk job `failed`.
2. Tambahkan adapter notifikasi selain webhook, mis. email/WhatsApp provider.
3. Tambahkan panel detail per customer untuk melihat histori provisioning, notifikasi, billing, dan aksi admin.
4. Tambahkan reminder billing renewal atau follow-up subscription.
5. Tambahkan webhook atau sink ke CRM saat trial di-convert menjadi paid.

## Environment yang dibutuhkan

- `CONTROL_DATABASE_URL`
- `TENANT_DATABASE_ADMIN_URL`
- `APP_BASE_DOMAIN`
- `TRIAL_DURATION_DAYS`
- `TRIAL_CONTACT_WHATSAPP`
- `TRIAL_DATABASE_PREFIX`
- `PROVISION_POLL_INTERVAL_MS`
- `TRIAL_READY_WEBHOOK_URL`

Jika `CONTROL_DATABASE_URL` belum diisi, kode saat ini fallback ke `DATABASE_URL` agar setup development tetap sederhana. Untuk production, control database tetap sebaiknya dipisah dari database customer.
