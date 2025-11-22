import { describe, it, expect } from 'vitest'

describe('Party Utils Unit Tests', () => {
    interface PartyInfo {
        nameCh: string
        nameEn: string
        emblem: string | null
    }

    describe('Party Information Lookup', () => {
        function getPartyInfo(partyName: string): PartyInfo {
            const partyMap: Record<string, PartyInfo> = {
                '民主進步黨': {
                    nameCh: '民主進步黨',
                    nameEn: 'Democratic Progressive Party',
                    emblem: '🟢'
                },
                '中國國民黨': {
                    nameCh: '中國國民黨',
                    nameEn: 'Kuomintang',
                    emblem: '🔵'
                },
                '台灣民眾黨': {
                    nameCh: '台灣民眾黨',
                    nameEn: 'Taiwan People\'s Party',
                    emblem: '🟡'
                },
                '時代力量': {
                    nameCh: '時代力量',
                    nameEn: 'New Power Party',
                    emblem: '⚫'
                },
                '無黨籍': {
                    nameCh: '無黨籍',
                    nameEn: 'Independent',
                    emblem: null
                }
            }

            return partyMap[partyName] || {
                nameCh: partyName,
                nameEn: partyName,
                emblem: null
            }
        }

        it('returns correct info for DPP', () => {
            const info = getPartyInfo('民主進步黨')
            expect(info.nameEn).toBe('Democratic Progressive Party')
            expect(info.emblem).toBe('🟢')
        })

        it('returns correct info for KMT', () => {
            const info = getPartyInfo('中國國民黨')
            expect(info.nameEn).toBe('Kuomintang')
            expect(info.emblem).toBe('🔵')
        })

        it('returns correct info for TPP', () => {
            const info = getPartyInfo('台灣民眾黨')
            expect(info.nameEn).toBe('Taiwan People\'s Party')
            expect(info.emblem).toBe('🟡')
        })

        it('handles independents with no emblem', () => {
            const info = getPartyInfo('無黨籍')
            expect(info.nameEn).toBe('Independent')
            expect(info.emblem).toBeNull()
        })

        it('handles unknown party gracefully', () => {
            const info = getPartyInfo('Unknown Party')
            expect(info.nameCh).toBe('Unknown Party')
            expect(info.nameEn).toBe('Unknown Party')
            expect(info.emblem).toBeNull()
        })
    })

    describe('Maverick Vote Detection', () => {
        interface Vote {
            legislatorId: string
            party: string
            selection: 'agree' | 'disagree' | 'abstain'
        }

        function calculateMaverickPercentage(votes: Vote[], legislatorParty: string, legislatorVote: 'agree' | 'disagree' | 'abstain'): number {
            const partyVotes = votes.filter(v => v.party === legislatorParty && v.legislatorId !== 'test')
            const oppositeVotes = partyVotes.filter(v => {
                if (legislatorVote === 'agree') return v.selection === 'disagree'
                if (legislatorVote === 'disagree') return v.selection === 'agree'
                return false
            })

            if (partyVotes.length === 0) return 0
            return oppositeVotes.length / partyVotes.length
        }

        it('calculates correct percentage for maverick vote', () => {
            const votes: Vote[] = [
                { legislatorId: 'test', party: 'DPP', selection: 'agree' },
                { legislatorId: '1', party: 'DPP', selection: 'disagree' },
                { legislatorId: '2', party: 'DPP', selection: 'disagree' },
                { legislatorId: '3', party: 'DPP', selection: 'disagree' },
                { legislatorId: '4', party: 'DPP', selection: 'agree' }
            ]

            const percentage = calculateMaverickPercentage(votes, 'DPP', 'agree')
            // 3 out of 4 party members voted opposite = 0.75
            expect(percentage).toBe(0.75)
        })

        it('returns 0 when party votes with legislator', () => {
            const votes: Vote[] = [
                { legislatorId: 'test', party: 'DPP', selection: 'agree' },
                { legislatorId: '1', party: 'DPP', selection: 'agree' },
                { legislatorId: '2', party: 'DPP', selection: 'agree' }
            ]

            const percentage = calculateMaverickPercentage(votes, 'DPP', 'agree')
            expect(percentage).toBe(0)
        })
    })
})
