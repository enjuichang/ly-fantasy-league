import { PrismaClient } from '@prisma/client'
import * as XLSX from 'xlsx'

/* ============================================================
    TYPES
============================================================ */

interface VoteRecord {
    voteDate: string
    term: string
    voteIssue: string
    voteType: string
    sessionPeriod: string
    url: string
    voteTime: string
}

type VoteType = '贊成' | '反對' | '棄權'

interface ParsedVote {
    legislatorName: string
    vote: VoteType
}

interface Legislator {
    id: string
    nameCh: string
    party: string
}

interface ProcessedScoreResult {
    rollcall: number
    maverick: number
    errors: string[]
}

/* ============================================================
    UTILITIES
============================================================ */

function getWeekStart(date: Date): Date {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day + (day === 0 ? -6 : 1)
    d.setDate(diff)
    d.setHours(0, 0, 0, 0)
    return d
}

function convertROC(roc: string) {
    const [y, m, d] = roc.split('/')
    return new Date(+y + 1911, +m - 1, +d)
}

function sleep(ms: number) {
    return new Promise(r => setTimeout(r, ms))
}

/* ============================================================
    FETCH ROLLCALLS
============================================================ */

async function fetchWithRetry(url: string, retries = 3): Promise<Response> {
    try {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Status ${res.status}`)
        return res
    } catch (err) {
        if (retries <= 0) throw err
        await sleep(500)
        return fetchWithRetry(url, retries - 1)
    }
}

async function fetchRollcalls(): Promise<VoteRecord[]> {
    const url = `https://data.ly.gov.tw/odw/openDatasetJson.action?id=370&selectTerm=11`

    let attempts = 0
    const maxAttempts = 5
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms))

    while (attempts < maxAttempts) {
        try {
            const res = await fetchWithRetry(url, 3) // this itself retries internally
            const data = await res.json()
            return data.jsonList.filter((v: VoteRecord) => v.voteType === "記名")
        } catch (err) {
            attempts++
            console.warn(`⚠️ fetchRollcalls failed (attempt ${attempts}/${maxAttempts}):`, err)

            if (attempts === maxAttempts) throw err

            await delay(1000 * attempts) // exponential backoff
        }
    }

    throw new Error("Unreachable")
}


/* ============================================================
    XLS PARSER — Modernized based on LY xls structure
============================================================ */

// Remove all leading numbers, full-width digits, unicode spaces, BOM, etc.
function normalizeName(raw: string): string {
    return raw
        .replace(/^[\d０-９]+/, "")                 // remove leading digits (both 0-9 and ０-９)
        .replace(/[\s\u3000\u200B\uFEFF]+/g, "")    // remove all space variants
        .trim()
}

async function parseXLS(url: string): Promise<ParsedVote[]> {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } })
    if (!res.ok) throw new Error(`Failed XLS: ${res.status}`)

    const buf = await res.arrayBuffer()
    const workbook = XLSX.read(buf, { type: 'array' })
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][]

    const votes: ParsedVote[] = []
    let current: VoteType | null = null

    for (const row of rows) {
        const cells = row.map((c: any) => String(c).trim())

        if (cells.includes("贊成:")) { current = "贊成"; continue }
        if (cells.includes("反對:")) { current = "反對"; continue }
        if (cells.includes("棄權:")) { current = "棄權"; continue }

        if (!current) continue
        if (cells.includes("無")) continue

        // Case B: "025伍麗華"
        for (const cell of cells) {
            const m = cell.match(/^([\d０-９]{1,3})(.+)$/)  // full-width digit support
            if (m) {
                const name = normalizeName(m[2])
                if (name) votes.push({ legislatorName: name, vote: current })
            }
        }

        // Case A: ["025", "伍麗華"]
        for (let i = 0; i < cells.length - 1; i++) {
            if (/^[\d０-９]+$/.test(cells[i]) && cells[i + 1]) {
                const name = normalizeName(cells[i + 1])
                if (name) votes.push({ legislatorName: name, vote: current })
            }
        }
    }

    return votes
}

/* ============================================================
    LEGISLATOR MATCHING (cached)
============================================================ */

let LEGISLATOR_CACHE: Legislator[] | null = null

async function loadLegislators(prisma: PrismaClient): Promise<Legislator[]> {
    if (!LEGISLATOR_CACHE) {
        LEGISLATOR_CACHE = await prisma.legislator.findMany({
            select: { id: true, nameCh: true, party: true }
        })
    }
    return LEGISLATOR_CACHE
}

function matchLegislator(all: Legislator[], name: string): Legislator | null {
    const cleaned = name.replace(/\s+/g, '')

    // 1. Exact match
    let m = all.find(l => l.nameCh === cleaned)
    if (m) return m

    // 2. DB name starts with XLS name (for Indigenous names)
    m = all.find(l => l.nameCh.startsWith(cleaned))
    if (m) return m

    // 3. Contains match (fallback)
    m = all.find(l => l.nameCh.includes(cleaned) || cleaned.includes(l.nameCh))
    if (m) return m

    return null
}


