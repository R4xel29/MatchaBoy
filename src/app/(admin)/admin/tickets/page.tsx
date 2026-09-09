import { redirect } from 'next/navigation';

export default function LegacyTicketsPage() {
  redirect('/admin/settings/tickets');
}
