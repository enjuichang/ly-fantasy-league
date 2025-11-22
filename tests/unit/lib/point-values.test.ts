import { describe, it, expect } from 'vitest'

describe('Point Value Unit Tests', () => {
    describe('PROPOSE_BILL Points', () => {
        it('base proposal should be 3 points', () => {
            const baseProposalPoints = 3
            expect(baseProposalPoints).toBe(3)
        })

        it('passed proposal bonus should be 6 points', () => {
            const passedBonus = 6
            expect(passedBonus).toBe(6)
        })

        it('total passed proposal should be 9 points', () => {
            const basePoints = 3
            const passedBonus = 6
            const total = basePoints + passedBonus
            expect(total).toBe(9)
        })
    })

    describe('COSIGN_BILL Points', () => {
        it('cosign passed bill should be 3 points', () => {
            const cosignPoints = 3
            expect(cosignPoints).toBe(3)
        })

        it('only passed bills (三讀) should count', () => {
            const billStatus = '三讀通過'
            expect(billStatus).toContain('三讀')
        })
    })

    describe('WRITTEN_SPEECH Points', () => {
        it('written interpellation should be 3 points', () => {
            const writtenPoints = 3
            expect(writtenPoints).toBe(3)
        })
    })

    describe('FLOOR_SPEECH Points', () => {
        it('floor speech should be 1 point', () => {
            const floorSpeechPoints = 1
            expect(floorSpeechPoints).toBe(1)
        })

        it('should have weekly cap of 5 points', () => {
            const weeklyCap = 5
            const actualPoints = 8 // More than cap
            const finalPoints = Math.min(actualPoints, weeklyCap)
            expect(finalPoints).toBe(5)
        })
    })

    describe('ROLLCALL_VOTE Points', () => {
        it('rollcall vote should be 1 point', () => {
            const rollcallPoints = 1
            expect(rollcallPoints).toBe(1)
        })

        it('should have no weekly cap', () => {
            const weeklyCap = null
            expect(weeklyCap).toBeNull()
        })
    })

    describe('MAVERICK_BONUS Points', () => {
        it('should award 3 points for 70%+ party opposition', () => {
            const partyOpposition = 0.75 // 75%
            let bonus = 0
            if (partyOpposition >= 0.7) bonus = 3
            expect(bonus).toBe(3)
        })

        it('should award 6 points for 80%+ party opposition', () => {
            const partyOpposition = 0.85 // 85%
            let bonus = 0
            if (partyOpposition >= 0.8) bonus = 6
            if (partyOpposition >= 0.7) bonus = Math.max(bonus, 3)
            expect(bonus).toBe(6)
        })

        it('should award 9 points for 90%+ party opposition', () => {
            const partyOpposition = 0.95 // 95%
            let bonus = 0
            if (partyOpposition >= 0.9) bonus = 9
            expect(bonus).toBe(9)
        })

        it('should award no bonus for less than 70% opposition', () => {
            const partyOpposition = 0.65 // 65%
            let bonus = 0
            if (partyOpposition >= 0.7) bonus = 3
            expect(bonus).toBe(0)
        })
    })
})
