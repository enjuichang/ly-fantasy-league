import { PrismaClient } from '@prisma/client'
import { syncRollcallScores } from '../../src/lib/fetchers/rollcall'

const prisma = new PrismaClient()

async function main() {
    console.log('Testing syncRollcallScores...')
    try {
        const result = await syncRollcallScores(prisma, 5)
        console.log('Result:', result)
    } catch (error) {
        console.error('Error:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
