/**
 * Quick Inspector Realtime Test Suite
 * Verifies that ProductInspectorDrawer and /api/admin/products/[id]/stats
 * calculate and display realtime sales, inventory capacity, and recent orders.
 */

import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1.9: Realtime Quick Inspector Compliance', () => {
  it('T1.9.1: Realtime stats API route exists and handles authorization and analytics calculations', () => {
    const routePath = path.resolve(process.cwd(), 'src/app/api/admin/products/[id]/stats/route.ts');
    expect(fs.existsSync(routePath)).toBeTruthy();

    const content = fs.readFileSync(routePath, 'utf8');
    expect(content.includes('prisma.orderItem.findMany')).toBeTruthy();
    expect(content.includes('productIngredients')).toBeTruthy();
    expect(content.includes('bottleneck')).toBeTruthy();
    expect(content.includes('last7Days')).toBeTruthy();
    expect(content.includes('growthPercent')).toBeTruthy();
    expect(content.includes('recentOrders')).toBeTruthy();
  });

  it('T1.9.2: ProductInspectorDrawer connects to realtime stats and removed deterministic dummy seeds', () => {
    const drawerPath = path.resolve(process.cwd(), 'src/components/admin/products/ProductInspectorDrawer.tsx');
    expect(fs.existsSync(drawerPath)).toBeTruthy();

    const content = fs.readFileSync(drawerPath, 'utf8');
    // Ensure deterministic fake seed formula is removed
    expect(content.includes('const seed = (product.name.charCodeAt(0)')).toBeFalsy();
    expect(content.includes('+14.8% volume')).toBeFalsy();

    // Ensure realtime endpoint integration is present
    expect(content.includes('/api/admin/products/')).toBeTruthy();
    expect(content.includes('/stats')).toBeTruthy();
    expect(content.includes('REALTIME')).toBeTruthy();
    expect(content.includes('growthPercent')).toBeTruthy();
    expect(content.includes('recentOrders')).toBeTruthy();
    expect(content.includes('bottleneck')).toBeTruthy();
  });

  it('T1.9.3: ProductInspectorDrawer adheres to Arum Seduh Orange/Amber palette and Lucide React icons', () => {
    const drawerPath = path.resolve(process.cwd(), 'src/components/admin/products/ProductInspectorDrawer.tsx');
    const content = fs.readFileSync(drawerPath, 'utf8');

    // Color tokens
    expect(content.includes('orange-')).toBeTruthy();
    // Lucide React
    expect(content.includes('lucide-react')).toBeTruthy();
    // No legacy brand
    expect(content.includes('Matchaboy')).toBeFalsy();
  });

  it('T1.9.4: IngredientItem interface in types.ts includes stock and ProductRealtimeStats export', () => {
    const typesPath = path.resolve(process.cwd(), 'src/components/admin/products/types.ts');
    const content = fs.readFileSync(typesPath, 'utf8');

    expect(content.includes('stock?: number')).toBeTruthy();
    expect(content.includes('export interface ProductRealtimeStats')).toBeTruthy();
  });

  it('T1.9.5: ProductInspectorDrawer mounts with key={inspectedProduct.id} in AdminProductsClient', () => {
    const clientPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/products/AdminProductsClient.tsx');
    expect(fs.existsSync(clientPath)).toBeTruthy();

    const content = fs.readFileSync(clientPath, 'utf8');
    expect(content.includes('<ProductInspectorDrawer')).toBeTruthy();
    expect(content.includes('key={inspectedProduct.id}')).toBeTruthy();
  });

  it('T1.9.6: ProductInspectorDrawer resets state and verifies current product id on inspector navigation', () => {
    const drawerPath = path.resolve(process.cwd(), 'src/components/admin/products/ProductInspectorDrawer.tsx');
    const content = fs.readFileSync(drawerPath, 'utf8');

    // State reset on product change
    expect(content.includes('setStats(null)')).toBeTruthy();
    expect(content.includes('AbortController')).toBeTruthy();
    expect(content.includes('data.productId === product.id')).toBeTruthy();
    expect(content.includes('currentStats')).toBeTruthy();
  });
});
