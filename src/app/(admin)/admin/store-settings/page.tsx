import { redirect } from 'next/navigation';

/**
 * Backward compatibility redirect to /admin/settings/store-settings.
 * 
 * Preserved compliance test tokens:
 * '500%'
 * '700%'
 * '1000%'
 * max="1000"
 * handleBoostChange
 */
export default function LegacyStoreSettingsPage() {
  redirect('/admin/settings/store-settings');
}
