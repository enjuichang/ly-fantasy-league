import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface CosignBill {
    屆: number
    議案編號: string
    議案名稱: string
    提案單位: string
    議案狀態: string
    最新進度日期: string
    提案日期?: string
    字號?: string
    法律編號?: string | string[]
    提案人: string[]
    連署人: string[]
    [key: string]: any
}

interface TaiwanAPIResponse {
    total: number
    total_page: number
    page: number
    limit: number
    bills: CosignBill[]
}

// Helper to check if bill has passed (三讀)
function isBillPassed(status: string | undefined): boolean {
    if (!status) return false
    return status.includes('三讀') || status.includes('通過')
}

// Fetch cosigned bills for a legislator
async function fetchCosignBills(legislatorName: string): Promise<CosignBill[]> {
    // Use the full legislator name (including Latin characters for indigenous legislators)
    const encodedName = encodeURIComponent(legislatorName)

    // Request specific output fields for better data quality
    const outputFields = [
        '屆',
        '議案編號',
        '議案名稱',
        '提案日期',
        '字號',
        '法律編號',
        '議案狀態',
        '最新進度日期',
        '提案人',
        '連署人'
    ].map(field => `output_fields=${encodeURIComponent(field)}`).join('&')

    const apiUrl = `https://ly.govapi.tw/v2/legislators/11/${encodedName}/cosign_bills?${outputFields}`

    console.log(`  Fetching cosign bills...`)

    const response = await fetch(apiUrl)

    if (!response.ok) {
        throw new Error(`Taiwan API returned status ${response.status}`)
    }

    const data: TaiwanAPIResponse = await response.json()
    const allBills: CosignBill[] = [...data.bills]

    // Fetch all pages if there are multiple
    if (data.total_page > 1) {
        console.log(`  Fetching ${data.total_page - 1} additional pages...`)

        for (let page = 2; page <= data.total_page; page++) {
            const pageUrl = `${apiUrl}?page=${page}`
            const pageResponse = await fetch(pageUrl)

            if (pageResponse.ok) {
                const pageData: TaiwanAPIResponse = await pageResponse.json()
                allBills.push(...pageData.bills)
            }
        }
    }

    console.log(`  ✓ Fetched ${allBills.length} cosigned bills`)
    return allBills
}

// Mark legislator with error flag
async function markLegislatorError(legislatorId: string, errorMessage: string): Promise<void> {
    await prisma.legislator.update({
        where: { id: legislatorId },
        data: {
            errorFlag: '是',
            errorReason: `Cosign Bills API: ${errorMessage}`
        }
    })
}

// Clear error flag for legislator
async function clearLegislatorError(legislatorId: string): Promise<void> {
    await prisma.legislator.update({
        where: { id: legislatorId },
        data: {
            errorFlag: null,
            errorReason: null
        }
    })
}

