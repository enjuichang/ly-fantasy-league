import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

/**
 * Test script to verify all point values are correct after refactoring
 */
async function testPointValues() {
    console.log('🧪 Testing Point Values After Refactoring\n')

    let allTestsPassed = true

    // Test 1: PROPOSE_BILL base points (should be 3)
    console.log('Test 1: PROPOSE_BILL base points...')
    const proposeBase = await prisma.score.findFirst({
        where: {
            category: 'PROPOSE_BILL',
            description: { contains: 'Proposed:' }
        },
        orderBy: { date: 'desc' }
    })

    if (proposeBase) {
        if (proposeBase.points === 3) {
            console.log('✅ PROPOSE_BILL base = 3 points (correct)')
        } else {
            console.log(`❌ PROPOSE_BILL base = ${proposeBase.points} points (expected 3)`)
            allTestsPassed = false
        }
    } else {
        console.log('⚠️  No PROPOSE_BILL base scores found')
    }

    // Test 2: PROPOSE_BILL passed bonus (should be 6)
    console.log('\nTest 2: PROPOSE_BILL passed bonus...')
    const proposePassed = await prisma.score.findFirst({
        where: {
            category: 'PROPOSE_BILL',
            description: { contains: 'Passed' }
        },
        orderBy: { date: 'desc' }
    })

    if (proposePassed) {
        if (proposePassed.points === 6) {
            console.log('✅ PROPOSE_BILL passed bonus = 6 points (correct, total = 9)')
        } else {
            console.log(`❌ PROPOSE_BILL passed bonus = ${proposePassed.points} points (expected 6)`)
            allTestsPassed = false
        }
    } else {
        console.log('⚠️  No PROPOSE_BILL passed scores found')
    }

    // Test 3: COSIGN_BILL points (should be 3)
    console.log('\nTest 3: COSIGN_BILL points...')
    const cosign = await prisma.score.findFirst({
        where: {
            category: 'COSIGN_BILL'
        },
        orderBy: { date: 'desc' }
    })

    if (cosign) {
        if (cosign.points === 3) {
            console.log('✅ COSIGN_BILL = 3 points (correct)')
        } else {
            console.log(`❌ COSIGN_BILL = ${cosign.points} points (expected 3)`)
            allTestsPassed = false
        }
    } else {
        console.log('⚠️  No COSIGN_BILL scores found')
    }

    // Test 4: WRITTEN_SPEECH points (should be 3)
    console.log('\nTest 4: WRITTEN_SPEECH points...')
    const written = await prisma.score.findFirst({
        where: {
            category: 'WRITTEN_SPEECH'
        },
        orderBy: { date: 'desc' }
    })

    if (written) {
        if (written.points === 3) {
            console.log('✅ WRITTEN_SPEECH = 3 points (correct)')
        } else {
            console.log(`❌ WRITTEN_SPEECH = ${written.points} points (expected 3)`)
            allTestsPassed = false
        }
    } else {
        console.log('⚠️  No WRITTEN_SPEECH scores found')
    }

    // Test 5: Check for old point values (should not exist)
    console.log('\nTest 5: Checking for old point values...')

    const oldPropose = await prisma.score.count({
        where: {
            category: 'PROPOSE_BILL',
            points: 6,
            description: { contains: 'Proposed:' }
        }
    })

    const oldWritten = await prisma.score.count({
        where: {
            category: 'WRITTEN_SPEECH',
            points: 1
        }
    })

    const oldCosign = await prisma.score.count({
        where: {
            category: 'COSIGN_BILL',
            points: 1
        }
    })

    if (oldPropose === 0 && oldWritten === 0 && oldCosign === 0) {
        console.log('✅ No old point values found (database fully updated)')
    } else {
        console.log(`❌ Found old point values:`)
        if (oldPropose > 0) console.log(`   - ${oldPropose} PROPOSE_BILL with 6 points`)
        if (oldCosign > 0) console.log(`   - ${oldCosign} COSIGN_BILL with 1 point`)
        if (oldWritten > 0) console.log(`   - ${oldWritten} WRITTEN_SPEECH with 1 point`)
        allTestsPassed = false
    }

    // Summary statistics
    console.log('\n📊 Database Statistics:')
    const stats = await prisma.score.groupBy({
        by: ['category'],
        _count: true,
        _sum: { points: true },
        _avg: { points: true }
    })

    stats.forEach(stat => {
        console.log(`  ${stat.category}:`)
        console.log(`    Count: ${stat._count}`)
        console.log(`    Avg Points: ${stat._avg.points?.toFixed(2)}`)
    })

    // Final result
    console.log('\n' + '='.repeat(50))
    if (allTestsPassed) {
        console.log('✅ All tests PASSED! Point values are correct.')
    } else {
        console.log('❌ Some tests FAILED. Please review the output above.')
    }
    console.log('='.repeat(50))

    return allTestsPassed
}

testPointValues()
    .then((passed) => {
        process.exit(passed ? 0 : 1)
    })
    .catch((error) => {
        console.error('❌ Test failed with error:', error)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
