/**
 * Test Suite: Admin Customer Management UI/UX & Slug Support
 * Specifications: PROJECT.md, AGENTS.md § Brand & UI Integrity
 * Verifies Customer List, Customer Detail, Slug Sanitization & Dual Resolution, and Brand Compliance.
 */

import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';
import { sanitizeSlug } from '../src/app/actions/customer-admin';

describe('Tier 1.15: Admin Customer Management UI/UX & Slug Compliance', () => {
  it('T1.15.1: Prisma schema includes unique slug field on User model', () => {
    const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
    expect(fs.existsSync(schemaPath)).toBeTruthy();
    const content = fs.readFileSync(schemaPath, 'utf8');
    expect(content.includes('slug          String?   @unique') || content.includes('slug String? @unique')).toBeTruthy();
  });

  it('T1.15.2: Sanitize slug helper converts raw text into clean URL-friendly slugs', async () => {
    expect(await sanitizeSlug('Budi Santoso')).toBe('budi-santoso');
    expect(await sanitizeSlug('  Ahmad   Dahlan  ')).toBe('ahmad-dahlan');
    expect(await sanitizeSlug('Rina & Sari #123!')).toBe('rina-sari-123');
    expect(await sanitizeSlug('---kopi--susu---')).toBe('kopi-susu');
  });

  it('T1.15.3: CustomerDetailPage supports multi-identifier resolution (id, slug, referralCode, phone)', () => {
    const detailPagePath = path.resolve(process.cwd(), 'src/app/(admin)/admin/customers/[id]/page.tsx');
    expect(fs.existsSync(detailPagePath)).toBeTruthy();
    const content = fs.readFileSync(detailPagePath, 'utf8');
    expect(content.includes('slug: identifier')).toBeTruthy();
    expect(content.includes('referralCode: identifier')).toBeTruthy();
    expect(content.includes('phone: identifier')).toBeTruthy();
    expect(content.includes('id: identifier')).toBeTruthy();
  });

  it('T1.15.4: Customer list page supports search across name, email, phone, slug, and id', () => {
    const listPagePath = path.resolve(process.cwd(), 'src/app/(admin)/admin/customers/page.tsx');
    expect(fs.existsSync(listPagePath)).toBeTruthy();
    const content = fs.readFileSync(listPagePath, 'utf8');
    expect(content.includes('slug: { contains: searchQuery')).toBeTruthy();
    expect(content.includes('id: { contains: searchQuery')).toBeTruthy();
    expect(content.includes('referralCode: { contains: searchQuery')).toBeTruthy();
  });

  it('T1.15.5: Customer components adhere to Arum Seduh Orange & Amber brand guidelines with zero Matchaboy mentions', () => {
    const clientPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/customers/CustomerListClient.tsx');
    const detailClientPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/customers/[id]/CustomerDetailClient.tsx');
    const createModalPath = path.resolve(process.cwd(), 'src/app/(admin)/admin/customers/CreateCustomerModal.tsx');

    [clientPath, detailClientPath, createModalPath].forEach((filePath) => {
      expect(fs.existsSync(filePath)).toBeTruthy();
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content.includes('Matchaboy')).toBeFalsy();
      expect(content.includes('orange-') || content.includes('amber-')).toBeTruthy();
      expect(content.includes('lucide-react')).toBeTruthy();
    });
  });

  it('T1.15.6: Server Actions export updateCustomerDetailsAction, createCustomerAction, and grantCustomerVoucherAction', () => {
    const actionsPath = path.resolve(process.cwd(), 'src/app/actions/customer-admin.ts');
    expect(fs.existsSync(actionsPath)).toBeTruthy();
    const content = fs.readFileSync(actionsPath, 'utf8');
    expect(content.includes('export async function updateCustomerDetailsAction')).toBeTruthy();
    expect(content.includes('export async function createCustomerAction')).toBeTruthy();
    expect(content.includes('export async function grantCustomerVoucherAction')).toBeTruthy();
  });
});
