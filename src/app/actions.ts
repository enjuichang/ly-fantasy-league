'use server'

import { auth } from "@/auth"
import { PrismaClient } from "@prisma/client"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { sendInvitationEmail } from "@/lib/email"

const prisma = new PrismaClient()

export async function createLeague(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Not authenticated")
    }

    // Verify user exists in DB (handles stale sessions after DB reset)
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) {
        throw new Error("User record not found. Please sign out and sign in again.")
    }

    const name = formData.get("name") as string
    if (!name) {
        throw new Error("Name is required")
    }

    // Default season start to today for now, or pick a date
    const seasonStart = new Date()

    const league = await prisma.league.create({
        data: {
            name,
            commissionerId: session.user.id,
            seasonStart,
            members: {
                create: {
                    userId: session.user.id
                }
            }
        }
    })

    revalidatePath("/dashboard")
    redirect(`/leagues/${league.id}`)
    revalidatePath("/dashboard")
    redirect(`/leagues/${league.id}`)
}

export async function joinLeague(formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Not authenticated")
    }

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) {
        throw new Error("User record not found. Please sign out and sign in again.")
    }

    const leagueId = formData.get("leagueId") as string
    if (!leagueId) {
        throw new Error("League ID is required")
    }

    // Check if league exists
    const league = await prisma.league.findUnique({
        where: { id: leagueId }
    })

    if (!league) {
        throw new Error("League not found")
    }

    // Check if already a member
    const existingMember = await prisma.leagueMember.findUnique({
        where: {
            userId_leagueId: {
                userId: session.user.id,
                leagueId: leagueId
            }
        }
    })

    if (existingMember) {
        redirect(`/leagues/${leagueId}`)
    }

    await prisma.leagueMember.create({
        data: {
            userId: session.user.id,
            leagueId: leagueId
        }
    })

    revalidatePath("/dashboard")
    redirect(`/leagues/${leagueId}`)
}

export async function createTeam(leagueId: string, formData: FormData) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Not authenticated")
    }

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) {
        throw new Error("User record not found. Please sign out and sign in again.")
    }

    const name = formData.get("name") as string
    if (!name) {
        throw new Error("Name is required")
    }

    const team = await prisma.team.create({
        data: {
            name,
            ownerId: session.user.id,
            leagueId
        }
    })

    revalidatePath(`/leagues/${leagueId}`)
    // return team // Removed to satisfy form action type
}

export async function getLeagues() {
    const session = await auth()
    if (!session?.user?.id) return []

    return prisma.league.findMany({
        where: {
            members: {
                some: {
                    userId: session.user.id
                }
            }
        },
        include: {
            _count: {
                select: { teams: true }
            }
        }
    })
}

export async function getLeague(id: string) {
    return prisma.league.findUnique({
        where: { id },
        include: {
            teams: {
                include: {
                    owner: true,
                    legislators: {
                        include: {
                            scores: true // We might want to filter scores later
                        }
                    }
                }
            },
            members: {
                include: {
                    user: true
                }
            }
        }
    })
}

export async function getUndraftedLegislators(leagueId: string) {
    // Get all legislators that are NOT in any team of this league
    // This is a bit complex in Prisma.
    // We find legislators where none of their teams belong to this league.

    return prisma.legislator.findMany({
        where: {
            teams: {
                none: {
                    leagueId: leagueId
                }
            }
        },
        include: {
            scores: true // To calculate stats
        },
        orderBy: { nameCh: 'asc' }
    })
}

export async function getAllLegislators() {
    return prisma.legislator.findMany({
        include: {
            scores: true
        }
    })
}

export async function getLegislatorById(id: string) {
    return prisma.legislator.findUnique({
        where: { id },
        include: {
            scores: {
                orderBy: {
                    date: 'desc'
                }
            }
        }
    })
}

