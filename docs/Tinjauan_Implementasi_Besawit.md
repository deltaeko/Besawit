# Tinjauan Implementasi Singkat Besawit

Dokumen ini merangkum hasil review implementasi aplikasi sebelum panduan pengguna disusun.

## Ringkasan status aplikasi
- **Tersedia dan dapat dipakai:** login/logout, dashboard, master data inti, pembelian TBS, penjualan ke pabrik, transaksi toko, finance, inventory, laporan utama, preview/cetak dokumen tertentu, role dan hak akses dasar.
- **Tersedia tetapi masih perlu kehati-hatian:** void transaksi yang berdampak ke stok, approval inventory, laporan berbasis snapshot, penggunaan pada layar kecil untuk tabel lebar.
- **Belum tersedia / belum lengkap:** lupa password, export PDF dari dalam aplikasi, retur penjualan toko, pengaturan sistem umum, audit log terpusat.

## Modul yang diverifikasi
- Dashboard
- Master Data
- Palm Agent
- Store
- Inventory
- Finance
- Reports
- Login / Logout
- Preview / Cetak dokumen

## Catatan implementasi penting
- Penjualan TBS sudah berbasis **pool gudang**, bukan referensi pembelian tunggal.
- Form penjualan toko kredit mewajibkan **pelanggan** dan **jatuh tempo piutang**.
- Pelanggan toko dapat dihubungkan ke petani agar piutang toko dapat dipotong dari hasil TBS.
- Modul Finance memisahkan pencatatan pembayaran/penerimaan dari transaksi asal untuk menjaga jejak audit.

## Daftar fitur yang ditandai untuk ditulis jujur di panduan
- Reset password mandiri: **belum tersedia**
- Export PDF dari aplikasi: **belum tersedia**
- Retur penjualan toko: **belum tersedia**
- Settings umum: **belum tersedia**
- Audit log lintas modul: **belum tersedia sebagai halaman khusus**
