import { redirect } from 'next/navigation';

export default function LegacyPaymentSettingsPage() {
  redirect('/admin/settings/payment-settings');
}
