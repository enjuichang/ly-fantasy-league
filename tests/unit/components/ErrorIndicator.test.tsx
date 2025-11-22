import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('Error Indicator Component Tests', () => {
    // Mock component for testing
    function ErrorIndicator({ errorReason }: { errorReason?: string | null }) {
        if (!errorReason) return null

        return (
            <div data-testid="error-indicator" className="error-badge">
                <span className="error-icon">E</span>
                <div className="error-tooltip">
                    <div className="error-title">Data Fetching Issue</div>
                    <div className="error-reason">Issue: {errorReason}</div>
                </div>
            </div>
        )
    }

    it('renders error indicator when error exists', () => {
        render(<ErrorIndicator errorReason="API Error: 404 Not Found" />)
        const indicator = screen.getByTestId('error-indicator')
        expect(indicator).toBeInTheDocument()
    })

    it('displays error reason in tooltip', () => {
        render(<ErrorIndicator errorReason="API Error: 404 Not Found" />)
        const reason = screen.getByText(/API Error: 404 Not Found/)
        expect(reason).toBeInTheDocument()
    })

    it('does not render when no error', () => {
        render(<ErrorIndicator errorReason={null} />)
        const indicator = screen.queryByTestId('error-indicator')
        expect(indicator).not.toBeInTheDocument()
    })

    it('shows E icon', () => {
        render(<ErrorIndicator errorReason="Some error" />)
        const icon = screen.getByText('E')
        expect(icon).toBeInTheDocument()
    })
})
