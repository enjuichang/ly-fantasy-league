import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Starting mock data cleanup...\n')

    // Delete all scores with category 'MOCK'
    const result = await prisma.score.deleteMany({
        where: {
            category: 'MOCK'
        }
    })

    console.log(`✅ Deleted ${result.count} mock score entries`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('❌ Error during cleanup:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
