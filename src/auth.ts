import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Passkey from "next-auth/providers/passkey"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { authConfig } from "./auth.config"
import { cookies, headers } from "next/headers"
import { parseUserAgent } from "./lib/ua-parser"

const googleClientId = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET

export const { handlers, auth, signIn, signOut } = NextAuth({
    ...authConfig,
    adapter: PrismaAdapter(prisma),
    experimental: {
        enableWebAuthn: true,
    },
    providers: [
        Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
        }),
        Passkey,
        CredentialsProvider({
            id: 'impersonate',
            name: "Impersonate",
            credentials: {
                userId: { type: "text" },
                timestamp: { type: "text" },
                signature: { type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.userId || !credentials?.timestamp || !credentials?.signature) return null;
                
                const { userId, timestamp, signature } = credentials;
                const secret = process.env.AUTH_SECRET;
                if (!secret) return null;
                
                // Verify timestamp is within last 1 minute
                const now = Date.now();
                if (now - Number(timestamp) > 60000 || Number(timestamp) > now + 5000) return null;
                
                const expectedSig = crypto
                   .createHmac('sha256', secret)
                   .update(`${userId}:${timestamp}`)
                   .digest('hex');
                   
                if (signature !== expectedSig) return null;
                
                const user = await prisma.user.findUnique({
                    where: { id: userId as string }
                });
                
                return user || null;
            }
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email", placeholder: "macha@example.com" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string }
                })

                if (!user || !user.password) return null

                const isPasswordValid = await bcrypt.compare(
                    credentials.password as string,
                    user.password
                )

                if (!isPasswordValid) return null

                return user
            }
        }),
        CredentialsProvider({
            id: 'whatsapp-link',
            name: "WhatsApp Link",
            credentials: {
                token: { type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.token) return null;

                const tokenRecord = await prisma.verificationToken.findFirst({
                    where: { token: credentials.token as string }
                });

                if (!tokenRecord || tokenRecord.expires < new Date()) {
                    return null;
                }

                // Delete token so it can't be used again
                await prisma.verificationToken.delete({
                    where: {
                        identifier_token: {
                            identifier: tokenRecord.identifier,
                            token: tokenRecord.token
                        }
                    }
                });

                const phone = tokenRecord.identifier;
                
                // Find or create user
                let user = await prisma.user.findUnique({
                    where: { phone }
                });

                if (!user) {
                    // Cek pending referral code dari cookie
                    let referredById: string | undefined = undefined;
                    try {
                        const reqHeaders = await headers();
                        const cookieHeader = reqHeaders.get("cookie") || "";
                        const match = cookieHeader.match(/pending_referral_code=([^;]+)/);
                        if (match) {
                            const pendingRef = decodeURIComponent(match[1]);
                            const referrer = await prisma.user.findUnique({
                                where: { referralCode: pendingRef },
                                select: { id: true }
                            });
                            if (referrer) {
                                referredById = referrer.id;
                            }
                        }
                    } catch (e) {
                        console.error("[AUTH] Error checking pending referral cookie:", e);
                    }

                    user = await prisma.user.create({
                        data: {
                            phone,
                            phoneVerified: true,
                            role: "CUSTOMER",
                            name: null,
                            ...(referredById ? { referredById } : {}),
                        }
                    });

                    // Buat voucher selamat datang berdasarkan template yang dikonfigurasi admin
                    // Kode template dibaca dari LoyaltySettings.welcomeVoucherCode (default: 'WELCOME')
                    const loyaltySettings = await prisma.loyaltySettings.findFirst();
                    const welcomeCode = (loyaltySettings as any)?.welcomeVoucherCode || 'WELCOME';
                    
                    let welcomeTemplate = await prisma.voucherTemplate.findUnique({
                        where: { code: welcomeCode }
                    });
                    if (!welcomeTemplate) {
                        try {
                            welcomeTemplate = await prisma.voucherTemplate.create({
                                data: {
                                    code: welcomeCode,
                                    title: "Diskon Pengguna Baru",
                                    description: "Diskon Rp3.000 untuk pesanan pertama Anda!",
                                    type: "DISCOUNT_RP",
                                    discountValue: 3000,
                                    minPurchase: 30000,
                                    terms: "Minimum transaksi Rp30.000\nBerlaku 7 hari sejak diterima\nHanya untuk pengguna baru",
                                    targetNewUserOnly: true,
                                    hideFromVoucherPack: true
                                }
                            });
                        } catch (e) {
                            console.error("[AUTH] Gagal membuat voucher template welcome:", e);
                        }
                    }

                    // Generate Welcome Discount Voucher menggunakan nilai dari template
                    const generatedCode = `${welcomeCode}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                    const discountAmount = welcomeTemplate?.discountValue ?? 3000;
                    const minPurchaseVal = welcomeTemplate?.minPurchase ?? 30000;
                    const expiryDays = 7;
                    await prisma.voucher.create({
                        data: {
                            userId: user.id,
                            code: generatedCode,
                            type: welcomeTemplate?.type ?? "DISCOUNT_RP",
                            description: welcomeTemplate?.description ?? "Diskon Rp3.000 (Hadiah Pengguna Baru)",
                            discountAmount,
                            minPurchase: minPurchaseVal,
                            templateId: welcomeTemplate?.id || null,
                            expiresAt: new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000),
                        }
                    });
                    if (welcomeTemplate) {
                        await prisma.voucherTemplate.update({
                            where: { id: welcomeTemplate.id },
                            data: { usageCount: { increment: 1 } }
                        }).catch(() => {});
                    }
                } else if (!user.phoneVerified) {
                    user = await prisma.user.update({
                        where: { id: user.id },
                        data: { phoneVerified: true }
                    });
                }

                return user;
            }
        })
    ],
    callbacks: {
        async signIn({ user, account }) {
            if (!user.email && !(user as any).phone) return true;
 
            // Handle Google OAuth custom pendaftaran guard
            if (account?.provider === 'google') {
                const dbUser = await prisma.user.findUnique({
                    where: { email: user.email as string },
                    select: { id: true, phone: true, phoneVerified: true, password: true, role: true }
                });

                // Admin, Cashier, and Driver accounts created by administrators do not need to verify phone via storefront cookie
                const isStaff = dbUser && (dbUser.role === 'ADMIN' || dbUser.role === 'CASHIER' || dbUser.role === 'DRIVER');

                if (dbUser && (isStaff || (dbUser.phone && dbUser.phoneVerified))) {
                    // Check if banned
                    const banned = await prisma.bannedContact.findFirst({
                        where: {
                            OR: [
                                { type: 'EMAIL', value: user.email || '___' },
                                { type: 'PHONE', value: dbUser.phone || '___' }
                            ]
                        }
                    });
                    if (banned) return false;
                    return true;
                }

                // Read pending phone number from raw request headers (100% robust cross-platform)
                const reqHeaders = await headers();
                const cookieHeader = reqHeaders.get("cookie") || "";
                let pendingPhone: string | undefined = undefined;
                const match = cookieHeader.match(/pending_oauth_phone=([^;]+)/);
                if (match) {
                    pendingPhone = decodeURIComponent(match[1]);
                }

                if (pendingPhone) {
                    let standardizedPhone = pendingPhone.replace(/[^0-9]/g, '');
                    if (standardizedPhone.startsWith('08')) {
                        standardizedPhone = '62' + standardizedPhone.substring(1);
                    } else if (standardizedPhone.startsWith('8')) {
                        standardizedPhone = '62' + standardizedPhone;
                    }

                    // Check for phone conflict
                    const phoneConflict = await prisma.user.findFirst({
                        where: {
                            phone: standardizedPhone,
                            phoneVerified: true,
                            NOT: { email: user.email as string }
                        }
                    });

                    if (phoneConflict) {
                        console.warn(`[AUTH] Phone conflict for Google sign-up. Phone ${standardizedPhone} already verified by another account.`);
                        // Only delete newly created Google accounts, never delete existing credential accounts
                        if (dbUser && !dbUser.password) {
                            try {
                                await prisma.user.delete({
                                    where: { id: dbUser.id }
                                });
                            } catch (e) {}
                        }
                        return `/login?error=PhoneConflict`;
                    }

                    // Update newly created user with phone
                    await prisma.user.update({
                        where: { id: user.id },
                        data: {
                            phone: standardizedPhone,
                            phoneVerified: false
                        }
                    });

                    // Clear cookie using next cookies store if possible
                    try {
                        const cookieStore = await cookies();
                        cookieStore.delete("pending_oauth_phone");
                    } catch (e) {}

                    // Check if banned
                    const banned = await prisma.bannedContact.findFirst({
                        where: {
                            OR: [
                                { type: 'EMAIL', value: user.email || '___' },
                                { type: 'PHONE', value: standardizedPhone }
                            ]
                        }
                    });
                    if (banned) {
                        if (dbUser && !dbUser.password) {
                            try {
                                await prisma.user.delete({
                                    where: { id: dbUser.id }
                                });
                            } catch (e) {}
                        }
                        return false;
                    }

                    return true;
                } else {
                    // Cookie not present -> Cancelled or Bypassed
                    console.log(`[AUTH] Google login without pending_oauth_phone cookie. Deleting user ${user.id} if newly created.`);
                    
                    // Only delete newly created Google accounts, never delete existing credential accounts
                    if (dbUser && !dbUser.password) {
                        try {
                            await prisma.user.delete({
                                where: { id: dbUser.id }
                            });
                        } catch (e) {
                            console.error("[AUTH] Failed to clean up user record:", e);
                        }
                    }
                    
                    // Redirect to login page with custom error instead of throwing AccessDenied (suspended account) error
                    return `/login?error=PhoneRequired`;
                }
            }
 
            const banned = await prisma.bannedContact.findFirst({
                where: {
                    OR: [
                        { type: 'EMAIL', value: user.email || '___' },
                        { type: 'PHONE', value: (user as any).phone || '___' }
                    ]
                }
            });
 
            if (banned) {
                return false; // Prevents sign-in
            }
 
            return true;
        },
        ...authConfig.callbacks,
        async jwt({ token, user, account, trigger }) {
            // On initial sign-in, user object is available
            if (user) {
                token.sub = user.id
                token.role = (user as any).role || "CUSTOMER"
                token.referralCode = (user as any).referralCode
                token.phone = (user as any).phone
                token.name = (user as any).name
                token.email = (user as any).email

                // Generate a unique session token for tracking login device
                const sessionToken = crypto.randomUUID()
                token.sessionToken = sessionToken

                // Create database session record with parsed UserAgent and IP address
                try {
                    const reqHeaders = await headers()
                    const userAgent = reqHeaders.get("user-agent") || ""
                    const ipAddress = reqHeaders.get("x-forwarded-for")?.split(',')[0] || reqHeaders.get("x-real-ip") || "127.0.0.1"
                    
                    const { deviceType, os, browser } = parseUserAgent(userAgent)

                    await prisma.session.create({
                        data: {
                            sessionToken,
                            userId: user.id,
                            expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                            userAgent,
                            ipAddress,
                            deviceType,
                            browser,
                            os
                        }
                    })
                } catch (e) {
                    console.error("[AUTH] Failed to create session record in database:", e)
                }
            }

            // For every request (or session check), verify user still exists, isn't banned, and session isn't revoked
            if (token.sub) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.sub as string },
                        select: { role: true, referralCode: true, email: true, phone: true, name: true }
                    })

                    // If user was deleted (Logout Paksa / Hapus Akun)
                    if (!dbUser) return null

                    // Check if banned
                    const banned = await prisma.bannedContact.findFirst({
                        where: {
                            OR: [
                                { type: 'EMAIL', value: dbUser.email || '___' },
                                { type: 'PHONE', value: dbUser.phone || '___' }
                            ]
                        }
                    })
                    if (banned) return null

                    // Verify database session exists and is active (Allows real-time session revocation)
                    if (token.sessionToken) {
                        const dbSession = await prisma.session.findUnique({
                            where: { sessionToken: token.sessionToken as string }
                        })
                        if (!dbSession) {
                            console.log(`[AUTH] Session ${token.sessionToken} has been revoked by admin or deleted. Forced logout.`)
                            return null
                        }

                        // Await update lastActive (at most once every 15 minutes to prevent connection pool leaks)
                        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000)
                        if (!dbSession.lastActive || dbSession.lastActive < fifteenMinutesAgo) {
                            try {
                                await prisma.session.update({
                                    where: { sessionToken: token.sessionToken as string },
                                    data: { lastActive: new Date() }
                                })
                            } catch (err) {
                                console.error("[AUTH] Failed to update session activity:", err)
                            }
                        }
                    }

                    // Sync role, referralCode, and other profile details
                    token.role = dbUser.role
                    token.referralCode = dbUser.referralCode
                    token.phone = dbUser.phone
                    token.name = dbUser.name
                    token.email = dbUser.email
                } catch (e) {
                    console.error("[AUTH] Failed to verify user status:", e)
                }
            }

            return token
        },
    },
})
