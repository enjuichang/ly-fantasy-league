import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface Interpellation {
    屆: number
    會議代碼: string
    質詢委員: string[]
    刊登日期: string
    事由: string
    說明?: string
    [key: string]: any
}

interface TaiwanAPIResponse {
    total: number
    total_page: number
    page: number
    limit: number
    interpellations: Interpellation[]
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

// Extract only Chinese characters from name (remove English letters, spaces, special chars)
function extractChineseName(name: string): string {
    // Match Chinese characters (CJK Unified Ideographs)
    const chineseChars = name.match(/[\u4e00-\u9fff]+/g)
    return chineseChars ? chineseChars.join('') : name
}

// Fetch interpellations (floor speeches) for a legislator
async function fetchInterpellations(legislatorName: string): Promise<Interpellation[]> {
    // Extract only Chinese characters to avoid API issues with names like "伍麗華Saidhai‧Tahovecahe"
    const chineseOnly = extractChineseName(legislatorName)
    const encodedName = encodeURIComponent(chineseOnly)

    // Use general endpoint with filters since legislator-specific endpoint returns 0 results
    // Use specific filters directly as query parameters
    const apiUrl = `https://ly.govapi.tw/v2/interpellations?屆=11&質詢委員=${encodedName}`

    console.log(`  Fetching interpellations...`)

    const response = await fetch(apiUrl)

    if (!response.ok) {
        throw new Error(`Taiwan API returned status ${response.status}`)
    }

    const data: TaiwanAPIResponse = await response.json()

    // Filter interpellations where the legislator is actually in the 質詢委員 array
    // and belongs to term 11 (屆 = 11)
    let allInterpellations: Interpellation[] = data.interpellations.filter(
        (interp) => interp.屆 === 11 && interp.質詢委員 && interp.質詢委員.includes(legislatorName)
    )

    // Fetch all pages if there are multiple
    if (data.total_page > 1) {
        console.log(`  Fetching ${data.total_page - 1} additional pages...`)

        for (let page = 2; page <= data.total_page; page++) {
            const pageUrl = `${apiUrl}&page=${page}`
            const pageResponse = await fetch(pageUrl)

            if (pageResponse.ok) {
                const pageData: TaiwanAPIResponse = await pageResponse.json()
                const filtered = pageData.interpellations.filter(
                    (interp) => interp.屆 === 11 && interp.質詢委員 && interp.質詢委員.includes(legislatorName)
                )
                allInterpellations.push(...filtered)
            }
        }
    }

    console.log(`  ✓ Fetched ${allInterpellations.length} interpellations`)
    return allInterpellations
}

// Mark legislator with error flag
async function markLegislatorError(legislatorId: string, errorMessage: string): Promise<void> {
    await prisma.legislator.update({
        where: { id: legislatorId },
        data: {
            errorFlag: '是',
            errorReason: `Interpellation API: ${errorMessage}`
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

// Process interpellations and create score entries
async function processInterpellations(
    legislatorId: string,
    legislatorName: string,
    interpellations: Interpellation[]
): Promise<number> {
    // Group interpellations by week based on 刊登日期 (publication date)
    const interpellationsByWeek = new Map<string, Interpellation[]>()

    for (const interpellation of interpellations) {
        // Use 刊登日期 (publication date)
        const dateStr = interpellation.刊登日期
        if (!dateStr) continue

        // Parse the date (format: YYYY-MM-DD)
        const interpellationDate = new Date(dateStr)
        if (isNaN(interpellationDate.getTime())) continue

        const weekStart = getWeekStart(interpellationDate)
        const weekKey = weekStart.toISOString()

        if (!interpellationsByWeek.has(weekKey)) {
            interpellationsByWeek.set(weekKey, [])
        }
        interpellationsByWeek.get(weekKey)!.push(interpellation)
    }

    console.log(`  Grouped into ${interpellationsByWeek.size} weeks`)

    let scoresCreated = 0

    // Create score entries for each week
    for (const [weekKey, weekInterpellations] of interpellationsByWeek.entries()) {
        const weekStart = new Date(weekKey)
        const count = weekInterpellations.length

        // Points: 1 per unique topic (we count each interpellation as a unique topic)
        // Max 5 points per week
        const points = Math.min(count * 1, 5)

        // Create a detailed description with 事由 and 說明
        let description = `Spoke on ${count} topic${count > 1 ? 's' : ''} on Legislative Yuan floor`

        // Add detailed topic info if available
        if (count === 1) {
            // For 1 topic, show full details
            const interp = weekInterpellations[0]
            const parts = []

            if (interp.事由) {
                const subject = interp.事由.substring(0, 100)
                parts.push(`事由: ${subject}${interp.事由.length > 100 ? '...' : ''}`)
            }

            if (interp.說明) {
                const explanation = interp.說明.substring(0, 150)
                parts.push(`說明: ${explanation}${interp.說明.length > 150 ? '...' : ''}`)
            }

            if (parts.length > 0) {
                description += ` - ${parts.join(' | ')}`
            }
        } else if (count <= 3) {
            // For 2-3 topics, show subjects only (truncated)
            const topics = weekInterpellations
                .filter(i => i.事由)
                .map(i => {
                    const subject = i.事由.substring(0, 50)
                    return `${subject}${i.事由.length > 50 ? '...' : ''}`
                })
                .join('; ')
            if (topics) {
                description += ` - Topics: ${topics}`
            }
        }

        // Check if score already exists for this week
        const existingScore = await prisma.score.findFirst({
            where: {
                legislatorId,
                date: weekStart,
                category: 'FLOOR_SPEECH'
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
                description,
                category: 'FLOOR_SPEECH'
            }
        })

        console.log(`  ✓ Created score: ${points}pts for week ${weekStart.toISOString().split('T')[0]} (${count} topics, max 5pts)`)
        scoresCreated++
    }

    return scoresCreated
}

async function main() {
    console.log('🚀 Starting FLOOR_SPEECH score fetching...\n')

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

                const interpellations = await fetchInterpellations(legislator.nameCh)
                const scoresCreated = await processInterpellations(
                    legislator.id,
                    legislator.nameCh,
                    interpellations
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

    console.log('\n\n✅ FLOOR_SPEECH score fetching completed!')
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
