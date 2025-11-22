import { PrismaClient } from '@prisma/client'
import { syncCosignScores } from '../../../src/lib/fetchers/cosign'

const prisma = new PrismaClient()

/**
 * Test the cosign bill fetcher with a single legislator
 * Verifies that new scores are created with correct point values (3 points)
 */
async function testCosignFetcher() {
    console.log('🧪 Testing COSIGN_BILL Fetcher\n')

    // Select a legislator known to have cosigned bills
    const legislator = await prisma.legislator.findFirst({
        where: {
            nameCh: '王定宇' // Known active legislator
        }
    })

    const testLegislator = legislator?.nameCh || (await prisma.legislator.findFirst())?.nameCh || ''

    // Count existing scores before fetch
    const beforeCount = await prisma.score.count({
        where: {
            category: 'COSIGN_BILL',
            legislator: { nameCh: testLegislator }
        }
    })

    console.log(`Testing with legislator: ${testLegislator}`)
    console.log(`Existing COSIGN_BILL scores: ${beforeCount}\n`)

    // Fetch scores
    console.log('Fetching cosign bill scores...\n')
    const result = await syncCosignScores(prisma, testLegislator, 1, 0)

    console.log('\n📊 Fetch Results:')
    console.log(`  Processed: ${result.processedCount}`)
    console.log(`  Errors: ${result.errorCount}`)
    console.log(`  New Scores: ${result.totalScoresCreated}`)

    // Verify point values
    console.log('\n🔍 Verifying Point Values:')

    const cosignScores = await prisma.score.findMany({
        where: {
            category: 'COSIGN_BILL',
            legislator: { nameCh: testLegislator }
        },
        take: 5,
        orderBy: { date: 'desc' }
    })

    console.log(`\nRecent Cosign Scores (should be 3 points each):`)
    let allCorrect = true
    cosignScores.forEach(score => {
        const status = score.points === 3 ? '✅' : '❌'
        console.log(`  ${status} ${score.points} pts - ${score.description?.substring(0, 60)}...`)
        if (score.points !== 3) allCorrect = false
    })

    // Verify all are passed bills (三讀)
    console.log('\n🔍 Verifying Only Passed Bills Are Counted:')
    const allScoresHaveMetadata = await prisma.score.findMany({
        where: {
            category: 'COSIGN_BILL',
            legislator: { nameCh: testLegislator }
        },
        take: 10
    })

    let onlyPassedBills = true
    allScoresHaveMetadata.forEach(score => {
        try {
            const metadata = JSON.parse(score.metadata || '{}')
            const hasThirdReading = score.description?.includes('Passed') || metadata.status?.includes('三讀')
            if (!hasThirdReading) {
                console.log(`  ⚠️  Score without 三讀: ${score.description}`)
                onlyPassedBills = false
            }
        } catch (e) {
            // Skip metadata parsing errors
        }
    })

    if (onlyPassedBills) {
        console.log('  ✅ All cosign scores are for passed bills (三讀)')
    }

    const testPassed = allCorrect && onlyPassedBills && result.errorCount === 0

    console.log('\n' + '='.repeat(50))
    if (testPassed) {
        console.log('✅ COSIGN_BILL fetcher test PASSED!')
    } else {
        console.log('❌ COSIGN_BILL fetcher test FAILED!')
    }
    console.log('='.repeat(50))

    return testPassed
}

testCosignFetcher()
    .then((passed) => {
        process.exit(passed ? 0 : 1)
    })
    .catch((error) => {
        console.error('❌ Test failed with error:', error)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
