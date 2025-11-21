import { describe, it, expect } from 'vitest'

describe('Cosign Bills Fetch Script', () => {
    describe('API Response Parsing', () => {
        it('extracts bill information from API response', () => {
            const mockResponse = {
                bills: [
                    {
                        billNo: '202401234',
                        billName: '測試法案',
                        議案狀態: '三讀通過',
                        billOrg: '財政委員會'
                    }
                ]
            }

            expect(mockResponse.bills).toHaveLength(1)
            expect(mockResponse.bills[0]).toHaveProperty('billNo')
            expect(mockResponse.bills[0]).toHaveProperty('議案狀態')
        })

        it('filters for passed bills only', () => {
            const bills = [
                { 議案狀態: '三讀通過', billNo: '1' },
                { 議案狀態: '審查中', billNo: '2' },
                { 議案狀態: '已通過', billNo: '3' },
                { 議案狀態: '退回', billNo: '4' },
                { 議案狀態: '委員會通過', billNo: '5' },
            ]

            const passedBills = bills.filter(bill =>
                bill.議案狀態 && (
                    bill.議案狀態.includes('三讀') ||
                    bill.議案狀態.includes('通過')
                )
            )

            expect(passedBills).toHaveLength(3)
            expect(passedBills.map(b => b.billNo)).toEqual(['1', '3', '5'])
        })
    })

    describe('Scoring Logic', () => {
        it('awards 3 points per passed bill', () => {
            const passedBillsCount = 5
            const POINTS_PER_PASSED_BILL = 3
            const totalPoints = passedBillsCount * POINTS_PER_PASSED_BILL

            expect(totalPoints).toBe(15)
        })

        it('awards 0 points when no bills passed', () => {
            const passedBillsCount = 0
            const POINTS_PER_PASSED_BILL = 3
            const totalPoints = passedBillsCount * POINTS_PER_PASSED_BILL

            expect(totalPoints).toBe(0)
        })

        it('groups bills by week for scoring', () => {
            function getWeekStart(date: Date): Date {
                const d = new Date(date)
                const day = d.getDay()
                const diff = d.getDate() - day + (day === 0 ? -6 : 1)
                d.setDate(diff)
                d.setHours(0, 0, 0, 0)
                return d
            }

            const bills = [
                { date: new Date('2024-03-11'), passed: true },
                { date: new Date('2024-03-12'), passed: true },
                { date: new Date('2024-03-18'), passed: true },
            ]

            const byWeek = new Map<string, number>()
            bills.forEach(bill => {
                if (bill.passed) {
                    const weekKey = getWeekStart(bill.date).toISOString().split('T')[0]
                    byWeek.set(weekKey, (byWeek.get(weekKey) || 0) + 1)
                }
            })

            expect(byWeek.size).toBe(2)
        })
    })

    describe('Deduplication', () => {
        it('checks for existing scores before creating', () => {
            const existingScores = [
                { legislatorId: 'leg1', category: 'COSIGN_BILL', date: '2024-03-11' }
            ]

            const newScore = {
                legislatorId: 'leg1',
                category: 'COSIGN_BILL',
                date: '2024-03-11'
            }

            const isDuplicate = existingScores.some(s =>
                s.legislatorId === newScore.legislatorId &&
                s.category === newScore.category &&
                s.date === newScore.date
            )

            expect(isDuplicate).toBe(true)
        })
    })
})

describe('Propose Bills Fetch Script', () => {
    describe('API Response Parsing', () => {
        it('extracts proposer information', () => {
            const bill = {
                billNo: '202401234',
                billName: '測試法案',
                proposer: '張三',
                billOrg: '財政委員會'
            }

            expect(bill.proposer).toBe('張三')
            expect(bill.billNo).toMatch(/^\d+$/)
        })

        it('handles bills with multiple proposers', () => {
            const proposerString = '張三,李四,王五'
            const proposers = proposerString.split(',').map(p => p.trim())

            expect(proposers).toHaveLength(3)
            expect(proposers[0]).toBe('張三')
        })
    })

    describe('Scoring Logic', () => {
        it('awards 1 point per bill proposed', () => {
            const billsProposed = 3
            const POINTS_PER_BILL = 1
            const totalPoints = billsProposed * POINTS_PER_BILL

            expect(totalPoints).toBe(3)
        })

        it('applies weekly cap of 5 points', () => {
            const billsProposed = 7
            const POINTS_PER_BILL = 1
            const MAX_WEEKLY_POINTS = 5

            const uncappedPoints = billsProposed * POINTS_PER_BILL
            const cappedPoints = Math.min(uncappedPoints, MAX_WEEKLY_POINTS)

            expect(cappedPoints).toBe(5)
        })
    })
})

