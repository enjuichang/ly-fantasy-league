#!/usr/bin/env tsx
/**
 * Verification script to check if propose bill scores are properly split
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('='.repeat(80))
    console.log('Verifying Propose Bill Scoring Structure')
    console.log('='.repeat(80))
    console.log()

    // Get a sample of propose bill scores
    const proposeScores = await prisma.score.findMany({
        where: {
            category: 'PROPOSE_BILL'
        },
        orderBy: {
            date: 'desc'
        },
        take: 20,
        include: {
            legislator: {
                select: {
                    nameCh: true
                }
            }
        }
    })

    console.log(`Found ${proposeScores.length} recent PROPOSE_BILL scores\n`)

    // Group by bill number to see if there are pairs
    const billGroups = new Map<string, typeof proposeScores>()

    for (const score of proposeScores) {
        if (!score.billNumber) continue

        if (!billGroups.has(score.billNumber)) {
            billGroups.set(score.billNumber, [])
        }
        billGroups.get(score.billNumber)!.push(score)
    }

    console.log('Checking for bills with multiple score entries (Propose + Pass):')
    console.log('-'.repeat(80))

    let foundPairs = 0
    for (const [billNumber, scores] of billGroups) {
        if (scores.length > 1) {
            foundPairs++
            console.log(`\n✓ Bill ${billNumber} has ${scores.length} score entries:`)
            for (const score of scores) {
                console.log(`  - ${score.points}pts: ${score.description}`)
            }
        }
    }

    if (foundPairs === 0) {
        console.log('\n⚠️  No paired scores found in recent data.')
        console.log('This could mean:')
        console.log('1. Recent bills haven\'t passed yet (only "Proposed" scores exist)')
        console.log('2. The data needs to be refreshed to create the new structure')
    } else {
        console.log(`\n✅ Found ${foundPairs} bills with separate Propose/Pass scores`)
    }

    console.log('\n' + '='.repeat(80))
    console.log('Sample of recent scores:')
    console.log('='.repeat(80))

    for (const score of proposeScores.slice(0, 5)) {
        console.log(`\n${score.legislator.nameCh}:`)
        console.log(`  Points: ${score.points}`)
        console.log(`  Description: ${score.description}`)
        console.log(`  Date: ${score.date.toISOString().split('T')[0]}`)
    }

    // Check cosign scores to verify 三讀 requirement
    console.log('\n' + '='.repeat(80))
    console.log('Verifying COSIGN_BILL scores (should only be 三讀)')
    console.log('='.repeat(80))
    console.log()

    const cosignScores = await prisma.score.findMany({
        where: {
            category: 'COSIGN_BILL'
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: 10
    })

    console.log(`Found ${cosignScores.length} recent COSIGN_BILL scores\n`)

    for (const score of cosignScores.slice(0, 5)) {
        // Parse metadata to check status
        const metadata = score.metadata ? JSON.parse(score.metadata as string) : {}
        console.log(`${score.description.substring(0, 60)}...`)
        console.log(`  Status: ${metadata.status || 'N/A'}`)
        console.log(`  Has 三讀: ${metadata.status?.includes('三讀') ? '✓' : '✗'}`)
        console.log()
    }
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
