/**
 * Recipe Modifier Doses & Modern Minimalist UI Compliance Test Suite
 * Validates sugar sweetness dosage (Less, Lumayan, Manis Sekali),
 * matcha dosage (Light, Medium, Bold, Extra Bold),
 * and espresso shot dosage (Single, Double, Triple Shot) across UI and inventory deduction.
 */

import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1.10: Recipe Modifier Doses & Minimalist Modal Compliance', () => {
  it('T1.10.1: types.ts exports SugarDosesConfig, MatchaDosesConfig, and ShotDosesConfig with required fields', () => {
    const typesPath = path.resolve(process.cwd(), 'src/components/admin/products/types.ts');
    expect(fs.existsSync(typesPath)).toBeTruthy();

    const content = fs.readFileSync(typesPath, 'utf8');
    expect(content.includes('export interface SugarDosesConfig')).toBeTruthy();
    expect(content.includes('less: number')).toBeTruthy();
    expect(content.includes('lumayan: number')).toBeTruthy();
    expect(content.includes('manisSekali: number')).toBeTruthy();

    expect(content.includes('export interface MatchaDosesConfig')).toBeTruthy();
    expect(content.includes('light: number')).toBeTruthy();
    expect(content.includes('medium: number')).toBeTruthy();
    expect(content.includes('bold: number')).toBeTruthy();
    expect(content.includes('extraBold: number')).toBeTruthy();

    expect(content.includes('export interface ShotDosesConfig')).toBeTruthy();
    expect(content.includes('single: number')).toBeTruthy();
    expect(content.includes('double: number')).toBeTruthy();
    expect(content.includes('triple: number')).toBeTruthy();
  });

  it('T1.10.2: Recipe API route handles GET and PUT with modifier doses', () => {
    const routePath = path.resolve(process.cwd(), 'src/app/api/admin/products/[id]/recipe/route.ts');
    expect(fs.existsSync(routePath)).toBeTruthy();

    const content = fs.readFileSync(routePath, 'utf8');
    expect(content.includes('sugarDoses')).toBeTruthy();
    expect(content.includes('matchaDoses')).toBeTruthy();
    expect(content.includes('shotDoses')).toBeTruthy();
    expect(content.includes('mods.sugarDoses')).toBeTruthy();
    expect(content.includes('mods.matchaDoses')).toBeTruthy();
    expect(content.includes('mods.shotDoses')).toBeTruthy();
  });

  it('T1.10.3: inventory-utils.ts incorporates sugar, matcha, and espresso shot doses into deduction', () => {
    const invPath = path.resolve(process.cwd(), 'src/lib/inventory-utils.ts');
    expect(fs.existsSync(invPath)).toBeTruthy();

    const content = fs.readFileSync(invPath, 'utf8');
    expect(content.includes('sugarDoses')).toBeTruthy();
    expect(content.includes('matchaDoses')).toBeTruthy();
    expect(content.includes('shotDoses')).toBeTruthy();
    expect(content.includes('parseItemModifiers')).toBeTruthy();
    expect(content.includes('sugarDoses.less')).toBeTruthy();
    expect(content.includes('sugarDoses.manisSekali')).toBeTruthy();
    expect(content.includes('matchaDoses.bold')).toBeTruthy();
    expect(content.includes('shotDoses.triple')).toBeTruthy();
  });

  it('T1.10.4: RecipeHppModal implements modern minimalist UI with SearchableIngredientSelect', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/admin/products/RecipeHppModal.tsx');
    expect(fs.existsSync(modalPath)).toBeTruthy();

    const content = fs.readFileSync(modalPath, 'utf8');
    expect(content.includes('SearchableIngredientSelect')).toBeTruthy();
    expect(content.includes('Takaran Modifikasi')).toBeTruthy();
    expect(content.includes('Less Sugar')).toBeTruthy();
    expect(content.includes('Lumayan (Biasa / Standar)')).toBeTruthy();
    expect(content.includes('Manis Sekali')).toBeTruthy();
    expect(content.includes('Bold (Lvl 7-8)')).toBeTruthy();
    expect(content.includes('Triple Shot (3 Shots)')).toBeTruthy();
  });

  it('T1.10.5: RecipeHppModal adheres to Arum Seduh Orange/Amber palette with zero Matchaboy references', () => {
    const modalPath = path.resolve(process.cwd(), 'src/components/admin/products/RecipeHppModal.tsx');
    const content = fs.readFileSync(modalPath, 'utf8');

    expect(content.includes('orange-')).toBeTruthy();
    expect(content.includes('amber-')).toBeTruthy();
    expect(content.includes('Matchaboy')).toBeFalsy();
  });
});
