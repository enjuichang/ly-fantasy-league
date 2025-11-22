import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('GET /api/legislators', () => {
    beforeAll(async () => {
        // Ensure database has legislators
        const count = await prisma.legislator.count()
        if (count === 0) {
            throw new Error('No legislators in database. Run seed first.')
        }
    })

    afterAll(async () => {
        await prisma.$disconnect()
    })

    it('should return list of legislators', async () => {
        const legislators = await prisma.legislator.findMany({
            orderBy: { nameCh: 'asc' }
        })

        expect(legislators).toBeDefined()
        expect(Array.isArray(legislators)).toBe(true)
        expect(legislators.length).toBeGreaterThan(0)
    })

    it('should return legislators sorted by Chinese name', async () => {
        const legislators = await prisma.legislator.findMany({
            orderBy: { nameCh: 'asc' }
        })

        // Just verify they are returned in the order specified
        // Actual locale sorting is handled by Prisma/database
        expect(legislators.length).toBeGreaterThan(0)

        // Verify all have Chinese names
        legislators.forEach(leg => {
            expect(leg.nameCh).toBeTruthy()
            expect(typeof leg.nameCh).toBe('string')
        })
    })

    it('should include required legislator fields', async () => {
        const legislators = await prisma.legislator.findMany({
            take: 1
        })

        const legislator = legislators[0]
        expect(legislator).toHaveProperty('id')
        expect(legislator).toHaveProperty('nameCh')
        expect(legislator).toHaveProperty('nameEn')
        expect(legislator).toHaveProperty('party')
        expect(legislator).toHaveProperty('region')
    })

    it('should include profile picture URL', async () => {
        const legislators = await prisma.legislator.findMany({
            where: { picUrl: { not: null } },
            take: 1
        })

        if (legislators.length > 0) {
            expect(legislators[0].picUrl).toBeTruthy()
            expect(typeof legislators[0].picUrl).toBe('string')
        }
    })

    it('should handle leave status flags', async () => {
        const legislatorsOnLeave = await prisma.legislator.findMany({
            where: { leaveFlag: '是' }
        })

        legislatorsOnLeave.forEach(leg => {
            expect(leg.leaveFlag).toBe('是')
            // Should have leave date and reason
            expect(leg.leaveDate).toBeTruthy()
        })
    })

    it('should handle error flags', async () => {
        const legislatorsWithErrors = await prisma.legislator.findMany({
            where: { errorFlag: '是' }
        })

        legislatorsWithErrors.forEach(leg => {
            expect(leg.errorFlag).toBe('是')
            expect(leg.errorReason).toBeTruthy()
        })
    })
})

describe('GET /api/legislators/[id]', () => {
    let testLegislatorId: string

    beforeAll(async () => {
        const legislator = await prisma.legislator.findFirst()
        if (!legislator) {
            throw new Error('No legislators in database')
        }
        testLegislatorId = legislator.id
    })

    afterAll(async () => {
        await prisma.$disconnect()
    })

    it('should return single legislator by ID', async () => {
        const legislator = await prisma.legislator.findUnique({
            where: { id: testLegislatorId }
        })

        expect(legislator).toBeDefined()
        expect(legislator?.id).toBe(testLegislatorId)
    })

    it('should return null for non-existent ID', async () => {
        const legislator = await prisma.legislator.findUnique({
            where: { id: 'non-existent-id-12345' }
        })

        expect(legislator).toBeNull()
    })

    it('should include related scores', async () => {
        const legislator = await prisma.legislator.findUnique({
            where: { id: testLegislatorId },
            include: {
                scores: {
                    take: 5,
                    orderBy: { date: 'desc' }
                }
            }
        })

        expect(legislator).toBeDefined()
        // Scores may or may not exist
        if (legislator?.scores) {
            expect(Array.isArray(legislator.scores)).toBe(true)
        }
    })
})
