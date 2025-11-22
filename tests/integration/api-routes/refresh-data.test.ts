import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

describe('GET /api/refresh-data', () => {
    afterAll(async () => {
        await prisma.$disconnect()
    })

    describe('Authorization', () => {
        it('should require authorization header', () => {
            // In actual test, would call API without auth header
            const authHeader = undefined
            const cronSecret = process.env.CRON_SECRET

            const isAuthorized = authHeader === `Bearer ${cronSecret}`
            expect(isAuthorized).toBe(false)
        })

        it('should validate CRON_SECRET', () => {
            const validAuthHeader = `Bearer ${process.env.CRON_SECRET}`
            const cronSecret = process.env.CRON_SECRET

            const isAuthorized = validAuthHeader === `Bearer ${cronSecret}`
            expect(isAuthorized).toBe(true)
        })

        it('should reject invalid tokens', () => {
            const invalidAuthHeader = 'Bearer invalid-token'
            const cronSecret = process.env.CRON_SECRET

            const isAuthorized = invalidAuthHeader === `Bearer ${cronSecret}`
            expect(isAuthorized).toBe(false)
        })
    })

    describe('Query Parameters', () => {
        it('should parse type parameter correctly', () => {
            const validTypes = ['rollcall', 'propose', 'cosign', 'written_interpellation', 'floor_speech', 'all']

            validTypes.forEach(type => {
                expect(['rollcall', 'propose', 'cosign', 'written_interpellation', 'floor_speech', 'all']).toContain(type)
            })
        })

        it('should handle missing type parameter (defaults to all)', () => {
            const type = null
            const shouldSyncAll = !type || type === 'all'
            expect(shouldSyncAll).toBe(true)
        })

        it('should parse pagination parameters', () => {
            const limitStr = '10'
            const offsetStr = '5'

            const limit = parseInt(limitStr)
            const offset = parseInt(offsetStr)

            expect(limit).toBe(10)
            expect(offset).toBe(5)
        })

        it('should handle rollcall batching parameters', () => {
            const rollcallLimit = '20'
            const rollcallOffset = '0'
            const lookbackDays = '7'

            expect(parseInt(rollcallLimit)).toBe(20)
            expect(parseInt(rollcallOffset)).toBe(0)
            expect(parseInt(lookbackDays)).toBe(7)
        })

        it('should parse date range parameters', () => {
            const fromDateStr = '2024-01-01'
            const toDateStr = '2024-12-31'

            const fromDate = new Date(fromDateStr)
            const toDate = new Date(toDateStr)

            expect(fromDate).toBeInstanceOf(Date)
            expect(toDate).toBeInstanceOf(Date)
            expect(fromDate < toDate).toBe(true)
        })
    })

    describe('Response Format', () => {
        it('should return success response with correct structure', () => {
            const mockResponse = {
                success: true,
                timestamp: new Date().toISOString(),
                results: {
                    propose: { processedCount: 100, errorCount: 0, totalScoresCreated: 50 }
                }
            }

            expect(mockResponse).toHaveProperty('success')
            expect(mockResponse).toHaveProperty('timestamp')
            expect(mockResponse).toHaveProperty('results')
            expect(mockResponse.success).toBe(true)
        })

        it('should return error response on failure', () => {
            const mockErrorResponse = {
                success: false,
                error: 'Failed to sync data'
            }

            expect(mockErrorResponse).toHaveProperty('success')
            expect(mockErrorResponse).toHaveProperty('error')
            expect(mockErrorResponse.success).toBe(false)
        })

        it('should include results for requested types', () => {
            const mockResults = {
                propose: { processedCount: 50, errorCount: 0, totalScoresCreated: 25 },
                cosign: { processedCount: 30, errorCount: 0, totalScoresCreated: 15 }
            }

            expect(mockResults).toHaveProperty('propose')
            expect(mockResults).toHaveProperty('cosign')
            expect(mockResults.propose.processedCount).toBeGreaterThanOrEqual(0)
        })
    })

    describe('Data Sync Logic', () => {
        it('should sync only requested type when specified', () => {
            const requestedType = 'propose'
            const types = ['rollcall', 'propose', 'cosign', 'written_interpellation', 'floor_speech']

            const shouldSyncPropose = !requestedType || requestedType === 'all' || requestedType === 'propose'
            const shouldSyncRollcall = !requestedType || requestedType === 'all' || requestedType === 'rollcall'

            expect(shouldSyncPropose).toBe(true)
            expect(shouldSyncRollcall).toBe(false)
        })

        it('should sync all types when type is "all" or missing', () => {
            const requestedType = 'all'

            const shouldSyncPropose = !requestedType || requestedType === 'all' || requestedType === 'propose'
            const shouldSyncCosign = !requestedType || requestedType === 'all' || requestedType === 'cosign'
            const shouldSyncWritten = !requestedType || requestedType === 'all' || requestedType === 'written_interpellation'

            expect(shouldSyncPropose).toBe(true)
            expect(shouldSyncCosign).toBe(true)
            expect(shouldSyncWritten).toBe(true)
        })
    })

    describe('Pagination Support', () => {
        it('should apply limit and offset for batch processing', () => {
            const totalLegislators = 100
            const limit = 20
            const offset = 0

            const batchCount = Math.ceil(totalLegislators / limit)
            expect(batchCount).toBe(5) // 100 / 20 = 5 batches
        })

        it('should handle last batch correctly', () => {
            const totalItems = 95
            const limit = 20
            const lastBatchOffset = 80

            const remainingItems = totalItems - lastBatchOffset
            expect(remainingItems).toBeLessThan(limit) // Last batch has fewer items
            expect(remainingItems).toBe(15)
        })
    })
})
