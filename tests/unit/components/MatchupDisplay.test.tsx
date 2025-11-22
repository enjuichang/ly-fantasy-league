import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('Matchup Display Component Tests', () => {
    interface Matchup {
        week: number
        team1Name: string
        team1Score: number
        team2Name: string | null
        team2Score: number | null
    }

    // Mock component for testing
    function MatchupDisplay({ matchup }: { matchup: Matchup }) {
        const isByeWeek = matchup.team2Name === null

        if (isByeWeek) {
            return (
                <div data-testid="matchup" className="matchup bye-week">
                    <div className="team">{matchup.team1Name}</div>
                    <div className="bye-indicator" data-testid="bye-indicator">BYE</div>
                </div>
            )
        }

        const team1Won = matchup.team1Score > (matchup.team2Score || 0)
        const team2Won = (matchup.team2Score || 0) > matchup.team1Score
        const isTie = matchup.team1Score === matchup.team2Score

        return (
            <div data-testid="matchup" className="matchup">
                <div className={`team ${team1Won ? 'winner' : ''}`} data-testid="team1">
                    <span className="team-name">{matchup.team1Name}</span>
                    <span className="score">{matchup.team1Score.toFixed(1)}</span>
                </div>
                <div className="vs">VS</div>
                <div className={`team ${team2Won ? 'winner' : ''}`} data-testid="team2">
                    <span className="team-name">{matchup.team2Name}</span>
                    <span className="score">{matchup.team2Score?.toFixed(1)}</span>
                </div>
                {isTie && <div data-testid="tie-indicator">TIE</div>}
            </div>
        )
    }

    it('renders team names', () => {
        const matchup: Matchup = {
            week: 1,
            team1Name: 'Team Alpha',
            team1Score: 45.5,
            team2Name: 'Team Beta',
            team2Score: 38.2
        }

        render(<MatchupDisplay matchup={matchup} />)

        expect(screen.getByText('Team Alpha')).toBeInTheDocument()
        expect(screen.getByText('Team Beta')).toBeInTheDocument()
    })

    it('renders team scores', () => {
        const matchup: Matchup = {
            week: 1,
            team1Name: 'Team Alpha',
            team1Score: 45.5,
            team2Name: 'Team Beta',
            team2Score: 38.2
        }

        render(<MatchupDisplay matchup={matchup} />)

        expect(screen.getByText('45.5')).toBeInTheDocument()
        expect(screen.getByText('38.2')).toBeInTheDocument()
    })

    it('displays VS indicator for regular matchup', () => {
        const matchup: Matchup = {
            week: 1,
            team1Name: 'Team A',
            team1Score: 40,
            team2Name: 'Team B',
            team2Score: 35
        }

        render(<MatchupDisplay matchup={matchup} />)
        expect(screen.getByText('VS')).toBeInTheDocument()
    })

    it('highlights winner correctly when team1 wins', () => {
        const matchup: Matchup = {
            week: 1,
            team1Name: 'Team A',
            team1Score: 50,
            team2Name: 'Team B',
            team2Score: 35
        }

        render(<MatchupDisplay matchup={matchup} />)

        const team1 = screen.getByTestId('team1')
        expect(team1).toHaveClass('winner')
    })

    it('highlights winner correctly when team2 wins', () => {
        const matchup: Matchup = {
            week: 1,
            team1Name: 'Team A',
            team1Score: 30,
            team2Name: 'Team B',
            team2Score: 45
        }

        render(<MatchupDisplay matchup={matchup} />)

        const team2 = screen.getByTestId('team2')
        expect(team2).toHaveClass('winner')
    })

    it('displays tie indicator for tied scores', () => {
        const matchup: Matchup = {
            week: 1,
            team1Name: 'Team A',
            team1Score: 40,
            team2Name: 'Team B',
            team2Score: 40
        }

        render(<MatchupDisplay matchup={matchup} />)
        expect(screen.getByTestId('tie-indicator')).toBeInTheDocument()
    })

    it('renders bye week correctly', () => {
        const matchup: Matchup = {
            week: 1,
            team1Name: 'Team A',
            team1Score: 0,
            team2Name: null,
            team2Score: null
        }

        render(<MatchupDisplay matchup={matchup} />)

        expect(screen.getByText('Team A')).toBeInTheDocument()
        expect(screen.getByTestId('bye-indicator')).toHaveTextContent('BYE')
        expect(screen.queryByText('VS')).not.toBeInTheDocument()
    })
})
