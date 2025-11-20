import { prisma } from "@/auth"
import { NextResponse } from "next/server"

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const legislator = await prisma.legislator.findUnique({
            where: { id },
            include: {
                scores: {
                    orderBy: { date: 'desc' }
                }
            }
        })

        if (!legislator) {
            return NextResponse.json(
                { error: "Legislator not found" },
                { status: 404 }
            )
        }

        return NextResponse.json(legislator)
    } catch (error) {
        console.error("Error fetching legislator:", error)
        return NextResponse.json(
            { error: "Failed to fetch legislator" },
            { status: 500 }
        )
    }
}
