#!/usr/bin/env tsx
/**
 * Demo script: Delete and re-fetch scores for one legislator to show new structure
 */

import { PrismaClient } from '@prisma/client'
import { syncProposeScores } from '../src/lib/fetchers'

const prisma = new PrismaClient()

async function main() {
    const testLegislator = '丁學忠' // Use the same one from our test

    console.log('='.repeat(80))
    console.log(`Demo: Testing New Propose Bill Scoring Structure`)
    console.log(`Legislator: ${testLegislator}`)
    console.log('='.repeat(80))
    console.log()

    // Get the legislator
    const legislator = await prisma.legislator.findFirst({
        where: { nameCh: testLegislator }
    })

    if (!legislator) {
        console.error('Legislator not found')
        process.exit(1)
    }

    // Step 1: Delete existing PROPOSE_BILL scores for this legislator
    console.log('1️⃣  Deleting existing PROPOSE_BILL scores...')
    const deleted = await prisma.score.deleteMany({
        where: {
            legislatorId: legislator.id,
            category: 'PROPOSE_BILL'
        }
    })
    console.log(`   ✓ Deleted ${deleted.count} existing scores\n`)

    // Step 2: Re-fetch with the new logic
    console.log('2️⃣  Re-fetching with new scoring logic...\n')
    const results = await syncProposeScores(prisma, testLegislator)
    console.log(`\n   ✓ Results:`, results)
    console.log()

    // Step 3: Query and display the new scores
    console.log('3️⃣  Checking newly created scores...\n')
    const scores = await prisma.score.findMany({
        where: {
            legislatorId: legislator.id,
            category: 'PROPOSE_BILL'
        },
        orderBy: {
            date: 'desc'
        },
        take: 10
    })

    console.log(`   Found ${scores.length} PROPOSE_BILL scores\n`)

    // Group by bill number
    const billGroups = new Map<string, typeof scores>()

    for (const score of scores) {
        if (!score.billNumber) continue

        if (!billGroups.has(score.billNumber)) {
            billGroups.set(score.billNumber, [])
        }
        billGroups.get(score.billNumber)!.push(score)
    }

    // Show examples of paired scores (proposed + passed)
    console.log('   📊 Examples of bills with BOTH Propose + Pass scores:\n')
    let pairCount = 0
    for (const [billNumber, billScores] of billGroups) {
        if (billScores.length === 2) {
            pairCount++
            if (pairCount <= 3) { // Show first 3 examples
                console.log(`   Bill: ${billNumber}`)
                for (const score of billScores) {
                    const isProposeEntry = score.description.startsWith('Proposed:')
                    const isPassEntry = score.description.includes('Passed')
                    console.log(`     ${isProposeEntry ? '📝' : '✅'} ${score.points}pts: ${score.description.substring(0, 70)}...`)
                }
                console.log()
            }
        }
    }

    console.log(`   ✓ Total bills with paired scores (Propose + Pass): ${pairCount}`)
    console.log(`   ✓ Bills with only Propose score: ${billGroups.size - pairCount}`)
    console.log()

    console.log('='.repeat(80))
    console.log('✅ Demo completed! The new structure creates separate score entries.')
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
