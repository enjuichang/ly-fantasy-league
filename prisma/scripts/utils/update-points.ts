import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function updatePoints() {
    console.log('🔄 Updating point values in database...\n')

    // Update PROPOSE_BILL scores (6 -> 3 points)
    // Note: This updates the base proposal points, not the passed bonus
    const proposeResult = await prisma.score.updateMany({
        where: {
            category: 'PROPOSE_BILL',
            points: 6,
            description: { contains: 'Proposed:' } // Only base proposals, not passed
        },
        data: {
            points: 3
        }
    })
    console.log(`✅ Updated ${proposeResult.count} PROPOSE_BILL scores (6 -> 3 points)`)

    // Update COSIGN_BILL scores (1 -> 3 points)
    const cosignResult = await prisma.score.updateMany({
        where: {
            category: 'COSIGN_BILL',
            points: 1
        },
        data: {
            points: 3
        }
    })
    console.log(`✅ Updated ${cosignResult.count} COSIGN_BILL scores (1 -> 3 points)`)

    // Update WRITTEN_SPEECH scores (1 -> 3 points)
    const writtenResult = await prisma.score.updateMany({
        where: {
            category: 'WRITTEN_SPEECH',
            points: 1
        },
        data: {
            points: 3
        }
    })
    console.log(`✅ Updated ${writtenResult.count} WRITTEN_SPEECH scores (1 -> 3 points)`)

    console.log('\n✨ Database update complete!')
}

updatePoints()
    .catch(console.error)
    .finally(() => prisma.$disconnect())
