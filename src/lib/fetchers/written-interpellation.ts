import { PrismaClient } from '@prisma/client'

interface WrittenInterpellation {
    屆: number
    會期: number
    質詢編號: string
    刊登日期: string  // Publication date
    質詢委員: string[]
    事由: string  // Reason/subject
    [key: string]: any
}

interface TaiwanAPIResponse {
    total: number
    total_page: number
    page: number
    limit: number
    interpellations: WrittenInterpellation[]
}

// Extract only Chinese characters from name (remove English letters, spaces, special chars)
function extractChineseName(name: string): string {
    // Match Chinese characters (CJK Unified Ideographs)
    const chineseChars = name.match(/[\u4e00-\u9fff]+/g)
    return chineseChars ? chineseChars.join('') : name
}

// Helper function for fetch with retry
async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3, backoff = 1000): Promise<Response> {
    try {
        const response = await fetch(url, options)
        if (!response.ok) {
            // If 404 or other client errors, don't retry unless it's a rate limit
            if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                return response
            }
            throw new Error(`Status ${response.status}`)
        }
        return response
    } catch (error) {
        if (retries <= 0) {
            throw error
        }
        console.log(`    ⚠️  Fetch failed, retrying in ${backoff}ms... (${retries} retries left)`)
        await new Promise(resolve => setTimeout(resolve, backoff))
        return fetchWithRetry(url, options, retries - 1, backoff * 2)
    }
}

// Fetch written interpellations for a legislator
async function fetchWrittenInterpellations(legislatorName: string): Promise<WrittenInterpellation[]> {
    // Extract only Chinese characters to avoid API issues
    const chineseOnly = extractChineseName(legislatorName)
    const encodedName = encodeURIComponent(chineseOnly)

    // Request specific output fields for better data quality
    const outputFields = [
        '屆',
        '會期',
        '質詢編號',
        '刊登日期',
        '質詢委員',
        '事由'
    ].map(field => `output_fields=${encodeURIComponent(field)}`).join('&')

    const apiUrl = `https://ly.govapi.tw/v2/legislators/11/${encodedName}/interpellations?${outputFields}`

    console.log(`  Fetching interpellations...`)

    const response = await fetchWithRetry(apiUrl)

    if (!response.ok) {
        throw new Error(`Taiwan API returned status ${response.status}`)
    }

    const data: any = await response.json()

    if (data.error || !data.interpellations) {
        console.log(`  ✓ No interpellations found`)
        return []
    }

    const allInterpellations: WrittenInterpellation[] = [...data.interpellations]

    // Fetch all pages if there are multiple
    if (data.total_page > 1) {
        console.log(`  Fetching ${data.total_page - 1} additional pages...`)

        for (let page = 2; page <= data.total_page; page++) {
            const pageUrl = `${apiUrl}&page=${page}`
            const pageResponse = await fetchWithRetry(pageUrl)

            if (pageResponse.ok) {
                const pageData: TaiwanAPIResponse = await pageResponse.json()
                allInterpellations.push(...pageData.interpellations)
            }
        }
    }

    console.log(`  ✓ Fetched ${allInterpellations.length} interpellations`)
    return allInterpellations
}

// Mark legislator with error flag
async function markLegislatorError(prisma: PrismaClient, legislatorId: string, errorMessage: string): Promise<void> {
    await prisma.legislator.update({
        where: { id: legislatorId },
        data: {
            errorFlag: '是',
            errorReason: `Written Interpellations API: ${errorMessage}`
        }
    })
}

// Clear error flag for legislator
async function clearLegislatorError(prisma: PrismaClient, legislatorId: string): Promise<void> {
    await prisma.legislator.update({
        where: { id: legislatorId },
        data: {
            errorFlag: null,
            errorReason: null
        }
    })
}

// Process written interpellations and create individual score entries
async function processWrittenInterpellations(
    prisma: PrismaClient,
    legislatorId: string,
    legislatorName: string,
    interpellations: WrittenInterpellation[]
): Promise<number> {
    console.log(`  Processing ${interpellations.length} interpellations individually...`)

    let scoresCreated = 0

    // Create a score entry for each individual interpellation
    for (const interpellation of interpellations) {
        const dateStr = interpellation.刊登日期
        if (!dateStr) {
            console.log(`  ⊘ Skipping interpellation with no date: ${interpellation.事由 || 'Unknown'}`)
            continue
        }

        // Parse the date (format: YYYY-MM-DD)
        const billDate = new Date(dateStr)
        if (isNaN(billDate.getTime())) {
            console.log(`  ⊘ Skipping interpellation with invalid date: ${dateStr}`)
            continue
        }

        // Set time to midnight to avoid timezone issues
        billDate.setHours(0, 0, 0, 0)

        // Points: 1 point for written interpellation
        const points = 1

        const title = interpellation.事由 || null

        // Create description
        let description = 'Written Interpellation'
        if (title) {
            description += `: ${title}`
        }

        // Create metadata JSON
        const metadata = JSON.stringify({
            interpellationId: interpellation.質詢編號,
            sessionPeriod: interpellation.會期 || null
        })

        // Check if score already exists
        const existingScore = await prisma.score.findFirst({
            where: {
                legislatorId,
                description: {
                    equals: description
                },
                category: 'WRITTEN_SPEECH',
                date: billDate
            }
        })

        if (existingScore) {
            continue
        }

        // Create score record
        await prisma.score.create({
            data: {
                legislatorId,
                date: billDate,
                points,
                description,
                category: 'WRITTEN_SPEECH',
                metadata
            }
        })

        console.log(`  ✓ Created: ${points}pts - ${title?.substring(0, 50)}${title && title.length > 50 ? '...' : ''}`)
        scoresCreated++
    }

    return scoresCreated
}

export async function syncWrittenInterpellationScores(prisma: PrismaClient, specificLegislator?: string, limit?: number, offset?: number) {
    console.log('🚀 Starting WRITTEN_SPEECH score fetching...\n')

    // Fetch legislators from database
    const legislators = await prisma.legislator.findMany({
        where: specificLegislator ? { nameCh: specificLegislator } : {},
        orderBy: { nameCh: 'asc' },
        take: limit,
        skip: offset
    })

    if (legislators.length === 0) {
        console.log('❌ No legislators found in database.')
        return {
            processedCount: 0,
            errorCount: 0,
            totalScoresCreated: 0
        }
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

                const interpellations = await fetchWrittenInterpellations(legislator.nameCh)
                const scoresCreated = await processWrittenInterpellations(
                    prisma,
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
                await clearLegislatorError(prisma, legislator.id)
            } else {
                const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
                console.error(`  ❌ Error for ${legislator.nameCh}:`, errorMsg)
                // Mark legislator with error flag
                await markLegislatorError(prisma, legislator.id, errorMsg)
                errorCount++
            }
        }

        // Small delay between batches to avoid overwhelming the API
        if (i + BATCH_SIZE < legislators.length) {
            await new Promise(resolve => setTimeout(resolve, 1000))
        }
    }

    console.log('\n\n✅ WRITTEN_SPEECH score fetching completed!')

    return {
        processedCount,
        errorCount,
        totalScoresCreated
    }
}
