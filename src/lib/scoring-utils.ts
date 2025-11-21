import { prisma } from '@/lib/prisma'
import { getWeekStart, getWeekEnd, getWeekDateRange, getCurrentWeek } from './scoring-client'

export * from './scoring-client'

/**
 * Calculate total weekly score for a team
 * @param teamId The team ID
 * @param weekStart The start date of the week (Monday)
 * @param weekEnd The end date of the week (Sunday)
 * @returns Total points scored by all legislators on the team for that week
 */
export async function getTeamWeeklyScore(
  teamId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<number> {
  // Get all legislators on the team
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      legislators: {
        include: {
          scores: {
            where: {
              date: {
                gte: weekStart,
                lte: weekEnd
              }
            }
          }
        }
      }
    }
  })

  if (!team) {
    return 0
  }

  // Parse bench IDs
  const benchIds = new Set(team.benchLegislatorIds ? team.benchLegislatorIds.split(',') : [])

  // Sum all scores from all legislators, excluding bench
  const totalScore = team.legislators.reduce((teamTotal: number, legislator: any) => {
    if (benchIds.has(legislator.id)) {
      return teamTotal
    }
    const legislatorScore = legislator.scores.reduce((sum: number, score: any) => sum + score.points, 0)
    return teamTotal + legislatorScore
  }, 0)

  return totalScore
}

/**
 * Calculate weekly scores for multiple teams
 * @param teamIds Array of team IDs
 * @param weekStart The start date of the week
 * @param weekEnd The end date of the week
 * @returns Map of teamId to their weekly score
 */
export async function getMultipleTeamWeeklyScores(
  teamIds: string[],
  weekStart: Date,
  weekEnd: Date
): Promise<Map<string, number>> {
  const scores = new Map<string, number>()

  for (const teamId of teamIds) {
    const score = await getTeamWeeklyScore(teamId, weekStart, weekEnd)
    scores.set(teamId, score)
  }

  return scores
}

/**
 * Get all weekly scores for a team across all weeks
 * @param teamId The team ID
 * @param seasonStart The start date of the season
 * @param totalWeeks Total number of weeks in the season
 * @returns Array of weekly scores
 */
export async function getTeamAllWeeklyScores(
  teamId: string,
  seasonStart: Date,
  totalWeeks: number
): Promise<Array<{ week: number; score: number; weekStart: Date; weekEnd: Date }>> {
  const weeklyScores = []

  for (let week = 1; week <= totalWeeks; week++) {
    const { weekStart, weekEnd } = getWeekDateRange(seasonStart, week)
    const score = await getTeamWeeklyScore(teamId, weekStart, weekEnd)

    weeklyScores.push({
      week,
      score,
      weekStart,
      weekEnd
    })
  }

  return weeklyScores
}

/**
 * Calculate legislator's score for a specific week
 * @param legislatorId The legislator ID
 * @param weekStart The start date of the week (Monday)
 * @param weekEnd The end date of the week (Sunday)
 * @returns Total points scored by the legislator for that week
 */
export async function getLegislatorWeeklyScore(
  legislatorId: string,
  weekStart: Date,
  weekEnd: Date
): Promise<number> {
  const scores = await prisma.score.findMany({
    where: {
      legislatorId,
      date: {
        gte: weekStart,
        lte: weekEnd
      }
    }
  })

  return scores.reduce((sum: number, score: any) => sum + score.points, 0)
}

/**
 * Calculate legislator's score for current week (up to now)
 * @param legislatorId The legislator ID
 * @param seasonStart The start date of the season
 * @returns Object with current week number and score
 */
export async function getLegislatorCurrentWeekScore(
  legislatorId: string,
  seasonStart: Date
): Promise<{ week: number; score: number }> {
  const currentWeek = getCurrentWeek(seasonStart)

  if (currentWeek === 0) {
    return { week: 0, score: 0 }
  }

  const { weekStart } = getWeekDateRange(seasonStart, currentWeek)
  const now = new Date()

  const scores = await prisma.score.findMany({
    where: {
      legislatorId,
      date: {
        gte: weekStart,
        lte: now
      }
    }
  })

  const score = scores.reduce((sum: number, score: any) => sum + score.points, 0)

  return { week: currentWeek, score }
}

/**
 * Calculate legislator's score for last week
 * @param legislatorId The legislator ID
 * @param seasonStart The start date of the season
 * @returns Object with last week number and score
 */
export async function getLegislatorLastWeekScore(
  legislatorId: string,
  seasonStart: Date
): Promise<{ week: number; score: number }> {
  const currentWeek = getCurrentWeek(seasonStart)

  if (currentWeek <= 1) {
    return { week: 0, score: 0 }
  }

  const lastWeek = currentWeek - 1
  const { weekStart, weekEnd } = getWeekDateRange(seasonStart, lastWeek)

  const score = await getLegislatorWeeklyScore(legislatorId, weekStart, weekEnd)

  return { week: lastWeek, score }
}
