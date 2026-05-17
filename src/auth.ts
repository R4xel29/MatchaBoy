import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import Passkey from "next-auth/providers/passkey"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./lib/prisma"
import bcrypt from "bcryptjs"
import crypto from "crypto"
import { authConfig } from "./auth.config"

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
                    user = await prisma.user.create({
                        data: {
                            phone,
                            role: "CUSTOMER",
                            name: `User ${phone.slice(-4)}`
                        }
                    });
                }

                return user;
            }
        })
    ],
    callbacks: {
        async signIn({ user }) {
            if (!user.email && !(user as any).phone) return true;

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
        // Override jwt callback to fetch role from DB for OAuth users
        async jwt({ token, user, account, trigger }) {
            // On initial sign-in, user object is available
            if (user) {
                token.sub = user.id
                token.role = (user as any).role || "CUSTOMER"
                token.referralCode = (user as any).referralCode
            }

            // For every request (or session check), verify user still exists and isn't banned
            if (token.sub) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.sub as string },
                        select: { role: true, referralCode: true, email: true, phone: true }
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

                    // Sync role and referralCode
                    token.role = dbUser.role
                    token.referralCode = dbUser.referralCode
                } catch (e) {
                    console.error("[AUTH] Failed to verify user status:", e)
                }
            }

            return token
        },
    },
})
