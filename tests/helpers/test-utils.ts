import { describe, it, expect } from 'vitest'

/**
 * Creates a mock legislator for testing
 */
export function createMockLegislator(overrides = {}) {
    return {
        id: 'test-id-1',
        nameCh: '測試立委',
        nameEn: 'Test Legislator',
        party: 'DPP',
        region: '台北市',
        picUrl: null,
        leaveFlag: '否',
        leaveDate: null,
        leaveReason: null,
        externalId: 'ext-1',
        sex: '男',
        areaName: '台北市第一選區',
        committee: '財政委員會',
        onboardDate: '2024-02-01',
        ...overrides
    }
}

/**
 * Creates a mock score for testing
 */
export function createMockScore(overrides = {}) {
    return {
        id: 'score-1',
        legislatorId: 'test-id-1',
        category: 'PROPOSE_BILL',
        points: 1,
        date: new Date('2024-03-15'),
        reason: 'Test score',
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    }
}

/**
 * Creates mock category scores
 */
export function createMockCategoryScores(overrides = {}) {
    return {
        PROPOSE_BILL: 0,
        COSIGN_BILL: 0,
        FLOOR_SPEECH: 0,
        WRITTEN_SPEECH: 0,
        ROLLCALL_VOTE: 0,
        MAVERICK_BONUS: 0,
        total: 0,
        ...overrides
    }
}

/**
 * Creates a date range for a specific week
 */
export function createWeekRange(year: number, month: number, day: number) {
    const date = new Date(year, month - 1, day)
    const weekStart = new Date(date)
    const weekDay = weekStart.getDay()
    const diff = weekStart.getDate() - weekDay + (weekDay === 0 ? -6 : 1)
    weekStart.setDate(diff)
    weekStart.setHours(0, 0, 0, 0)

    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    weekEnd.setHours(23, 59, 59, 999)

    return { weekStart, weekEnd }
}

describe('Test Helpers', () => {
    it('createMockLegislator creates valid legislator', () => {
        const legislator = createMockLegislator()

        expect(legislator).toHaveProperty('id')
        expect(legislator).toHaveProperty('nameCh')
        expect(legislator).toHaveProperty('party')
    })

    it('createMockLegislator accepts overrides', () => {
        const legislator = createMockLegislator({ nameCh: '自訂名稱', party: 'KMT' })

        expect(legislator.nameCh).toBe('自訂名稱')
        expect(legislator.party).toBe('KMT')
    })

    it('createMockScore creates valid score', () => {
        const score = createMockScore()

        expect(score).toHaveProperty('id')
        expect(score).toHaveProperty('legislatorId')
        expect(score).toHaveProperty('category')
        expect(score).toHaveProperty('points')
        expect(score).toHaveProperty('date')
    })

    it('createMockCategoryScores creates valid category scores', () => {
        const scores = createMockCategoryScores({ PROPOSE_BILL: 5, total: 5 })

        expect(scores.PROPOSE_BILL).toBe(5)
        expect(scores.COSIGN_BILL).toBe(0)
        expect(scores.total).toBe(5)
    })

    it('createWeekRange creates correct week boundaries', () => {
        const { weekStart, weekEnd } = createWeekRange(2024, 3, 13) // Wednesday

        expect(weekStart.getDay()).toBe(1) // Monday
        expect(weekEnd.getDay()).toBe(0) // Sunday
        expect(weekStart.getDate()).toBe(11)
        expect(weekEnd.getDate()).toBe(17)
    })
})
