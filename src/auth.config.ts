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
            }
            // For OAuth sign-in, the role might not be on the user object from the provider
            // so we need to check if it's set, if not it will default to CUSTOMER which is correct
            return token
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.role = token.role as string
                session.user.id = token.sub as string
            }
            return session
        }
    }
} satisfies NextAuthConfig
