import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'

// We need to pass the prisma client instance or create a new one if not provided
// But for Next.js API routes, we should use a singleton pattern for PrismaClient
// For now, we'll accept it as an argument to avoid multiple instances issues in the script vs app

interface VoteRecord {
    voteDate: string      // ROC format: "113/04/09"
    term: string
    voteIssue: string
    voteType: string      // Filter for "記名"
    sessionPeriod: string
    url: string          // XLS file URL
    voteTime: string
}

interface TaiwanAPIResponse {
    jsonList: VoteRecord[]
}

interface VotingData {
    legislatorName: string
    vote: '贊成' | '反對' | '棄權'
}

interface PartyVoteStats {
    party: string
    forCount: number
    againstCount: number
    abstainCount: number
    total: number
    forPercentage: number
    againstPercentage: number
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

// Convert ROC date to Gregorian date
function convertROCtoGregorian(rocDate: string): Date {
    // Format: "113/04/09" -> 2024-04-09
    const [rocYear, month, day] = rocDate.split('/')
    const gregorianYear = parseInt(rocYear) + 1911
    return new Date(`${gregorianYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
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

// Fetch all rollcall votes from API
async function fetchRollcallVotes(): Promise<VoteRecord[]> {
    const apiUrl = 'https://data.ly.gov.tw/odw/openDatasetJson.action?id=370&selectTerm=11'

    console.log('  Fetching voting records from API...')

    try {
        const response = await fetchWithRetry(apiUrl)

        if (!response.ok) {
            throw new Error(`Taiwan API returned status ${response.status}`)
        }

        const data: TaiwanAPIResponse = await response.json()

        // Filter for rollcall votes only (voteType === '記名')
        const rollcallVotes = data.jsonList.filter(vote => vote.voteType === '記名')

        console.log(`  ✓ Found ${rollcallVotes.length} rollcall votes`)
        return rollcallVotes
    } catch (error) {
        console.error('  ❌ Failed to fetch rollcall votes:', error)
        throw error
    }
}

// Parse XLS file to extract voting data
async function parseVoteXLS(url: string): Promise<VotingData[]> {
    console.log('    Downloading XLS file...')

    // Download with redirects and user agent
    const response = await fetchWithRetry(url, {
        redirect: 'follow',
        headers: {
            'User-Agent': 'Mozilla/5.0'
        }
    })

    if (!response.ok) {
        throw new Error(`Failed to download XLS: ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as any[][]

    const votingData: VotingData[] = []
    let currentVote: '贊成' | '反對' | '棄權' | null = null

    // Parse rows to find voting sections
    for (const row of data) {
        // Check for section headers
        const firstCell = String(row[1] || '').trim()

        if (firstCell === '贊成:') {
            currentVote = '贊成'
            continue
        } else if (firstCell === '反對:') {
            currentVote = '反對'
            continue
        } else if (firstCell === '棄權:') {
            currentVote = '棄權'
            continue
        }

        // Skip if we're not in a voting section
        if (!currentVote) continue

        // Extract names from row (format: "NNN  Name")
        for (const cell of row) {
            const cellStr = String(cell).trim()

            // Match pattern: number + spaces + name
            const match = cellStr.match(/^\d+\s+(.+)$/)
            if (match) {
                const name = match[1].trim()
                // Remove extra spaces (some names have full-width spaces)
                const cleanName = name.replace(/\s+/g, '')

                if (cleanName) {
                    votingData.push({
                        legislatorName: cleanName,
                        vote: currentVote
                    })
                }
            }
        }
    }

    return votingData
}

// Match legislator name to database
async function matchLegislator(prisma: PrismaClient, name: string): Promise<{ id: string, party: string, nameCh: string } | null> {
    // Try exact match first
    let legislator = await prisma.legislator.findFirst({
        where: { nameCh: name },
        select: { id: true, party: true, nameCh: true }
    })

    if (legislator) return legislator

    // Try fuzzy matching - remove spaces, match partial name
    const cleanedName = name.replace(/\s+/g, '')

    // Try contains match
    legislator = await prisma.legislator.findFirst({
        where: { nameCh: { contains: cleanedName } },
        select: { id: true, party: true, nameCh: true }
    })

    if (legislator) return legislator

    // Try reverse - check if database name is contained in input name
    const allLegislators = await prisma.legislator.findMany({
        select: { id: true, party: true, nameCh: true }
    })

    for (const leg of allLegislators) {
        const dbNameClean = leg.nameCh.replace(/\s+/g, '')
        if (cleanedName.includes(dbNameClean) || dbNameClean.includes(cleanedName)) {
            return leg
        }
    }

    return null
}

// Calculate party voting statistics
function calculatePartyStats(
    votingData: VotingData[],
    legislators: Map<string, { id: string, party: string, nameCh: string }>
): Map<string, PartyVoteStats> {
    const partyStats = new Map<string, PartyVoteStats>()

    for (const [name, vote] of votingData.map(v => [v.legislatorName, v.vote] as const)) {
        const legislator = legislators.get(name)
        if (!legislator) continue

        const party = legislator.party

        if (!partyStats.has(party)) {
            partyStats.set(party, {
                party,
                forCount: 0,
                againstCount: 0,
                abstainCount: 0,
                total: 0,
                forPercentage: 0,
                againstPercentage: 0
            })
        }

        const stats = partyStats.get(party)!
        stats.total++

        if (vote === '贊成') stats.forCount++
        else if (vote === '反對') stats.againstCount++
        else if (vote === '棄權') stats.abstainCount++
    }

    // Calculate percentages
    for (const stats of partyStats.values()) {
        if (stats.total > 0) {
            stats.forPercentage = (stats.forCount / stats.total) * 100
            stats.againstPercentage = (stats.againstCount / stats.total) * 100
        }
    }

    return partyStats
}

// Calculate maverick bonus for a legislator
function calculateMaverickBonus(
    legislatorVote: '贊成' | '反對' | '棄權',
    legislatorParty: string,
    partyStats: Map<string, PartyVoteStats>
): number {
    // No maverick bonus for abstentions
    if (legislatorVote === '棄權') return 0

    const stats = partyStats.get(legislatorParty)
    if (!stats || stats.total === 0) return 0

    // Determine party majority position
    const partyMajorityFor = stats.forPercentage > 50
    const legislatorVotedFor = legislatorVote === '贊成'

    // Check if legislator voted opposite of party majority
    if (partyMajorityFor !== legislatorVotedFor) {
        // Calculate the percentage of party members that voted the opposite way
        const oppositionPercentage = partyMajorityFor
            ? stats.forPercentage
            : stats.againstPercentage

        // Award points based on how strong the party majority was
        // Higher opposition percentage = more independent thinking
        if (oppositionPercentage >= 90) return 9  // 90%+ of party voted opposite
        if (oppositionPercentage >= 80) return 6  // 80%+ of party voted opposite
        if (oppositionPercentage >= 70) return 3  // 70%+ of party voted opposite
    }

    return 0
}

// Process a single vote record
async function processVote(
    prisma: PrismaClient,
    voteRecord: VoteRecord,
    votingData: VotingData[]
): Promise<{ rollcallScores: number, maverickScores: number, errors: string[] }> {
    const voteDate = convertROCtoGregorian(voteRecord.voteDate)
    const weekStart = getWeekStart(voteDate)
    const errors: string[] = []

    // Match all legislators and build lookup map
    const legislators = new Map<string, { id: string, party: string, nameCh: string }>()

    for (const vote of votingData) {
        const match = await matchLegislator(prisma, vote.legislatorName)
        if (match) {
            legislators.set(vote.legislatorName, match)
        } else {
            const unicodeName = vote.legislatorName.split('').map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join('')
            errors.push(`Could not match legislator: ${vote.legislatorName} (Unicode: ${unicodeName})`)
        }
    }

    // Calculate party statistics for maverick detection
    const partyStats = calculatePartyStats(votingData, legislators)

    let rollcallScoresCreated = 0
    let maverickScoresCreated = 0

    // Create scores for each legislator
    for (const vote of votingData) {
        const legislator = legislators.get(vote.legislatorName)
        if (!legislator) continue

        // Create ROLLCALL_VOTE score (1 point for participation)
        const voteDescription = `Rollcall vote: ${voteRecord.voteIssue.substring(0, 80)} (voted: ${vote.vote})`

        const existingVote = await prisma.score.findFirst({
            where: {
                legislatorId: legislator.id,
                date: weekStart,
                category: 'ROLLCALL_VOTE',
                description: { contains: voteRecord.voteIssue.substring(0, 20) }
            }
        })

        if (!existingVote) {
            await prisma.score.create({
                data: {
                    legislatorId: legislator.id,
                    date: weekStart,
                    points: 1,
                    description: voteDescription,
                    category: 'ROLLCALL_VOTE'
                }
            })
            rollcallScoresCreated++
        }

        // Calculate and create MAVERICK_BONUS if applicable
        const maverickPoints = calculateMaverickBonus(
            vote.vote,
            legislator.party,
            partyStats
        )

        if (maverickPoints > 0) {
            const maverickDescription = `Voted independently (${vote.vote}) on: ${voteRecord.voteIssue.substring(0, 80)}`

            const existingMaverick = await prisma.score.findFirst({
                where: {
                    legislatorId: legislator.id,
                    date: weekStart,
                    category: 'MAVERICK_BONUS',
                    description: { contains: voteRecord.voteIssue.substring(0, 50) }
                }
            })

            if (!existingMaverick) {
                await prisma.score.create({
                    data: {
                        legislatorId: legislator.id,
                        date: weekStart,
                        points: maverickPoints,
                        description: maverickDescription,
                        category: 'MAVERICK_BONUS'
                    }
                })
                maverickScoresCreated++
            }
        }
    }

    return {
        rollcallScores: rollcallScoresCreated,
        maverickScores: maverickScoresCreated,
        errors
    }
}

export async function syncRollcallScores(prisma: PrismaClient, limit?: number) {
    console.log('🚀 Starting ROLLCALL_VOTE and MAVERICK_BONUS score fetching...\n')

    // Fetch all rollcall votes
    let votes: VoteRecord[] = []
    try {
        votes = await fetchRollcallVotes()
    } catch (error) {
        console.error('❌ Critical error fetching votes list. Aborting.')
        throw error
    }

    // Sort votes by date descending to process newest first (optimization for cron)
    // Actually, the API usually returns newest first, but let's be sure
    // But wait, if we process newest first, we might want to stop if we find existing records?
    // For now, let's just process everything or limit it.

    if (limit) {
        votes = votes.slice(0, limit)
        console.log(`\n⚠️  Limited to first ${limit} votes\n`)
    }

    console.log(`📊 Processing ${votes.length} rollcall vote(s)\n`)

    let processedCount = 0
    let totalRollcallScores = 0
    let totalMaverickScores = 0
    let errorCount = 0
    const allErrors: string[] = []

    for (const [index, vote] of votes.entries()) {
        try {
            console.log(`\n📋 Processing vote ${index + 1}/${votes.length}`)
            console.log(`   Date: ${vote.voteDate}`)
            console.log(`   Issue: ${vote.voteIssue.substring(0, 80)}...`)

            const votingData = await parseVoteXLS(vote.url)
            const result = await processVote(prisma, vote, votingData)

            totalRollcallScores += result.rollcallScores
            totalMaverickScores += result.maverickScores
            allErrors.push(...result.errors)

            console.log(`   ✓ Created ${result.rollcallScores} ROLLCALL_VOTE scores, ${result.maverickScores} MAVERICK_BONUS scores`)

            processedCount++

            // Rate limiting - small delay between votes
            if (index < votes.length - 1) {
                await new Promise(resolve => setTimeout(resolve, 500))
            }
        } catch (error) {
            console.error(`   ❌ Error:`, error instanceof Error ? error.message : error)
            errorCount++
        }
    }

    console.log('\n\n✅ ROLLCALL_VOTE score fetching completed!')

    return {
        processedCount,
        errorCount,
        totalRollcallScores,
        totalMaverickScores,
        errors: allErrors
    }
}
