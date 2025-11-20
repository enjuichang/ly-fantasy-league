import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { PrismaClient } from "@prisma/client"

export const prisma = new PrismaClient()

export const { handlers, signIn, signOut, auth } = NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
        Google({
            clientId: process.env.AUTH_GOOGLE_ID,
            clientSecret: process.env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
        }),
        Credentials({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            authorize: async (credentials) => {
                if (!credentials?.email || !credentials?.password) {
                    return null
                }

                const user = await prisma.user.findUnique({
                    where: { email: credentials.email as string },
                })

                if (!user) {
                    // Auto-register for demo purposes
                    return prisma.user.create({
                        data: {
                            email: credentials.email as string,
                            name: (credentials.email as string).split("@")[0],
                        }
                    })
                }

                return user
            },
        }),
    ],
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
        strategy: "jwt", // Use JWT for now to support both Credentials and Google easily without DB sessions for Credentials
    }
})
