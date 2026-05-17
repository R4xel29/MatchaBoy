import { ReactNode } from 'react';
import { Truck } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DriverLayout({ children }: { children: ReactNode }) {
  const session = await auth();
  
  if (!session?.user) {
    redirect('/login');
  }

  return (
    <div className="min-h-dvh bg-[#F8F9FB] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border/40 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/driver" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
              <Truck className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground font-heading tracking-tight">Driver App</span>
          </Link>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
             {session.user.name}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-md mx-auto relative">
        {children}
      </main>
    </div>
  );
}
