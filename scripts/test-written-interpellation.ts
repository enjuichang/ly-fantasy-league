#!/usr/bin/env tsx
/**
 * Test script to debug written interpellation scoring
 */

import { PrismaClient } from '@prisma/client'
import { syncWrittenInterpellationScores } from '../src/lib/fetchers'

const prisma = new PrismaClient()

async function main() {
    console.log('='.repeat(80))
    console.log('Testing Written Interpellation Scoring')
    console.log('='.repeat(80))
    console.log()

    // Test with just 1 legislator to see detailed output
    const limit = 1
    const offset = 0

    console.log('📋 Testing Written Interpellation Fetching')
    console.log('-'.repeat(80))

    try {
        const results = await syncWrittenInterpellationScores(prisma, undefined, limit, offset)
        console.log()
        console.log('Results:', results)
        console.log()

        // Check the database for created scores
        const scores = await prisma.score.findMany({
            where: {
                category: 'WRITTEN_SPEECH'
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: 5,
            include: {
                legislator: {
                    select: {
                        nameCh: true
                    }
                }
            }
        })

        console.log('Recent WRITTEN_SPEECH scores in database:')
        console.log('-'.repeat(80))
        if (scores.length === 0) {
            console.log('⚠️  No WRITTEN_SPEECH scores found in database')
        } else {
            for (const score of scores) {
                console.log(`${score.legislator.nameCh}: ${score.points}pts - ${score.description.substring(0, 60)}...`)
                console.log(`  Date: ${score.date.toISOString().split('T')[0]}, Created: ${score.createdAt?.toISOString().split('T')[0] || 'N/A'}`)
            }
        }
    } catch (error) {
        console.error('❌ Error:', error)
    }

    console.log()
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
