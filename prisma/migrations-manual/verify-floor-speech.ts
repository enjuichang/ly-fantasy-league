
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const legislators = ['林國成', '黃國昌']

    for (const name of legislators) {
        const legislator = await prisma.legislator.findFirst({
            where: { nameCh: name },
        })

        if (!legislator) {
            console.log(`Legislator ${name} not found`)
            continue
        }

        // Check WRITTEN_SPEECH
        const writtenScores = await prisma.score.findMany({
            where: {
                legislatorId: legislator.id,
                category: 'WRITTEN_SPEECH'
            },
            orderBy: { date: 'asc' }
        })

        console.log(`Legislator: ${name}`)
        console.log(`Total WRITTEN_SPEECH scores: ${writtenScores.length}`)
        writtenScores.forEach(s => {
            console.log(`  - Date: ${s.date.toISOString().split('T')[0]}, Points: ${s.points}`)
        })

        // Check FLOOR_SPEECH
        const floorScores = await prisma.score.findMany({
            where: {
                legislatorId: legislator.id,
                category: 'FLOOR_SPEECH'
            },
            orderBy: { date: 'asc' }
        })

        console.log(`Total FLOOR_SPEECH scores: ${floorScores.length}`)
        floorScores.forEach(s => {
            console.log(`  - Date: ${s.date.toISOString().split('T')[0]}, Points: ${s.points}`)
        })
        console.log('---')
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