export async function draftPlayer(leagueId: string, teamId: string, legislatorId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Not authenticated")

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) throw new Error("User record not found. Please sign out and sign in again.")

    // Verify commissioner
    const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { commissionerId: true }
    })

    if (league?.commissionerId !== session.user.id) {
        throw new Error("Only commissioner can draft manually")
    }

    // Add legislator to team
    await prisma.team.update({
        where: { id: teamId },
        data: {
            legislators: {
                connect: { id: legislatorId }
            }
        }
    })

    revalidatePath(`/leagues/${leagueId}`)
    revalidatePath(`/leagues/${leagueId}/draft`)
    revalidatePath(`/leagues/${leagueId}/team`)
    revalidatePath(`/leagues/${leagueId}/players`)
}

export async function inviteUser(leagueId: string, email: string, locale: string = 'en') {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Not authenticated")

    // Verify user exists in DB
    const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { id: true, name: true, email: true }
    })
    if (!currentUser) throw new Error("User record not found. Please sign out and sign in again.")

    // Verify commissioner
    const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { commissionerId: true, name: true }
    })

    if (league?.commissionerId !== session.user.id) {
        throw new Error("Only commissioner can invite users")
    }

    // Check if already a member
    const user = await prisma.user.findUnique({ where: { email } })
    if (user) {
        const existingMember = await prisma.leagueMember.findUnique({
            where: {
                userId_leagueId: {
                    userId: user.id,
                    leagueId: leagueId
                }
            }
        })
        if (existingMember) {
            return { success: false, message: "User is already a member" }
        }
    }

    // Check if invitation exists
    const existingInvite = await prisma.invitation.findUnique({
        where: {
            email_leagueId: {
                email,
                leagueId
            }
        }
    })

    if (existingInvite) {
        return { success: false, message: "Invitation already sent" }
    }

    // Create invitation
    const invitation = await prisma.invitation.create({
        data: {
            email,
            leagueId,
            token: Math.random().toString(36).substring(7) // Simple token
        }
    })

    // Send email invitation
    const emailResult = await sendInvitationEmail({
        to: email,
        leagueName: league.name,
        commissionerName: currentUser.name || currentUser.email || 'Commissioner',
        token: invitation.token,
        locale
    })

    if (!emailResult.success) {
        console.error(`[EMAIL] Failed to send invitation to ${email}:`, emailResult.error)
        // Note: We don't fail the invitation creation if email fails
        // The invitation is still created and can be accepted from dashboard
    }

    revalidatePath(`/leagues/${leagueId}/settings`)
    return { success: true, message: emailResult.success ? "Invitation sent successfully" : "Invitation created (email delivery failed)" }
}

export async function getLeagueInvitations(leagueId: string) {
    const session = await auth()
    if (!session?.user?.id) return []

    // Verify commissioner (optional, but good for privacy)
    const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { commissionerId: true }
    })

    if (league?.commissionerId !== session.user.id) return []

    return prisma.invitation.findMany({
        where: { leagueId },
        orderBy: { createdAt: 'desc' }
    })
}

export async function saveDraftPreferences(leagueId: string, legislatorIds: string[]) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Not authenticated")

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) throw new Error("User record not found. Please sign out and sign in again.")

    const team = await prisma.team.findFirst({
        where: {
            leagueId,
            ownerId: session.user.id
        }
    })

    if (!team) throw new Error("Team not found")

    // Clear existing preferences
    await prisma.draftPreference.deleteMany({
        where: { teamId: team.id }
    })

    // Create new preferences
    if (legislatorIds.length > 0) {
        await prisma.draftPreference.createMany({
            data: legislatorIds.map((legId, index) => ({
                teamId: team.id,
                legislatorId: legId,
                rank: index + 1
            }))
        })
    }

    revalidatePath(`/leagues/${leagueId}/draft`)
    return { success: true }
}

export async function executeDraft(leagueId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Not authenticated")

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) throw new Error("User record not found. Please sign out and sign in again.")

    // Verify commissioner
    const league = await prisma.league.findUnique({
        where: { id: leagueId },
        select: { commissionerId: true }
    })

    if (league?.commissionerId !== session.user.id) {
        throw new Error("Only commissioner can run draft")
    }

    const { runSnakeDraft } = await import("@/lib/draft-logic")
    await runSnakeDraft(leagueId)

    revalidatePath(`/leagues/${leagueId}/draft`)
    revalidatePath(`/leagues/${leagueId}`)
    return { success: true }
}

