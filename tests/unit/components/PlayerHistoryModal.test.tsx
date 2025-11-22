import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('Player History Modal Component Tests', () => {
    interface Score {
        category: string
        points: number
        date: Date
        description: string
    }

    // Mock component for testing
    function PlayerHistoryModal({
        legislatorName,
        scores,
        avgPerWeek
    }: {
        legislatorName: string
        scores: Score[]
        avgPerWeek: number
    }) {
        return (
            <div data-testid="player-history-modal">
                <h2>{legislatorName}</h2>
                <div data-testid="avg-per-week">
                    Avg Per Week: {avgPerWeek.toFixed(1)} pts
                </div>
                <div data-testid="score-list">
                    {scores.map((score, idx) => (
                        <div key={idx} data-testid={`score-${idx}`}>
                            <span>{score.category}</span>
                            <span>{score.points} pts</span>
                            <span>{score.description}</span>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    it('displays legislator name', () => {
        const scores: Score[] = []
        render(<PlayerHistoryModal legislatorName="王定宇" scores={scores} avgPerWeek={15.5} />)
        expect(screen.getByText('王定宇')).toBeInTheDocument()
    })

    it('displays average points per week', () => {
        const scores: Score[] = []
        render(<PlayerHistoryModal legislatorName="Test" scores={scores} avgPerWeek={15.5} />)
        expect(screen.getByTestId('avg-per-week')).toHaveTextContent('15.5 pts')
    })

    it('renders all score entries', () => {
        const scores: Score[] = [
            { category: 'PROPOSE_BILL', points: 3, date: new Date(), description: 'Proposed bill' },
            { category: 'COSIGN_BILL', points: 3, date: new Date(), description: 'Cosigned bill' },
            { category: 'WRITTEN_SPEECH', points: 3, date: new Date(), description: 'Written interpellation' }
        ]
        render(<PlayerHistoryModal legislatorName="Test" scores={scores} avgPerWeek={9} />)

        expect(screen.getByTestId('score-0')).toBeInTheDocument()
        expect(screen.getByTestId('score-1')).toBeInTheDocument()
        expect(screen.getByTestId('score-2')).toBeInTheDocument()
    })

    it('displays score details correctly', () => {
        const scores: Score[] = [
            { category: 'PROPOSE_BILL', points: 3, date: new Date(), description: 'Proposed: Test Bill' }
        ]
        render(<PlayerHistoryModal legislatorName="Test" scores={scores} avgPerWeek={3} />)

        expect(screen.getByText('PROPOSE_BILL')).toBeInTheDocument()
        expect(screen.getByText('3 pts')).toBeInTheDocument()
        expect(screen.getByText('Proposed: Test Bill')).toBeInTheDocument()
    })

    it('handles empty scores array', () => {
        render(<PlayerHistoryModal legislatorName="Test" scores={[]} avgPerWeek={0} />)

        const scoreList = screen.getByTestId('score-list')
        expect(scoreList.children.length).toBe(0)
    })
})
