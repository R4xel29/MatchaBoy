---
name: stitch-ui-workflow
description: Workflow for fetching, analyzing, and implementing UI screens from StitchMCP into Next.js React components with zero feature regression and brand adherence.
---

# StitchMCP UI Adoption Workflow

Panduan ini digunakan ketika pengguna meminta meremajakan, membuat, atau menyelaraskan tampilan UI berdasarkan desain dari **StitchMCP** (`@mcp:StitchMCP`).

## 1. Tool Chain StitchMCP
1. **List Projects**:
   - Panggil tool `list_projects` pada MCP server `StitchMCP` untuk menemukan project yang relevan.
2. **List Screens**:
   - Panggil tool `list_screens`.
   - **PENTING**: Argumen `projectId` **WAJIB** berupa ID murni tanpa prefix `projects/` (contoh: `projectId: "472572904318165024"`, bukan `"projects/472572904318165024"`).
3. **Get Screen**:
   - Panggil tool `get_screen` dengan menyertakan `name`, `projectId`, dan `screenId` untuk memperoleh entri file dan download URL `htmlCode`.
4. **Fetch & Analyze Screen Code**:
   - Gunakan `read_url_content` pada tautan `htmlCode.downloadUrl`.
   - Analisis struktur layout (Bento Grid, Inspector Drawer, Metric Ribbons, Floating Action Bars), token styling Tailwind, dan interaksi komponen.

## 2. Prinsip Implementasi Produksi (Zero Feature Regression)
- **Retensi Fitur 100%**:
  DILARANG menghapus handler fungsional, modal, listener event, atau logika bisnis yang sudah ada di halaman target (misal: modal pembuatan produk, quick price, recipe HPP, master toppings, event AI Studio, bulk actions).
- **Penyelarasan Identitas Brand**:
  - Selalu sesuaikan warna dan tema dengan identitas resmi brand (**Arum Seduh**: nuansa Orange & Amber, dark slate foundations).
  - Gunakan ikon vektor resmi (`lucide-react`) dan jangan biarkan emoji OS tampil pada tombol atau badge.
- **Arsitektur Komponen**:
  - Pecah komponen visual yang kompleks menjadi komponen modular (misal: `ProductInspectorDrawer`, `ProductGridTable`).
  - Sediakan fleksibilitas tampilan (contoh: dual-view Bento Cards vs Data Table).
  - Berikan feedback interaktif langsung (misal: instant availability switch langsung di kartu tanpa membuka modal).
