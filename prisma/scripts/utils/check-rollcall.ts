import { prisma } from '../../../src/lib/prisma'

async function checkRollcallScores() {
    // Check for ROLLCALL_VOTE scores
    const rollcallCount = await prisma.score.count({
        where: { category: 'ROLLCALL_VOTE' }
    })

    console.log(`📊 ROLLCALL_VOTE scores in database: ${rollcallCount}`)

    // Check for MAVERICK_BONUS scores
    const maverickCount = await prisma.score.count({
        where: { category: 'MAVERICK_BONUS' }
    })

    console.log(`📊 MAVERICK_BONUS scores in database: ${maverickCount}`)

    // Get a sample of rollcall scores
    if (rollcallCount > 0) {
        console.log('\n📋 Sample ROLLCALL_VOTE scores:')
        const sampleRollcall = await prisma.score.findMany({
            where: { category: 'ROLLCALL_VOTE' },
            take: 5,
            include: {
                legislator: {
                    select: { nameCh: true }
                }
            },
            orderBy: { date: 'desc' }
        })

        for (const score of sampleRollcall) {
            const desc = score.description.length > 60 ? score.description.substring(0, 60) + '...' : score.description
            console.log(`  - ${score.legislator.nameCh}: ${desc} (${score.points}pts, ${score.date.toISOString().split('T')[0]})`)
        }
    }

    // Get total by category
    console.log('\n📊 All score categories:')
    const allCategories = await prisma.score.groupBy({
        by: ['category'],
        _count: { category: true }
    })

    for (const cat of allCategories) {
        console.log(`  - ${cat.category}: ${cat._count.category} scores`)
    }
}

checkRollcallScores()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
