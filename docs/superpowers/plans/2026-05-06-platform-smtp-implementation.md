# Platform SMTP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menambahkan halaman `Platform > SMTP` di console utama untuk menyimpan SMTP global, mengenkripsi password, mengirim test email, dan memakai config itu untuk email trial-ready.

**Architecture:** Config SMTP disimpan di control-plane database sebagai setting global tunggal. UI owner-only di base domain memanggil API platform baru untuk membaca, menyimpan, dan mengetes config. Flow trial-ready email membaca config DB lebih dulu lalu fallback ke env lama.

**Tech Stack:** Next.js app router, Drizzle ORM, PostgreSQL, nodemailer, Node crypto, React Hook Form, zod

---

### Task 1: Control-Plane SMTP Storage

**Files:**
- Modify: `D:\Besawit\src\lib\platform\schema.ts`
- Create: `D:\Besawit\drizzle-platform\0003_platform_smtp_settings.sql`
- Modify: `D:\Besawit\drizzle-platform\meta\_journal.json`

- [ ] Tambahkan tabel settings SMTP global dan field status test terakhir.
- [ ] Tambahkan migration control-plane baru.

### Task 2: SMTP Config Service And Encryption

**Files:**
- Create: `D:\Besawit\src\lib\platform\smtp-crypto.ts`
- Create: `D:\Besawit\src\services\platform-smtp-service.ts`
- Modify: `D:\Besawit\src\services\email-service.ts`
- Modify: `D:\Besawit\src\lib\env.ts`

- [ ] Tambahkan helper encrypt/decrypt password SMTP.
- [ ] Tambahkan service read/save/test SMTP config dari control-plane DB.
- [ ] Ubah email sender agar bisa memakai config eksplisit dari DB.

### Task 3: Platform API

**Files:**
- Create: `D:\Besawit\src\app\api\platform\smtp\route.ts`
- Create: `D:\Besawit\src\app\api\platform\smtp\test\route.ts`
- Create: `D:\Besawit\src\lib\validation\platform-smtp.ts`

- [ ] Tambahkan API GET/PUT untuk settings SMTP owner-only.
- [ ] Tambahkan API POST test email owner-only.

### Task 4: Platform UI

**Files:**
- Create: `D:\Besawit\src\app\(app)\platform\smtp\page.tsx`
- Create: `D:\Besawit\src\modules\platform\platform-smtp-form.tsx`
- Modify: `D:\Besawit\src\app\(app)\platform\trials\page.tsx` (link kecil ke SMTP bila perlu)

- [ ] Tambahkan halaman `Platform > SMTP`.
- [ ] Tambahkan form save config dan kirim test email.

### Task 5: Trial-Ready Integration And Tests

**Files:**
- Modify: `D:\Besawit\src\services\platform-notification-service.ts`
- Create: `D:\Besawit\tests\platform-smtp.test.ts`
- Modify: `D:\Besawit\package.json`

- [ ] Pakai config DB sebagai prioritas utama untuk email trial-ready.
- [ ] Tambahkan test dasar masking/encryption/fallback.
- [ ] Jalankan `npm run check` dan `npm test`.
