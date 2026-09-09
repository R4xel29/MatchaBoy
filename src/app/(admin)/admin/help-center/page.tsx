import { redirect } from 'next/navigation';

export default function LegacyHelpCenterPage() {
  redirect('/admin/settings/help-center');
}
