import { PrismaClient } from '@prisma/client'
import { generateRoundRobinSchedule } from '../src/lib/matchup-logic'

const prisma = new PrismaClient()

async function main() {
  // Get all leagues with completed drafts
  const leagues = await prisma.league.findMany({
    where: {
      draftStatus: 'COMPLETED'
    },
    include: {
      matchups: true,
      teams: true
    }
  })

  console.log(`Found ${leagues.length} leagues with completed drafts\n`)

  for (const league of leagues) {
    console.log(`League: ${league.name} (${league.id})`)
    console.log(`  Teams: ${league.teams.length}`)
    console.log(`  Total weeks: ${league.totalWeeks}`)
    console.log(`  Matchups created: ${league.matchups.length}`)

    if (league.matchups.length === 0 && league.teams.length >= 2) {
      console.log(`  ⚠️  No matchups found! Generating now...`)
      try {
        await generateRoundRobinSchedule(league.id)
        console.log(`  ✓ Generated matchup schedule!`)
      } catch (error) {
        console.error(`  ✗ Failed to generate schedule:`, error)
      }
    } else if (league.matchups.length > 0) {
      console.log(`  ✓ Matchups already exist`)
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
