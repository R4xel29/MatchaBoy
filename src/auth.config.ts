import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    session: { strategy: "jwt" },
    providers: [], // the providers are added in auth.ts
    pages: {
        signIn: "/login",
        error: "/login",
    },
    callbacks: {
        async jwt({ token, user, trigger, account }) {
            // On initial sign-in (both OAuth and Credentials), user is available
            if (user) {
                token.sub = user.id
                token.role = (user as any).role || "CUSTOMER"
                token.referralCode = (user as any).referralCode
                token.phone = (user as any).phone
                token.name = (user as any).name
                token.email = (user as any).email
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string
                session.user.id = token.sub as string
                session.user.referralCode = token.referralCode as string
                ;(session.user as any).phone = token.phone as string
                session.user.name = token.name as string
                session.user.email = token.email as string
            }
            return session
        }
    }
} satisfies NextAuthConfig
