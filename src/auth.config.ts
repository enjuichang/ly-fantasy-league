import type { NextAuthConfig } from "next-auth"

export const authConfig = {
    providers: [],
    pages: {
        signIn: '/signin',
    },
    callbacks: {
        authorized({ request, auth }) {
            const { pathname } = request.nextUrl
            if (pathname === "/middleware-example") return !!auth
            return true
        },
        session({ session, token, user }) {
            if (session.user && user) {
                session.user.id = user.id
            } else if (session.user && token?.sub) {
                session.user.id = token.sub
            }
            return session
        }
    },
    session: {
        strategy: "jwt",
    }
} satisfies NextAuthConfig
