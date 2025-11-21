import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LeaveIndicator } from '@/components/ui/leave-indicator'

describe('LeaveIndicator', () => {
    it('renders nothing when leaveFlag is not "是"', () => {
        const { container } = render(
            <LeaveIndicator leaveFlag="否" leaveDate={null} leaveReason={null} />
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders nothing when leaveFlag is null', () => {
        const { container } = render(
            <LeaveIndicator leaveFlag={null} leaveDate={null} leaveReason={null} />
        )
        expect(container.firstChild).toBeNull()
    })

    it('renders badge with "L" when leaveFlag is "是"', () => {
        render(
            <LeaveIndicator
                leaveFlag="是"
                leaveDate="2024-03-01"
                leaveReason="Personal leave"
            />
        )

        const badge = screen.getByText('L')
        expect(badge).toBeInTheDocument()
        expect(badge).toHaveClass('bg-red-600')
    })

    it('renders with leave date and reason', () => {
        const { container } = render(
            <LeaveIndicator
                leaveFlag="是"
                leaveDate="2024-03-01"
                leaveReason="Medical leave"
            />
        )

        expect(screen.getByText('L')).toBeInTheDocument()
        expect(container.querySelector('[data-slot="tooltip-trigger"]')).toBeInTheDocument()
    })

    it('renders with missing leave date', () => {
        render(
            <LeaveIndicator
                leaveFlag="是"
                leaveDate={null}
                leaveReason="Unknown"
            />
        )

        expect(screen.getByText('L')).toBeInTheDocument()
    })

    it('renders with missing leave reason', () => {
        render(
            <LeaveIndicator
                leaveFlag="是"
                leaveDate="2024-03-01"
                leaveReason={null}
            />
        )

        expect(screen.getByText('L')).toBeInTheDocument()
    })

    it('renders with both date and reason missing', () => {
        render(
            <LeaveIndicator
                leaveFlag="是"
                leaveDate={null}
                leaveReason={null}
            />
        )

        expect(screen.getByText('L')).toBeInTheDocument()
    })
})
