import { prisma } from '../../src/lib/prisma'
import { syncFloorSpeechScores } from '../../src/lib/fetchers/floor-speech'

async function backfillFloorSpeeches() {
    console.log('🚀 Starting Floor Speech Backfill for Past 12 Weeks\n')

    // Calculate dates for the past 12 weeks
    const today = new Date()
    const weeksAgo12 = new Date()
    weeksAgo12.setDate(today.getDate() - (12 * 7))

    console.log(`📅 Backfilling from ${weeksAgo12.toISOString().split('T')[0]} to ${today.toISOString().split('T')[0]}\n`)
    console.log('⚠️  This will be done in weekly batches to avoid timeouts...\n')

    // Break into weekly chunks
    const weeks: { from: Date; to: Date }[] = []

    for (let i = 0; i < 12; i++) {
        const weekStart = new Date()
        weekStart.setDate(today.getDate() - ((12 - i) * 7))

        const weekEnd = new Date()
        weekEnd.setDate(today.getDate() - ((12 - i - 1) * 7))

        weeks.push({ from: weekStart, to: weekEnd })
    }

    let totalScoresCreated = 0
    let totalProcessed = 0
    let totalErrors = 0

    // Process each week
    for (let i = 0; i < weeks.length; i++) {
        const week = weeks[i]
        const weekNum = i + 1

        console.log(`\n${'='.repeat(80)}`)
        console.log(`📆 Week ${weekNum}/12: ${week.from.toISOString().split('T')[0]} to ${week.to.toISOString().split('T')[0]}`)
        console.log(`${'='.repeat(80)}\n`)

        try {
            // Process ALL legislators for this week (no limit/offset)
            const result = await syncFloorSpeechScores(
                prisma,
                undefined, // no specific legislator
                undefined, // no limit
                undefined, // no offset
                week.from,
                week.to
            )

            totalScoresCreated += result.totalScoresCreated
            totalProcessed += result.processedCount
            totalErrors += result.errorCount

            console.log(`\n✓ Week ${weekNum} completed:`)
            console.log(`  - Legislators processed: ${result.processedCount}`)
            console.log(`  - Scores created: ${result.totalScoresCreated}`)
            console.log(`  - Errors: ${result.errorCount}`)

            // Small delay between weeks to avoid overwhelming the API
            if (i < weeks.length - 1) {
                console.log('\n⏳ Waiting 2 seconds before next week...')
                await new Promise(resolve => setTimeout(resolve, 2000))
            }
        } catch (error) {
            console.error(`\n❌ Error processing week ${weekNum}:`, error)
            totalErrors++
        }
    }

    console.log('\n\n' + '='.repeat(80))
    console.log('🎉 BACKFILL COMPLETE!')
    console.log('='.repeat(80))
    console.log(`\n📊 Final Statistics:`)
    console.log(`  - Total weeks processed: ${weeks.length}`)
    console.log(`  - Total legislators processed: ${totalProcessed}`)
    console.log(`  - Total scores created: ${totalScoresCreated}`)
    console.log(`  - Total errors: ${totalErrors}`)
    console.log('')
}

// Run the backfill
backfillFloorSpeeches()
    .catch(error => {
        console.error('Fatal error:', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
