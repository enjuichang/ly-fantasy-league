import { PrismaClient } from '@prisma/client'
import { syncProposeScores } from '../../../src/lib/fetchers/propose'

const prisma = new PrismaClient()

/**
 * Test the propose bill fetcher with a single legislator
 * Verifies that new scores are created with correct point values (3 for base, 6 for passed)
 */
async function testProposeFetcher() {
    console.log('🧪 Testing PROPOSE_BILL Fetcher\n')

    // Select a legislator known to have proposed bills
    const legislator = await prisma.legislator.findFirst({
        where: {
            nameCh: '柯建銘' // Known active legislator
        }
    })

    if (!legislator) {
        console.log('❌ Test legislator not found, using first available legislator')
        const firstLeg = await prisma.legislator.findFirst()
        if (!firstLeg) {
            console.log('❌ No legislators in database!')
            return false
        }
    }

    const testLegislator = legislator?.nameCh || (await prisma.legislator.findFirst())?.nameCh || ''

    // Count existing scores before fetch
    const beforeCount = await prisma.score.count({
        where: {
            category: 'PROPOSE_BILL',
            legislator: { nameCh: testLegislator }
        }
    })

    console.log(`Testing with legislator: ${testLegislator}`)
    console.log(`Existing PROPOSE_BILL scores: ${beforeCount}\n`)

    // Fetch scores
    console.log('Fetching propose bill scores...\n')
    const result = await syncProposeScores(prisma, testLegislator, 1, 0)

    console.log('\n📊 Fetch Results:')
    console.log(`  Processed: ${result.processedCount}`)
    console.log(`  Errors: ${result.errorCount}`)
    console.log(`  New Scores: ${result.totalScoresCreated}`)

    // Verify point values
    console.log('\n🔍 Verifying Point Values:')

    const baseScores = await prisma.score.findMany({
        where: {
            category: 'PROPOSE_BILL',
            legislator: { nameCh: testLegislator },
            description: { contains: 'Proposed:' }
        },
        take: 3,
        orderBy: { date: 'desc' }
    })

    const passedScores = await prisma.score.findMany({
        where: {
            category: 'PROPOSE_BILL',
            legislator: { nameCh: testLegislator },
            description: { contains: 'Passed' }
        },
        take: 3,
        orderBy: { date: 'desc' }
    })

    console.log(`\nBase Proposal Scores (should be 3 points):`)
    let baseCorrect = true
    baseScores.forEach(score => {
        const status = score.points === 3 ? '✅' : '❌'
        console.log(`  ${status} ${score.points} pts - ${score.description?.substring(0, 60)}...`)
        if (score.points !== 3) baseCorrect = false
    })

    console.log(`\nPassed Proposal Bonus (should be 6 points):`)
    let passedCorrect = true
    passedScores.forEach(score => {
        const status = score.points === 6 ? '✅' : '❌'
        console.log(`  ${status} ${score.points} pts - ${score.description?.substring(0, 60)}...`)
        if (score.points !== 6) passedCorrect = false
    })

    const allCorrect = baseCorrect && passedCorrect && result.errorCount === 0

    console.log('\n' + '='.repeat(50))
    if (allCorrect) {
        console.log('✅ PROPOSE_BILL fetcher test PASSED!')
    } else {
        console.log('❌ PROPOSE_BILL fetcher test FAILED!')
    }
    console.log('='.repeat(50))

    return allCorrect
}

testProposeFetcher()
    .then((passed) => {
        process.exit(passed ? 0 : 1)
    })
    .catch((error) => {
        console.error('❌ Test failed with error:', error)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
