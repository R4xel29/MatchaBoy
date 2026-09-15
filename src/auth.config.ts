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
                token.jobdeskCode = (user as any).jobdeskCode || null
                token.phone = (user as any).phone
                token.name = (user as any).name
                token.email = (user as any).email
                token.image = (user as any).image
            }
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string
                session.user.id = token.sub as string
                session.user.referralCode = token.referralCode as string
                session.user.jobdeskCode = (token.jobdeskCode as string) || null
                ;(session.user as any).phone = token.phone as string
                session.user.name = token.name as string
                session.user.email = token.email as string
                session.user.image = token.image as string
                ;(session.user as any).sessionToken = token.sessionToken as string
            }
            return session
        }
    }
} satisfies NextAuthConfig
