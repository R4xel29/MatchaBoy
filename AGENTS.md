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

6. SIKLUS HIDUP PESANAN PASCA PEMBAYARAN:
   - Setiap pesanan yang telah menyelesaikan pembayaran (baik pembayaran tunai di kasir maupun pembayaran otomatis melalui QRIS / webhook DOKU) WAJIB masuk ke status 'PENDING' (Pesanan Diterima / Menunggu Masak).
   - DILARANG mengarahkan pesanan yang baru lunas langsung ke status 'COMPLETED'. Pesanan harus melalui tahapan proses antrean dapur: 'PENDING' -> 'PREPARING' (Masak) -> 'READY' (Siap Saji) -> 'COMPLETED' (Selesai).
   - Pengurangan stok bahan baku dilakukan saat pesanan memasuki proses masak ('PREPARING'), dan poin loyalitas atau komisi referral diberikan saat pesanan berstatus 'COMPLETED'.

7. VALIDASI MODIFIER & KONSISTENSI STRUK (POS & SPMB):
   - Produk kategori Makanan ('makanan' / 'food' / 'snack') DILARANG memiliki modifier minuman seperti level es, level gula, kepekatan matcha, atau espresso shot.
   - Menu Kopi DILARANG memiliki keterangan matcha level jika 'showMatcha' bernilai false.
   - Menu Non-Espresso / Matcha DILARANG memiliki opsi single/double shot jika 'showEspressoShot' bernilai false.
   - Pada antarmuka dan teks ringkasan pesanan SPMB, opsi es dan gula WAJIB dipisahkan oleh tanda panah '→' (contoh: "Normal Ice → Biasa"), bukan tanda koma.
   - Pada struk cetak kasir (thermal printer), setiap modifier wajib dicetak per baris secara konsisten baik pesanan dari POS maupun SPMB menggunakan tanda panah chevron '»' (contoh: '» ES: NORMAL ICE', '» GULA: BIASA').

8. TRANSPARANSI POTONGAN HARGA (DISKON & PROMO):
   - Pada menu atau pesanan yang memiliki potongan harga/diskon promo, struk dan rincian pesanan WAJIB menampilkan rincian potongan secara eksplisit dan transparan.
   - Format wajib menunjukkan harga semula, besaran potongan, dan harga akhir (contoh: 'Rp 11.000 - Rp 1.000 = Rp 10.000' atau baris '» POTONGAN: -Rp 1.000'), bukan langsung menampilkan harga akhir saja tanpa penjelasan.

9. STANDAR ADOPSI DESAIN UI (STITCH / FIGMA / MOCKUP):
   - Setiap peremajaan antarmuka berdasarkan desain eksternal (seperti StitchMCP) WAJIB mempertahankan 100% fitur, modal, alur validasi, event listener, dan tombol aksi yang sudah ada (*zero feature regression*).
   - Seluruh token warna dari mockup wajib diselaraskan dengan identitas resmi Arum Seduh (nuansa Oranye & Kuning Amber, bukan warna acak atau hijau default).
   - Gunakan ikon vektor Lucide React secara konsisten dan dilarang memakai emoji sistem operasi pada teks antarmuka atau tombol aksi.

10. PROTOKOL OTOMATIS COMMIT & PUSH PASCA-VERIFIKASI:
    - Setiap kali pembuatan fitur, perbaikan bug, atau refaktor kode telah diverifikasi berhasil (misal: exit code 0 pada `npx tsx tests/run-all-tests.ts` dan `npm run build`), asisten WAJIB LANGSUNG menjalankan `git add .`, membuat commit dengan pesan konvensional deskriptif, dan mengeksekusi `git push origin <branch>` SEBELUM mengirimkan pesan laporan akhir kepada pengguna.
    - Laporan akhir wajib selalu mencantumkan commit hash (contoh: `1f1d338`) dan nama branch tujuan (`master`).
    - DILARANG mengakhiri tugas tanpa melakukan commit & push jika terdapat perubahan berkas yang valid dan terverifikasi.



