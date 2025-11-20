import { prisma } from "@/auth"
import { generateRoundRobinSchedule } from "./matchup-logic"

export async function runSnakeDraft(leagueId: string) {
    // 1. Get all teams in the league
    const teams = await prisma.team.findMany({
        where: { leagueId },
        include: {
            preferences: {
                orderBy: { rank: 'asc' }
            },
            legislators: true // To check if team is already full (optional for V1)
        }
    })

    if (teams.length === 0) throw new Error("No teams in league")

    // 2. Get all available legislators
    const allLegislators = await prisma.legislator.findMany()
    const draftedLegislatorIds = new Set(
        (await prisma.draftPick.findMany({ where: { leagueId } }))
            .map((p: { legislatorId: string }) => p.legislatorId)
    )

    // 3. Determine draft order (Snake)
    // Round 1: 1, 2, 3... N
    // Round 2: N, N-1... 1
    // Total rounds = 9 (6 starters + 3 bench)
    const TOTAL_ROUNDS = 9
    const draftOrder: { teamId: string, round: number, pickNumber: number }[] = []
    let pickCounter = 1

    for (let round = 1; round <= TOTAL_ROUNDS; round++) {
        const roundOrder = round % 2 === 1
            ? [...teams] // Odd rounds: Normal order
            : [...teams].reverse() // Even rounds: Reverse order

        for (const team of roundOrder) {
            draftOrder.push({
                teamId: team.id,
                round,
                pickNumber: pickCounter++
            })
        }
    }

    // 4. Execute Draft
    const picksToCreate = []
    const teamBenchUpdates = new Map<string, string[]>()

    for (const pick of draftOrder) {
        const team = teams.find((t: { id: string }) => t.id === pick.teamId)!

        // Find the highest ranked legislator that hasn't been drafted
        let chosenLegislatorId: string | null = null

        // Check preferences first
        for (const pref of team.preferences) {
            if (!draftedLegislatorIds.has(pref.legislatorId)) {
                chosenLegislatorId = pref.legislatorId
                break
            }
        }

        // Fallback: Random available legislator if preference list is exhausted/empty
        if (!chosenLegislatorId) {
            const available = allLegislators.filter((l: { id: string }) => !draftedLegislatorIds.has(l.id))
            if (available.length > 0) {
                const randomIndex = Math.floor(Math.random() * available.length)
                chosenLegislatorId = available[randomIndex].id
            }
        }

        if (chosenLegislatorId) {
            draftedLegislatorIds.add(chosenLegislatorId)
            picksToCreate.push({
                leagueId,
                teamId: team.id,
                legislatorId: chosenLegislatorId,
                pickNumber: pick.pickNumber,
                round: pick.round
            })

            // If this is the 7th, 8th, or 9th player for the team, add to bench
            // We need to track how many players this team has drafted so far in this session
            // But simpler: if round > 6, it's a bench player
            if (pick.round > 6) {
                const currentBench = teamBenchUpdates.get(team.id) || []
                currentBench.push(chosenLegislatorId)
                teamBenchUpdates.set(team.id, currentBench)
            }
        }
    }

    // 5. Save results in transaction
    const transactionOps = [
        // Create pick records
        prisma.draftPick.createMany({ data: picksToCreate }),
        // Assign legislators to teams
        ...picksToCreate.map(pick =>
            prisma.team.update({
                where: { id: pick.teamId },
                data: {
                    legislators: {
                        connect: { id: pick.legislatorId }
                    }
                }
            })
        ),
        // Update bench legislators
        ...Array.from(teamBenchUpdates.entries()).map(([teamId, benchIds]) =>
            prisma.team.update({
                where: { id: teamId },
                data: {
                    benchLegislatorIds: benchIds.join(',')
                }
            })
        ),
        // Update league status
        prisma.league.update({
            where: { id: leagueId },
            data: { draftStatus: "COMPLETED" }
        })
    ]

    await prisma.$transaction(transactionOps)

    // 6. Auto-generate matchup schedule after draft completes
    try {
        await generateRoundRobinSchedule(leagueId)
        console.log(`✓ Generated matchup schedule for league ${leagueId}`)
    } catch (error) {
        console.error('Failed to generate matchup schedule:', error)
        // Don't fail the draft if schedule generation fails
    }

    return { success: true, picks: picksToCreate.length }
}
