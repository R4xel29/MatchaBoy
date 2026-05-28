# 🔒 Perbaikan Filter Produk Archived - Dokumentasi

## 🐛 Masalah yang Ditemukan

**Sebelumnya:**
- Produk yang diarsipkan masih muncul di halaman storefront (pengguna)
- Produk archived muncul di halaman voucher
- Produk archived muncul di cashier POS
- Produk archived muncul di admin voucher selector

**Penyebab:**
Query `prisma.product.findMany()` tidak memfilter produk dengan badge 'archived'

---

## ✅ Perbaikan yang Dilakukan

### File yang Diperbaiki:

#### 1. **Storefront Page** (`src/app/(storefront)/page.tsx`)
**Sebelumnya:**
```typescript
prisma.product.findMany({
  orderBy: { createdAt: 'desc' }
})
```

**Sekarang:**
```typescript
prisma.product.findMany({
  where: {
    OR: [
      { badge: null },
      { badge: { not: 'archived' } }
    ]
  },
  orderBy: { createdAt: 'desc' }
})
```

#### 2. **Voucher Claim Page** (`src/app/(storefront)/vouchers/claim/page.tsx`)
**Sebelumnya:**
```typescript
prisma.product.findMany({
  orderBy: { name: 'asc' }
})
```

**Sekarang:**
```typescript
prisma.product.findMany({
  where: {
    OR: [
      { badge: null },
      { badge: { not: 'archived' } }
    ]
  },
  orderBy: { name: 'asc' }
})
```

#### 3. **Voucher Detail Page** (`src/app/(storefront)/vouchers/[id]/page.tsx`)
**Sebelumnya:**
```typescript
prisma.product.findMany({
  orderBy: { createdAt: 'desc' }
})
```

**Sekarang:**
```typescript
prisma.product.findMany({
  where: {
    OR: [
      { badge: null },
      { badge: { not: 'archived' } }
    ]
  },
  orderBy: { createdAt: 'desc' }
})
```

#### 4. **Cashier POS Page** (`src/app/(admin)/admin/cashier/page.tsx`)
**Sebelumnya:**
```typescript
prisma.product.findMany({
  where: { badge: { not: 'sold-out' } },
  include: { category: true },
  orderBy: { name: 'asc' }
})
```

**Sekarang:**
```typescript
prisma.product.findMany({
  where: {
    AND: [
      { badge: { not: 'sold-out' } },
      {
        OR: [
          { badge: null },
          { badge: { not: 'archived' } }
        ]
      }
    ]
  },
  include: { category: true },
  orderBy: { name: 'asc' }
})
```

#### 5. **Admin Voucher Page** (`src/app/(admin)/admin/vouchers/page.tsx`)
**Sebelumnya:**
```typescript
prisma.product.findMany({
  select: { id: true, name: true, category: { select: { name: true } } },
  orderBy: { name: 'asc' }
})
```

**Sekarang:**
```typescript
prisma.product.findMany({
  where: {
    OR: [
      { badge: null },
      { badge: { not: 'archived' } }
    ]
  },
  select: { id: true, name: true, category: { select: { name: true } } },
  orderBy: { name: 'asc' }
})
```

---

## 🔍 Penjelasan Filter

### Filter Logic:
```typescript
where: {
  OR: [
    { badge: null },           // Produk tanpa badge
    { badge: { not: 'archived' } }  // Produk dengan badge selain 'archived'
  ]
}
```

**Artinya:**
- Tampilkan produk yang badge-nya `null` (tidak ada badge)
- ATAU tampilkan produk yang badge-nya bukan `'archived'`
- Produk dengan badge `'new'`, `'best-seller'`, `'sold-out'` tetap muncul
- Produk dengan badge `'archived'` **TIDAK** muncul

### Filter untuk Cashier (Kombinasi):
```typescript
where: {
  AND: [
    { badge: { not: 'sold-out' } },  // Tidak sold-out
    {
      OR: [
        { badge: null },
        { badge: { not: 'archived' } }  // Tidak archived
      ]
    }
  ]
}
```

**Artinya:**
- Produk harus **TIDAK** sold-out
- DAN produk harus **TIDAK** archived
- Hanya produk yang available yang muncul di cashier

---

## 📊 Dampak Perbaikan

