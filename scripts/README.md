# Scripts untuk Manajemen Produk

## 📋 Daftar Script

### 1. Archive Products (Direkomendasikan ✅)
**File:** `archive-products-except-matcha.ts`

Script ini akan **mengarsipkan** semua produk kecuali "Matcha Latte" dengan mengubah badge menjadi 'archived'. Produk yang diarsipkan:
- ✅ Masih ada di database
- ✅ Tidak muncul di storefront
- ✅ Bisa dikembalikan kapan saja
- ✅ History order tetap utuh

**Cara menjalankan:**
```bash
npm run archive-products
```

### 2. Delete Products (Permanen ⚠️)
**File:** `delete-products-except-matcha.ts`

Script ini akan **menghapus permanen** semua produk kecuali "Matcha Latte" dari database. 

⚠️ **PERINGATAN:** 
- Produk akan dihapus permanen
- Relasi dengan ingredients akan dihapus
- Order items yang terkait akan dihapus
- **TIDAK BISA DIKEMBALIKAN!**

**Cara menjalankan:**
```bash
npm run delete-products
```

## 🚀 Cara Menggunakan

### Langkah 1: Pastikan Database Terhubung
Pastikan koneksi database Anda sudah aktif dan bisa diakses.

### Langkah 2: Pilih Script yang Sesuai
- Gunakan **archive-products** jika Anda ingin bisa mengembalikan produk nanti
- Gunakan **delete-products** jika Anda yakin ingin menghapus permanen

### Langkah 3: Jalankan Script
```bash
# Untuk mengarsipkan (direkomendasikan)
npm run archive-products

# Atau untuk menghapus permanen
npm run delete-products
```

### Langkah 4: Periksa Hasil
Script akan menampilkan:
- Jumlah produk yang diproses
- Daftar produk yang diarsipkan/dihapus
- Produk yang tersisa (hanya Matcha Latte)

## 🔄 Mengembalikan Produk yang Diarsipkan

Jika Anda menggunakan `archive-products` dan ingin mengembalikan produk:

### Opsi 1: Via Prisma Studio
```bash
npx prisma studio
```
Kemudian ubah field `badge` dari 'archived' ke `null` atau badge lainnya.

### Opsi 2: Via SQL
```sql
-- Kembalikan semua produk yang diarsipkan
UPDATE "Product" SET badge = NULL WHERE badge = 'archived';

-- Kembalikan produk tertentu
UPDATE "Product" SET badge = NULL WHERE name = 'Nama Produk' AND badge = 'archived';
```

### Opsi 3: Via Script (buat script baru)
```typescript
await prisma.product.updateMany({
  where: { badge: 'archived' },
  data: { badge: null }
});
```

## 📊 Troubleshooting

### Error: Can't reach database server
**Solusi:**
1. Periksa koneksi internet Anda
2. Pastikan DATABASE_URL di `.env` sudah benar
3. Coba restart development server
4. Periksa status Supabase di dashboard

### Error: Product not found
**Solusi:**
Pastikan produk "Matcha Latte" ada di database dengan nama yang persis sama (case-insensitive).

### Error: Foreign key constraint
**Solusi:**
Script sudah menangani ini dengan menghapus relasi terlebih dahulu (ProductIngredient, OrderItem) sebelum menghapus produk.

## 💡 Tips

1. **Backup Database:** Selalu backup database sebelum menjalankan script delete
2. **Gunakan Archive:** Lebih aman menggunakan archive daripada delete
3. **Test di Development:** Test script di environment development dulu
4. **Periksa Hasil:** Selalu periksa hasil di Prisma Studio atau admin panel

## 📝 Catatan

- Script ini menggunakan Prisma Client
- Case-insensitive untuk nama produk "Matcha Latte"
- Script akan otomatis disconnect dari database setelah selesai
- Exit code 0 = sukses, 1 = gagal
