import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const session = await auth();
    const sessionToken = (session?.user as any)?.sessionToken;

    if (sessionToken) {
      try {
        await prisma.session.deleteMany({
          where: { sessionToken: String(sessionToken) },
        });
      } catch (dbErr) {
        console.error('[AUTH_LOGOUT] Failed to delete database session:', dbErr);
      }
    }

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    const response = NextResponse.json(
      { success: true, redirectUrl: '/adminarus' },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      }
    );

    const authCookieNames = new Set<string>([
      'authjs.session-token',
      '__Secure-authjs.session-token',
      'authjs.csrf-token',
      '__Host-authjs.csrf-token',
      'authjs.callback-url',
      '__Secure-authjs.callback-url',
      'next-auth.session-token',
      '__Secure-next-auth.session-token',
      'next-auth.csrf-token',
      '__Host-next-auth.csrf-token',
      'next-auth.callback-url',
      '__Secure-next-auth.callback-url',
    ]);

    for (const c of allCookies) {
      if (
        authCookieNames.has(c.name) ||
        c.name.includes('authjs') ||
        c.name.includes('next-auth') ||
        c.name.includes('session-token')
      ) {
        authCookieNames.add(c.name);
      }
    }

    for (const cookieName of authCookieNames) {
      try {
        cookieStore.delete(cookieName);
      } catch {}
      response.cookies.set(cookieName, '', {
        path: '/',
        expires: new Date(0),
        maxAge: 0,
      });
    }

    return response;
  } catch (error) {
    console.error('[AUTH_LOGOUT] Unexpected error during logout:', error);
    return NextResponse.json(
      { success: true, redirectUrl: '/adminarus' },
      { status: 200 }
    );
  }
}
