import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
    try {
        const legislators = await prisma.legislator.findMany({
            orderBy: {
                nameCh: 'asc'
            }
        })

        return NextResponse.json(legislators)
    } catch (error) {
        console.error('Failed to fetch legislators:', error)
        return NextResponse.json(
            { error: 'Failed to fetch legislators' },
            { status: 500 }
        )
    }
}
