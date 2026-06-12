# Platform SMTP Settings Design

## Goal

Menambahkan pengaturan SMTP global dari console utama Besawit agar tim owner bisa mengatur email calon customer langsung dari web, tanpa bergantung pada edit `.env` manual untuk operasi harian.

## Problem

Saat ini SMTP hanya bisa dibaca dari environment variable server. Itu berarti:

- setup SMTP tidak bisa dilakukan dari web
- owner non-technical tidak punya jalur operasional untuk mengubah kredensial email
- UI trial sudah mengarahkan calon customer untuk menunggu email/setup link, tetapi sistem belum punya pengaturan SMTP yang bisa dikelola dari console utama

## Decision

Gunakan halaman baru `Platform > SMTP` di base domain utama.

- Konfigurasi disimpan di control-plane database
- Berlaku global/default untuk notifikasi calon customer
- Hanya role `owner` yang bisa melihat dan mengubah
- Password SMTP disimpan terenkripsi dan tidak pernah ditampilkan utuh kembali di UI

## Scope

### Included

- halaman `Platform > SMTP`
- penyimpanan config SMTP global di control-plane database
- enkripsi password SMTP
- tombol `Simpan SMTP`
- tombol `Kirim Test Email`
- status test email terakhir
- integrasi pembacaan SMTP dari DB untuk flow trial-ready email

### Excluded

- multi-profile SMTP
- SMTP per tenant
- framework notifikasi umum untuk semua event
- retry worker baru untuk email
- audit dashboard kompleks untuk seluruh histori email

## Placement

SMTP ditempatkan di area `Platform`, bukan `Settings` tenant.

Alasannya:

- dipakai untuk calon customer / control-plane flow
- bukan preferensi visual tenant
- cakupannya global untuk console utama
- lebih aman jika hanya tersedia di base domain owner console

## Data Model

Tambahkan tabel control-plane baru untuk pengaturan SMTP global.

### Suggested Table

`platform_smtp_settings`

### Fields

- `id`
- `scope`
- `host`
- `port`
- `secure`
- `username`
- `password_encrypted`
- `from_email`
- `from_name`
- `last_test_status`
- `last_test_error`
- `last_test_at`
- `created_at`
- `updated_at`

### Notes

- `scope` default cukup `default`
- satu row aktif saja untuk sekarang
- `password_encrypted` wajib terenkripsi di server
- `last_test_status` cukup `success | failed | never`

Tidak perlu membuat tabel histori terpisah pada tahap ini.

## Security Model

### Access Control

- hanya base domain utama
- hanya user `owner`
- tenant biasa tidak bisa mengakses route, UI, atau API SMTP settings

### Password Handling

- password SMTP tidak dikembalikan dalam response API
- UI hanya tahu apakah password sudah tersimpan
- jika owner tidak mengisi field password saat edit, password lama dipertahankan
- jika owner mengisi password baru, server mengenkripsi lalu mengganti nilai lama

### Encryption

Gunakan server-side encryption helper dengan secret aplikasi yang sudah ada atau secret turunan khusus untuk config encryption. Nilai terenkripsi disimpan di control-plane DB, bukan plaintext.

## UI Design

### Page

Halaman baru: `Platform > SMTP`

Isi halaman:

1. penjelasan singkat bahwa SMTP dipakai untuk email calon customer
2. form konfigurasi
3. status card
4. form kirim test email

### Form Fields

- SMTP Host
- Port
- Secure (boolean)
- Username
- Password
- From Email
- From Name

### Status Card

Menampilkan:

- status konfigurasi: `aktif` atau `belum lengkap`
- password status: `tersimpan` atau `belum ada`
- hasil test terakhir
- waktu test terakhir

### Actions

- `Simpan SMTP`
- `Kirim Test Email`

### Test Email UX

Owner memasukkan alamat email tujuan test. Sistem mengirim email uji sederhana yang membuktikan:

- koneksi SMTP valid
- kredensial valid
- `from` address valid

Hasil test langsung disimpan ke DB dan juga ditampilkan di UI.

## API Design

### Read Settings

Server page atau loader akan mengambil setting SMTP dari control-plane DB.

Response ke UI harus masked:

- host, port, secure, username, from email, from name boleh tampil
- password tidak pernah tampil
- hanya boolean/status `hasPassword`

