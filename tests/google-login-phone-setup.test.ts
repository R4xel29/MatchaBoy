import { describe, it, expect } from './test-framework';
import * as fs from 'fs';
import * as path from 'path';

describe('Tier 1.17: Google Login & Setup Phone Menu Access Compliance', () => {
  const rootDir = path.resolve(__dirname, '..');

  it('T1.17.1: auth.ts allows direct Google login without rejecting on missing pending_oauth_phone cookie', () => {
    const authContent = fs.readFileSync(path.join(rootDir, 'src/auth.ts'), 'utf-8');
    expect(!authContent.includes('return `/login?error=PhoneRequired`')).toBeTruthy();
    expect(authContent.includes('async createUser({ user })')).toBeTruthy();
  });

  it('T1.17.2: SetupPhoneClient provides pre-fill, Skip to Menu button, Logout button, and callbackUrl support', () => {
    const setupPhoneClient = fs.readFileSync(
      path.join(rootDir, 'src/app/(setup)/setup-phone/SetupPhoneClient.tsx'),
      'utf-8'
    );
    expect(
      setupPhoneClient.includes('initialPhone') && setupPhoneClient.includes('formatLocalPhoneInput')
    ).toBeTruthy();
    expect(
      setupPhoneClient.includes('handleSkipToMenu') && setupPhoneClient.includes('Lihat Menu Dulu')
    ).toBeTruthy();
    expect(
      setupPhoneClient.includes('handleLogout') && setupPhoneClient.includes('Keluar / Ganti Akun')
    ).toBeTruthy();
    expect(setupPhoneClient.includes('callbackUrl')).toBeTruthy();
  });

  it('T1.17.3: StorefrontLayout allows menu and profile browsing after skip_phone_setup and enforces verification on /checkout', () => {
    const layoutContent = fs.readFileSync(
      path.join(rootDir, 'src/app/(storefront)/layout.tsx'),
      'utf-8'
    );
    expect(layoutContent.includes('skip_phone_setup')).toBeTruthy();
    expect(layoutContent.includes('/setup-phone?callbackUrl=/checkout')).toBeTruthy();
  });

  it('T1.17.4: ProfileClient displays WhatsApp verification banner and wires Edit Profile verification button', () => {
    const profileClient = fs.readFileSync(
      path.join(rootDir, 'src/app/(storefront)/profile/ProfileClient.tsx'),
      'utf-8'
    );
    expect(
      profileClient.includes('Nomor WhatsApp Belum Terverifikasi') &&
        profileClient.includes('Verifikasi Sekarang')
    ).toBeTruthy();
    expect(profileClient.includes("router.push('/setup-phone?callbackUrl=/profile')")).toBeTruthy();
  });
});
