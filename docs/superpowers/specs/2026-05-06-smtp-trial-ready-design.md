# SMTP Trial Ready Notification Design

## Goal

Menambahkan pengiriman email native via SMTP untuk notifikasi `trial_ready` tanpa memutus flow notifikasi webhook yang sudah ada. User trial harus menerima setup link langsung dari aplikasi saat tenant siap dipakai, sementara tim internal tetap bisa memakai webhook untuk otomasi lain.

## Current State

- Trial request dibuat lewat landing page dan masuk ke control-plane.
- Provisioning worker membuat tenant DB, menandai instance `ready`, lalu memanggil `sendTrialReadyNotification(...)`.
- Saat ini notifikasi hanya dicatat sebagai channel `webhook`.
- Jika `TRIAL_READY_WEBHOOK_URL` tidak diisi, notifikasi ditandai `skipped` dan calon customer tidak menerima email dari aplikasi.

## Decision

Gunakan model `SMTP + webhook`.

- Email menjadi channel native untuk customer-facing delivery.
- Webhook tetap dipertahankan sebagai channel opsional untuk integrasi eksternal.
- Kedua channel dicatat terpisah di `platform_notifications` agar status delivery bisa diaudit per channel.

## Scope

### Included

- SMTP config lewat environment variables.
- Mailer service kecil untuk kirim email transactional.
- Trial-ready orchestration yang mengirim email dan webhook.
- Resend trial-ready menggunakan flow yang sama.
- Log notifikasi terpisah per channel.
- Copy UI/admin yang menjelaskan email trial-ready benar-benar dikirim jika SMTP aktif.

### Excluded

- General purpose email framework untuk semua event lain.
- Queue terpisah khusus email.
- Retry daemon/background scheduler baru.
- Template email visual kompleks dengan editor.

## Architecture

### 1. Notification Orchestrator

`sendTrialReadyNotification(...)` tetap menjadi entry point, tetapi berubah dari single-channel webhook sender menjadi orchestrator:

1. bangun payload trial-ready sekali
2. kirim email SMTP jika config tersedia
3. kirim webhook jika `TRIAL_READY_WEBHOOK_URL` tersedia
4. simpan hasil masing-masing channel ke `platform_notifications`

Orchestrator tidak gagal total hanya karena satu channel gagal. Email dan webhook dievaluasi independen, lalu hasilnya disimpan terpisah.

### 2. Email Delivery Service

Tambahkan service kecil, misalnya `src/services/email-service.ts`, yang bertanggung jawab untuk:

- membangun transporter SMTP
- validasi config dasar
- mengirim email plain text + HTML sederhana
- mengembalikan hasil terstruktur (`sent`, `failed`, `skipped`, message id/error)

Service ini tidak mengetahui domain trial/provisioning. Ia hanya menerima input email generik.

### 3. Trial Ready Email Composer

Tambahkan helper composer khusus untuk email `trial_ready`, misalnya `src/services/trial-ready-email.ts`, yang membentuk:

- subject
- plain text body
- HTML body sederhana

Isi email:

- nama usaha
- subdomain / tenant URL
- setup link
- email admin
- masa trial berakhir
- instruksi singkat: buat password dulu, lalu login
- kontak bantuan

### 4. Notification Logging

`platform_notifications.channel` diperluas dari:

- `webhook`

menjadi:

- `email`
- `webhook`

Setiap pengiriman membuat row sendiri. Contoh:

- row 1: `channel=email`, `status=sent`
- row 2: `channel=webhook`, `status=skipped`

Ini memberi audit trail yang jelas di panel platform.

## Environment Variables

Tambahkan variable berikut:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_FROM_EMAIL`
- `SMTP_FROM_NAME`

Behavior:

- jika config SMTP tidak lengkap, email channel ditandai `skipped`
- jika webhook URL tidak ada, webhook channel ditandai `skipped`
- keduanya independen

## Data Model Changes

### Platform Notification Channel Enum

Update enum `platform_notification_channel` agar mendukung:

- `email`
- `webhook`

Tidak perlu tabel baru. Struktur `platform_notifications` yang ada sudah cukup untuk menyimpan hasil delivery per channel.

## Runtime Behavior

### Trial Provisioning Success

Saat worker menandai tenant `ready`:

1. generate final `setupUrl`
2. bangun `loginUrl`
3. panggil orchestrator trial-ready
4. orchestrator mengirim email jika SMTP aktif
5. orchestrator memanggil webhook jika aktif
6. semua hasil delivery dicatat

### Resend From Platform Admin

Saat admin memilih resend:

1. ambil instance dan metadata setup link terbaru
2. bangun payload yang sama
3. panggil orchestrator yang sama
4. buat row log baru untuk email/webhook resend

## Failure Handling

- SMTP tidak aktif: email `skipped`, webhook tetap dicoba.
- Webhook tidak aktif: webhook `skipped`, email tetap dicoba.
- SMTP gagal kirim: email `failed`, error message disimpan, webhook tetap dicoba.
- Webhook gagal: webhook `failed`, response/error disimpan, email tidak terpengaruh.
- Kedua channel gagal: instance tetap `ready`; masalahnya ada di delivery, bukan provisioning.

Ini penting supaya provisioning tenant tidak dianggap gagal hanya karena notifikasi gagal.

## UI / Admin Impact

### Trial UX

Copy yang saat ini menyebut “cek email/notifikasi trial ready” menjadi benar bila SMTP aktif.

### Platform Console

Panel platform tetap bisa menampilkan status notifikasi terakhir, tetapi interpretasinya harus per channel. Jika perlu, tampilan nanti bisa diperjelas supaya admin melihat:

- email sent/failed/skipped
- webhook sent/failed/skipped

Perubahan UI ini tetap minimal, tidak perlu redesign panel sekarang.

## Testing

### Automated

- unit test env parsing SMTP
- unit test email composer `trial_ready`
- test orchestrator saat:
  - SMTP aktif, webhook mati
  - SMTP mati, webhook aktif
  - keduanya aktif
  - salah satu gagal

### Manual

- siapkan SMTP sandbox/dev inbox
- buat trial sampai `ready`
- cek email diterima dan setup link valid
- klik resend dari platform admin
- cek email kedua terkirim dan log notifikasi bertambah

## Rollout

### Local / Dev

- isi env SMTP dengan mailbox sandbox atau SMTP testing provider
- jalankan trial provisioning flow

### Production

- isi env SMTP production
- opsional tetap isi `TRIAL_READY_WEBHOOK_URL` jika ada automasi internal

## Risks

- SMTP config salah bisa membuat notifikasi customer gagal diam-diam jika admin tidak melihat panel.
- HTML email terlalu kompleks akan menambah beban maintenance; karena itu template awal harus sederhana.
- Jika resend terlalu sering, customer bisa menerima beberapa email setup. Ini diterima untuk sekarang karena token setup terbaru tetap valid dan flow resend memang disengaja.

## Recommendation

Implementasi minimal terbaik adalah:

1. tambahkan SMTP env + `nodemailer`
2. ubah orchestrator notifikasi trial-ready menjadi multi-channel
3. tambahkan migration enum channel `email`
4. verifikasi dengan SMTP sandbox

Pendekatan ini paling kecil risikonya, sesuai arsitektur yang sudah ada, dan langsung menyelesaikan gap utama: calon customer benar-benar menerima setup link dari aplikasi.
