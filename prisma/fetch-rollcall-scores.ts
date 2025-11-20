import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'

const prisma = new PrismaClient()

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

// Fetch all rollcall votes from API
async function fetchRollcallVotes(): Promise<VoteRecord[]> {
    const apiUrl = 'https://data.ly.gov.tw/odw/openDatasetJson.action?id=370&selectTerm=11'

    console.log('  Fetching voting records from API...')
    const response = await fetch(apiUrl)

    if (!response.ok) {
        throw new Error(`Taiwan API returned status ${response.status}`)
    }

    const data: TaiwanAPIResponse = await response.json()

    // Filter for rollcall votes only (voteType === '記名')
    const rollcallVotes = data.jsonList.filter(vote => vote.voteType === '記名')

    console.log(`  ✓ Found ${rollcallVotes.length} rollcall votes`)
    return rollcallVotes
}

// Parse XLS file to extract voting data
async function parseVoteXLS(url: string): Promise<VotingData[]> {
    console.log('    Downloading XLS file...')

    // Download with redirects and user agent
    const response = await fetch(url, {
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

    console.log(`    ✓ Extracted ${votingData.length} votes (${votingData.filter(v => v.vote === '贊成').length} for, ${votingData.filter(v => v.vote === '反對').length} against, ${votingData.filter(v => v.vote === '棄權').length} abstain)`)
    return votingData
}

// Match legislator name to database
async function matchLegislator(name: string): Promise<{ id: string, party: string, nameCh: string } | null> {
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
        if (oppositionPercentage >= 90) return 30
        if (oppositionPercentage >= 80) return 20
        if (oppositionPercentage >= 70) return 10
    }

    return 0
}

// Process a single vote record
async function processVote(
    voteRecord: VoteRecord,
    votingData: VotingData[]
): Promise<{ rollcallScores: number, maverickScores: number, errors: string[] }> {
    const voteDate = convertROCtoGregorian(voteRecord.voteDate)
    const weekStart = getWeekStart(voteDate)
    const errors: string[] = []

    // Match all legislators and build lookup map
    const legislators = new Map<string, { id: string, party: string, nameCh: string }>()

    for (const vote of votingData) {
        const match = await matchLegislator(vote.legislatorName)
        if (match) {
            legislators.set(vote.legislatorName, match)
        } else {
            errors.push(`Could not match legislator: ${vote.legislatorName}`)
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

        // Create ROLLCALL_VOTE score (3 points for participation)
        const voteReason = `Rollcall vote: ${voteRecord.voteIssue.substring(0, 80)} (voted: ${vote.vote})`

        const existingVote = await prisma.score.findFirst({
            where: {
                legislatorId: legislator.id,
                date: weekStart,
                category: 'ROLLCALL_VOTE',
                reason: { contains: voteRecord.voteIssue.substring(0, 50) }
            }
        })

        if (!existingVote) {
            await prisma.score.create({
                data: {
                    legislatorId: legislator.id,
                    date: weekStart,
                    points: 3,
                    reason: voteReason,
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
            const maverickReason = `Voted independently (${vote.vote}) on: ${voteRecord.voteIssue.substring(0, 80)}`

            const existingMaverick = await prisma.score.findFirst({
                where: {
                    legislatorId: legislator.id,
                    date: weekStart,
                    category: 'MAVERICK_BONUS',
                    reason: { contains: voteRecord.voteIssue.substring(0, 50) }
                }
            })

            if (!existingMaverick) {
                await prisma.score.create({
                    data: {
                        legislatorId: legislator.id,
                        date: weekStart,
                        points: maverickPoints,
                        reason: maverickReason,
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

async function main() {
    console.log('🚀 Starting ROLLCALL_VOTE and MAVERICK_BONUS score fetching...\n')

    // Get command line arguments
    const args = process.argv.slice(2)
    const limitArg = args.find(arg => arg.startsWith('--limit='))
    const limit = limitArg ? parseInt(limitArg.split('=')[1]) : undefined

    // Fetch all rollcall votes
    let votes = await fetchRollcallVotes()

    if (limit) {
        votes = votes.slice(0, limit)
        console.log(`\n⚠️  Limited to first ${limit} votes for testing\n`)
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
            const result = await processVote(vote, votingData)

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
    console.log(`\n📈 Statistics:`)
    console.log(`   Votes processed: ${processedCount}`)
    console.log(`   Errors: ${errorCount}`)
    console.log(`   Total ROLLCALL_VOTE scores created: ${totalRollcallScores}`)
    console.log(`   Total MAVERICK_BONUS scores created: ${totalMaverickScores}`)

    if (allErrors.length > 0) {
        console.log(`\n⚠️  Unmatched legislators (${allErrors.length}):`)
        const uniqueErrors = [...new Set(allErrors)]
        uniqueErrors.slice(0, 20).forEach(err => console.log(`   - ${err}`))
        if (uniqueErrors.length > 20) {
            console.log(`   ... and ${uniqueErrors.length - 20} more`)
        }
    }
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
