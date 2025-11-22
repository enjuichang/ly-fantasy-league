import { describe, it, expect, beforeEach, vi } from 'vitest'

// Use vi.hoisted() to ensure mocks are hoisted before imports
const { mockAuth, mockFindUnique, mockDelete, mockDeleteMany, mockFindMany, mockTransaction, mockRevalidatePath } = vi.hoisted(() => {
    return {
        mockAuth: vi.fn(),
        mockFindUnique: vi.fn(),
        mockDelete: vi.fn(),
        mockDeleteMany: vi.fn(),
        mockFindMany: vi.fn(),
        mockTransaction: vi.fn(),
        mockRevalidatePath: vi.fn(),
    }
})

vi.mock('@/auth', () => ({
    auth: mockAuth,
}))

vi.mock('@/lib/prisma', () => ({
    prisma: {
        league: {
            findUnique: mockFindUnique,
            delete: mockDelete,
        },
        matchup: {
            deleteMany: mockDeleteMany,
        },
        leagueActivity: {
            deleteMany: mockDeleteMany,
        },
        invitation: {
            deleteMany: mockDeleteMany,
        },
        draftPick: {
            deleteMany: mockDeleteMany,
        },
        team: {
            findMany: mockFindMany,
            deleteMany: mockDeleteMany,
        },
        draftPreference: {
            deleteMany: mockDeleteMany,
        },
        leagueMember: {
            deleteMany: mockDeleteMany,
        },
        $transaction: mockTransaction,
    },
}))

vi.mock('next/cache', () => ({
    revalidatePath: mockRevalidatePath,
}))

// Import AFTER mocks are set up
import { deleteLeague } from '@/app/actions'

