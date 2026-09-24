import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'

// Initialize NextAuth with only the Edge-compatible configuration
const { auth } = NextAuth(authConfig)

const protectedRoutes = ['/admin', '/checkout']
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
            const isPublicAdminRoute = pathname === '/api/admin/loyalty/settings' || pathname === '/api/admin/store-settings' || pathname === '/api/admin/tables'
            const isGetRequest = req.method === 'GET'
            
            const isKaryawan = role === 'CASHIER' || role === 'KARYAWAN'
            if (!(isPublicAdminRoute && isGetRequest)) {
                if (role !== 'ADMIN' && !isKaryawan) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }
                // Endpoint /api/admin/karyawan hanya untuk karyawan
                if (pathname.startsWith('/api/admin/karyawan') && !isKaryawan) {
                    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                }
                if (isKaryawan) {
                    const cashierAllowed = [
                        '/api/admin/reports', 
                        '/api/admin/bank-accounts', 
                        '/api/admin/store-settings',
                        '/api/admin/inventory',
                        '/api/admin/expenses',
                        '/api/admin/receipt-settings',
                        '/api/admin/inspections',
                        '/api/admin/orders',
                        '/api/admin/karyawan',
                    ]
                    const isAllowed = cashierAllowed.some(route => pathname.startsWith(route))
                    if (!isAllowed) {
                        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
                    }
                }
            }
        }

        if (pathname.startsWith('/api/cashier')) {
            if (!isLoggedIn) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
            }
            const isKaryawan = role === 'CASHIER' || role === 'KARYAWAN'
            if (role !== 'ADMIN' && !isKaryawan) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
            }
        }
        
        return NextResponse.next()
    }

    // Route alias: /admin/login redirects to the official admin & employee portal /adminarus
    if (pathname === '/admin/login') {
        return NextResponse.redirect(new URL('/adminarus', req.url))
    }

    // Redirect authenticated users away from auth pages
    if (authRoutes.some(route => pathname.startsWith(route))) {
        if (isLoggedIn) {
            // Redirect based on role
            if (role === 'ADMIN') {
                return NextResponse.redirect(new URL('/admin', req.url))
            }
            if (role === 'CASHIER' || role === 'KARYAWAN') {
                return NextResponse.redirect(new URL('/admin/karyawan', req.url))
            }
            return NextResponse.redirect(new URL('/profile', req.url))
        }
        return NextResponse.next()
    }

    // Protect sensitive routes
    if (protectedRoutes.some(route => pathname.startsWith(route)) && !pathname.startsWith('/adminarus')) {
        if (!isLoggedIn) {
            // For admin paths, rewrite to 404 so it looks like the page doesn't exist
            if (pathname.startsWith('/admin')) {
                return NextResponse.rewrite(new URL('/404', req.url))
            }
            const loginUrl = new URL('/login', req.url)
            loginUrl.searchParams.set('callbackUrl', pathname)
            return NextResponse.redirect(loginUrl)
        }

        const isKaryawan = role === 'CASHIER' || role === 'KARYAWAN'

        // Admin routes: allow ADMIN and CASHIER/KARYAWAN roles
        if (pathname.startsWith('/admin')) {
            if (role !== 'ADMIN' && !isKaryawan) {
                // Rewrite to 404 even for logged-in customers to keep the admin portal hidden
                return NextResponse.rewrite(new URL('/404', req.url))
            }

            // Dashboard karyawan HANYA untuk role karyawan. Jika admin mengakses, redirect ke dashboard admin
            if (pathname === '/admin/karyawan' && role === 'ADMIN') {
                return NextResponse.redirect(new URL('/admin', req.url))
            }

            // Karyawan hanya dapat mengakses halaman operasional spesifik
            if (isKaryawan) {
                if (pathname === '/admin') {
                    return NextResponse.redirect(new URL('/admin/karyawan', req.url))
                }
                const cashierAllowed = [
                    '/admin/karyawan',
                    '/admin/cashier', 
                    '/admin/orders',
                    '/admin/inventory',
                    '/admin/finances/expenses',
                    '/admin/receipt-settings',
                    '/admin/inspections',
                ]
                const isAllowed = cashierAllowed.some(route => pathname.startsWith(route))
                if (!isAllowed) {
                    return NextResponse.rewrite(new URL('/404', req.url))
                }
            }
        }
    }

    // Direct default route / to /spmb (preserves query params like ?table=...)
    if (pathname === '/') {
        const url = req.nextUrl.clone()
        url.pathname = '/spmb'
        return NextResponse.redirect(url)
    }

    return NextResponse.next()
})

export const config = {
    matcher: ['/((?!_next/static|_next/image|favicon.ico|products/|icons/|manifest.json).*)'],
}
