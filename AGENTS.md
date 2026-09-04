# Aturan Proyek Arum Seduh

1. IDENTITAS BRAND RESMI:
   - Nama brand/toko resmi aplikasi ini adalah "Arum Seduh".
   - JANGAN PERNAH menggunakan nama "Matchaboy" dalam respon chat, penjelasan, struk kasir, teks antarmuka (UI), atau kode baru. Abaikan nama folder root ("Matchaboy") untuk urusan penamaan brand.

2. WARNA & DESAIN:
   - Palet warna utama adalah nuansa Orange dan Kuning Amber (contoh: `bg-gradient-to-r from-orange-500 to-amber-500`, `text-orange-600`, `text-amber-600`, `bg-orange-50`).
   - Jangan gunakan warna hijau matcha default.

3. IKON & EMOJI:
   - Gunakan ikon vektor Lucide React yang rapi (`Coffee`, `Receipt`, `Printer`, `Sparkles`, dll.).
   - Dilarang memakai emoji sistem operasi default pada teks antarmuka, tombol, atau badge.

4. PERFORMA TRANSAKSI REAL-TIME KASIR (NON-BLOCKING):
   - Endpoint POS Kasir (`/api/cashier/*`) melayani antrian tatap muka langsung dan wajib merespons instan (< 500ms).
   - DILARANG melakukan `await` pada panggilan notifikasi eksternal (seperti WhatsApp bot gateway, push notification, atau analitik eksternal) sebelum mengirimkan response JSON ke kasir. Jalankan selalu di latar belakang (*asinkron/fire-and-forget*).
   - Seluruh pemanggilan `fetch` ke layanan pihak ketiga atau provider WhatsApp WAJIB menyertakan `signal: AbortSignal.timeout(2500)` agar proses server tidak menggantung jika bot/gateway offline.
   - Operasi Redis/Cache wajib memiliki batas waktu fallback (*race timeout*) maksimal 800ms agar degradasi jaringan Upstash tidak mengunci transaksi.

5. INTEGRITAS PROMO & ROLLBACK DISKON:
   - Validasi dan kalkulasi potongan harga WAJIB dihitung ulang di backend secara universal via `validateAndCalculateDiscount` dari `@/lib/discount-utils`.
   - Setiap pembatalan pesanan (baik dari pembeli, kasir, admin, atau cron pembayaran kedaluwarsa) WAJIB memanggil `revertVoucherUsage` untuk memulihkan status voucher personal maupun kuota `usageCount` template promo.

