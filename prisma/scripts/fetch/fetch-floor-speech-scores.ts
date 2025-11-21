
import { PrismaClient } from '@prisma/client'
import { getWeekStart } from '../../../src/lib/scoring-client'

const prisma = new PrismaClient()

// Helper to delay execution
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper to convert Date to ROC string (e.g., 1130201)
function toRocDate(date: Date): string {
    const year = date.getFullYear() - 1911
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}${month}${day}`
}

// Helper to parse ROC date string (e.g., 113/02/01) to Date object
function parseRocDate(rocDateStr: string): Date {
    const parts = rocDateStr.split('/')
    if (parts.length !== 3) throw new Error(`Invalid ROC date format: ${rocDateStr}`)

    const year = parseInt(parts[0]) + 1911
    const month = parseInt(parts[1]) - 1
    const day = parseInt(parts[2])

    return new Date(year, month, day)
}

interface SpeechRecord {
    smeeting_date: string // "113/02/27"
    meeting_status: string
    meeting_name: string
    meeting_content: string
    speechers: string | null // " 0001 林岱樺, 0002 邱議瑩..."
    meeting_unit: string
}

async function fetchSpeeches(startDate: Date, endDate: Date): Promise<SpeechRecord[]> {
    const from = toRocDate(startDate)
    const to = toRocDate(endDate)
    const url = `https://www.ly.gov.tw/WebAPI/LegislativeSpeech.aspx?from=${from}&to=${to}&mode=JSON`

    console.log(`Fetching speeches from ${url}...`)

    const res = await fetch(url)
    if (!res.ok) {
        throw new Error(`Failed to fetch speeches: ${res.status} ${res.statusText}`)
    }

    return await res.json()
}

async function main() {
    console.log('Starting FLOOR_SPEECH score fetch...')

    // Define date range (e.g., current term starting Feb 1, 2024)
    // For this run, let's fetch the last 30 days to be safe, or a specific range if needed.
    // Let's fetch from Feb 1, 2024 to now to cover the term.
    const startDate = new Date('2024-02-01')
    const endDate = new Date()

    try {
        const speeches = await fetchSpeeches(startDate, endDate)
        console.log(`Fetched ${speeches.length} meeting records.`)

        let totalScoresCreated = 0

        for (const record of speeches) {
            if (!record.speechers) continue

            const date = parseRocDate(record.smeeting_date)

            // Parse speechers string
            // Format: " 0001 Name, 0002 Name"
            const speecherParts = record.speechers.split(',')
            const legislatorNames = speecherParts.map(part => {
                const match = part.trim().match(/^\d+\s+(.+)$/)
                return match ? match[1].trim() : null
            }).filter(name => name !== null) as string[]

            if (legislatorNames.length === 0) continue

            console.log(`Processing ${legislatorNames.length} speakers for meeting on ${record.smeeting_date}...`)

            for (const name of legislatorNames) {
                // Find legislator
                // Try exact match first
                let legislator = await prisma.legislator.findFirst({
                    where: {
                        nameCh: name
                    }
                })

                // Handle special cases or fuzzy matching if needed
                // For now, assume names match (the API seems to use standard names)

                if (!legislator) {
                    console.warn(`Legislator not found: ${name}`)
                    continue
                }

                // Check if score already exists
                const existingScore = await prisma.score.findFirst({
                    where: {
                        legislatorId: legislator.id,
                        category: 'FLOOR_SPEECH',
                        date: date,
                        description: {
                            contains: record.meeting_name // Use meeting name to distinguish multiple speeches in same meeting if needed
                        }
                    }
                })

                if (existingScore) {
                    // console.log(`Score already exists for ${name} on ${date.toISOString().split('T')[0]}`)
                    continue
                }

                // Create score
                // 1 point per floor speech
                await prisma.score.create({
                    data: {
                        legislatorId: legislator.id,
                        category: 'FLOOR_SPEECH',
                        points: 1,
                        date: date,
                        description: `Floor Speech: ${record.meeting_name} (${record.meeting_unit})`
                    }
                })

                totalScoresCreated++
            }
        }

        console.log(`Successfully created ${totalScoresCreated} FLOOR_SPEECH scores.`)

    } catch (error) {
        console.error('Error in main loop:', error)
    }
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
