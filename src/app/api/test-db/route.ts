import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        console.log('[API] /api/test-db - Starting database test...')

        const count = await prisma.legislator.count()
        console.log(`[API] /api/test-db - Found ${count} legislators`)

        return NextResponse.json({
            success: true,
            count,
            message: 'Database connection successful'
        })
    } catch (error) {
        console.error('[API] /api/test-db - Error:', error)
        return NextResponse.json(
            {
                error: 'Database test failed',
                details: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined
            },
            { status: 500 }
        )
    }
}