### Save Settings

API simpan:

- validasi input
- jika password field kosong, pertahankan password lama
- jika password diisi, encrypt lalu simpan
- update `updated_at`

### Send Test Email

API test:

- baca config tersimpan dari DB
- decrypt password
- kirim email ke alamat tujuan test
- simpan `last_test_status`, `last_test_error`, `last_test_at`

Jika config belum lengkap, API menolak test dengan error yang jelas.

## Runtime Behavior

### Priority Order

Untuk pengiriman email trial-ready:

1. baca SMTP config dari control-plane DB
2. jika config DB lengkap, pakai config itu
3. jika config DB tidak ada / belum lengkap, fallback ke env SMTP
4. jika keduanya tidak ada, email channel `skipped`

Pendekatan ini menjaga transisi halus dari env ke web-managed config.

### Trial Ready Flow

Saat tenant trial menjadi `ready`:

- sistem membangun email trial-ready
- email service mengambil SMTP config dari DB
- jika valid, email dikirim ke calon customer
- jika gagal, kegagalan dicatat tapi provisioning tenant tetap sukses

### Resend Flow

Saat admin memilih resend trial-ready:

- sistem memakai config SMTP yang sama dari DB
- tidak perlu input ulang dari env

## Services

### New Platform SMTP Settings Service

Tambahkan service khusus untuk:

- membaca config SMTP global
- menyimpan config SMTP global
- decrypt config saat runtime
- membaca status konfigurasi untuk UI

Service ini hidup di layer control-plane, bukan tenant app DB biasa.

### Email Service Integration

Email service yang sudah ada perlu diubah agar:

- bisa menerima config SMTP eksplisit dari platform settings
- tidak hanya bergantung pada `env`

Tanggung jawab email service tetap sederhana: kirim email. Tanggung jawab membaca config tetap di service SMTP settings/platform layer.

## Validation

Validasi minimal:

- host wajib
- port wajib numeric valid
- secure boolean
- username wajib
- from email wajib format email
- password wajib hanya saat create pertama atau saat mengganti password

## Failure Handling

- config belum lengkap: simpan boleh ditolak dengan error field-level
- password decrypt gagal: tandai test gagal dan email channel gagal
- SMTP auth gagal: tampilkan error jelas di test result
- SMTP timeout: tampilkan error jelas di test result
- trial-ready email gagal: provisioning tetap `ready`, hanya delivery yang gagal

## Testing

### Automated

- test masking response settings
- test save settings tanpa password baru tidak menghapus password lama
- test save settings dengan password baru mengenkripsi nilai
- test send test email memakai config DB
- test fallback ke env jika config DB belum ada

### Manual

- login owner di base domain utama
- buka `Platform > SMTP`
- simpan konfigurasi valid
- kirim test email ke inbox sandbox
- buat atau resend trial-ready
- cek email customer benar-benar terkirim

## Rollout

### Initial Rollout

- deploy migration control-plane
- deploy UI + API SMTP settings
- isi SMTP dari `Platform > SMTP`
- kirim test email
- baru setelah itu andalkan trial-ready email ke calon customer

### Backward Compatibility

Env SMTP lama tetap bisa hidup sebagai fallback sementara. Ini penting agar deploy tidak langsung memutus flow yang sudah ada.

## Risks

- jika encryption helper lemah atau salah implementasi, secret SMTP terpapar
- jika UI mengizinkan save setengah lengkap, owner bisa salah mengira SMTP sudah aktif
- jika fallback env dan DB tidak jelas, debugging delivery bisa membingungkan

Karena itu UI harus menampilkan status konfigurasi dengan tegas: `aktif`, `belum lengkap`, atau `test gagal`.

## Recommendation

Implementasi terbaik adalah:

1. tambahkan control-plane table untuk SMTP global
2. tambahkan encryption helper untuk password SMTP
3. buat halaman `Platform > SMTP` owner-only
4. sambungkan flow `trial_ready` ke config DB dengan fallback env
5. verifikasi via `Kirim Test Email` sebelum dipakai operasional

Pendekatan ini tetap sempit, operasional, dan langsung menyelesaikan kebutuhan utama Anda: setup SMTP dari web utama Besawit untuk notifikasi calon customer.
