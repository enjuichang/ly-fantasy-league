import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface CosignBill {
    屆: number
    議案編號: string
    議案名稱: string
    提案單位: string
    議案狀態: string
    最新進度日期: string
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

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        // Fetch legislator from database
        const legislator = await prisma.legislator.findUnique({
            where: { id },
            select: { nameCh: true }
        })

        if (!legislator) {
            return NextResponse.json(
                { error: 'Legislator not found' },
                { status: 404 }
            )
        }

        // Fetch cosigned bills from Taiwan API
        // Term 11 is hardcoded as specified
        const encodedName = encodeURIComponent(legislator.nameCh)

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

        console.log(`Fetching cosign bills for ${legislator.nameCh}`)

        const response = await fetch(apiUrl)

        if (!response.ok) {
            throw new Error(`Taiwan API returned status ${response.status}`)
        }

        const data: TaiwanAPIResponse = await response.json()

        // If there are multiple pages, fetch all of them
        const allBills: CosignBill[] = [...data.bills]

        if (data.total_page > 1) {
            console.log(`Fetching ${data.total_page - 1} additional pages...`)

            for (let page = 2; page <= data.total_page; page++) {
                const pageUrl = `${apiUrl}?page=${page}`
                const pageResponse = await fetch(pageUrl)

                if (pageResponse.ok) {
                    const pageData: TaiwanAPIResponse = await pageResponse.json()
                    allBills.push(...pageData.bills)
                }
            }
        }

        console.log(`Fetched ${allBills.length} total cosigned bills for ${legislator.nameCh}`)

        return NextResponse.json({
            success: true,
            legislator: legislator.nameCh,
            total: allBills.length,
            bills: allBills
        })
    } catch (error) {
        console.error('Failed to fetch cosign bills:', error)
        return NextResponse.json(
            {
                error: 'Failed to fetch cosign bills',
                details: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        )
    }
}
