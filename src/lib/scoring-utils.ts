import { prisma } from '@/auth'

/**
 * Get the Monday (start) of the week for a given date
 */
export function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Get the Sunday (end) of the week for a given date
 */
export function getWeekEnd(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() + (day === 0 ? 0 : 7 - day)
  d.setDate(diff)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/**
 * Add weeks to a date
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7)
}

/**
 * Get the current week number based on season start
 * @param seasonStart The start date of the season
 * @param currentDate The date to check (defaults to now)
 * @returns Week number (1-based) or 0 if before season starts
 */
export function getCurrentWeek(seasonStart: Date, currentDate: Date = new Date()): number {
  const start = getWeekStart(seasonStart)
  const current = getWeekStart(currentDate)

  if (current < start) {
    return 0 // Season hasn't started yet
  }

  const diffTime = current.getTime() - start.getTime()
  const diffWeeks = Math.floor(diffTime / (7 * 24 * 60 * 60 * 1000))

  return diffWeeks + 1 // 1-based week number
}

/**
 * Get the date range for a specific week
 * @param seasonStart The start date of the season
 * @param weekNumber The week number (1-based)
 * @returns Object with weekStart and weekEnd dates
 */
export function getWeekDateRange(seasonStart: Date, weekNumber: number): { weekStart: Date; weekEnd: Date } {
  const start = getWeekStart(seasonStart)
  const weekStart = addWeeks(start, weekNumber - 1)
  const weekEnd = getWeekEnd(weekStart)

  return { weekStart, weekEnd }
}

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

/**
 * Calculate the average score for a legislator based on their score history
 * @param scores Array of score objects
 * @returns Average points per week
 */
export function calculateAverageScore(scores: Array<{ points: number; date: Date }>): number {
  if (!scores || scores.length === 0) return 0

  const totalPoints = scores.reduce((sum, score) => sum + score.points, 0)

  // Group scores by week to get average per week
  const scoresByWeek = new Map<string, number>()

  scores.forEach(score => {
    const weekKey = getWeekStart(score.date).toISOString()
    const currentWeekTotal = scoresByWeek.get(weekKey) || 0
    scoresByWeek.set(weekKey, currentWeekTotal + score.points)
  })

  const weekCount = scoresByWeek.size

  if (weekCount === 0) return 0

  return totalPoints / weekCount
}

/**
 * Interface for category score breakdown
 */
export interface CategoryScores {
  PROPOSE_BILL: number
  COSIGN_BILL: number
  FLOOR_SPEECH: number
  ROLLCALL_VOTE: number
  MAVERICK_BONUS: number
  total: number
}

/**
 * Get scores broken down by category for a specific time range
 * @param scores Array of score objects with category field
 * @param weekStart Start of week (optional, if provided filters to specific week)
 * @param weekEnd End of week (optional, if provided filters to specific week)
 * @returns Breakdown of scores by category
 */
export function getScoresByCategory(
  scores: Array<{ points: number; date: Date; category: string }>,
  weekStart?: Date,
  weekEnd?: Date
): CategoryScores {
  let filteredScores = scores

  // Filter to specific week if provided
  if (weekStart && weekEnd) {
    filteredScores = scores.filter(score => {
      const scoreDate = new Date(score.date)
      return scoreDate >= weekStart && scoreDate <= weekEnd
    })
  }

  // Calculate totals by category
  const result: CategoryScores = {
    PROPOSE_BILL: 0,
    COSIGN_BILL: 0,
    FLOOR_SPEECH: 0,
    ROLLCALL_VOTE: 0,
    MAVERICK_BONUS: 0,
    total: 0
  }

  filteredScores.forEach(score => {
    if (score.category === 'PROPOSE_BILL') {
      result.PROPOSE_BILL += score.points
    } else if (score.category === 'COSIGN_BILL') {
      result.COSIGN_BILL += score.points
    } else if (score.category === 'FLOOR_SPEECH') {
      result.FLOOR_SPEECH += score.points
    } else if (score.category === 'ROLLCALL_VOTE') {
      result.ROLLCALL_VOTE += score.points
    } else if (score.category === 'MAVERICK_BONUS') {
      result.MAVERICK_BONUS += score.points
    }
    result.total += score.points
  })

  return result
}

/**
 * Get last week's scores broken down by category
 * @param scores Array of all score objects for a legislator
 * @param seasonStart Start date of the season
 * @returns Category breakdown for last week
 */
export function getLastWeekScoresByCategory(
  scores: Array<{ points: number; date: Date; category: string }>,
  seasonStart: Date
): CategoryScores {
  const currentWeek = getCurrentWeek(seasonStart)

  if (currentWeek <= 0) {
    return {
      PROPOSE_BILL: 0,
      COSIGN_BILL: 0,
      FLOOR_SPEECH: 0,
      ROLLCALL_VOTE: 0,
      MAVERICK_BONUS: 0,
      total: 0
    }
  }

  const lastWeek = currentWeek - 1
  const { weekStart, weekEnd } = getWeekDateRange(seasonStart, lastWeek)

  return getScoresByCategory(scores, weekStart, weekEnd)
}

/**
 * Calculate average scores by category across all weeks
 * @param scores Array of all score objects
 * @returns Average scores per week by category
 */
export function getAverageScoresByCategory(
  scores: Array<{ points: number; date: Date; category: string }>
): CategoryScores {
  if (!scores || scores.length === 0) {
    return {
      PROPOSE_BILL: 0,
      COSIGN_BILL: 0,
      FLOOR_SPEECH: 0,
      ROLLCALL_VOTE: 0,
      MAVERICK_BONUS: 0,
      total: 0
    }
  }

  // Group scores by week
  const scoresByWeek = new Map<string, Array<{ points: number; category: string }>>()

  scores.forEach(score => {
    const weekKey = getWeekStart(score.date).toISOString()
    if (!scoresByWeek.has(weekKey)) {
      scoresByWeek.set(weekKey, [])
    }
    scoresByWeek.get(weekKey)!.push({ points: score.points, category: score.category })
  })

  const weekCount = scoresByWeek.size
  if (weekCount === 0) {
    return {
      PROPOSE_BILL: 0,
      COSIGN_BILL: 0,
      FLOOR_SPEECH: 0,
      ROLLCALL_VOTE: 0,
      MAVERICK_BONUS: 0,
      total: 0
    }
  }

  // Calculate totals across all weeks
  const totals: CategoryScores = {
    PROPOSE_BILL: 0,
    COSIGN_BILL: 0,
    FLOOR_SPEECH: 0,
    ROLLCALL_VOTE: 0,
    MAVERICK_BONUS: 0,
    total: 0
  }

  scoresByWeek.forEach(weekScores => {
    weekScores.forEach(score => {
      if (score.category === 'PROPOSE_BILL') {
        totals.PROPOSE_BILL += score.points
      } else if (score.category === 'COSIGN_BILL') {
        totals.COSIGN_BILL += score.points
      } else if (score.category === 'FLOOR_SPEECH') {
        totals.FLOOR_SPEECH += score.points
      } else if (score.category === 'ROLLCALL_VOTE') {
        totals.ROLLCALL_VOTE += score.points
      } else if (score.category === 'MAVERICK_BONUS') {
        totals.MAVERICK_BONUS += score.points
      }
      totals.total += score.points
    })
  })

  // Return averages
  return {
    PROPOSE_BILL: totals.PROPOSE_BILL / weekCount,
    COSIGN_BILL: totals.COSIGN_BILL / weekCount,
    FLOOR_SPEECH: totals.FLOOR_SPEECH / weekCount,
    ROLLCALL_VOTE: totals.ROLLCALL_VOTE / weekCount,
    MAVERICK_BONUS: totals.MAVERICK_BONUS / weekCount,
    total: totals.total / weekCount
  }
}
