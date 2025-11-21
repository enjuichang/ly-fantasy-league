import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncRollcallScores, syncProposeScores, syncCosignScores, syncWrittenInterpellationScores, syncFloorSpeechScores } from '@/lib/fetchers'

// Initialize Prisma Client
// In production, this should be a singleton to avoid connection limits
// But Next.js App Router handles this reasonably well in route handlers
// const prisma = new PrismaClient()

export const maxDuration = 60 // Set max duration to 60 seconds (Vercel Hobby limit)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
    try {
        // Check for authorization
        const authHeader = request.headers.get('authorization')
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return new NextResponse('Unauthorized', { status: 401 })
        }

        const { searchParams } = new URL(request.url)
        const type = searchParams.get('type') // 'rollcall', 'propose', or 'all' (default)

        const results: any = {}

        // Sync Rollcall Scores
        if (!type || type === 'all' || type === 'rollcall') {
            // Support batching via rollcall_limit and rollcall_offset query params
            const rollcallLimit = searchParams.get('rollcall_limit') ? parseInt(searchParams.get('rollcall_limit')!) : 20
            const rollcallOffset = searchParams.get('rollcall_offset') ? parseInt(searchParams.get('rollcall_offset')!) : 0
            results.rollcall = await syncRollcallScores(prisma, rollcallLimit, rollcallOffset)
        }

        // Sync Propose Scores
        if (!type || type === 'all' || type === 'propose') {
            // Parse pagination params
            const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
            const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined

            // Propose sync is heavier as it iterates legislators
            // We use pagination to avoid timeouts
            results.propose = await syncProposeScores(prisma, undefined, limit, offset)
        }

        // Sync Cosign Scores
        if (!type || type === 'all' || type === 'cosign') {
            const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
            const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
            results.cosign = await syncCosignScores(prisma, undefined, limit, offset)
        }

        // Sync Written Interpellation Scores
        if (!type || type === 'all' || type === 'written_interpellation') {
            const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
            const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
            results.written_interpellation = await syncWrittenInterpellationScores(prisma, undefined, limit, offset)
        }

        // Sync Floor Speech Scores
        if (!type || type === 'all' || type === 'floor_speech') {
            const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined
            const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined
            results.floor_speech = await syncFloorSpeechScores(prisma, undefined, limit, offset)
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            results
        })
    } catch (error) {
        console.error('Data refresh failed:', error)
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    } finally {
        await prisma.$disconnect()
    }
}
