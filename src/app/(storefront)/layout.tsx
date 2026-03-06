import { AppHeader } from '@/components/storefront/AppHeader';
import { FloatingCart } from '@/components/storefront/FloatingCart';

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main>{children}</main>
      <FloatingCart />
    </div>
  );
}
