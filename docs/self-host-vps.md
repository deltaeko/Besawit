# Self-Host VPS

Dokumen ini menargetkan skenario paling pragmatis:
- `1 VPS`
- `1 stack Docker Compose`
- database PostgreSQL lokal di VPS yang sama
- upload branding disimpan ke volume lokal server

## Komponen Runtime

- `app`: Next.js production server
- `worker`: provisioning worker untuk trial/customer baru
- `db`: PostgreSQL
- `branding_assets`: volume persistent untuk logo dan favicon tenant
- `postgres_data`: volume persistent untuk database

## File Env

Mulai dari:

```bash
cp .env.production.example .env.production
```

Field penting yang wajib benar:
- `APP_URL`
- `APP_BASE_DOMAIN`
- `DATABASE_URL`
- `CONTROL_DATABASE_URL`
- `TENANT_DATABASE_ADMIN_URL`
- `SESSION_SECRET`
- `TRIAL_CONTACT_WHATSAPP`

## Jalankan Stack

```bash
docker compose --env-file .env.production up -d --build
```

## Volume Penting

Data yang harus dianggap persistent:
- volume `postgres_data`
- volume `branding_assets`

Secara logis:
- database customer/trial ada di PostgreSQL
- logo dan favicon tenant ada di `branding_assets`

## Backup Minimum

Untuk single VPS, backup minimum yang masuk akal:

1. backup PostgreSQL harian
2. backup volume branding assets harian
3. simpan backup ke lokasi lain, jangan hanya di VPS yang sama

Contoh yang perlu dibackup:
- dump database `besawit`
- seluruh database trial `besawit_trial_*`
- folder/volume branding assets

## Risiko Jika Tanpa Backup

Kalau hanya mengandalkan disk VPS tanpa backup:
- logo/favicon tenant bisa hilang saat server rusak
- data trial/customer bisa hilang saat disk corrupt
- migrasi server menjadi lebih sulit

## Rekomendasi Praktis

Untuk tahap awal penjualan:
- pakai storage lokal VPS
- jangan dulu pindah ke S3/R2/MinIO
- fokus ke backup yang disiplin

Kalau nanti berubah menjadi:
- multi VPS
- failover
- beberapa app instance

baru pindahkan asset upload ke object storage eksternal.
