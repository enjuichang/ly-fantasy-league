import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🧹 Clearing PROPOSE_BILL and COSIGN_BILL scores...\n')

    const proposeBillResult = await prisma.score.deleteMany({
        where: {
            category: 'PROPOSE_BILL'
        }
    })

    console.log(`✅ Deleted ${proposeBillResult.count} PROPOSE_BILL score entries`)

    const cosignBillResult = await prisma.score.deleteMany({
        where: {
            category: 'COSIGN_BILL'
        }
    })

    console.log(`✅ Deleted ${cosignBillResult.count} COSIGN_BILL score entries`)

    console.log(`\n📊 Total deleted: ${proposeBillResult.count + cosignBillResult.count} entries`)
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
