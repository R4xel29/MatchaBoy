import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1.21: Product Form Multi-Step Photos (Display, Detail & Banner), Multi-Crop & AI Description Compliance', () => {
  it('T1.21.1: ProductFormModal separates Info & Deskripsi (Step 1) from Foto & Visual (Step 2)', () => {
    const formPath = path.resolve(
      process.cwd(),
      'src/components/admin/products/ProductFormModal.tsx'
    );
    const content = fs.readFileSync(formPath, 'utf8');
    expect(content).toContain("id: 'info'");
    expect(content).toContain("label: 'Info & Deskripsi'");
    expect(content).toContain("id: 'photos'");
    expect(content).toContain("label: 'Foto & Visual'");
  });

  it('T1.21.2: Photo Step provides 2 mandatory slots (Display & Detail) + 1 optional Banner slot from 1 uploaded master image', () => {
    const formPath = path.resolve(
      process.cwd(),
      'src/components/admin/products/ProductFormModal.tsx'
    );
    const content = fs.readFileSync(formPath, 'utf8');
    expect(content).toContain('masterImageSrc');
    expect(content).toContain('detailImage');
    expect(content).toContain('bannerImage');
    expect(content).toContain('1. Gambar Display Katalog');
    expect(content).toContain('2. Gambar Detail Produk');
    expect(content).toContain('3. Gambar Banner Promosi Produk (Opsional)');
    expect(content).toContain('autoCropImageToWebp');
  });

  it('T1.21.3: ProductImageCropperModal supports multi-slot switching (display, detail, banner) from the same source image', () => {
    const cropperPath = path.resolve(
      process.cwd(),
      'src/components/admin/products/ProductImageCropperModal.tsx'
    );
    const content = fs.readFileSync(cropperPath, 'utf8');
    expect(content).toContain("export type CropTargetSlot = 'display' | 'detail' | 'banner'");
    expect(content).toContain('Simpan & Lanjut Crop Detail');
    expect(content).toContain('Simpan Display Saja');
  });

  it('T1.21.4: AI Description Generator button requires Menu Name first and calls /api/admin/products/ai-description', () => {
    const formPath = path.resolve(
      process.cwd(),
      'src/components/admin/products/ProductFormModal.tsx'
    );
    const formContent = fs.readFileSync(formPath, 'utf8');
    expect(formContent).toContain('handleGenerateAiDescription');
    expect(formContent).toContain('/api/admin/products/ai-description');
    expect(formContent).toContain(
      'Wajib mengisi Nama Menu terlebih dahulu sebelum menggunakan AI'
    );

    const apiPath = path.resolve(
      process.cwd(),
      'src/app/api/admin/products/ai-description/route.ts'
    );
    const apiContent = fs.readFileSync(apiPath, 'utf8');
    expect(apiContent).toContain('Nama menu wajib diisi terlebih dahulu');
    expect(apiContent).toContain('generateStoreAIResponse');
    expect(apiContent).toContain('Arum Seduh');
  });

  it('T1.21.5: Storefront ProductModal uses product.modifiers?.detailImage and falls back to cropped product.image if only display is filled', () => {
    const modalPath = path.resolve(
      process.cwd(),
      'src/components/storefront/ProductModal.tsx'
    );
    const content = fs.readFileSync(modalPath, 'utf8');
    expect(content).toContain('product.modifiers?.detailImage || product.image');
  });
});