/* ============================================================
    PARTY STATISTICS
============================================================ */

function computePartyStats(votes: ParsedVote[], legs: Map<string, Legislator>) {
    const stats = new Map<string, any>()

    for (const v of votes) {
        const leg = legs.get(v.legislatorName)
        if (!leg) continue

        if (!stats.has(leg.party)) {
            stats.set(leg.party, { for: 0, against: 0, abstain: 0, total: 0 })
        }

        const p = stats.get(leg.party)
        p.total++
        if (v.vote === '贊成') p.for++
        if (v.vote === '反對') p.against++
        if (v.vote === '棄權') p.abstain++
    }

    for (const p of stats.values()) {
        p.pctFor = (p.for / p.total) * 100
        p.pctAgainst = (p.against / p.total) * 100
    }

    return stats
}

function maverickBonus(vote: VoteType, party: string, stats: Map<string, any>) {
    if (vote === '棄權') return 0

    const p = stats.get(party)
    if (!p) return 0

    const majorityFor = p.pctFor > 50
    const votedFor = vote === '贊成'

    if (majorityFor !== votedFor) {
        const pct = majorityFor ? p.pctFor : p.pctAgainst
        if (pct >= 90) return 9
        if (pct >= 80) return 6
        if (pct >= 70) return 3
    }

    return 0
}

/* ============================================================
    SCORE PROCESSING
============================================================ */

async function scoreVotes(
    prisma: PrismaClient,
    record: VoteRecord,
    parsed: ParsedVote[]
): Promise<ProcessedScoreResult> {

    const errors: string[] = []
    const week = getWeekStart(convertROC(record.voteDate))

    const allLegs = await loadLegislators(prisma)
    const matched = new Map<string, Legislator>()

    for (const v of parsed) {
        const m = matchLegislator(allLegs, v.legislatorName)
        if (m) matched.set(v.legislatorName, m)
        else errors.push(`Unmatched legislator: ${v.legislatorName}`)
    }

    const stats = computePartyStats(parsed, matched)

    const rollRows: any[] = []
    const mavRows: any[] = []

    for (const v of parsed) {
        const leg = matched.get(v.legislatorName)
        if (!leg) continue

        rollRows.push({
            legislatorId: leg.id,
            date: week,
            points: 1,
            category: 'ROLLCALL_VOTE',
            description: `Rollcall vote on ${record.voteIssue}`
        })

        const bonus = maverickBonus(v.vote, leg.party, stats)
        if (bonus > 0) {
            mavRows.push({
                legislatorId: leg.id,
                date: week,
                points: bonus,
                category: 'MAVERICK_BONUS',
                description: `Voted independently (${v.vote}) on ${record.voteIssue}`
            })
        }
    }

    if (rollRows.length)
        await prisma.score.createMany({ data: rollRows, skipDuplicates: true })

    if (mavRows.length)
        await prisma.score.createMany({ data: mavRows, skipDuplicates: true })

    return {
        rollcall: rollRows.length,
        maverick: mavRows.length,
        errors
    }
}

/* ============================================================
    MASTER SYNC FUNCTION
============================================================ */

export async function syncRollcallScores(limit?: number, offset?: number) {
    console.log(`🚀 Syncing rollcall scores\n`)

    const prisma = new PrismaClient()
    const list = await fetchRollcalls()

    // FIXED SLICE LOGIC
    const start = offset ?? 0
    const end = limit ? start + limit : list.length
    const slice = list.slice(start, end)

    console.log(`Total rollcall votes fetched: ${list.length}`)
    console.log(`Processing ${slice.length} votes (start=${start}, end=${end})`)

    let totalRoll = 0
    let totalMaverick = 0
    const allErrors: string[] = []

    for (let i = 0; i < slice.length; i++) {
        const vote = slice[i]
        console.log(`📘 Processing ${i + 1}/${slice.length}: ${vote.voteIssue.slice(0, 60)}...`)

        const parsed = await parseXLS(vote.url)
        const result = await scoreVotes(prisma, vote, parsed)

        totalRoll += result.rollcall
        totalMaverick += result.maverick
        allErrors.push(...result.errors)

        await sleep(250)
    }

    console.log(`\n===== SUMMARY =====`)
    console.log(`Processed: ${slice.length}`)
    console.log(`Rollcall scores created: ${totalRoll}`)
    console.log(`Maverick scores created: ${totalMaverick}`)
    console.log(`Errors: ${allErrors.length}`)

    return {
        processedCount: slice.length,
        errorCount: allErrors.length,
        totalRollcallScores: totalRoll,
        totalMaverickScores: totalMaverick,
        errors: allErrors
    }
}
