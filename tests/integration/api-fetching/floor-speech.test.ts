import { describe, it, expect } from 'vitest'

describe('Floor Speech API Integration', () => {
    it.skip('fetches data successfully from ly.gov.tw API', async () => {
        // This test requires network access
        // Run with: npm run test:integration

        const from = '1130201' // ROC date format
        const to = '1130207'
        const url = `https://www.ly.gov.tw/WebAPI/LegislativeSpeech.aspx?from=${from}&to=${to}&mode=JSON`

        const response = await fetch(url)
        expect(response.ok).toBe(true)

        const data = await response.json()
        expect(Array.isArray(data)).toBe(true)
    })

    it('parses speechers field correctly', () => {
        const speechersString = " 0001 張廖萬堅, 0002 蘇巧慧, 0003 林岱樺"

        const parts = speechersString.split(',')
        const names = parts.map(part => {
            const match = part.trim().match(/^\d+\s+(.+)$/)
            return match ? match[1].trim() : null
        }).filter(name => name !== null)

        expect(names).toEqual(['張廖萬堅', '蘇巧慧', '林岱樺'])
        expect(names.length).toBe(3)
    })

    it('converts ROC date to AD date correctly', () => {
        // ROC year 113 = AD year 2024
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
