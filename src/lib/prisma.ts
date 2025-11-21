import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined
}

if (process.env.DATABASE_URL) {
    console.log('DEBUG: Prisma Init URL:', process.env.DATABASE_URL.replace(/:[^:]*@/, ':****@'))
} else {
    console.log('DEBUG: Prisma Init URL is undefined')
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
