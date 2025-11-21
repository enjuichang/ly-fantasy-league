import dotenv from "dotenv"
dotenv.config({ path: ".env.local" })

import * as XLSX from 'xlsx'
import { syncRollcallScores } from "../../src/lib/fetchers/rollcall"

/**
 * CONFIG
 */
const DEFAULT_BATCH_SIZE = 20 // Change as you need
const SLEEP_BETWEEN_BATCHES = 3000 // ms

/**
 * Sleep helper
 */
function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Retrieve total number of rollcall votes from API
 */
async function getTotalRollcalls(): Promise<number> {
    try {
        const url = "https://data.ly.gov.tw/odw/usageFile.action?id=370&type=CSV&fname=370_CSV.csv"
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to query API: ${res.status}`)

        const buf = await res.arrayBuffer()
        const workbook = XLSX.read(buf, { type: 'array' })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json(sheet) as any[]

        return rows.filter(row => String(row.term) === '11' && row.voteType === '記名').length
    } catch (err) {
        console.error("❌ Failed to fetch total rollcall count:", err)
        throw err
    }
}

/**
 * Main backfill runner
 */
async function runBackfill() {
    console.log("🚀 Starting rollcall backfill...\n")

    const total = await getTotalRollcalls()
    console.log(`📊 Total rollcall votes in dataset: ${total}\n`)

    // Prevent batchSize from being zero
    const batchSize =
        Number(process.env.BATCH_SIZE) > 0
            ? Number(process.env.BATCH_SIZE)
            : DEFAULT_BATCH_SIZE

    console.log(`🧮 Using batch size: ${batchSize}`)

    let offset = Number(process.env.START_OFFSET) || 0
    if (offset < 0) offset = 0

    let batchIndex = 1

    // Continue until offset is past total
    while (offset < total) {
        console.log(`\n==========================`)
        console.log(`🟦 Starting batch ${batchIndex}`)
        console.log(`🟦 Offset: ${offset}`)
        console.log(`🟦 Limit: ${batchSize}`)
        console.log(`==========================\n`)

        let result
        try {
            result = await syncRollcallScores(batchSize, offset, undefined)
        } catch (err) {
            console.error(`❌ Batch ${batchIndex} failed:`, err)
            break
        }

        console.log(`\n📄 Batch ${batchIndex} Summary`)
        console.log(`  ✓ Votes processed: ${result.processedCount}`)
        console.log(`  ✓ Rollcall scores created: ${result.totalRollcallScores}`)
        console.log(`  ✓ Maverick scores created: ${result.totalMaverickScores}`)
        console.log(`  ✓ Errors: ${result.errorCount}`)

        if (result.errorCount > 0) {
            console.log("  ⚠ Errors:")
            for (const e of result.errors) {
                console.log("     - " + e)
            }
        }

        // Move to next batch
        offset += batchSize
        batchIndex++

        // If slice was empty, stop early
        if (result.processedCount === 0) {
            console.log("\n⚠ No more votes to process. Exiting.")
            break
        }

        console.log(`\n⏳ Waiting ${SLEEP_BETWEEN_BATCHES / 1000} seconds before next batch...\n`)
        await sleep(SLEEP_BETWEEN_BATCHES)
    }

    console.log("\n🎉 Backfill complete!")
}

// Execute
runBackfill().catch(err => {
    console.error("💥 Fatal backfill error:", err)
    process.exit(1)
})
