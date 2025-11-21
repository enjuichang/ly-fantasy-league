
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Migrating FLOOR_SPEECH scores to WRITTEN_SPEECH...')

    const result = await prisma.score.updateMany({
        where: {
            category: 'FLOOR_SPEECH'
        },
        data: {
            category: 'WRITTEN_SPEECH'
        }
    })

    console.log(`Migrated ${result.count} records.`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
