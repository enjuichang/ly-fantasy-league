import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('Team Roster Component Tests', () => {
    interface Player {
        id: string
        nameCh: string
        onBench: boolean
        lastWeekScore: number
    }

    // Mock component for testing
    function TeamRoster({
        players,
        onMoveToBench,
        onMoveToRoster,
        onDrop
    }: {
        players: Player[]
        onMoveToBench: (playerId: string) => void
        onMoveToRoster: (playerId: string) => void
        onDrop: (playerId: string) => void
    }) {
        const roster = players.filter(p => !p.onBench)
        const bench = players.filter(p => p.onBench)

        return (
            <div data-testid="team-roster">
                <div data-testid="starting-roster">
                    <h3>Starting Roster ({roster.length}/6)</h3>
                    {roster.map(player => (
                        <div key={player.id} data-testid={`roster-${player.id}`}>
                            <span>{player.nameCh}</span>
                            <span>Last: {player.lastWeekScore} pts</span>
                            <button onClick={() => onMoveToBench(player.id)}>→ Bench</button>
                            <button onClick={() => onDrop(player.id)}>Drop</button>
                        </div>
                    ))}
                </div>
                <div data-testid="bench">
                    <h3>Bench ({bench.length}/3)</h3>
                    {bench.map(player => (
                        <div key={player.id} data-testid={`bench-${player.id}`}>
                            <span>{player.nameCh}</span>
                            <span>Last: {player.lastWeekScore} pts</span>
                            <button onClick={() => onMoveToRoster(player.id)}>→ Roster</button>
                            <button onClick={() => onDrop(player.id)}>Drop</button>
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    it('displays roster and bench counts correctly', () => {
        const players: Player[] = [
            { id: '1', nameCh: 'Player 1', onBench: false, lastWeekScore: 10 },
            { id: '2', nameCh: 'Player 2', onBench: false, lastWeekScore: 15 },
            { id: '3', nameCh: 'Player 3', onBench: true, lastWeekScore: 8 }
        ]

        render(<TeamRoster players={players} onMoveToBench={() => { }} onMoveToRoster={() => { }} onDrop={() => { }} />)

        expect(screen.getByText('Starting Roster (2/6)')).toBeInTheDocument()
        expect(screen.getByText('Bench (1/3)')).toBeInTheDocument()
    })

    it('renders roster players in correct section', () => {
        const players: Player[] = [
            { id: '1', nameCh: 'Roster Player', onBench: false, lastWeekScore: 10 }
        ]

        render(<TeamRoster players={players} onMoveToBench={() => { }} onMoveToRoster={() => { }} onDrop={() => { }} />)

        expect(screen.getByTestId('roster-1')).toBeInTheDocument()
        expect(screen.queryByTestId('bench-1')).not.toBeInTheDocument()
    })

    it('renders bench players in correct section', () => {
        const players: Player[] = [
            { id: '1', nameCh: 'Bench Player', onBench: true, lastWeekScore: 8 }
        ]

        render(<TeamRoster players={players} onMoveToBench={() => { }} onMoveToRoster={() => { }} onDrop={() => { }} />)

        expect(screen.getByTestId('bench-1')).toBeInTheDocument()
        expect(screen.queryByTestId('roster-1')).not.toBeInTheDocument()
    })

    it('shows last week score for each player', () => {
        const players: Player[] = [
            { id: '1', nameCh: 'Player 1', onBench: false, lastWeekScore: 12.5 }
        ]

        render(<TeamRoster players={players} onMoveToBench={() => { }} onMoveToRoster={() => { }} onDrop={() => { }} />)

        expect(screen.getByText('Last: 12.5 pts')).toBeInTheDocument()
    })

    it('calls onMoveToBench when bench button clicked', () => {
        let movedPlayerId = ''
        const handleMoveToBench = (id: string) => { movedPlayerId = id }

        const players: Player[] = [
            { id: '1', nameCh: 'Player 1', onBench: false, lastWeekScore: 10 }
        ]

        render(<TeamRoster players={players} onMoveToBench={handleMoveToBench} onMoveToRoster={() => { }} onDrop={() => { }} />)

        const benchButton = screen.getByText('→ Bench')
        fireEvent.click(benchButton)

        expect(movedPlayerId).toBe('1')
    })

    it('calls onMoveToRoster when roster button clicked', () => {
        let movedPlayerId = ''
        const handleMoveToRoster = (id: string) => { movedPlayerId = id }

        const players: Player[] = [
            { id: '1', nameCh: 'Player 1', onBench: true, lastWeekScore: 10 }
        ]

        render(<TeamRoster players={players} onMoveToBench={() => { }} onMoveToRoster={handleMoveToRoster} onDrop={() => { }} />)

        const rosterButton = screen.getByText('→ Roster')
        fireEvent.click(rosterButton)

        expect(movedPlayerId).toBe('1')
    })

    it('calls onDrop when drop button clicked', () => {
        let droppedPlayerId = ''
        const handleDrop = (id: string) => { droppedPlayerId = id }

        const players: Player[] = [
            { id: '1', nameCh: 'Player 1', onBench: false, lastWeekScore: 10 }
        ]

        render(<TeamRoster players={players} onMoveToBench={() => { }} onMoveToRoster={() => { }} onDrop={handleDrop} />)

        const dropButton = screen.getByText('Drop')
        fireEvent.click(dropButton)

        expect(droppedPlayerId).toBe('1')
    })
})
