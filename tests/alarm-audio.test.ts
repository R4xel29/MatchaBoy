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
      'store-settings',
      'page.tsx'
    );
    const settingsContent = fs.readFileSync(settingsPath, 'utf8');
    expect(settingsContent.includes('500%')).toBe(true);
    expect(settingsContent.includes('700%')).toBe(true);
    expect(settingsContent.includes('handleBoostChange')).toBe(true);
  });
});
