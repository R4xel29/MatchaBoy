import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
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
    providers: [
        Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            allowDangerousEmailAccountLinking: true,
        }),
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
        })
    ],
    callbacks: {
        ...authConfig.callbacks,
        // Override jwt callback to fetch role from DB for OAuth users
        async jwt({ token, user, account, trigger }) {
            // On initial sign-in, user object is available
            if (user) {
                token.sub = user.id
                token.role = (user as any).role || "CUSTOMER"
            }

            // For OAuth sign-in, fetch the actual role from the DB
            // because PrismaAdapter doesn't include custom fields in the user object
            if (account && account.provider !== "credentials" && token.sub) {
                try {
                    const dbUser = await prisma.user.findUnique({
                        where: { id: token.sub },
                        select: { role: true }
                    })
                    if (dbUser) {
                        token.role = dbUser.role
                    }
                } catch (e) {
                    console.error("[AUTH] Failed to fetch user role:", e)
                }
            }

            return token
        },
    },
})
