---
description: Selalu lakukan git commit dan git push setelah tugas/verifikasi selesai
globs: *
always_on: true
---

# Aturan Wajib Git Push

1. **Wajib Commit & Push Setelah Tugas Selesai**:
   - Setiap kali pekerjaan pembuatan fitur, perbaikan bug, atau refactor telah diverifikasi (misal via `npm run build`), asisten WAJIB melakukan commit dan push ke remote git repository (`git push origin <branch>`).
2. **Sintaks PowerShell**:
   - Di lingkungan Windows PowerShell, jalankan perintah git secara berurutan menggunakan titik koma `;` atau perintah terpisah:
     `git add .; git commit -m "feat/fix: deskripsi perubahan"; git push origin master`
3. **Konfirmasi ke Pengguna**:
   - Sertakan hash commit dan konfirmasi branch saat melaporkan pekerjaan selesai.
