# Release Readiness

Dokumen ini adalah gate terakhir sebelum commit, handoff, atau deploy ke environment baru. Isinya mengikuti kondisi repo saat ini: database app dan control-plane wajib dipisah, migrasi dijalankan terpisah, dan smoke test utama sudah tersedia sebagai script repeatable.

## Fresh Database Bootstrap

1. Copy `.env.example` menjadi `.env`.
2. Pastikan `DATABASE_URL` menunjuk ke database app/business yang fresh, misalnya `besawit_app`.
3. Pastikan `CONTROL_DATABASE_URL` menunjuk ke database control-plane yang terpisah, misalnya `besawit_control`.
4. Pastikan `TENANT_DATABASE_ADMIN_URL` menunjuk ke koneksi admin Postgres yang bisa membuat database tenant.
5. Jalankan `npm run db:migrate`.
6. Jalankan `npm run db:migrate:platform`.
7. Jalankan `npm run db:seed`.
8. Jalankan aplikasi di `http://localhost:6001`.

Jangan gunakan database campuran lama yang menaruh schema app dan control-plane di database yang sama sebagai baseline migrasi baru.

## Mandatory Verification

Jalankan seluruh command berikut:

```bash
npm run check
npm run test
npm run smoke:core-api
npm run smoke:trial-flow
npm run verify:release
```

Ekspektasi minimum:
- `npm run check` selesai tanpa error typecheck atau lint failure.
- `npm run test` lulus untuk regression suite ringan dan doc gate.
- `npm run smoke:core-api` membuktikan write API tanpa session ditolak, login seed berhasil, palm purchase berhasil dengan session, cash store sale membuat payment dan cash ledger, dan manual WhatsApp log untuk receipt berhasil.
- `npm run smoke:trial-flow` membuktikan trial request dibuat dengan `setupUrl: null`, status bergerak dari `queued` ke `ready`, setup link final diterbitkan setelah provisioning, setup account berhasil, login tenant berhasil, dan token setup tidak bisa dipakai ulang.
- `npm run verify:release` lulus sebagai release gate gabungan.

Jika Anda ingin menjalankan runtime smoke tests via test runner juga, gunakan:

```bash
npm run test:smoke
```

## Manual Review Before Commit

1. Pastikan file `.env` lokal atau secret production tidak ikut ter-stage.
2. Pastikan `drizzle/meta/_journal.json` sinkron dengan file migrasi di `drizzle/`.
3. Pastikan backend auth/RBAC tetap enforced di mutating route walaupun `/api` masih dikecualikan dari matcher middleware.
4. Pastikan tidak ada `temporaryPassword` tersisa di bawah `src/`.
5. Pastikan perubahan env, Docker, dan README tetap mengarahkan app DB dan control DB ke database yang berbeda.

## Current Local Baseline

Baseline lokal yang sekarang sudah diverifikasi di repo ini:
- app DB fresh dan control DB fresh dipakai terpisah
- `npm run db:migrate` dan `npm run db:migrate:platform` lulus pada database fresh
- `npm run smoke:core-api` tersedia sebagai smoke runtime untuk auth guard dan side effect finance
- `npm run smoke:trial-flow` tersedia sebagai smoke runtime untuk provisioning dan setup account
- `npm run verify:release` tersedia sebagai gate ringkas yang menggabungkan check, test, dan dua smoke utama
