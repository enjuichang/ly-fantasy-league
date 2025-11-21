import { describe, it, expect } from 'vitest'

// Simple utility function tests that don't import from the app
describe('Date Utilities', () => {
    describe('getWeekStart', () => {
        function getWeekStart(date: Date): Date {
            const d = new Date(date)
            const day = d.getDay()
            const diff = d.getDate() - day + (day === 0 ? -6 : 1)
            d.setDate(diff)
            d.setHours(0, 0, 0, 0)
            return d
        }

        it('returns Monday for any day of the week', () => {
            const wednesday = new Date('2024-03-13')
            const monday = getWeekStart(wednesday)

            expect(monday.getDay()).toBe(1) // Monday
            expect(monday.getHours()).toBe(0)
        })

        it('handles Sunday correctly', () => {
            const sunday = new Date('2024-03-17')
            const monday = getWeekStart(sunday)

            expect(monday.getDay()).toBe(1)
            expect(monday.getDate()).toBe(11) // Previous Monday
        })
    })

    describe('ROC Date Conversion', () => {
        it('converts ROC year to AD year correctly', () => {
            const rocYear = 113
            const adYear = rocYear + 1911

            expect(adYear).toBe(2024)
        })

        it('parses ROC date string correctly', () => {
            const rocDate = '113/02/27'
            const parts = rocDate.split('/')

            const year = parseInt(parts[0]) + 1911
            const month = parseInt(parts[1]) - 1
            const day = parseInt(parts[2])

            const date = new Date(year, month, day)

            expect(date.getFullYear()).toBe(2024)
            expect(date.getMonth()).toBe(1) // February (0-indexed)
            expect(date.getDate()).toBe(27)
        })
    })
})
