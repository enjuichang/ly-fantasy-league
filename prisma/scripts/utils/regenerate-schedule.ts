import { PrismaClient } from '@prisma/client'
import { generateRoundRobinSchedule } from '../../../src/lib/matchup-logic'

const prisma = new PrismaClient()

async function main() {
  // Get all leagues with completed drafts
  const leagues = await prisma.league.findMany({
    where: {
      draftStatus: 'COMPLETED'
    },
    include: {
      teams: true
    }
  })

  console.log(`Found ${leagues.length} leagues with completed drafts\n`)

  for (const league of leagues) {
    console.log(`League: ${league.name} (${league.id})`)
    console.log(`  Teams: ${league.teams.length}`)
    console.log(`  Total weeks: ${league.totalWeeks}`)

    if (league.teams.length >= 2) {
      console.log(`  🔄 Regenerating schedule with repeating matchups...`)
      try {
        await generateRoundRobinSchedule(league.id)

        // Count the created matchups
        const matchupCount = await prisma.matchup.count({
          where: { leagueId: league.id }
        })

        console.log(`  ✓ Generated ${matchupCount} matchups!`)

        // Show example matchups
        const exampleMatchups = await prisma.matchup.findMany({
          where: { leagueId: league.id },
          include: {
            team1: { select: { name: true } },
            team2: { select: { name: true } }
          },
          orderBy: { week: 'asc' },
          take: 5
        })

        console.log(`  📅 First 5 weeks:`)
        exampleMatchups.forEach(m => {
          console.log(`    Week ${m.week}: ${m.team1.name} vs ${m.team2?.name || 'BYE'}`)
        })
      } catch (error) {
        console.error(`  ✗ Failed to generate schedule:`, error)
      }
    } else {
      console.log(`  ℹ️  Not enough teams to generate matchups`)
    }
    console.log('')
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e)
    prisma.$disconnect()
    process.exit(1)
  })