export async function getPendingInvitations() {
    const session = await auth()
    if (!session?.user?.email) return []

    return prisma.invitation.findMany({
        where: {
            email: session.user.email,
            status: "PENDING"
        },
        include: {
            league: {
                select: {
                    id: true,
                    name: true,
                    commissioner: {
                        select: { name: true, email: true }
                    }
                }
            }
        }
    })
}

export async function acceptInvitation(invitationId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Not authenticated")

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) throw new Error("User record not found. Please sign out and sign in again.")

    const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId }
    })

    if (!invitation || invitation.status !== "PENDING") {
        throw new Error("Invalid invitation")
    }

    // Add to league
    await prisma.leagueMember.create({
        data: {
            userId: session.user.id,
            leagueId: invitation.leagueId
        }
    })

    // Update invitation
    await prisma.invitation.update({
        where: { id: invitationId },
        data: { status: "ACCEPTED" }
    })

    revalidatePath("/dashboard")
    redirect(`/leagues/${invitation.leagueId}`)
}

export async function acceptInvitationByToken(invitationId: string) {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
        return { success: false, message: "Not authenticated" }
    }

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) {
        return { success: false, message: "User record not found. Please sign out and sign in again." }
    }

    const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId }
    })

    if (!invitation) {
        return { success: false, message: "Invitation not found" }
    }

    if (invitation.status !== "PENDING") {
        return { success: false, message: "Invitation is no longer valid" }
    }

    if (invitation.email !== session.user.email) {
        return { success: false, message: "Email mismatch" }
    }

    try {
        // Add to league
        await prisma.leagueMember.create({
            data: {
                userId: session.user.id,
                leagueId: invitation.leagueId
            }
        })

        // Update invitation
        await prisma.invitation.update({
            where: { id: invitationId },
            data: { status: "ACCEPTED" }
        })

        revalidatePath("/dashboard")
        return { success: true, message: "Invitation accepted" }
    } catch (error) {
        console.error("Error accepting invitation:", error)
        return { success: false, message: "Failed to accept invitation" }
    }
}

export async function declineInvitationByToken(invitationId: string) {
    const session = await auth()
    if (!session?.user?.email) {
        return { success: false, message: "Not authenticated" }
    }

    const invitation = await prisma.invitation.findUnique({
        where: { id: invitationId }
    })

    if (!invitation) {
        return { success: false, message: "Invitation not found" }
    }

    if (invitation.status !== "PENDING") {
        return { success: false, message: "Invitation is no longer valid" }
    }

    if (invitation.email !== session.user.email) {
        return { success: false, message: "Email mismatch" }
    }

    try {
        // Update invitation status
        await prisma.invitation.update({
            where: { id: invitationId },
            data: { status: "DECLINED" }
        })

        revalidatePath("/dashboard")
        return { success: true, message: "Invitation declined" }
    } catch (error) {
        console.error("Error declining invitation:", error)
        return { success: false, message: "Failed to decline invitation" }
    }
}

// =======================
// Matchup Actions
// =======================

/**
 * Get matchups for a specific week in a league
 */
export async function getMatchupsByWeek(leagueId: string, week: number) {
    const matchups = await prisma.matchup.findMany({
        where: {
            leagueId,
            week
        },
        include: {
            team1: {
                include: {
                    owner: true
                }
            },
            team2: {
                include: {
                    owner: true
                }
            }
        },
        orderBy: {
            createdAt: 'asc'
        }
    })

    return matchups
}

/**
 * Manually regenerate the matchup schedule for a league
 * Only accessible by commissioner
 */
export async function regenerateSchedule(leagueId: string) {
    const session = await auth()
    if (!session?.user?.id) {
        throw new Error("Not authenticated")
    }

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) {
        throw new Error("User record not found. Please sign out and sign in again.")
    }

    const league = await prisma.league.findUnique({
        where: { id: leagueId }
    })

    if (!league) {
        throw new Error("League not found")
    }

    if (league.commissionerId !== session.user.id) {
        throw new Error("Only the commissioner can regenerate the schedule")
    }

    const { generateRoundRobinSchedule } = await import("@/lib/matchup-logic")
    await generateRoundRobinSchedule(leagueId)

    revalidatePath(`/leagues/${leagueId}/matchups`)
}

