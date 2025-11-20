import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface TaiwanAPILegislator {
  name: string
  ename: string
  party: string
  sex: string
  picUrl: string
  areaName: string
  committee: string
  leaveFlag: string
  leaveDate: string | null
  leaveReason: string | null
  onboardDate: string
  [key: string]: any
}

interface TaiwanAPIResponse {
  jsonList: TaiwanAPILegislator[]
}

// Extract legislator ID from picUrl
// Example: "http://www.ly.gov.tw//Images/Legislators/110001.jpg" -> "110001"
function extractLegislatorId(picUrl: string): string | null {
  const match = picUrl.match(/\/(\d+)\.jpg/)
  return match ? match[1] : null
}

async function main() {
  console.log('Start seeding ...')

  try {
    // Fetch data from Taiwan Legislative Yuan API
    console.log('Fetching legislators from Taiwan API...')
    const response = await fetch(
      'https://data.ly.gov.tw/odw/openDatasetJson.action?id=9&selectTerm=all&page=1'
    )

    if (!response.ok) {
      throw new Error(`API returned status ${response.status}`)
    }

    const data: TaiwanAPIResponse = await response.json()
    const legislators = data.jsonList

    console.log(`Fetched ${legislators.length} legislators from Taiwan API`)

    let syncedCount = 0
    let errorCount = 0

    // Create legislators
    for (const leg of legislators) {
      try {
        const externalId = extractLegislatorId(leg.picUrl)

        if (!externalId) {
          console.warn(`Could not extract ID from picUrl: ${leg.picUrl}`)
          errorCount++
          continue
        }

        const legislator = await prisma.legislator.upsert({
          where: { externalId },
          update: {
            nameCh: leg.name,
            nameEn: leg.ename,
            party: leg.party,
            sex: leg.sex,
            picUrl: leg.picUrl,
            areaName: leg.areaName || null,
            committee: leg.committee || null,
            leaveFlag: leg.leaveFlag || null,
            leaveDate: leg.leaveDate || null,
            leaveReason: leg.leaveReason || null,
            onboardDate: leg.onboardDate || null,
          },
          create: {
            externalId,
            nameCh: leg.name,
            nameEn: leg.ename,
            party: leg.party,
            sex: leg.sex,
            picUrl: leg.picUrl,
            areaName: leg.areaName || null,
            committee: leg.committee || null,
            leaveFlag: leg.leaveFlag || null,
            leaveDate: leg.leaveDate || null,
            leaveReason: leg.leaveReason || null,
            onboardDate: leg.onboardDate || null,
          },
        })

        console.log(`✓ Synced legislator: ${leg.name} (${leg.ename})`)
        syncedCount++
      } catch (error) {
        console.error(`Error syncing legislator ${leg.name}:`, error)
        errorCount++
      }
    }

    console.log(`\nSeeding finished: ${syncedCount} synced, ${errorCount} errors`)
  } catch (error) {
    console.error('Failed to fetch legislators from Taiwan API:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
