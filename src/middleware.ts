import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

// Initialize NextAuth with only the Edge-compatible configuration
const { auth } = NextAuth(authConfig)

const protectedRoutes = ['/profile', '/driver', '/admin']
const authRoutes = ['/login', '/register']

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const { pathname } = req.nextUrl
    const role = req.auth?.user?.role

    // Redirect authenticated users away from auth pages
    if (authRoutes.some(route => pathname.startsWith(route))) {
        if (isLoggedIn) {
            // Redirect based on role
            if (role === 'ADMIN') {
                return NextResponse.redirect(new URL('/admin', req.url))
            }
            return NextResponse.redirect(new URL('/profile', req.url))
        }
        return NextResponse.next()
    }

    // Protect sensitive routes
    if (protectedRoutes.some(route => pathname.startsWith(route))) {
        if (!isLoggedIn) {
            const loginUrl = new URL('/login', req.url)
            loginUrl.searchParams.set('callbackUrl', pathname)
            return NextResponse.redirect(loginUrl)
        }

        // Role Based protection
        if (pathname.startsWith('/driver') && role !== 'DRIVER' && role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/profile', req.url))
        }

        if (pathname.startsWith('/admin') && role !== 'ADMIN') {
            return NextResponse.redirect(new URL('/profile', req.url))
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|products/|icons/|manifest.json).*)'],
}
