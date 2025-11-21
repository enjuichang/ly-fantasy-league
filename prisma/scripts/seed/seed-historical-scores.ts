import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Activity tier types for legislators
type ActivityTier = 'HIGH' | 'MEDIUM' | 'LOW'

interface ScoringActivity {
  category: string
  minPoints: number
  maxPoints: number
  probability: number // 0-1, chance this activity happens in a given week
  pointsPerOccurrence: number
  description: (count: number) => string
}

// Define scoring activities based on the point distribution rules
const SCORING_ACTIVITIES: ScoringActivity[] = [
  {
    category: 'FLOOR_SPEECH',
    minPoints: 1,
    maxPoints: 5,
    probability: 0.6,
    pointsPerOccurrence: 1,
    description: (count) => `Spoke on ${count} unique topic${count > 1 ? 's' : ''} on Legislative Yuan floor`
  },
  {
    category: 'BILL_SPONSOR',
    minPoints: 6,
    maxPoints: 12,
    probability: 0.3,
    pointsPerOccurrence: 6,
    description: (count) => `Sponsored ${count} new bill${count > 1 ? 's' : ''}`
  },
  {
    category: 'BILL_PASS',
    minPoints: 12,
    maxPoints: 24,
    probability: 0.1,
    pointsPerOccurrence: 12,
    description: (count) => `Sponsored bill${count > 1 ? 's' : ''} passed (${count} bill${count > 1 ? 's' : ''})`
  },
  {
    category: 'BILL_COSPONSOR_PASS',
    minPoints: 3,
    maxPoints: 9,
    probability: 0.25,
    pointsPerOccurrence: 3,
    description: (count) => `Cosponsored ${count} bill${count > 1 ? 's' : ''} that passed`
  },
  {
    category: 'COSIGN_BILL',
    minPoints: 1,
    maxPoints: 10,
    probability: 0.5,
    pointsPerOccurrence: 1,
    description: (count) => `Cosigned ${count} bill${count > 1 ? 's' : ''}`
  },
  {
    category: 'COMMITTEE_REPORT',
    minPoints: 3,
    maxPoints: 9,
    probability: 0.4,
    pointsPerOccurrence: 3,
    description: (count) => `Committee reported on ${count} bill${count > 1 ? 's' : ''}`
  },
  {
    category: 'ROLLCALL_VOTE',
    minPoints: 3,
    maxPoints: 9,
    probability: 0.8,
    pointsPerOccurrence: 3,
    description: (count) => `Voted in ${count} rollcall vote${count > 1 ? 's' : ''}`
  },
  {
    category: 'MAVERICK_BONUS',
    minPoints: 1,
    maxPoints: 3,
    probability: 0.15,
    pointsPerOccurrence: 0, // Will be set randomly 1-3
    description: (count) => `Voted independently of party (${count === 1 ? '70%' : count === 2 ? '80%' : '90%'} opposition)`
  }
]

// Activity tier multipliers for probability
const TIER_MULTIPLIERS: Record<ActivityTier, number> = {
  HIGH: 1.5,
  MEDIUM: 1.0,
  LOW: 0.4
}

// Assign legislators to activity tiers
function assignActivityTier(index: number, total: number): ActivityTier {
  const percentile = index / total
  if (percentile < 0.30) return 'HIGH'    // Top 30% are high activity
  if (percentile < 0.80) return 'MEDIUM'  // Next 50% are medium
  return 'LOW'                             // Bottom 20% are low activity
}

// Generate a random integer between min and max (inclusive)
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Check if an activity should occur based on probability
function shouldOccur(baseProbability: number, tierMultiplier: number): boolean {
  const adjustedProbability = Math.min(baseProbability * tierMultiplier, 0.95)
  return Math.random() < adjustedProbability
}

// Get the start of the week (Monday) for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// Generate scores for a single legislator for a single week
async function generateWeeklyScores(
  legislatorId: string,
  legislatorName: string,
  weekStart: Date,
  tier: ActivityTier
): Promise<void> {
  const tierMultiplier = TIER_MULTIPLIERS[tier]

  for (const activity of SCORING_ACTIVITIES) {
    if (!shouldOccur(activity.probability, tierMultiplier)) {
      continue
    }

    // Calculate how many times this activity occurred
    let points = 0
    let count = 0

    if (activity.category === 'MAVERICK_BONUS') {
      // Maverick bonus: 1-3 points randomly
      points = randomInt(1, 3)
      count = points
    } else {
      // For other activities, calculate occurrences based on point range
      const maxOccurrences = Math.floor(activity.maxPoints / activity.pointsPerOccurrence)
      const minOccurrences = Math.ceil(activity.minPoints / activity.pointsPerOccurrence)
      count = randomInt(minOccurrences, maxOccurrences)
      points = count * activity.pointsPerOccurrence
    }

    // Create the aggregated score
    await prisma.score.create({
      data: {
        legislatorId,
        date: weekStart,
        points,
        reason: activity.description(count),
        category: activity.category
      }
    })

    console.log(`  → ${activity.category}: ${points}pts (${legislatorName})`)
  }
}

async function main() {
  console.log('🚀 Starting historical score seeding...\n')

  // Fetch all legislators from the database
  const legislators = await prisma.legislator.findMany({
    orderBy: { nameCh: 'asc' }
  })

  if (legislators.length === 0) {
    console.log('❌ No legislators found in database. Run the main seed script first.')
    return
  }

  console.log(`📊 Found ${legislators.length} legislators\n`)

  // Delete existing scores (optional - comment out if you want to keep existing data)
  const deletedScores = await prisma.score.deleteMany({})
  console.log(`🗑️  Deleted ${deletedScores.count} existing scores\n`)

  // Generate 12 weeks of historical data
  const WEEKS_TO_GENERATE = 12
  const today = new Date()
  const weeks: Date[] = []

  for (let i = WEEKS_TO_GENERATE - 1; i >= 0; i--) {
    const date = new Date(today)
    date.setDate(date.getDate() - (i * 7))
    weeks.push(getWeekStart(date))
  }

  console.log(`📅 Generating scores for ${WEEKS_TO_GENERATE} weeks:\n`)
  weeks.forEach((week, i) => {
    console.log(`   Week ${i + 1}: ${week.toISOString().split('T')[0]}`)
  })
  console.log('\n')

  // Process each legislator
  let processedCount = 0
  for (const [index, legislator] of legislators.entries()) {
    const tier = assignActivityTier(index, legislators.length)

    console.log(`\n👤 Processing: ${legislator.nameCh} (${legislator.nameEn || 'N/A'}) - ${tier} activity`)

    // Generate scores for each week
    for (const [weekIndex, weekStart] of weeks.entries()) {
      console.log(`\n  📆 Week ${weekIndex + 1} (${weekStart.toISOString().split('T')[0]}):`)
      await generateWeeklyScores(legislator.id, legislator.nameCh, weekStart, tier)
    }

    processedCount++
  }

  // Calculate and display statistics
  const totalScores = await prisma.score.count()
  const totalPoints = await prisma.score.aggregate({
    _sum: { points: true }
  })

  console.log('\n\n✅ Historical score seeding completed!')
  console.log(`\n📈 Statistics:`)
  console.log(`   Legislators processed: ${processedCount}`)
  console.log(`   Total scores created: ${totalScores}`)
  console.log(`   Total points awarded: ${totalPoints._sum.points}`)
  console.log(`   Weeks generated: ${WEEKS_TO_GENERATE}`)
  console.log(`   Average points per legislator: ${((totalPoints._sum.points || 0) / processedCount).toFixed(2)}`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error during seeding:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
