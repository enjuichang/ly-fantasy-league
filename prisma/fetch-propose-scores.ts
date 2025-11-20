import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ProposeBill {
    屆: number
    議案編號: string
    議案名稱: string
    提案單位: string
    議案狀態: string
    最新進度日期: string
    提案日期: string
    字號: string
    法律編號: string | string[]
    提案人: string[]
    [key: string]: any
}

interface TaiwanAPIResponse {
    total: number
    total_page: number
    page: number
    limit: number
    bills: ProposeBill[]
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

// Fetch proposed bills for a legislator
async function fetchProposeBills(legislatorName: string): Promise<ProposeBill[]> {
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
        '提案人'
    ].map(field => `output_fields=${encodeURIComponent(field)}`).join('&')

    const apiUrl = `https://ly.govapi.tw/v2/legislators/11/${encodedName}/propose_bills?${outputFields}`

    console.log(`  Fetching proposed bills...`)

    const response = await fetch(apiUrl)

    if (!response.ok) {
        throw new Error(`Taiwan API returned status ${response.status}`)
    }

    const data: TaiwanAPIResponse = await response.json()
    const allBills: ProposeBill[] = [...data.bills]

    // Fetch all pages if there are multiple
    if (data.total_page > 1) {
        console.log(`  Fetching ${data.total_page - 1} additional pages...`)

        for (let page = 2; page <= data.total_page; page++) {
            const pageUrl = `${apiUrl}&page=${page}`
            const pageResponse = await fetch(pageUrl)

            if (pageResponse.ok) {
                const pageData: TaiwanAPIResponse = await pageResponse.json()
                allBills.push(...pageData.bills)
            }
        }
    }

    console.log(`  ✓ Fetched ${allBills.length} proposed bills`)
    return allBills
}

// Process proposed bills and create score entries
async function processProposeBills(
    legislatorId: string,
    legislatorName: string,
    bills: ProposeBill[]
): Promise<number> {
    // Group bills by week based on 提案日期 (proposal date)
    const billsByWeek = new Map<string, ProposeBill[]>()

    for (const bill of bills) {
        // Use 提案日期 (proposal date)
        const dateStr = bill.提案日期 || bill.最新進度日期
        if (!dateStr) continue

        // Parse the date (format: YYYY-MM-DD)
        const billDate = new Date(dateStr)
        if (isNaN(billDate.getTime())) continue

        const weekStart = getWeekStart(billDate)
        const weekKey = weekStart.toISOString()

        if (!billsByWeek.has(weekKey)) {
            billsByWeek.set(weekKey, [])
        }
        billsByWeek.get(weekKey)!.push(bill)
    }

    console.log(`  Grouped into ${billsByWeek.size} weeks`)

    let scoresCreated = 0

    // Create score entries for each week
    for (const [weekKey, weekBills] of billsByWeek.entries()) {
        const weekStart = new Date(weekKey)
        const count = weekBills.length

        // Check for passed bills (議案狀態 contains "三讀" or "通過")
        const passedBills = weekBills.filter(bill =>
            bill.議案狀態 && (
                bill.議案狀態.includes('三讀') ||
                bill.議案狀態.includes('通過')
            )
        )

        // Base points: 3 per bill proposed
        // Bonus points: +3 for each passed bill (total 6 per passed bill)
        const basePoints = count * 3
        const bonusPoints = passedBills.length * 3
        const points = basePoints + bonusPoints

        // Create a detailed reason with bill metadata
        let reason = `Proposed ${count} bill${count > 1 ? 's' : ''}`
        if (passedBills.length > 0) {
            reason += ` (${passedBills.length} passed, +${bonusPoints} bonus)`
        }

        // Add bill details
        if (count >= 1 && count <= 3) {
            // For 1-3 bills, show all information
            const billDetails = weekBills.map(bill => {
                const parts = []

                // Add bill name (議案名稱)
                if (bill.議案名稱) {
                    parts.push(bill.議案名稱)
                }

                // Add metadata in parentheses
                const metadata = []
                if (bill.字號) metadata.push(`字號: ${bill.字號}`)

                // Handle 法律編號 which can be string or array
                if (bill.法律編號) {
                    const lawNumber = Array.isArray(bill.法律編號)
                        ? bill.法律編號[0]
                        : bill.法律編號
                    if (lawNumber) metadata.push(`法律編號: ${lawNumber}`)
                }

                // Add bill status if passed
                if (bill.議案狀態 && bill.議案狀態.includes('三讀')) {
                    metadata.push(`狀態: ${bill.議案狀態}`)
                }

                if (metadata.length > 0) {
                    parts.push(`(${metadata.join(', ')})`)
                }

                return parts.join(' ')
            }).filter(detail => detail.length > 0)

            if (billDetails.length > 0) {
                reason += ` - ${billDetails.join('; ')}`
            }
        } else if (count > 3 && passedBills.length > 0) {
            // For 4+ bills, only show details of passed bills
            const passedBillDetails = passedBills.map(bill => {
                const parts = []

                // Add bill name (議案名稱)
                if (bill.議案名稱) {
                    parts.push(bill.議案名稱)
                }

                // Add metadata in parentheses
                const metadata = []
                if (bill.字號) metadata.push(`字號: ${bill.字號}`)

                // Handle 法律編號 which can be string or array
                if (bill.法律編號) {
                    const lawNumber = Array.isArray(bill.法律編號)
                        ? bill.法律編號[0]
                        : bill.法律編號
                    if (lawNumber) metadata.push(`法律編號: ${lawNumber}`)
                }

                metadata.push(`狀態: ${bill.議案狀態}`)

                if (metadata.length > 0) {
                    parts.push(`(${metadata.join(', ')})`)
                }

                return parts.join(' ')
            }).filter(detail => detail.length > 0)

            if (passedBillDetails.length > 0) {
                reason += ` - Passed: ${passedBillDetails.join('; ')}`
            }
        }

        // Check if score already exists for this week
        const existingScore = await prisma.score.findFirst({
            where: {
                legislatorId,
                date: weekStart,
                category: 'PROPOSE_BILL'
            }
        })

        if (existingScore) {
            console.log(`  ⊘ Score already exists for week ${weekStart.toISOString().split('T')[0]}`)
            continue
        }

        await prisma.score.create({
            data: {
                legislatorId,
                date: weekStart,
                points,
                reason,
                category: 'PROPOSE_BILL'
            }
        })

        console.log(`  ✓ Created score: ${points}pts for week ${weekStart.toISOString().split('T')[0]} (${count} bills${passedBills.length > 0 ? `, ${passedBills.length} passed` : ''})`)
        scoresCreated++
    }

    return scoresCreated
}

async function main() {
    console.log('🚀 Starting PROPOSE_BILL score fetching...\n')

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

                const bills = await fetchProposeBills(legislator.nameCh)
                const scoresCreated = await processProposeBills(
                    legislator.id,
                    legislator.nameCh,
                    bills
                )

                return { legislator: legislator.nameCh, scoresCreated }
            })
        )

        // Collect results
        for (const result of results) {
            if (result.status === 'fulfilled') {
                totalScoresCreated += result.value.scoresCreated
                processedCount++
            } else {
                console.error(`  ❌ Error:`, result.reason)
                errorCount++
            }
        }

        // Small delay between batches to avoid overwhelming the API
        if (i + BATCH_SIZE < legislators.length) {
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }

    console.log('\n\n✅ PROPOSE_BILL score fetching completed!')
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
