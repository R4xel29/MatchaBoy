import CustomerDisplayClient from './CustomerDisplayClient';

export const metadata = {
  title: 'Customer Display - Matchaboy',
  description: 'Display Layar Monitor Kedua Realtime POS Kasir Matchaboy',
};

export default function StandaloneDisplayPage() {
  return <CustomerDisplayClient />;
}
