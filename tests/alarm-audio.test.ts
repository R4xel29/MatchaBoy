/**
 * Tier 1 Test Suite: Custom Incoming Order Alarm Audio Suite
 * Verifies:
 * 1. Default alarm sound URL configuration.
 * 2. Fallback resolution for custom vs default sound.
 * 3. Static contract validation for audio alarm endpoints and utilities.
 */

import { describe, it, expect } from './test-framework';
import { DEFAULT_ALARM_SOUND_URL, getAlarmSoundUrl } from '../src/lib/alarm-utils';
import fs from 'fs';
import path from 'path';

describe('Tier 1.8: Custom Incoming Order Alarm Audio Compliance', () => {
  it('T1.8.1: DEFAULT_ALARM_SOUND_URL is a valid HTTPS audio link', () => {
    expect(DEFAULT_ALARM_SOUND_URL).toBeTruthy();
    expect(DEFAULT_ALARM_SOUND_URL.startsWith('https://')).toBe(true);
    expect(DEFAULT_ALARM_SOUND_URL.endsWith('.mp3')).toBe(true);
  });

  it('T1.8.2: getAlarmSoundUrl returns custom URL when provided and non-empty', () => {
    const customUrl = 'https://example.com/storage/alarm/my-voice.mp3';
    expect(getAlarmSoundUrl(customUrl)).toBe(customUrl);

    const customWav = 'https://example.com/alarm/alert.wav';
    expect(getAlarmSoundUrl(customWav)).toBe(customWav);
  });

  it('T1.8.3: getAlarmSoundUrl gracefully falls back to DEFAULT_ALARM_SOUND_URL for empty/null/whitespace', () => {
    expect(getAlarmSoundUrl('')).toBe(DEFAULT_ALARM_SOUND_URL);
    expect(getAlarmSoundUrl('   ')).toBe(DEFAULT_ALARM_SOUND_URL);
    expect(getAlarmSoundUrl(null)).toBe(DEFAULT_ALARM_SOUND_URL);
    expect(getAlarmSoundUrl(undefined)).toBe(DEFAULT_ALARM_SOUND_URL);
  });

  it('T1.8.4: StoreSettings schema & API routes include alarmSoundUrl field', () => {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    expect(schemaContent.includes('alarmSoundUrl')).toBe(true);

    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'store-settings', 'route.ts');
    const routeContent = fs.readFileSync(routePath, 'utf8');
    expect(routeContent.includes('alarmSoundUrl')).toBe(true);
  });

  it('T1.8.5: Upload alarm route exists and enforces 5MB limit and audio formats', () => {
    const uploadRoutePath = path.join(
      process.cwd(),
      'src',
      'app',
      'api',
      'admin',
      'store-settings',
      'upload-alarm',
      'route.ts'
    );
    expect(fs.existsSync(uploadRoutePath)).toBe(true);
    const content = fs.readFileSync(uploadRoutePath, 'utf8');
    expect(content.includes('5 * 1024 * 1024')).toBe(true);
    expect(content.includes('audio/')).toBe(true);
    expect(content.includes('uploadToSupabase')).toBe(true);
  });

  it('T1.8.6: Cashier and Admin components use getAlarmSoundUrl instead of hardcoded URLs', () => {
    const cashierPath = path.join(
      process.cwd(),
      'src',
      'app',
      '(admin)',
      'admin',
      'cashier',
      'orders',
      'CashierOrdersClient.tsx'
    );
    const cashierContent = fs.readFileSync(cashierPath, 'utf8');
    expect(cashierContent.includes('getAlarmSoundUrl')).toBe(true);

    const adminAlarmPath = path.join(
      process.cwd(),
      'src',
      'components',
      'admin',
      'AdminIncomingOrderAlarm.tsx'
    );
    const adminAlarmContent = fs.readFileSync(adminAlarmPath, 'utf8');
    expect(adminAlarmContent.includes('getAlarmSoundUrl')).toBe(true);
  });

  it('T1.8.7: alarmVolumeBoost is present in schema.prisma and store-settings API route', () => {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    const schemaContent = fs.readFileSync(schemaPath, 'utf8');
    expect(schemaContent.includes('alarmVolumeBoost')).toBe(true);

    const routePath = path.join(process.cwd(), 'src', 'app', 'api', 'admin', 'store-settings', 'route.ts');
    const routeContent = fs.readFileSync(routePath, 'utf8');
    expect(routeContent.includes('alarmVolumeBoost')).toBe(true);
  });

  it('T1.8.8: Web Audio API booster utilities (setupSpeakerPecahBooster & playBoostedAudio) exist', () => {
    const utilsPath = path.join(process.cwd(), 'src', 'lib', 'alarm-utils.ts');
    const utilsContent = fs.readFileSync(utilsPath, 'utf8');
    expect(utilsContent.includes('setupSpeakerPecahBooster')).toBe(true);
    expect(utilsContent.includes('playBoostedAudio')).toBe(true);
    expect(utilsContent.includes('playOneShotBoostedAlarm')).toBe(true);
    expect(utilsContent.includes('makeDistortionCurve')).toBe(true);
  });

  it('T1.8.9: CashierOrdersClient and AdminIncomingOrderAlarm wire playBoostedAudio', () => {
    const cashierPath = path.join(
      process.cwd(),
      'src',
      'app',
      '(admin)',
      'admin',
      'cashier',
      'orders',
      'CashierOrdersClient.tsx'
    );
    const cashierContent = fs.readFileSync(cashierPath, 'utf8');
    expect(cashierContent.includes('playBoostedAudio')).toBe(true);
    expect(cashierContent.includes('alarmVolumeBoost')).toBe(true);

    const adminAlarmPath = path.join(
      process.cwd(),
      'src',
      'components',
      'admin',
      'AdminIncomingOrderAlarm.tsx'
    );
    const adminAlarmContent = fs.readFileSync(adminAlarmPath, 'utf8');
    expect(adminAlarmContent.includes('playBoostedAudio')).toBe(true);
    expect(adminAlarmContent.includes('alarmVolumeBoost')).toBe(true);
  });

  it('T1.8.10: Web Audio booster & settings support extreme 500% and 700% overdrive levels', () => {
    const utilsPath = path.join(process.cwd(), 'src', 'lib', 'alarm-utils.ts');
    const utilsContent = fs.readFileSync(utilsPath, 'utf8');
    expect(utilsContent.includes('500%')).toBe(true);
    expect(utilsContent.includes('700%')).toBe(true);
    expect(utilsContent.includes('distortionAmount')).toBe(true);

    const settingsPath = path.join(
      process.cwd(),
      'src',
      'app',
      '(admin)',
      'admin',
      'settings',
      'store-settings',
      'page.tsx'
    );
    const settingsContent = fs.readFileSync(settingsPath, 'utf8');
    expect(settingsContent.includes('500%')).toBe(true);
    expect(settingsContent.includes('700%')).toBe(true);
    expect(settingsContent.includes('handleBoostChange')).toBe(true);
  });

  it('T1.8.11: Web Audio booster supports ultimate 1000% overdrive with DynamicsCompressorNode', () => {
    const utilsPath = path.join(process.cwd(), 'src', 'lib', 'alarm-utils.ts');
    const utilsContent = fs.readFileSync(utilsPath, 'utf8');
    expect(utilsContent.includes('1000%')).toBe(true);
    expect(utilsContent.includes('DynamicsCompressorNode')).toBe(true);
    expect(utilsContent.includes('compressorThreshold')).toBe(true);
    expect(utilsContent.includes('compressorRatio')).toBe(true);

    const settingsPath = path.join(
      process.cwd(),
      'src',
      'app',
      '(admin)',
      'admin',
      'settings',
      'store-settings',
      'page.tsx'
    );
    const settingsContent = fs.readFileSync(settingsPath, 'utf8');
    expect(settingsContent.includes('1000%')).toBe(true);
    expect(settingsContent.includes('max="1000"')).toBe(true);
  });

  it('T1.8.12: AdminIncomingOrderAlarm excludes only /admin/cashier/orders and remains active on POS and other menus', () => {
    const adminAlarmPath = path.join(
      process.cwd(),
      'src',
      'components',
      'admin',
      'AdminIncomingOrderAlarm.tsx'
    );
    const content = fs.readFileSync(adminAlarmPath, 'utf8');
    expect(content.includes("'/admin/cashier/orders'")).toBe(true);
    // Ensure it no longer disables across the entire /admin/cashier prefix
    expect(content.includes("pathname.startsWith('/admin/cashier')")).toBe(false);
  });

  it('T1.8.13: AdminLayoutClient and layout.tsx pass server-side storeSettings alarm props to AdminIncomingOrderAlarm', () => {
    const layoutPath = path.join(
      process.cwd(),
      'src',
      'app',
      '(admin)',
      'layout.tsx'
    );
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    expect(layoutContent.includes('alarmSoundUrl: true')).toBe(true);
    expect(layoutContent.includes('initialAlarmSoundUrl')).toBe(true);

    const clientPath = path.join(
      process.cwd(),
      'src',
      'components',
      'admin',
      'AdminLayoutClient.tsx'
    );
    const clientContent = fs.readFileSync(clientPath, 'utf8');
    expect(clientContent.includes('initialAlarmSoundUrl')).toBe(true);
    expect(clientContent.includes('AdminIncomingOrderAlarm')).toBe(true);
  });

  it('T1.8.14: Audio elements set crossOrigin before src and alarm-utils handles <= 100% direct playback', () => {
    const utilsPath = path.join(process.cwd(), 'src', 'lib', 'alarm-utils.ts');
    const utilsContent = fs.readFileSync(utilsPath, 'utf8');
    expect(utilsContent.includes('boostPercent <= 100')).toBe(true);

    const adminAlarmPath = path.join(
      process.cwd(),
      'src',
      'components',
      'admin',
      'AdminIncomingOrderAlarm.tsx'
    );
    const adminContent = fs.readFileSync(adminAlarmPath, 'utf8');
    expect(adminContent.includes("audio.crossOrigin = 'anonymous'")).toBe(true);

    const cashierPath = path.join(
      process.cwd(),
      'src',
      'app',
      '(admin)',
      'admin',
      'cashier',
      'orders',
      'CashierOrdersClient.tsx'
    );
    const cashierContent = fs.readFileSync(cashierPath, 'utf8');
    expect(cashierContent.includes("audio.crossOrigin = 'anonymous'")).toBe(true);
  });
});
