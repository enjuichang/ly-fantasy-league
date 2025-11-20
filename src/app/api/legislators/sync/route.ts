import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface TaiwanAPILegislator {
    name: string
    ename: string
    party: string
    sex: string
    picUrl: string
    leaveFlag: string
    leaveDate: string
    areaName: string
    leaveReason: string
    committee: string
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

export async function POST() {
    try {
        // Fetch data from Taiwan Legislative Yuan API
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

        // Upsert legislators into database
        for (const leg of legislators) {
            try {
                const externalId = extractLegislatorId(leg.picUrl)

                if (!externalId) {
                    console.warn(`Could not extract ID from picUrl: ${leg.picUrl}`)
                    errorCount++
                    continue
                }

                await prisma.legislator.upsert({
                    where: { externalId },
                    update: {
                        nameCh: leg.name,
                        nameEn: leg.ename,
                        party: leg.party,
                        sex: leg.sex,
                        picUrl: leg.picUrl,
                        leaveFlag: leg.leaveFlag,
                        leaveDate: leg.leaveDate,
                        areaName: leg.areaName,
                        leaveReason: leg.leaveReason,
                        committee: leg.committee,
                        onboardDate: leg.onboardDate,
                    },
                    create: {
                        externalId,
                        nameCh: leg.name,
                        nameEn: leg.ename,
                        party: leg.party,
                        sex: leg.sex,
                        picUrl: leg.picUrl,
                        leaveFlag: leg.leaveFlag,
                        leaveDate: leg.leaveDate,
                        areaName: leg.areaName,
                        leaveReason: leg.leaveReason,
                        committee: leg.committee,
                        onboardDate: leg.onboardDate,
                    },
                })

                syncedCount++
            } catch (error) {
                console.error(`Error syncing legislator ${leg.name}:`, error)
                errorCount++
            }
        }

        console.log(`Sync complete: ${syncedCount} synced, ${errorCount} errors`)

        return NextResponse.json({
            success: true,
            synced: syncedCount,
            errors: errorCount,
            total: legislators.length,
        })
    } catch (error) {
        console.error('Failed to sync legislators:', error)
        return NextResponse.json(
            {
                error: 'Failed to sync legislators',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
