# Fitur yang Didisablekan (Coming Soon)

Dokumen ini mencatat fitur-fitur yang sementara didisablekan untuk dilanjutkan nanti.

## Tanggal: 3 Juni 2026

### Fitur yang Didisablekan di StorefrontClient.tsx

1. **Rekomendasi AI Anda**
   - Lokasi: Section "Rekomendasi AI Anda"
   - Status: Dikomentari dengan tag `/* DISABLED (Coming Soon) */`
   - Cara Mengaktifkan Kembali: Hapus komentar `/*` dan `*/` di sekitar section tersebut

2. **Custom Matcha Studio**
   - Lokasi: 
     - Shortcut button di Interactive Function Shortcuts Grid
     - Banner direct link di Content Sections
   - Status: Dikomentari dengan tag `/* DISABLED (Coming Soon) */`
   - Cara Mengaktifkan Kembali: Hapus komentar `/*` dan `*/` di sekitar kedua bagian tersebut

3. **Order Otomatis (Pemesanan Otomatis)**
   - Lokasi: Shortcut button di Interactive Function Shortcuts Grid
   - Status: Dikomentari dengan tag `/* DISABLED (Coming Soon) */`
   - Cara Mengaktifkan Kembali: Hapus komentar `/*` dan `*/` di sekitar button tersebut

4. **Matchaboy Pay (Wallet/Dompet Digital)**
   - Lokasi: Card di "MATCHABOY PAY & ARUS POIN DUAL CARD" section
   - Status: Dikomentari dengan tag `/* DISABLED (Coming Soon) */`
   - Cara Mengaktifkan Kembali: Hapus komentar `/*` dan `*/` di sekitar card Matchaboy Pay
   - Catatan: Card "Arus Poin" tetap aktif di sebelahnya

## Catatan Penting

- Semua code fitur-fitur di atas TIDAK DIHAPUS, hanya dikomentari
- Grid layout akan menyesuaikan secara otomatis dengan fitur yang aktif
- Untuk mengaktifkan kembali fitur, cukup hapus komentar `/*` dan `*/` di sekitar code yang didisablekan
- Tidak ada perubahan pada file lain di luar StorefrontClient.tsx
- Semua fungsi, state, dan handler terkait fitur-fitur ini masih ada di dalam file

## Cara Mencari Code yang Didisablekan

Gunakan pencarian dengan keyword:
- `DISABLED (Coming Soon)`
- Nama fitur yang spesifik (contoh: "Rekomendasi AI", "Custom Matcha Studio", dll)

## Testing

File telah dicek dengan TypeScript diagnostics dan tidak ada error yang ditemukan.