### Sebelum Perbaikan:
```
Storefront:
✅ Matcha Latte (active)
✅ Iced Matcha (active)
❌ Matcha Biscuit (archived) ← MASIH MUNCUL!
❌ Dirty Matcha (archived) ← MASIH MUNCUL!
```

### Setelah Perbaikan:
```
Storefront:
✅ Matcha Latte (active)
✅ Iced Matcha (active)
✓ Matcha Biscuit (archived) ← TIDAK MUNCUL
✓ Dirty Matcha (archived) ← TIDAK MUNCUL
```

---

## 🎯 Halaman yang Terpengaruh

### Halaman Pengguna (Storefront):
1. ✅ **Homepage** - Produk archived tidak muncul
2. ✅ **Voucher Claim** - Produk archived tidak bisa dipilih
3. ✅ **Voucher Detail** - Produk archived tidak muncul di list

### Halaman Admin:
1. ✅ **Cashier POS** - Produk archived tidak muncul di menu
2. ✅ **Voucher Management** - Produk archived tidak muncul di selector

### Halaman yang TIDAK Terpengaruh:
1. ✅ **Admin Products** - Produk archived tetap bisa dilihat dengan "Show Archived"
2. ✅ **Order History** - Order lama dengan produk archived tetap terlihat

---

## 🧪 Testing

### Test Case 1: Storefront Homepage
```
1. Archive produk "Matcha Biscuit"
2. Buka homepage storefront
3. ✓ Produk "Matcha Biscuit" tidak muncul
4. Restore produk "Matcha Biscuit"
5. Refresh homepage
6. ✓ Produk "Matcha Biscuit" muncul kembali
```

### Test Case 2: Cashier POS
```
1. Archive produk "Dirty Matcha"
2. Buka halaman Cashier POS
3. ✓ Produk "Dirty Matcha" tidak muncul di menu
4. Restore produk "Dirty Matcha"
5. Refresh halaman
6. ✓ Produk "Dirty Matcha" muncul kembali
```

### Test Case 3: Voucher Claim
```
1. Archive produk "Iced Matcha"
2. Buka halaman voucher claim
3. ✓ Produk "Iced Matcha" tidak muncul di list
4. Tidak bisa apply voucher untuk produk archived
```

### Test Case 4: Admin Products
```
1. Archive produk "Matcha Latte"
2. Buka Admin > Products
3. ✓ Produk "Matcha Latte" tidak muncul (default)
4. Klik "Show Archived"
5. ✓ Produk "Matcha Latte" muncul dengan warna abu-abu
```

---

## 💡 Best Practices

### Kapan Menggunakan Archive:
✅ **Gunakan Archive untuk:**
- Menu seasonal yang tidak dijual saat ini
- Produk yang stok habis untuk waktu lama
- Menu yang sedang di-review atau di-update
- Testing menu baru (archive menu lama sementara)

❌ **Jangan Archive untuk:**
- Produk yang sold-out sementara (gunakan badge 'sold-out')
- Produk yang masih ingin ditampilkan tapi tidak bisa dibeli

### Workflow Archive:
```
1. Admin archive produk di Admin > Products
2. Produk langsung hilang dari storefront
3. Produk hilang dari cashier POS
4. Produk hilang dari voucher selector
5. Order history tetap menampilkan produk archived
6. Admin bisa restore kapan saja
```

---

## 🔒 Security & Data Integrity

### Data Preservation:
- ✅ Produk archived **TIDAK DIHAPUS** dari database
- ✅ Order history tetap utuh
- ✅ Relasi ingredients tetap ada
- ✅ Bisa di-restore kapan saja

### Access Control:
- ✅ User biasa: Tidak bisa lihat produk archived
- ✅ Cashier: Tidak bisa jual produk archived
- ✅ Admin: Bisa lihat dan restore produk archived

---

## ✅ Kesimpulan

Perbaikan filter produk archived sudah diterapkan di:
- ✅ 5 file diperbaiki
- ✅ Storefront homepage
- ✅ Voucher pages (claim & detail)
- ✅ Cashier POS
- ✅ Admin voucher management
- ✅ Produk archived tidak muncul di halaman pengguna
- ✅ Data tetap aman dan bisa di-restore

**Sekarang produk yang diarsipkan benar-benar tersembunyi dari pengguna! 🎉**
