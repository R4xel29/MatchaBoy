/**
 * Employee Dashboard (Dashboard Karyawan) Test Suite
 * Verifies that the staff operational dashboard, API, middleware authorization,
 * kitchen queue advancement, and brand guidelines are fully implemented.
 */

import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1.16: Dashboard Karyawan & Staff Operational Hub Compliance', () => {
  it('T1.16.1: API route /api/admin/karyawan/route.ts exists and fetches shift, reconciliation, live orders, SOP, and inventory alerts', () => {
    const routePath = path.resolve(process.cwd(), 'src/app/api/admin/karyawan/route.ts');
    expect(fs.existsSync(routePath)).toBeTruthy();

    const content = fs.readFileSync(routePath, 'utf8');
    expect(content.includes('prisma.cashierShift.findFirst')).toBeTruthy();
    expect(content.includes('prisma.order.findMany')).toBeTruthy();
    expect(content.includes('prisma.sopTemplateItem.findMany')).toBeTruthy();
    expect(content.includes('prisma.ingredient.findMany')).toBeTruthy();
    expect(content.includes('expectedCash')).toBeTruthy();
    expect(content.includes('reconciliation')).toBeTruthy();
    expect(content.includes('liveOrders')).toBeTruthy();
  });

  it('T1.16.2: Server page /admin/karyawan/page.tsx guards access exclusively for employee role and redirects ADMIN to /admin', () => {
    const pagePath = path.resolve(process.cwd(), 'src/app/(admin)/admin/karyawan/page.tsx');
    expect(fs.existsSync(pagePath)).toBeTruthy();

    const content = fs.readFileSync(pagePath, 'utf8');
    expect(content.includes("session.user.role === 'CASHIER' || session.user.role === 'KARYAWAN'")).toBeTruthy();
    expect(content.includes("session?.user?.role === 'ADMIN'")).toBeTruthy();
    expect(content.includes("redirect('/admin')")).toBeTruthy();
    expect(content.includes('Promise.all([')).toBeTruthy();
    expect(content.includes('<KaryawanDashboardClient')).toBeTruthy();
    expect(content.includes('initialData={initialData}')).toBeTruthy();
  });

  it('T1.16.3: Client component KaryawanDashboardClient.tsx implements shift timer, KPIs, modals, and queue advancement', () => {
    const clientPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/karyawan/KaryawanDashboardClient.tsx');
    expect(fs.existsSync(clientPath)).toBeTruthy();

    const content = fs.readFileSync(clientPath, 'utf8');
    // Shift lifecycle
    expect(content.includes('handleOpenShift')).toBeTruthy();
    expect(content.includes('handleCloseShift')).toBeTruthy();
    expect(content.includes('/api/cashier/shift')).toBeTruthy();
    expect(content.includes('shiftDuration')).toBeTruthy();

    // Order advancement (PENDING -> PREPARING -> READY -> COMPLETED)
    expect(content.includes('advanceOrderStatus')).toBeTruthy();
    expect(content.includes('PREPARING')).toBeTruthy();
    expect(content.includes('READY')).toBeTruthy();
    expect(content.includes('COMPLETED')).toBeTruthy();

    // SOP and Critical Stock
    expect(content.includes('sopStats')).toBeTruthy();
    expect(content.includes('criticalIngredients')).toBeTruthy();
  });

  it('T1.16.4: Middleware and AdminSidebar restrict Dashboard Karyawan strictly to employee session/role', () => {
    const middlewarePath = path.resolve(process.cwd(), 'src/middleware.ts');
    const middlewareContent = fs.readFileSync(middlewarePath, 'utf8');
    expect(middlewareContent.includes("'/admin/karyawan'")).toBeTruthy();
    expect(middlewareContent.includes("'/api/admin/karyawan'")).toBeTruthy();
    expect(middlewareContent.includes("pathname === '/admin/karyawan' && role === 'ADMIN'")).toBeTruthy();
    expect(middlewareContent.includes("redirect(new URL('/admin/karyawan', req.url))")).toBeTruthy();

    const sidebarPath = path.resolve(process.cwd(), 'src/components/admin/AdminSidebar.tsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    // Featured in STAFF_ITEMS for employees
    expect(sidebarContent.includes("{ label: 'Dashboard Karyawan', href: '/admin/karyawan', icon: LayoutDashboard }")).toBeTruthy();
    // NOT in MAIN_ITEMS for admin
    const mainItemsMatch = sidebarContent.match(/const MAIN_ITEMS = \[([\s\S]*?)\];/);
    expect(mainItemsMatch).toBeTruthy();
    expect(mainItemsMatch![1].includes('/admin/karyawan')).toBeFalsy();
  });

  it('T1.16.5: NextAuth session and JWT callbacks support jobdeskCode', () => {
    const typesPath = path.resolve(process.cwd(), 'src/types/next-auth.d.ts');
    const typesContent = fs.readFileSync(typesPath, 'utf8');
    expect(typesContent.includes('jobdeskCode?: string | null')).toBeTruthy();

    const authConfigPath = path.resolve(process.cwd(), 'src/auth.config.ts');
    const authConfigContent = fs.readFileSync(authConfigPath, 'utf8');
    expect(authConfigContent.includes('token.jobdeskCode')).toBeTruthy();
    expect(authConfigContent.includes('session.user.jobdeskCode')).toBeTruthy();
  });

  it('T1.16.6: Brand integrity and UI style compliance (100% Arum Seduh, Orange/Amber palette, zero Matchaboy)', () => {
    const filesToCheck = [
      'src/app/(admin)/admin/karyawan/page.tsx',
      'src/app/(admin)/admin/karyawan/KaryawanDashboardClient.tsx',
      'src/app/api/admin/karyawan/route.ts',
    ];

    filesToCheck.forEach((relPath) => {
      const fullPath = path.resolve(process.cwd(), relPath);
      expect(fs.existsSync(fullPath)).toBeTruthy();
      const content = fs.readFileSync(fullPath, 'utf8');

      // No Matchaboy
      expect(content.includes('Matchaboy')).toBeFalsy();
    });

    const clientContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/app/(admin)/admin/karyawan/KaryawanDashboardClient.tsx'),
      'utf8'
    );
    // Orange/Amber styling
    expect(clientContent.includes('from-orange-500 to-amber-500')).toBeTruthy();
    expect(clientContent.includes('text-orange-')).toBeTruthy();
    // Official Brand name
    expect(clientContent.includes('Arum Seduh')).toBeTruthy();
  });
});
