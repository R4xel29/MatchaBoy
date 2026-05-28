# Fitur Crop & Rotate Gambar Profile

## Deskripsi
Fitur ini memungkinkan user dan driver untuk melakukan crop dan rotate pada gambar profile sebelum diupload.

## Teknologi
- **react-easy-crop**: Library untuk crop gambar dengan UI yang smooth
- **Canvas API**: Untuk memproses gambar hasil crop dan rotate

## Implementasi

### 1. Komponen ImageCropModal
Lokasi: `src/components/ui/ImageCropModal.tsx`

Fitur:
- ✅ Crop gambar dengan bentuk bulat (circle)
- ✅ Zoom in/out dengan slider
- ✅ Rotate 90° dengan tombol
- ✅ Preview real-time
- ✅ UI yang responsive dan modern
- ✅ Loading state saat processing

### 2. Integrasi di ProfileClient
Lokasi: `src/app/(storefront)/profile/ProfileClient.tsx`

Perubahan:
- Import `ImageCropModal` component
- Tambah state `showCropModal` dan `tempImageUrl`
- Ubah `handlePhotoUpload` menjadi `handlePhotoSelect` untuk membuka modal crop
- Tambah `handleCropComplete` untuk upload hasil crop
- Render `ImageCropModal` di akhir component

### 3. Integrasi di Driver Page
Lokasi: `src/app/(driver)/driver/page.tsx`

Perubahan:
- Import `ImageCropModal` component
- Tambah state `showCropModal` dan `tempImageUrl`
- Ubah `handlePhotoUpload` menjadi `handlePhotoSelect` untuk membuka modal crop
- Tambah `handleCropComplete` untuk upload hasil crop
- Render `ImageCropModal` di akhir component

## Cara Penggunaan

### Untuk User (Profile)
1. Buka halaman Profile
2. Klik tombol "Edit Profil"
3. Klik icon camera pada foto profile
4. Pilih gambar dari device
5. Modal crop akan muncul dengan kontrol:
   - **Drag**: Geser gambar untuk posisi crop
   - **Pinch/Zoom slider**: Zoom in/out
   - **Tombol Putar**: Rotate 90° searah jarum jam
6. Klik "Simpan" untuk upload hasil crop

### Untuk Driver
1. Buka halaman Driver Dashboard
2. Klik tab "Profile"
3. Klik icon camera pada foto profile
4. Pilih gambar dari device
5. Modal crop akan muncul dengan kontrol yang sama
6. Klik "Simpan" untuk upload hasil crop

## Konfigurasi

### Aspect Ratio
Default: `1:1` (square/circle)

Untuk mengubah aspect ratio, edit parameter `aspectRatio` di `ImageCropModal`:
```tsx
<ImageCropModal
  aspectRatio={1}  // 1:1 untuk square, 16/9 untuk landscape, dll
  ...
/>
```

### Crop Shape
Default: `round` (circle)

Untuk mengubah shape, edit property `cropShape` di `Cropper`:
```tsx
<Cropper
  cropShape="round"  // "round" atau "rect"
  ...
/>
```

### Image Quality
Default: `0.95` (95% quality)

Untuk mengubah quality, edit parameter di `canvas.toBlob`:
```tsx
canvas.toBlob((blob) => {
  ...
}, 'image/jpeg', 0.95);  // 0.0 - 1.0
```

## Dependencies
```json
{
  "react-easy-crop": "^5.5.7"
}
```

## Browser Support
- ✅ Chrome/Edge (modern)
- ✅ Firefox (modern)
- ✅ Safari (iOS 12+)
- ✅ Mobile browsers

## Notes
- Gambar hasil crop disimpan dalam format JPEG dengan quality 95%
- File size akan lebih kecil karena sudah di-crop dan di-compress
- Mendukung touch gestures untuk mobile (pinch to zoom, drag to pan)
- Canvas API digunakan untuk processing, tidak perlu server-side processing
