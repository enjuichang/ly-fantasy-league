import { PrismaClient } from '@prisma/client'

interface FloorSpeechMeeting {
    smeeting_date: string  // ROC calendar format: "106/10/05"
    meeting_status: string
    meeting_name: string
    meeting_content: string
    speechers: string  // Format: "0001 Name1, 0002 Name2, ..."
    meeting_unit: string
}

// Convert Gregorian date to ROC (民國) calendar format
function toROCDate(date: Date): string {
    const year = date.getFullYear() - 1911  // ROC year = Gregorian year - 1911
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}${month}${day}`
}

// Convert ROC calendar string to Date object
function fromROCDate(rocDateStr: string): Date {
    const parts = rocDateStr.split('/')
    if (parts.length !== 3) return new Date()

    const rocYear = parseInt(parts[0])
    const month = parseInt(parts[1])
    const day = parseInt(parts[2])
    const gregorianYear = rocYear + 1911

    return new Date(gregorianYear, month - 1, day)
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

// Fetch floor speeches from Legislative Yuan WebAPI for a date range
async function fetchFloorSpeeches(fromDate: Date, toDate: Date): Promise<FloorSpeechMeeting[]> {
    const from = toROCDate(fromDate)
    const to = toROCDate(toDate)

    const apiUrl = `https://www.ly.gov.tw/WebAPI/LegislativeSpeech.aspx?from=${from}&to=${to}&mode=JSON`

    console.log(`  Fetching speeches from ${from} to ${to}...`)

    const response = await fetchWithRetry(apiUrl)

    if (!response.ok) {
        throw new Error(`Legislative Yuan API returned status ${response.status}`)
    }

    const data = await response.json()

    if (!Array.isArray(data)) {
        console.log(`  ✓ No speeches found`)
        return []
    }

    console.log(`  ✓ Found ${data.length} meetings with speeches`)
    return data
}

// Parse speechers string and extract legislator names
function parseSpeechersNames(speechers: string): string[] {
    if (!speechers) return []

    // Format: "0001 Name1, 0002 Name2, ..."
    const names = speechers.split(',').map(item => {
        const match = item.trim().match(/^\d+\s+(.+)$/)
        return match ? match[1].trim() : null
    }).filter(Boolean) as string[]

    return names
}

// Mark legislator with error flag
async function markLegislatorError(prisma: PrismaClient, legislatorId: string, errorMessage: string): Promise<void> {
    await prisma.legislator.update({
        where: { id: legislatorId },
        data: {
            errorFlag: '是',
            errorReason: `Floor Speeches API: ${errorMessage}`
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

// Process floor speeches and create individual score entries for a specific legislator
async function processFloorSpeechesForLegislator(
    prisma: PrismaClient,
    legislatorId: string,
    legislatorName: string,
    meetings: FloorSpeechMeeting[]
): Promise<number> {
    let scoresCreated = 0

    // Filter meetings where this legislator spoke
    for (const meeting of meetings) {
        const speakerNames = parseSpeechersNames(meeting.speechers)

        // Check if this legislator spoke (match by full name)
        const didSpeak = speakerNames.some(name => {
            return name === legislatorName
        })

        if (!didSpeak) continue

        // Parse the meeting date
        const meetingDate = fromROCDate(meeting.smeeting_date)
        if (isNaN(meetingDate.getTime())) {
            console.log(`  ⊘ Skipping meeting with invalid date: ${meeting.smeeting_date}`)
            continue
        }

        // Set time to midnight to avoid timezone issues
        meetingDate.setHours(0, 0, 0, 0)

        // Points: 2 points for floor speech
        const points = 2

        // Create description
        const description = `Floor Speech: ${meeting.meeting_name}`

        // Create metadata JSON
        const metadata = JSON.stringify({
            meetingDate: meeting.smeeting_date,
            meetingUnit: meeting.meeting_unit,
            meetingContent: meeting.meeting_content,
            meetingStatus: meeting.meeting_status
        })

        // Check if score already exists
        const existingScore = await prisma.score.findFirst({
            where: {
                legislatorId,
                description: {
                    equals: description
                },
                category: 'FLOOR_SPEECH',
                date: meetingDate
            }
        })

        if (existingScore) {
            continue
        }

        // Create score record
        await prisma.score.create({
            data: {
                legislatorId,
                date: meetingDate,
                points,
                description,
                category: 'FLOOR_SPEECH',
                metadata
            }
        })

        console.log(`  ✓ Created: ${points}pts - ${meeting.meeting_name.substring(0, 50)}${meeting.meeting_name.length > 50 ? '...' : ''}`)
        scoresCreated++
    }

    return scoresCreated
}

export async function syncFloorSpeechScores(prisma: PrismaClient, specificLegislator?: string, limit?: number, offset?: number) {
    console.log('🚀 Starting FLOOR_SPEECH score fetching...\n')

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

    // Fetch speeches for the last 30 days
    const toDate = new Date()
    const fromDate = new Date()
    fromDate.setDate(fromDate.getDate() - 30)

    console.log('📅 Fetching floor speeches for the last 30 days...\n')

    let meetings: FloorSpeechMeeting[] = []
    try {
        meetings = await fetchFloorSpeeches(fromDate, toDate)
    } catch (error) {
        console.error('❌ Failed to fetch floor speeches:', error)
        return {
            processedCount: 0,
            errorCount: 0,
            totalScoresCreated: 0
        }
    }

    if (meetings.length === 0) {
        console.log('📭 No meetings with speeches found in the date range.')
        return {
            processedCount: 0,
            errorCount: 0,
            totalScoresCreated: 0
        }
    }

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

                const scoresCreated = await processFloorSpeechesForLegislator(
                    prisma,
                    legislator.id,
                    legislator.nameCh,
                    meetings
                )

                console.log(`  Processing ${scoresCreated} speeches for ${legislator.nameCh}...`)

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

    console.log('\n\n✅ FLOOR_SPEECH score fetching completed!')

    return {
        processedCount,
        errorCount,
        totalScoresCreated
    }
}
