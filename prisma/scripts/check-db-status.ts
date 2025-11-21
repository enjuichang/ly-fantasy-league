import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('Checking database status...')

    try {
        const legislatorCount = await prisma.legislator.count()
        const scoreCount = await prisma.score.count()
        const userCount = await prisma.user.count()
        const leagueCount = await prisma.league.count()
        const teamCount = await prisma.team.count()
        const draftPickCount = await prisma.draftPick.count()

        console.log('\nDatabase Counts:')
        console.log('----------------')
        console.log(`Legislators: ${legislatorCount}`)
        console.log(`Scores:      ${scoreCount}`)
        console.log(`Users:       ${userCount}`)
        console.log(`Leagues:     ${leagueCount}`)
        console.log(`Teams:       ${teamCount}`)
        console.log(`Draft Picks: ${draftPickCount}`)
        console.log('----------------')

        if (legislatorCount === 0) {
            console.log('\n⚠️  Database appears to be empty of legislators.')
        } else {
            console.log('\n✅ Database has data.')
        }

    } catch (error) {
        console.error('Error checking database:', error)
    } finally {
        await prisma.$disconnect()
    }
}

main()
