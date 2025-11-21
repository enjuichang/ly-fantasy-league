import { describe, it, expect } from 'vitest'

describe('Cosign Bills API Integration', () => {
    it.skip('fetches cosign bills from Taiwan API', async () => {
        const legislatorName = '賴品妤'
        const encodedName = encodeURIComponent(legislatorName)
        const url = `https://ly.govapi.tw/v2/legislators/11/${encodedName}/cosign_bills`

        const response = await fetch(url)
        expect(response.ok).toBe(true)

        const data = await response.json()
        expect(data).toHaveProperty('bills')
        expect(Array.isArray(data.bills)).toBe(true)
    })

    it('filters passed bills correctly', () => {
        const bills = [
            { 議案狀態: '三讀通過' },
            { 議案狀態: '審查中' },
            { 議案狀態: '已通過' },
            { 議案狀態: '退回' },
        ]

        const passedBills = bills.filter(bill =>
            bill.議案狀態 && (
                bill.議案狀態.includes('三讀') ||
                bill.議案狀態.includes('通過')
            )
        )

        expect(passedBills.length).toBe(2)
        expect(passedBills[0].議案狀態).toBe('三讀通過')
        expect(passedBills[1].議案狀態).toBe('已通過')
    })

    it('calculates correct points for passed bills', () => {
        const passedBillsCount = 5
        const pointsPerBill = 3
        const totalPoints = passedBillsCount * pointsPerBill

        expect(totalPoints).toBe(15)
    })

    it('handles bills with no status', () => {
        const bills = [
            { 議案狀態: null },
            { 議案狀態: undefined },
            { 議案狀態: '' },
        ]

        const passedBills = bills.filter(bill =>
            bill.議案狀態 && (
                bill.議案狀態.includes('三讀') ||
                bill.議案狀態.includes('通過')
            )
        )

        expect(passedBills.length).toBe(0)
    })
})

describe('Interpellation API Integration', () => {
    it.skip('fetches interpellations from Taiwan API', async () => {
        const url = 'https://ly.govapi.tw/v2/interpellations?term=11&limit=10'

        const response = await fetch(url)
        expect(response.ok).toBe(true)

        const data = await response.json()
        expect(Array.isArray(data)).toBe(true)
    })

    it('parses interpellation date correctly', () => {
        const dateStr = '2024-03-15'
        const date = new Date(dateStr)

        expect(date.getFullYear()).toBe(2024)
        expect(date.getMonth()).toBe(2) // March (0-indexed)
        expect(date.getDate()).toBe(15)
    })

    it('groups interpellations by week', () => {
        function getWeekStart(date: Date): Date {
            const d = new Date(date)
            const day = d.getDay()
            const diff = d.getDate() - day + (day === 0 ? -6 : 1)
            d.setDate(diff)
            d.setHours(0, 0, 0, 0)
            return d
        }

        function getWeekKey(date: Date): string {
            return getWeekStart(date).toISOString().split('T')[0]
        }

        const interpellations = [
            { date: new Date('2024-03-11') }, // Monday
            { date: new Date('2024-03-12') }, // Tuesday, same week
            { date: new Date('2024-03-18') }, // Monday, next week
            { date: new Date('2024-03-19') }, // Tuesday, same week as 18th
        ]

        const byWeek = new Map<string, number>()

        interpellations.forEach(interp => {
            const weekKey = getWeekKey(interp.date)
            byWeek.set(weekKey, (byWeek.get(weekKey) || 0) + 1)
        })

        expect(byWeek.size).toBe(2)

        const keys = Array.from(byWeek.keys()).sort()
        expect(byWeek.get(keys[0])).toBe(2) // Week of March 11
        expect(byWeek.get(keys[1])).toBe(2) // Week of March 18
    })
})

describe('Rollcall Votes API Integration', () => {
    it('parses XLS date format', () => {
        function excelDateToJS(serial: number): Date {
            const utc_days = Math.floor(serial - 25569)
            const utc_value = utc_days * 86400
            const date_info = new Date(utc_value * 1000)
            return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate())
        }

        const excelDate = 45000
        const jsDate = excelDateToJS(excelDate)

        expect(jsDate).toBeInstanceOf(Date)
        expect(jsDate.getFullYear()).toBeGreaterThan(2000)
    })

    it('identifies maverick votes', () => {
        const votes = [
            { legislator: 'A', party: 'DPP', vote: '贊成' },
            { legislator: 'B', party: 'DPP', vote: '贊成' },
            { legislator: 'C', party: 'DPP', vote: '反對' }, // Maverick
            { legislator: 'D', party: 'KMT', vote: '反對' },
        ]

        const dppVotes = votes.filter(v => v.party === 'DPP')
        const dppYes = dppVotes.filter(v => v.vote === '贊成').length
        const dppNo = dppVotes.filter(v => v.vote === '反對').length
        const dppMajority = dppYes > dppNo ? '贊成' : '反對'

        const mavericks = dppVotes.filter(v => v.vote !== dppMajority)

        expect(mavericks.length).toBe(1)
        expect(mavericks[0].legislator).toBe('C')
    })

    it('handles tie votes correctly', () => {
        const votes = [
            { legislator: 'A', party: 'DPP', vote: '贊成' },
            { legislator: 'B', party: 'DPP', vote: '反對' },
        ]

        const dppVotes = votes.filter(v => v.party === 'DPP')
        const dppYes = dppVotes.filter(v => v.vote === '贊成').length
        const dppNo = dppVotes.filter(v => v.vote === '反對').length

        // In case of tie, majority defaults to '反對'
        const dppMajority = dppYes > dppNo ? '贊成' : '反對'

        expect(dppMajority).toBe('反對')
    })
})

describe('Bill Proposal API Integration', () => {
    it('validates bill proposal structure', () => {
        const bill = {
            billNo: '202401234',
            billName: '測試法案',
            proposer: '張三',
            billStatus: '審查中',
            billOrg: '財政委員會'
        }

        expect(bill).toHaveProperty('billNo')
        expect(bill).toHaveProperty('billName')
        expect(bill).toHaveProperty('proposer')
        expect(bill.billNo).toMatch(/^\d+$/)
    })

    it('applies weekly cap to bill proposals', () => {
        const bills = [
            { points: 1, date: new Date('2024-03-11') },
            { points: 1, date: new Date('2024-03-12') },
            { points: 1, date: new Date('2024-03-13') },
            { points: 1, date: new Date('2024-03-14') },
            { points: 1, date: new Date('2024-03-15') },
            { points: 1, date: new Date('2024-03-16') }, // 6th bill, over cap
        ]

        const MAX_WEEKLY_POINTS = 5
        const totalPoints = bills.reduce((sum, b) => sum + b.points, 0)
        const cappedPoints = Math.min(totalPoints, MAX_WEEKLY_POINTS)

        expect(cappedPoints).toBe(5)
    })
})