/**
 * Get weekly scores for legislators on a team
 * Returns current week score and last week score for each legislator
 */
export async function getLegislatorWeeklyScores(
    legislatorIds: string[],
    seasonStart: Date
) {
    const { getLegislatorCurrentWeekScore, getLegislatorLastWeekScore } = await import("@/lib/scoring-utils")

    const weeklyScores = await Promise.all(
        legislatorIds.map(async (id) => {
            const [currentWeek, lastWeek] = await Promise.all([
                getLegislatorCurrentWeekScore(id, seasonStart),
                getLegislatorLastWeekScore(id, seasonStart)
            ])

            return {
                legislatorId: id,
                currentWeek,
                lastWeek
            }
        })
    )

    return weeklyScores
}

export async function toggleBenchStatus(
    teamId: string,
    legislatorId: string,
    swapWithLegislatorId?: string
) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Not authenticated")

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) throw new Error("User record not found. Please sign out and sign in again.")

    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            legislators: {
                select: { id: true }
            }
        }
    })

    if (!team) throw new Error("Team not found")
    if (team.ownerId !== session.user.id) throw new Error("Not authorized")

    const benchIds = new Set(team.benchLegislatorIds ? team.benchLegislatorIds.split(',').filter(Boolean) : [])
    const isBench = benchIds.has(legislatorId)

    const totalCount = team.legislators.length
    const rosterCount = totalCount - benchIds.size
    const benchCount = benchIds.size

    if (isBench) {
        // Moving FROM bench TO roster
        if (rosterCount >= 6) {
            // Roster is full - need to swap
            if (!swapWithLegislatorId) {
                // Auto-swap with first roster player
                const firstRosterPlayer = team.legislators.find(leg => !benchIds.has(leg.id) && leg.id !== legislatorId)

                if (!firstRosterPlayer) {
                    return { success: false, message: "Unable to swap - roster configuration error." }
                }
                swapWithLegislatorId = firstRosterPlayer.id
            }

            // Perform swap: remove legislatorId from bench, add swapWith to bench
            benchIds.delete(legislatorId)
            benchIds.add(swapWithLegislatorId)
        } else {
            // Roster has space - simple move
            benchIds.delete(legislatorId)
        }
    } else {
        // Moving FROM roster TO bench
        if (benchCount >= 3) {
            // Bench is full - need to swap
            if (!swapWithLegislatorId) {
                // Need user to select which bench player to swap with
                return {
                    success: false,
                    needsSwapSelection: true,
                    message: "Bench is full. Please select a bench player to swap with."
                }
            }

            // Perform swap: remove swapWith from bench, add legislatorId to bench
            benchIds.delete(swapWithLegislatorId)
            benchIds.add(legislatorId)
        } else {
            // Bench has space - simple move
            benchIds.add(legislatorId)
        }
    }

    await prisma.team.update({
        where: { id: teamId },
        data: {
            benchLegislatorIds: Array.from(benchIds).join(',')
        }
    })

    revalidatePath(`/leagues/${team.leagueId}/team`)
    return { success: true }
}

