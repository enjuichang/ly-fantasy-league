import { PrismaClient } from '@prisma/client'

interface CosignBill {
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

// Fetch cosign bills for a legislator
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

    const response = await fetchWithRetry(apiUrl)

    if (!response.ok) {
        throw new Error(`Taiwan API returned status ${response.status}`)
    }

    const data: any = await response.json()

    if (data.error || !data.bills) {
        console.log(`  ✓ No cosign bills found`)
        return []
    }

    const allBills: CosignBill[] = [...data.bills]

    // Fetch all pages if there are multiple
    if (data.total_page > 1) {
        console.log(`  Fetching ${data.total_page - 1} additional pages...`)

        for (let page = 2; page <= data.total_page; page++) {
            const pageUrl = `${apiUrl}&page=${page}`
            const pageResponse = await fetchWithRetry(pageUrl)

            if (pageResponse.ok) {
                const pageData: TaiwanAPIResponse = await pageResponse.json()
                allBills.push(...pageData.bills)
            }
        }
    }

    console.log(`  ✓ Fetched ${allBills.length} cosign bills`)
    return allBills
}

// Mark legislator with error flag
async function markLegislatorError(prisma: PrismaClient, legislatorId: string, errorMessage: string): Promise<void> {
    await prisma.legislator.update({
        where: { id: legislatorId },
        data: {
            errorFlag: '是',
            errorReason: `Cosign Bills API: ${errorMessage}`
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

// Process cosign bills and create individual score entries
async function processCosignBills(
    prisma: PrismaClient,
    legislatorId: string,
    legislatorName: string,
    bills: CosignBill[]
): Promise<number> {
    console.log(`  Processing ${bills.length} bills individually...`)

    let scoresCreated = 0

    // Create a score entry for each individual bill
    for (const bill of bills) {
        // FILTER: Only award points for bills that have passed third reading (三讀)
        const billStatus = bill.議案狀態 || ''
        const hasThirdReading = billStatus.includes('三讀')

        if (!hasThirdReading) {
            // Skip bills that haven't passed third reading
            continue
        }

        // Use 提案日期 (proposal date)
        const dateStr = bill.提案日期 || bill.最新進度日期
        if (!dateStr) {
            console.log(`  ⊘ Skipping bill with no date: ${bill.議案名稱 || 'Unknown'}`)
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

        // Points: 1 point for cosigning a PASSED bill
        const points = 1

        // Extract bill number and title
        const billNumber = bill.字號 || null
        const billTitle = bill.議案名稱 || null

        // Create description
        let description = 'Cosigned'
        if (billTitle) {
            description += `: ${billTitle}`
        }
        if (billNumber) {
            description += ` (字號: ${billNumber})`
        }

        // Create metadata JSON with additional bill details
        const lawNumber = Array.isArray(bill.法律編號)
            ? bill.法律編號[0]
            : bill.法律編號

        const metadata = JSON.stringify({
            billId: bill.議案編號,
            lawNumber: lawNumber || null,
            status: bill.議案狀態 || null,
            latestProgressDate: bill.最新進度日期 || null,
            proposingUnit: bill.提案單位 || null
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

        console.log(`  ✓ Created: ${points}pts - ${billTitle?.substring(0, 50)}${billTitle && billTitle.length > 50 ? '...' : ''}`)
        scoresCreated++
    }

    return scoresCreated
}

export async function syncCosignScores(prisma: PrismaClient, specificLegislator?: string, limit?: number, offset?: number) {
    console.log('🚀 Starting COSIGN_BILL score fetching...\n')

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

                const bills = await fetchCosignBills(legislator.nameCh)
                const scoresCreated = await processCosignBills(
                    prisma,
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

    console.log('\n\n✅ COSIGN_BILL score fetching completed!')

    return {
        processedCount,
        errorCount,
        totalScoresCreated
    }
}
