#!/usr/bin/env tsx
/**
 * Populate all WRITTEN_SPEECH scores from the API
 * This will fetch and create scores for all legislators with written interpellations
 */

import { PrismaClient } from '@prisma/client'
import { syncWrittenInterpellationScores } from '../../../src/lib/fetchers'

const prisma = new PrismaClient()

async function main() {
    console.log('='.repeat(80))
    console.log('Populating WRITTEN_SPEECH Scores for All Legislators')
    console.log('='.repeat(80))
    console.log()

    console.log('Starting full sync of written interpellations...')
    console.log('This will process ALL legislators in the database.')
    console.log()

    const results = await syncWrittenInterpellationScores(prisma)

    console.log()
    console.log('='.repeat(80))
    console.log('Sync Complete!')
    console.log('='.repeat(80))
    console.log(`Processed: ${results.processedCount}`)
    console.log(`Errors: ${results.errorCount}`)
    console.log(`Scores Created: ${results.totalScoresCreated}`)
    console.log()

    // Verify the results
    console.log('Verifying updated database...')
    console.log('-'.repeat(80))

    const totalScores = await prisma.score.count({
        where: {
            category: 'WRITTEN_SPEECH'
        }
    })

    console.log(`Total WRITTEN_SPEECH scores now: ${totalScores}`)

    // Show legislators with scores
    const legislatorsWithScores = await prisma.score.groupBy({
        by: ['legislatorId'],
        where: {
            category: 'WRITTEN_SPEECH'
        },
        _count: {
            id: true
        },
        _sum: {
            points: true
        }
    })

    console.log(`Legislators with scores: ${legislatorsWithScores.length}`)
    console.log()

    // Show top 10
    const sorted = legislatorsWithScores.sort((a, b) => (b._sum.points || 0) - (a._sum.points || 0))
    console.log('Top 10 legislators by points:')
    console.log('-'.repeat(80))

    for (const data of sorted.slice(0, 10)) {
        const legislator = await prisma.legislator.findUnique({
            where: { id: data.legislatorId }
        })

        if (legislator) {
            console.log(`${legislator.nameCh}: ${data._sum.points || 0} points (${data._count.id} interpellations)`)
        }
    }

    console.log()
    console.log('='.repeat(80))
    console.log('✅ Data population complete!')
    console.log('='.repeat(80))
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
