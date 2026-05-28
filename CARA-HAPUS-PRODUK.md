# 🗑️ Cara Menghapus Semua Menu Kecuali "Matcha Latte"

## ⚡ Quick Start

### Opsi 1: Arsipkan Produk (Direkomendasikan ✅)
```bash
npm run archive-products
```
✅ Produk disembunyikan tapi masih bisa dikembalikan

### Opsi 2: Hapus Permanen (⚠️ Hati-hati!)
```bash
npm run delete-products
```
⚠️ Produk dihapus permanen dan tidak bisa dikembalikan

---

## 📖 Penjelasan Detail

### 🔹 Archive Products
- Mengubah badge produk menjadi 'archived'
- Produk tidak muncul di storefront
- Data tetap ada di database
- Bisa dikembalikan kapan saja
- **Aman untuk production**

### 🔹 Delete Products
- Menghapus produk dari database
- Menghapus relasi ingredients
- Menghapus order items terkait
- **TIDAK BISA DIKEMBALIKAN**
- Hanya untuk development/testing

---

## 🚨 Troubleshooting

### Jika muncul error "Can't reach database server"

**Penyebab:**
- Koneksi internet terputus
- Database Supabase sedang maintenance
- Firewall memblokir koneksi

**Solusi:**
1. Periksa koneksi internet
2. Cek status Supabase di: https://status.supabase.com/
3. Tunggu beberapa menit dan coba lagi
4. Restart development server:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

### Jika ingin mengembalikan produk yang diarsipkan

**Via Prisma Studio:**
```bash
npx prisma studio
```
Kemudian buka tabel Product dan ubah `badge` dari 'archived' ke `null`

**Via Admin Panel:**
Buka halaman admin products dan edit produk yang diarsipkan

---

## 📝 Catatan Penting

1. ✅ Script sudah dibuat dan siap digunakan
2. ✅ Sudah ditambahkan ke package.json
3. ⏳ Tunggu koneksi database kembali normal
4. 🔄 Jalankan script setelah koneksi tersedia

---

## 📞 Bantuan

Jika masih ada masalah, periksa:
- File `.env` untuk DATABASE_URL
- Status koneksi internet
- Log error di terminal
- Dashboard Supabase untuk status database