describe('deleteLeague', () => {
    const mockLeagueId = 'test-league-id'
    const mockUserId = 'test-user-id'
    const mockCommissionerId = 'commissioner-id'

    beforeEach(() => {
        vi.clearAllMocks()
    })

    describe('authentication checks', () => {
        it('throws error when user is not authenticated', async () => {
            mockAuth.mockResolvedValue(null)

            await expect(deleteLeague(mockLeagueId)).rejects.toThrow('Not authenticated')

            expect(mockFindUnique).not.toHaveBeenCalled()
        })

        it('throws error when session has no user id', async () => {
            mockAuth.mockResolvedValue({
                user: {},
            } as any)

            await expect(deleteLeague(mockLeagueId)).rejects.toThrow('Not authenticated')

            expect(mockFindUnique).not.toHaveBeenCalled()
        })
    })

    describe('league validation', () => {
        beforeEach(() => {
            mockAuth.mockResolvedValue({
                user: { id: mockUserId },
            } as any)
        })

        it('throws error when league does not exist', async () => {
            mockFindUnique.mockResolvedValue(null)

            await expect(deleteLeague(mockLeagueId)).rejects.toThrow('League not found')

            expect(mockFindUnique).toHaveBeenCalledWith({
                where: { id: mockLeagueId },
            })
        })

        it('throws error when user is not the commissioner', async () => {
            mockFindUnique.mockResolvedValue({
                id: mockLeagueId,
                commissionerId: mockCommissionerId,
                name: 'Test League',
            } as any)

            await expect(deleteLeague(mockLeagueId)).rejects.toThrow(
                'Only the commissioner can delete the league'
            )

            expect(mockTransaction).not.toHaveBeenCalled()
        })
    })

    describe('successful deletion', () => {
        const mockTeams = [
            { id: 'team-1' },
            { id: 'team-2' },
            { id: 'team-3' },
        ]

        beforeEach(() => {
            mockAuth.mockResolvedValue({
                user: { id: mockCommissionerId },
            } as any)

            mockFindUnique.mockResolvedValue({
                id: mockLeagueId,
                commissionerId: mockCommissionerId,
                name: 'Test League',
            } as any)

            // Mock the transaction to execute the callback
            mockTransaction.mockImplementation(async (callback) => {
                const mockTx = {
                    matchup: { deleteMany: vi.fn() },
                    leagueActivity: { deleteMany: vi.fn() },
                    invitation: { deleteMany: vi.fn() },
                    draftPick: { deleteMany: vi.fn() },
                    team: {
                        findMany: vi.fn().mockResolvedValue(mockTeams),
                        deleteMany: vi.fn(),
                    },
                    draftPreference: { deleteMany: vi.fn() },
                    leagueMember: { deleteMany: vi.fn() },
                    league: { delete: vi.fn() },
                }
                return callback(mockTx as any)
            })
        })

        it('deletes all related data in correct order', async () => {
            await deleteLeague(mockLeagueId)

            expect(mockTransaction).toHaveBeenCalledTimes(1)

            // Get the transaction callback
            const transactionCallback = mockTransaction.mock.calls[0][0]

            // Execute the callback with a mock transaction
            const mockTx = {
                matchup: { deleteMany: vi.fn() },
                leagueActivity: { deleteMany: vi.fn() },
                invitation: { deleteMany: vi.fn() },
                draftPick: { deleteMany: vi.fn() },
                team: {
                    findMany: vi.fn().mockResolvedValue(mockTeams),
                    deleteMany: vi.fn(),
                },
                draftPreference: { deleteMany: vi.fn() },
                leagueMember: { deleteMany: vi.fn() },
                league: { delete: vi.fn() },
            }

            await transactionCallback(mockTx as any)

            // Verify deletion order
            expect(mockTx.matchup.deleteMany).toHaveBeenCalledWith({
                where: { leagueId: mockLeagueId },
            })

            expect(mockTx.leagueActivity.deleteMany).toHaveBeenCalledWith({
                where: { leagueId: mockLeagueId },
            })

            expect(mockTx.invitation.deleteMany).toHaveBeenCalledWith({
                where: { leagueId: mockLeagueId },
            })

            expect(mockTx.draftPick.deleteMany).toHaveBeenCalledWith({
                where: { leagueId: mockLeagueId },
            })

            expect(mockTx.team.findMany).toHaveBeenCalledWith({
                where: { leagueId: mockLeagueId },
                select: { id: true },
            })

            expect(mockTx.draftPreference.deleteMany).toHaveBeenCalledWith({
                where: { teamId: { in: ['team-1', 'team-2', 'team-3'] } },
            })

            expect(mockTx.team.deleteMany).toHaveBeenCalledWith({
                where: { leagueId: mockLeagueId },
            })

            expect(mockTx.leagueMember.deleteMany).toHaveBeenCalledWith({
                where: { leagueId: mockLeagueId },
            })

            expect(mockTx.league.delete).toHaveBeenCalledWith({
                where: { id: mockLeagueId },
            })
        })

        it('skips draft preferences deletion when there are no teams', async () => {
            // Mock with no teams
            mockTransaction.mockImplementation(async (callback) => {
                const mockTx = {
                    matchup: { deleteMany: vi.fn() },
                    leagueActivity: { deleteMany: vi.fn() },
                    invitation: { deleteMany: vi.fn() },
                    draftPick: { deleteMany: vi.fn() },
                    team: {
                        findMany: vi.fn().mockResolvedValue([]),
                        deleteMany: vi.fn(),
                    },
                    draftPreference: { deleteMany: vi.fn() },
                    leagueMember: { deleteMany: vi.fn() },
                    league: { delete: vi.fn() },
                }
                return callback(mockTx as any)
            })

            await deleteLeague(mockLeagueId)

            const transactionCallback = mockTransaction.mock.calls[0][0]
            const mockTx = {
                matchup: { deleteMany: vi.fn() },
                leagueActivity: { deleteMany: vi.fn() },
                invitation: { deleteMany: vi.fn() },
                draftPick: { deleteMany: vi.fn() },
                team: {
                    findMany: vi.fn().mockResolvedValue([]),
                    deleteMany: vi.fn(),
                },
                draftPreference: { deleteMany: vi.fn() },
                leagueMember: { deleteMany: vi.fn() },
                league: { delete: vi.fn() },
            }

            await transactionCallback(mockTx as any)

            // Draft preferences should not be deleted when there are no teams
            expect(mockTx.draftPreference.deleteMany).not.toHaveBeenCalled()
        })

        it('revalidates dashboard path after deletion', async () => {
            await deleteLeague(mockLeagueId)

            expect(mockRevalidatePath).toHaveBeenCalledWith('/dashboard')
        })
    })

    describe('error handling', () => {
        beforeEach(() => {
            mockAuth.mockResolvedValue({
                user: { id: mockCommissionerId },
            } as any)

            mockFindUnique.mockResolvedValue({
                id: mockLeagueId,
                commissionerId: mockCommissionerId,
                name: 'Test League',
            } as any)
        })

        it('propagates database errors', async () => {
            const dbError = new Error('Database connection failed')
            mockTransaction.mockRejectedValue(dbError)

            await expect(deleteLeague(mockLeagueId)).rejects.toThrow('Database connection failed')
        })

        it('does not revalidate path when deletion fails', async () => {
            mockTransaction.mockRejectedValue(new Error('Transaction failed'))

            await expect(deleteLeague(mockLeagueId)).rejects.toThrow()

            expect(mockRevalidatePath).not.toHaveBeenCalled()
        })
    })
})