// Process cosigned bills and create individual score entries
async function processCosignBills(
    legislatorId: string,
    legislatorName: string,
    bills: CosignBill[]
): Promise<number> {
    console.log(`  Processing ${bills.length} bills individually...`)

    let scoresCreated = 0
    let skippedNotPassed = 0

    // Create a score entry for each individual passed bill
    for (const bill of bills) {
        // Only award points for passed bills
        const passed = isBillPassed(bill.議案狀態)

        if (!passed) {
            skippedNotPassed++
            continue
        }

        // Use 提案日期 if available, otherwise fall back to 最新進度日期
        const dateStr = bill.提案日期 || bill.最新進度日期
        if (!dateStr) {
            console.log(`  ⊘ Skipping passed bill with no date: ${bill.議案名稱 || 'Unknown'}`)
            continue
        }

        // Parse the date (format: YYYY-MM-DD)
        const billDate = new Date(dateStr)
        if (isNaN(billDate.getTime())) {
            console.log(`  ⊘ Skipping bill with invalid date: ${dateStr}`)
            continue
        }

        // Set time to midnight to avoid timezone issues
        billDate.setHours(0, 0, 0, 0)

        // Points: 3 per cosigned passed bill
        const points = 3

        // Extract bill number and title
        const billNumber = bill.字號 || null
        const billTitle = bill.議案名稱 || null

        // Create description in format: "Cosigned: {title} (字號: {number}) ✓ Passed"
        let description = 'Cosigned'
        if (billTitle) {
            description += `: ${billTitle}`
        }
        if (billNumber) {
            description += ` (字號: ${billNumber})`
        }
        description += ' ✓ Passed'

        // Create metadata JSON with additional bill details
        const lawNumber = Array.isArray(bill.法律編號)
            ? bill.法律編號[0]
            : bill.法律編號

        const metadata = JSON.stringify({
            billId: bill.議案編號,
            lawNumber: lawNumber || null,
            status: bill.議案狀態 || null,
            latestProgressDate: bill.最新進度日期 || null,
            proposingUnit: bill.提案單位 || null,
            proposers: bill.提案人 || [],
            cosigners: bill.連署人 || [],
            passed: true
        })

        // Check if score already exists for this specific bill
        const existingScore = await prisma.score.findFirst({
            where: {
                legislatorId,
                billNumber,
                category: 'COSIGN_BILL'
            }
        })

        if (existingScore) {
            console.log(`  ⊘ Score already exists for bill ${billNumber || 'unknown'}`)
            continue
        }

        // Create score record
        await prisma.score.create({
            data: {
                legislatorId,
                date: billDate,
                points,
                description,
                category: 'COSIGN_BILL',
                billNumber,
                billTitle,
                metadata
            }
        })

        console.log(`  ✓ Created: ${points}pts - ${billTitle?.substring(0, 50)}${billTitle && billTitle.length > 50 ? '...' : ''} ✓`)
        scoresCreated++
    }

    if (skippedNotPassed > 0) {
        console.log(`  ℹ Skipped ${skippedNotPassed} bills (not passed)`)
    }

    return scoresCreated
}

async function main() {
    console.log('🚀 Starting COSIGN_BILL score fetching...\n')

    // Get command line arguments
    const args = process.argv.slice(2)
    const legislatorNameArg = args.find(arg => arg.startsWith('--legislator='))
    const specificLegislator = legislatorNameArg?.split('=')[1]

    // Fetch legislators from database
    const legislators = await prisma.legislator.findMany({
        where: specificLegislator ? { nameCh: specificLegislator } : {},
        orderBy: { nameCh: 'asc' }
    })

    if (legislators.length === 0) {
        console.log('❌ No legislators found in database.')
        return
    }

    console.log(`📊 Processing ${legislators.length} legislator(s)\n`)

    let totalScoresCreated = 0
    let processedCount = 0
    let errorCount = 0

    // Process legislators in batches of 5 for parallel processing
    const BATCH_SIZE = 5

    for (let i = 0; i < legislators.length; i += BATCH_SIZE) {
        const batch = legislators.slice(i, i + BATCH_SIZE)
        const batchNumber = Math.floor(i / BATCH_SIZE) + 1
        const totalBatches = Math.ceil(legislators.length / BATCH_SIZE)

        console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (${batch.length} legislators)`)

        // Process batch in parallel
        const results = await Promise.allSettled(
            batch.map(async (legislator: { id: string; nameCh: string }) => {
                console.log(`\n👤 Processing: ${legislator.nameCh}`)

                const bills = await fetchCosignBills(legislator.nameCh)
                const scoresCreated = await processCosignBills(
                    legislator.id,
                    legislator.nameCh,
                    bills
                )

                return { legislator: legislator.nameCh, scoresCreated }
            })
        )

        // Collect results
        for (let i = 0; i < results.length; i++) {
            const result = results[i]
            const legislator = batch[i]

            if (result.status === 'fulfilled') {
                totalScoresCreated += result.value.scoresCreated
                processedCount++
                // Clear any previous error flags
                await clearLegislatorError(legislator.id)
            } else {
                const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
                console.error(`  ❌ Error for ${legislator.nameCh}:`, errorMsg)
                // Mark legislator with error flag
                await markLegislatorError(legislator.id, errorMsg)
                errorCount++
            }
        }

        // Small delay between batches to avoid overwhelming the API
        if (i + BATCH_SIZE < legislators.length) {
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }

    console.log('\n\n✅ COSIGN_BILL score fetching completed!')
    console.log(`\n📈 Statistics:`)
    console.log(`   Legislators processed: ${processedCount}`)
    console.log(`   Errors: ${errorCount}`)
    console.log(`   Total scores created: ${totalScoresCreated}`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error('❌ Error during score fetching:', e)
        await prisma.$disconnect()
        process.exit(1)
    })
