# Keterbatasan Dokumentasi Besawit

Dokumen ini mencatat bagian aplikasi yang tidak didokumentasikan sebagai alur penuh karena implementasinya belum lengkap, belum tersedia, atau bukan fitur end-user utama.

## Fitur yang belum tersedia
- Lupa password / reset password mandiri
- Export PDF dari dalam aplikasi
- Retur penjualan toko
- Modul pengaturan sistem umum
- Halaman audit log lintas modul yang terpusat

## Fitur yang hanya didokumentasikan sebagai catatan, bukan alur lengkap
- Void transaksi yang berdampak ke stok
  - Fitur ada, tetapi harus dipakai terbatas oleh user berwenang dan bergantung pada status stok/pembayaran.
- Approval stock take dan adjustment
  - Fitur ada, tetapi panduan pengguna menekankan kehati-hatian, bukan tutorial approval massal.
- Report snapshot
  - Sebagian laporan menampilkan snapshot atau daftar dokumen terbaru, sehingga panduan menekankan cara membaca konteksnya.

## Halaman yang ada di aplikasi tetapi tidak diposisikan sebagai panduan utama pengguna umum
- Preview dokumen khusus yang sifatnya administratif
- Halaman cash ledger untuk pengguna di luar role finance
- Statement petani/pabrik yang dipakai sebagai pendukung audit dan follow-up

## Batasan screenshot
- Screenshot diambil dari lingkungan lokal dengan data demo, sehingga kode dokumen dan nilai contoh dapat berbeda dengan lingkungan produksi.
- Screenshot ditujukan untuk membantu orientasi halaman, bukan menjadi acuan angka transaksi.
