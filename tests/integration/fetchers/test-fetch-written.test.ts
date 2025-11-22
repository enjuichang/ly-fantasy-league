import { PrismaClient } from '@prisma/client'
import { syncWrittenInterpellationScores } from '../../../src/lib/fetchers/written-interpellation'

const prisma = new PrismaClient()

/**
 * Test the written interpellation fetcher with a single legislator
 * Verifies that new scores are created with correct point values (3 points)
 */
async function testWrittenFetcher() {
    console.log('🧪 Testing WRITTEN_SPEECH Fetcher\n')

    // Select a legislator known to have written interpellations
    const legislator = await prisma.legislator.findFirst({
        where: {
            nameCh: '賴士葆' // Known active legislator
        }
    })

    const testLegislator = legislator?.nameCh || (await prisma.legislator.findFirst())?.nameCh || ''

    // Count existing scores before fetch
    const beforeCount = await prisma.score.count({
        where: {
            category: 'WRITTEN_SPEECH',
            legislator: { nameCh: testLegislator }
        }
    })

    console.log(`Testing with legislator: ${testLegislator}`)
    console.log(`Existing WRITTEN_SPEECH scores: ${beforeCount}\n`)

    // Fetch scores
    console.log('Fetching written interpellation scores...\n')
    const result = await syncWrittenInterpellationScores(prisma, testLegislator, 1, 0)

    console.log('\n📊 Fetch Results:')
    console.log(`  Processed: ${result.processedCount}`)
    console.log(`  Errors: ${result.errorCount}`)
    console.log(`  New Scores: ${result.totalScoresCreated}`)

    // Verify point values
    console.log('\n🔍 Verifying Point Values:')

    const writtenScores = await prisma.score.findMany({
        where: {
            category: 'WRITTEN_SPEECH',
            legislator: { nameCh: testLegislator }
        },
        take: 5,
        orderBy: { date: 'desc' }
    })

    console.log(`\nRecent Written Interpellation Scores (should be 3 points each):`)
    let allCorrect = true
    writtenScores.forEach(score => {
        const status = score.points === 3 ? '✅' : '❌'
        console.log(`  ${status} ${score.points} pts - ${score.description?.substring(0, 60)}...`)
        if (score.points !== 3) allCorrect = false
    })

    // Check total points for this legislator
    const totalPoints = await prisma.score.aggregate({
        where: {
            category: 'WRITTEN_SPEECH',
            legislator: { nameCh: testLegislator }
        },
        _sum: { points: true },
        _count: true
    })

    console.log(`\n📊 Total Stats for ${testLegislator}:`)
    console.log(`  Total Interpellations: ${totalPoints._count}`)
    console.log(`  Total Points: ${totalPoints._sum.points}`)
    console.log(`  Expected Points (count × 3): ${totalPoints._count * 3}`)

    const pointsMatch = totalPoints._sum.points === totalPoints._count * 3
    if (pointsMatch) {
        console.log('  ✅ All scores are 3 points each')
    } else {
        console.log('  ❌ Some scores have incorrect point values')
        allCorrect = false
    }

    const testPassed = allCorrect && result.errorCount === 0 && pointsMatch

    console.log('\n' + '='.repeat(50))
    if (testPassed) {
        console.log('✅ WRITTEN_SPEECH fetcher test PASSED!')
    } else {
        console.log('❌ WRITTEN_SPEECH fetcher test FAILED!')
    }
    console.log('='.repeat(50))

    return testPassed
}

testWrittenFetcher()
    .then((passed) => {
        process.exit(passed ? 0 : 1)
    })
    .catch((error) => {
        console.error('❌ Test failed with error:', error)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
