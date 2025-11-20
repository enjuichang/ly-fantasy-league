import { prisma } from '@/auth'
import { getWeekDateRange, getTeamWeeklyScore } from './scoring-utils'

/**
 * Generate a round-robin schedule for a league
 * Each team plays every other team once
 * If odd number of teams, one team gets a bye each week
 *
 * @param leagueId The league ID
 * @returns Array of created matchups
 */
export async function generateRoundRobinSchedule(leagueId: string) {
  // Get league and teams
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    include: { teams: true }
  })

  if (!league) {
    throw new Error('League not found')
  }

  const teams = league.teams
  const teamCount = teams.length

  if (teamCount < 2) {
    throw new Error('Need at least 2 teams to generate schedule')
  }

  // Delete any existing matchups for this league
  await prisma.matchup.deleteMany({
    where: { leagueId }
  })

  const matchups = []
  const totalWeeks = league.totalWeeks

  // For round-robin, we need n-1 weeks for n teams (or n weeks if odd)
  const roundRobinWeeks = teamCount % 2 === 0 ? teamCount - 1 : teamCount

  // If totalWeeks is greater than one round-robin cycle, we'll repeat the cycle
  const cyclesNeeded = Math.ceil(totalWeeks / roundRobinWeeks)

  // Create a copy of teams array
  const originalTeams = [...teams]
  let teamList = [...originalTeams]

  // If odd number of teams, add a null placeholder for bye
  if (teamCount % 2 !== 0) {
    teamList.push(null as any)
  }

  const n = teamList.length

  // Round-robin algorithm - repeat for multiple cycles if needed
  let currentWeek = 1

  for (let cycle = 0; cycle < cyclesNeeded && currentWeek <= totalWeeks; cycle++) {
    // Reset team list for each cycle
    teamList = [...originalTeams]
    if (teamCount % 2 !== 0) {
      teamList.push(null as any)
    }

    // Generate one full round-robin cycle
    for (let roundWeek = 1; roundWeek <= roundRobinWeeks && currentWeek <= totalWeeks; roundWeek++) {
      const { weekStart } = getWeekDateRange(league.seasonStart, currentWeek)

      // Create matchups for this week
      for (let i = 0; i < n / 2; i++) {
        const team1 = teamList[i]
        const team2 = teamList[n - 1 - i]

        // Skip if either team is null (bye week)
        if (!team1 || !team2) {
          // If team1 is not null, they have a bye
          if (team1) {
            matchups.push(
              await prisma.matchup.create({
                data: {
                  leagueId,
                  week: currentWeek,
                  weekStart,
                  team1Id: team1.id,
                  team2Id: null // Bye week
                }
              })
            )
          }
          continue
        }

        // Create matchup
        matchups.push(
          await prisma.matchup.create({
            data: {
              leagueId,
              week: currentWeek,
              weekStart,
              team1Id: team1.id,
              team2Id: team2.id
            }
          })
        )
      }

      // Rotate teams for next week (keep first team fixed, rotate others)
      const fixed = teamList[0]
      const rotated = teamList.slice(1)
      rotated.unshift(rotated.pop()!)
      teamList = [fixed, ...rotated]

      currentWeek++
    }
  }

  return matchups
}

/**
 * Calculate and update scores for a specific matchup
 * @param matchupId The matchup ID
 * @returns Updated matchup with scores
 */
export async function calculateMatchupScores(matchupId: string) {
  const matchup = await prisma.matchup.findUnique({
    where: { id: matchupId },
    include: {
      team1: true,
      team2: true
    }
  })

  if (!matchup) {
    throw new Error('Matchup not found')
  }

  // Get week end date
  const weekEnd = new Date(matchup.weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  // Calculate scores for both teams
  const team1Score = await getTeamWeeklyScore(matchup.team1Id, matchup.weekStart, weekEnd)
  const team2Score = matchup.team2Id
    ? await getTeamWeeklyScore(matchup.team2Id, matchup.weekStart, weekEnd)
    : 0

  // Determine winner
  let winnerId: string | null = null
  if (matchup.team2Id) {
    if (team1Score > team2Score) {
      winnerId = matchup.team1Id
    } else if (team2Score > team1Score) {
      winnerId = matchup.team2Id
    }
    // If scores are equal, winnerId stays null (tie)
  } else {
    // Bye week - team1 automatically wins
    winnerId = matchup.team1Id
  }

  // Update matchup with scores and winner
  const updatedMatchup = await prisma.matchup.update({
    where: { id: matchupId },
    data: {
      team1Score,
      team2Score: matchup.team2Id ? team2Score : null,
      winnerId
    }
  })

  return updatedMatchup
}

/**
 * Calculate scores for all matchups in a specific week
 * @param leagueId The league ID
 * @param week The week number
 * @returns Array of updated matchups
 */
export async function calculateWeekMatchups(leagueId: string, week: number) {
  const matchups = await prisma.matchup.findMany({
    where: {
      leagueId,
      week
    }
  })

  const updatedMatchups = []

  for (const matchup of matchups) {
    const updated = await calculateMatchupScores(matchup.id)
    updatedMatchups.push(updated)
  }

  return updatedMatchups
}

/**
 * Update team records based on matchup results
 * Recalculates wins, losses, and ties for all teams in a league
 * @param leagueId The league ID
 */
export async function updateTeamRecords(leagueId: string) {
  const teams = await prisma.team.findMany({
    where: { leagueId }
  })

  for (const team of teams) {
    // Get all matchups for this team
    const matchups = await prisma.matchup.findMany({
      where: {
        leagueId,
        OR: [{ team1Id: team.id }, { team2Id: team.id }],
        NOT: { winnerId: null } // Only count completed matchups
      }
    })

    let wins = 0
    let losses = 0
    let ties = 0

    for (const matchup of matchups) {
      if (!matchup.winnerId) {
        // Tie
        ties++
      } else if (matchup.winnerId === team.id) {
        // Win
        wins++
      } else {
        // Loss
        losses++
      }
    }

    // Update team record
    await prisma.team.update({
      where: { id: team.id },
      data: { wins, losses, ties }
    })
  }
}

/**
 * Calculate all matchup scores for completed weeks and update team records
 * @param leagueId The league ID
 * @param upToWeek Calculate up to this week (defaults to all weeks)
 */
export async function updateLeagueStandings(leagueId: string, upToWeek?: number) {
  const league = await prisma.league.findUnique({
    where: { id: leagueId }
  })

  if (!league) {
    throw new Error('League not found')
  }

  const maxWeek = upToWeek || league.totalWeeks

  // Calculate scores for each week
  for (let week = 1; week <= maxWeek; week++) {
    await calculateWeekMatchups(leagueId, week)
  }

  // Update all team records
  await updateTeamRecords(leagueId)
}