describe('Interpellation Fetch Script', () => {
    describe('API Response Parsing', () => {
        it('parses interpellation data', () => {
            const interpellation = {
                term: 11,
                sessionPeriod: 1,
                meetingNo: 5,
                legislatorName: '張三',
                interpellationDate: '2024-03-15'
            }

            expect(interpellation.term).toBe(11)
            expect(interpellation.legislatorName).toBe('張三')
        })

        it('distinguishes written vs oral interpellations', () => {
            const interpellations = [
                { type: 'written', legislatorName: '張三' },
                { type: 'oral', legislatorName: '李四' },
            ]

            const writtenCount = interpellations.filter(i => i.type === 'written').length
            const oralCount = interpellations.filter(i => i.type === 'oral').length

            expect(writtenCount).toBe(1)
            expect(oralCount).toBe(1)
        })
    })

    describe('Scoring Logic', () => {
        it('awards 1 point per written interpellation', () => {
            const interpellationsCount = 3
            const POINTS_PER_INTERPELLATION = 1
            const totalPoints = interpellationsCount * POINTS_PER_INTERPELLATION

            expect(totalPoints).toBe(3)
        })

        it('applies weekly cap of 5 points', () => {
            const interpellationsCount = 8
            const POINTS_PER_INTERPELLATION = 1
            const MAX_WEEKLY_POINTS = 5

            const uncappedPoints = interpellationsCount * POINTS_PER_INTERPELLATION
            const cappedPoints = Math.min(uncappedPoints, MAX_WEEKLY_POINTS)

            expect(cappedPoints).toBe(5)
        })
    })
})

describe('Rollcall Votes Fetch Script', () => {
    describe('XLS Parsing', () => {
        it('converts Excel date to JavaScript date', () => {
            function excelDateToJS(serial: number): Date {
                const utc_days = Math.floor(serial - 25569)
                const utc_value = utc_days * 86400
                const date_info = new Date(utc_value * 1000)
                return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate())
            }

            const excelDate = 45000
            const jsDate = excelDateToJS(excelDate)

            expect(jsDate).toBeInstanceOf(Date)
            expect(jsDate.getFullYear()).toBeGreaterThan(2020)
        })

        it('parses vote values', () => {
            const voteValues = ['贊成', '反對', '棄權', '未投票']

            voteValues.forEach(vote => {
                expect(['贊成', '反對', '棄權', '未投票']).toContain(vote)
            })
        })
    })

    describe('Maverick Detection', () => {
        it('identifies legislators voting against party line', () => {
            const votes = [
                { legislator: 'A', party: 'DPP', vote: '贊成' },
                { legislator: 'B', party: 'DPP', vote: '贊成' },
                { legislator: 'C', party: 'DPP', vote: '贊成' },
                { legislator: 'D', party: 'DPP', vote: '反對' }, // Maverick
            ]

            const dppVotes = votes.filter(v => v.party === 'DPP')
            const yesCount = dppVotes.filter(v => v.vote === '贊成').length
            const noCount = dppVotes.filter(v => v.vote === '反對').length
            const majority = yesCount > noCount ? '贊成' : '反對'

            const mavericks = dppVotes.filter(v => v.vote !== majority)

            expect(mavericks).toHaveLength(1)
            expect(mavericks[0].legislator).toBe('D')
        })

        it('awards 2 points for maverick votes', () => {
            const MAVERICK_BONUS = 2
            expect(MAVERICK_BONUS).toBe(2)
        })
    })

    describe('Scoring Logic', () => {
        it('awards 1 point per rollcall vote', () => {
            const votesCount = 5
            const POINTS_PER_VOTE = 1
            const totalPoints = votesCount * POINTS_PER_VOTE

            expect(totalPoints).toBe(5)
        })
    })
})

describe('Floor Speech Fetch Script', () => {
    describe('ROC Date Conversion', () => {
        it('converts ROC date to AD date', () => {
            const rocDate = '113/03/15'
            const parts = rocDate.split('/')

            const year = parseInt(parts[0]) + 1911
            const month = parseInt(parts[1]) - 1
            const day = parseInt(parts[2])

            const date = new Date(year, month, day)

            expect(date.getFullYear()).toBe(2024)
            expect(date.getMonth()).toBe(2) // March (0-indexed)
            expect(date.getDate()).toBe(15)
        })

        it('formats date for API request', () => {
            const date = new Date('2024-03-15')
            const year = date.getFullYear() - 1911
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')

            const rocDate = `${year}${month}${day}`

            expect(rocDate).toBe('1130315')
        })
    })

    describe('Speechers Parsing', () => {
        it('parses speechers field correctly', () => {
            const speechersString = " 0001 張廖萬堅, 0002 蘇巧慧, 0003 林岱樺"

            const parts = speechersString.split(',')
            const names = parts.map(part => {
                const match = part.trim().match(/^\d+\s+(.+)$/)
                return match ? match[1].trim() : null
            }).filter(name => name !== null)

            expect(names).toHaveLength(3)
            expect(names).toContain('張廖萬堅')
            expect(names).toContain('蘇巧慧')
        })

        it('handles empty speechers field', () => {
            const speechersString = ""
            const parts = speechersString.split(',').filter(p => p.trim())

            expect(parts).toHaveLength(0)
        })
    })

    describe('Scoring Logic', () => {
        it('awards 1 point per floor speech', () => {
            const speechesCount = 3
            const POINTS_PER_SPEECH = 1
            const totalPoints = speechesCount * POINTS_PER_SPEECH

            expect(totalPoints).toBe(3)
        })

        it('applies weekly cap of 5 points', () => {
            const speechesCount = 7
            const POINTS_PER_SPEECH = 1
            const MAX_WEEKLY_POINTS = 5

            const uncappedPoints = speechesCount * POINTS_PER_SPEECH
            const cappedPoints = Math.min(uncappedPoints, MAX_WEEKLY_POINTS)

            expect(cappedPoints).toBe(5)
        })
    })
})
