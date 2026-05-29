import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

// Initialize NextAuth with only the Edge-compatible configuration
const { auth } = NextAuth(authConfig)

const protectedRoutes = ['/admin', '/checkout', '/driver']
const authRoutes = ['/login', '/register']

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const { pathname } = req.nextUrl
    const role = req.auth?.user?.role

    const isApiRoute = pathname.startsWith('/api')

    // Separate protection for API routes (Defense-in-Depth)
    if (isApiRoute) {
        if (pathname.startsWith('/api/admin')) {
            if (!isLoggedIn) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            if (role !== 'ADMIN' && role !== 'CASHIER') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
            if (role === 'CASHIER') {
                const cashierAllowed = ['/api/admin/reports', '/api/admin/bank-accounts', '/api/admin/store-settings']
                const isAllowed = cashierAllowed.some(route => pathname.startsWith(route))
                if (!isAllowed) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }
            }
        }

        if (pathname.startsWith('/api/driver')) {
            // Exclude register route from driver auth since anyone can register
            if (!pathname.startsWith('/api/driver/register')) {
                if (!isLoggedIn) {
                    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
                }
                if (role !== 'DRIVER' && role !== 'ADMIN') {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }
            }
        }

        if (pathname.startsWith('/api/cashier')) {
            if (!isLoggedIn) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            if (role !== 'ADMIN' && role !== 'CASHIER') {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }
        
        return NextResponse.next()
    }

    // Redirect authenticated users away from auth pages
    if (authRoutes.some(route => pathname.startsWith(route))) {
        if (isLoggedIn) {
            // Redirect based on role
            if (role === 'ADMIN') {
                return NextResponse.redirect(new URL('/admin', req.url))
            }
            if (role === 'CASHIER') {
                return NextResponse.redirect(new URL('/admin/cashier', req.url))
            }
            if (role === 'DRIVER') {
                return NextResponse.redirect(new URL('/driver', req.url))
            }
            return NextResponse.redirect(new URL('/profile', req.url))
        }
        return NextResponse.next()
    }

    // Separate driver account functions from regular user pages
    if (isLoggedIn && role === 'DRIVER' && !pathname.startsWith('/driver')) {
        return NextResponse.redirect(new URL('/driver', req.url))
    }

    // Protect sensitive routes
    if (protectedRoutes.some(route => pathname.startsWith(route)) && !pathname.startsWith('/adminarus')) {
        if (!isLoggedIn) {
            // For admin paths, rewrite to 404 so it looks like the page doesn't exist
            if (pathname.startsWith('/admin')) {
                return NextResponse.rewrite(new URL('/404', req.url))
            }
            const loginUrl = new URL(pathname.startsWith('/driver') ? '/login/driver' : '/login', req.url)
            loginUrl.searchParams.set('callbackUrl', pathname)
            return NextResponse.redirect(loginUrl)
        }

        // Admin routes: allow ADMIN and CASHIER roles
        if (pathname.startsWith('/admin')) {
            if (role !== 'ADMIN' && role !== 'CASHIER') {
                // Rewrite to 404 even for logged-in customers to keep the admin portal hidden
                return NextResponse.rewrite(new URL('/404', req.url))
            }

            // Cashier can only access specific pages
            if (role === 'CASHIER') {
                const cashierAllowed = ['/admin/cashier', '/admin/orders']
                const isAllowed = cashierAllowed.some(route => pathname.startsWith(route)) || pathname === '/admin'
                if (!isAllowed) {
                    return NextResponse.rewrite(new URL('/404', req.url))
                }
            }
        }

        // Driver routes: allow DRIVER role only
        if (pathname.startsWith('/driver')) {
            if (role !== 'DRIVER') {
                return NextResponse.redirect(new URL('/profile', req.url))
            }
        }
    }

    return NextResponse.next()
})

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|products/|icons/|manifest.json).*)'],
}
