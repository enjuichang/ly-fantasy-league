#!/usr/bin/env tsx
/**
 * Comprehensive check of WRITTEN_SPEECH scores in the database
 * This will help diagnose why the frontend shows 0 points
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('='.repeat(80))
    console.log('Checking WRITTEN_SPEECH Scores in Database')
    console.log('='.repeat(80))
    console.log()

    // 1. Check total count of WRITTEN_SPEECH scores
    const totalScores = await prisma.score.count({
        where: {
            category: 'WRITTEN_SPEECH'
        }
    })

    console.log(`📊 Total WRITTEN_SPEECH scores in database: ${totalScores}`)
    console.log()

    // 2. Get all WRITTEN_SPEECH scores grouped by legislator
    const scoresWithLegislator = await prisma.score.groupBy({
        by: ['legislatorId'],
        where: {
            category: 'WRITTEN_SPEECH'
        },
        _count: {
            id: true
        },
        _sum: {
            points: true
        }
    })

    console.log(`📋 Legislators with WRITTEN_SPEECH scores: ${scoresWithLegislator.length}`)
    console.log()

    // 3. Get detailed info for legislators with scores
    console.log('Detailed breakdown:')
    console.log('-'.repeat(80))

    for (const scoreData of scoresWithLegislator) {
        const legislator = await prisma.legislator.findUnique({
            where: { id: scoreData.legislatorId }
        })

        if (legislator) {
            console.log(`${legislator.nameCh}:`)
            console.log(`  - Count: ${scoreData._count.id}`)
            console.log(`  - Total Points: ${scoreData._sum.points || 0}`)
        }
    }
    console.log()

    // 4. Show sample scores
    console.log('Sample WRITTEN_SPEECH scores:')
    console.log('-'.repeat(80))

    const sampleScores = await prisma.score.findMany({
        where: {
            category: 'WRITTEN_SPEECH'
        },
        include: {
            legislator: {
                select: {
                    nameCh: true
                }
            }
        },
        orderBy: {
            date: 'desc'
        },
        take: 10
    })

    for (const score of sampleScores) {
        console.log(`${score.legislator.nameCh} - ${score.date.toISOString().split('T')[0]}:`)
        console.log(`  Points: ${score.points}`)
        console.log(`  Description: ${score.description.substring(0, 80)}...`)
        console.log()
    }

    // 5. Check if there are any recent scores
    const oneMonthAgo = new Date()
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

    const recentScores = await prisma.score.count({
        where: {
            category: 'WRITTEN_SPEECH',
            date: {
                gte: oneMonthAgo
            }
        }
    })

    console.log(`Recent scores (last 30 days): ${recentScores}`)
    console.log()

    // 6. Check the most active week for scoring
    const allScores = await prisma.score.findMany({
        where: {
            category: 'WRITTEN_SPEECH'
        },
        select: {
            date: true,
            points: true,
            legislatorId: true
        }
    })

    // Calculate weekly totals
    const weeklyTotals = new Map<string, { count: number, points: number, legislators: Set<string> }>()

    for (const score of allScores) {
        const weekKey = getWeekKey(score.date)

        if (!weeklyTotals.has(weekKey)) {
            weeklyTotals.set(weekKey, { count: 0, points: 0, legislators: new Set() })
        }

        const weekData = weeklyTotals.get(weekKey)!
        weekData.count++
        weekData.points += score.points
        weekData.legislators.add(score.legislatorId)
    }

    console.log('Top 5 weeks by activity:')
    console.log('-'.repeat(80))

    const sortedWeeks = Array.from(weeklyTotals.entries())
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 5)

    for (const [week, data] of sortedWeeks) {
        console.log(`${week}:`)
        console.log(`  Scores: ${data.count}, Total Points: ${data.points}, Legislators: ${data.legislators.size}`)
    }
    console.log()

    // 7. Test a specific query that the FE might use
    console.log('Testing legislator total scores (simulating FE query):')
    console.log('-'.repeat(80))

    const legislatorsWithScores = await prisma.legislator.findMany({
        include: {
            scores: {
                where: {
                    category: 'WRITTEN_SPEECH'
                }
            }
        },
        take: 5
    })

    for (const leg of legislatorsWithScores) {
        const totalPoints = leg.scores.reduce((sum, score) => sum + score.points, 0)
        if (totalPoints > 0) {
            console.log(`${leg.nameCh}: ${totalPoints} points (${leg.scores.length} scores)`)
        }
    }
    console.log()

    console.log('='.repeat(80))
    console.log('✅ Database check complete!')
    console.log('='.repeat(80))
}

function getWeekKey(date: Date): string {
    const year = date.getFullYear()
    const oneJan = new Date(year, 0, 1)
    const numberOfDays = Math.floor((date.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000))
    const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7)
    return `${year}-W${String(weekNumber).padStart(2, '0')}`
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