export async function pickupPlayer(teamId: string, legislatorId: string, dropLegislatorId?: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Not authenticated")

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) throw new Error("User record not found. Please sign out and sign in again.")

    const team = await prisma.team.findUnique({
        where: { id: teamId },
        include: {
            legislators: true,
            league: true
        }
    })

    if (!team) throw new Error("Team not found")
    if (team.ownerId !== session.user.id) throw new Error("Not authorized")

    const benchIds = new Set(team.benchLegislatorIds ? team.benchLegislatorIds.split(',').filter(Boolean) : [])

    // Check if we need to drop a player
    if (team.legislators.length >= 9 && !dropLegislatorId) {
        return { success: false, message: "Roster is full. Please select a player to drop." }
    }

    const legislator = await prisma.legislator.findUnique({
        where: { id: legislatorId }
    })

    if (!legislator) throw new Error("Legislator not found")

    let message = ""
    let activityType = "PICKUP"
    let droppedLegislator = null

    if (dropLegislatorId) {
        // Swap: drop old, add new
        droppedLegislator = await prisma.legislator.findUnique({
            where: { id: dropLegislatorId }
        })

        if (!droppedLegislator) throw new Error("Legislator to drop not found")

        activityType = "SWAP"
        message = `${team.name} dropped ${droppedLegislator.nameCh} and picked up ${legislator.nameCh}`

        // Check if dropped player was on bench
        const wasOnBench = benchIds.has(dropLegislatorId)

        // Remove dropped player from bench if present
        benchIds.delete(dropLegislatorId)

        // If dropped player was on bench, new player should also go to bench
        if (wasOnBench) {
            benchIds.add(legislatorId)
        }

        await prisma.team.update({
            where: { id: teamId },
            data: {
                legislators: {
                    disconnect: { id: dropLegislatorId },
                    connect: { id: legislatorId }
                },
                benchLegislatorIds: Array.from(benchIds).join(',')
            }
        })
    } else {
        // Simple pickup
        message = `${team.name} picked up ${legislator.nameCh}`

        // If roster already has 6 active players, new player goes to bench
        const activeCount = team.legislators.length - benchIds.size
        const newBenchIds = new Set(benchIds)

        if (activeCount >= 6) {
            newBenchIds.add(legislatorId)
        }

        await prisma.team.update({
            where: { id: teamId },
            data: {
                legislators: {
                    connect: { id: legislatorId }
                },
                benchLegislatorIds: Array.from(newBenchIds).join(',')
            }
        })
    }

    // Log activity
    await prisma.leagueActivity.create({
        data: {
            leagueId: team.leagueId,
            teamId: team.id,
            type: activityType,
            legislatorAddedId: legislatorId,
            legislatorDroppedId: dropLegislatorId || null,
            message
        }
    })

    revalidatePath(`/leagues/${team.leagueId}/players`)
    revalidatePath(`/leagues/${team.leagueId}/team`)
    revalidatePath(`/leagues/${team.leagueId}/activity`)

    return { success: true }
}

export async function dropPlayer(teamId: string, legislatorId: string) {
    const session = await auth()
    if (!session?.user?.id) throw new Error("Not authenticated")

    // Verify user exists in DB
    const user = await prisma.user.findUnique({ where: { id: session.user.id } })
    if (!user) throw new Error("User record not found. Please sign out and sign in again.")

    const team = await prisma.team.findUnique({
        where: { id: teamId }
    })

    if (!team) throw new Error("Team not found")
    if (team.ownerId !== session.user.id) throw new Error("Not authorized")

    const legislator = await prisma.legislator.findUnique({
        where: { id: legislatorId }
    })

    if (!legislator) throw new Error("Legislator not found")

    // Remove from bench if present
    const benchIds = new Set(team.benchLegislatorIds ? team.benchLegislatorIds.split(',').filter(Boolean) : [])
    benchIds.delete(legislatorId)

    await prisma.team.update({
        where: { id: teamId },
        data: {
            legislators: {
                disconnect: { id: legislatorId }
            },
            benchLegislatorIds: Array.from(benchIds).join(',')
        }
    })

    // Log activity
    await prisma.leagueActivity.create({
        data: {
            leagueId: team.leagueId,
            teamId: team.id,
            type: "DROP",
            legislatorDroppedId: legislatorId,
            message: `${team.name} dropped ${legislator.nameCh}`
        }
    })

    revalidatePath(`/leagues/${team.leagueId}/players`)
    revalidatePath(`/leagues/${team.leagueId}/team`)
    revalidatePath(`/leagues/${team.leagueId}/activity`)

    return { success: true }
}

export async function getLeagueActivities(leagueId: string, limit: number = 50) {
    const activities = await prisma.leagueActivity.findMany({
        where: { leagueId },
        include: {
            team: {
                select: {
                    name: true
                }
            },
            legislatorAdded: {
                select: {
                    nameCh: true
                }
            },
            legislatorDropped: {
                select: {
                    nameCh: true
                }
            }
        },
        orderBy: {
            createdAt: 'desc'
        },
        take: limit
    })

    return activities
}
