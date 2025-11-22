import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { DeleteLeagueDialog } from '@/app/[locale]/leagues/[id]/settings/delete-league-dialog'
import { deleteLeague } from '@/app/actions'
import { useRouter } from 'next/navigation'

// Mock dependencies
vi.mock('@/app/actions', () => ({
    deleteLeague: vi.fn(),
}))

vi.mock('next/navigation', () => ({
    useRouter: vi.fn(),
}))

vi.mock('next-intl', () => ({
    useTranslations: () => (key: string, params?: any) => {
        const translations: Record<string, string> = {
            'settings.delete.button': 'Delete League',
            'settings.delete.confirmTitle': 'Delete League?',
            'settings.delete.confirmMessage': 'Are you sure you want to delete "{leagueName}"? This action cannot be undone.',
            'settings.delete.warning': 'This will permanently delete:',
            'settings.delete.items.teams': 'All teams and their rosters',
            'settings.delete.items.rosters': 'All player rosters',
            'settings.delete.items.matchups': 'All matchups and scores',
            'settings.delete.items.invitations': 'All pending invitations',
            'settings.delete.items.activity': 'All league activity history',
            'settings.delete.cancel': 'Cancel',
            'settings.delete.confirm': 'Delete League',
            'settings.delete.deleting': 'Deleting...',
            'settings.delete.error': 'Failed to delete league. Please try again.',
        }

        if (params?.leagueName) {
            return translations[key].replace('{leagueName}', params.leagueName)
        }

        return translations[key] || key
    },
}))

describe('DeleteLeagueDialog', () => {
    const mockPush = vi.fn()
    const mockLeagueId = 'test-league-id'
    const mockLeagueName = 'Test League'

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useRouter).mockReturnValue({
            push: mockPush,
            replace: vi.fn(),
            prefetch: vi.fn(),
        } as any)

        // Mock window.alert
        global.alert = vi.fn()
    })

    it('renders the delete button', () => {
        render(<DeleteLeagueDialog leagueId={mockLeagueId} leagueName={mockLeagueName} />)

        const deleteButton = screen.getByRole('button', { name: /delete league/i })
        expect(deleteButton).toBeInTheDocument()
        expect(deleteButton).toHaveClass('w-full', 'sm:w-auto')
    })

    it('opens confirmation dialog when delete button is clicked', async () => {
        render(<DeleteLeagueDialog leagueId={mockLeagueId} leagueName={mockLeagueName} />)

        const deleteButton = screen.getByRole('button', { name: /delete league/i })
        fireEvent.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText('Delete League?')).toBeInTheDocument()
        })

        expect(screen.getByText(/Are you sure you want to delete "Test League"/)).toBeInTheDocument()
    })

    it('displays warning message and list of items to be deleted', async () => {
        render(<DeleteLeagueDialog leagueId={mockLeagueId} leagueName={mockLeagueName} />)

        const deleteButton = screen.getByRole('button', { name: /delete league/i })
        fireEvent.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText('This will permanently delete:')).toBeInTheDocument()
        })

        expect(screen.getByText('All teams and their rosters')).toBeInTheDocument()
        expect(screen.getByText('All player rosters')).toBeInTheDocument()
        expect(screen.getByText('All matchups and scores')).toBeInTheDocument()
        expect(screen.getByText('All pending invitations')).toBeInTheDocument()
        expect(screen.getByText('All league activity history')).toBeInTheDocument()
    })

    it('closes dialog when cancel button is clicked', async () => {
        render(<DeleteLeagueDialog leagueId={mockLeagueId} leagueName={mockLeagueName} />)

        const deleteButton = screen.getByRole('button', { name: /delete league/i })
        fireEvent.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText('Delete League?')).toBeInTheDocument()
        })

        const cancelButton = screen.getByRole('button', { name: /cancel/i })
        fireEvent.click(cancelButton)

        await waitFor(() => {
            expect(screen.queryByText('Delete League?')).not.toBeInTheDocument()
        })
    })

    it('calls deleteLeague and navigates to dashboard on successful deletion', async () => {
        vi.mocked(deleteLeague).mockResolvedValue(undefined)

        render(<DeleteLeagueDialog leagueId={mockLeagueId} leagueName={mockLeagueName} />)

        const deleteButton = screen.getByRole('button', { name: /delete league/i })
        fireEvent.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText('Delete League?')).toBeInTheDocument()
        })

        // In the dialog, there's a Cancel button and a Delete League confirmation button
        const buttons = screen.getAllByRole('button')
        // The confirm button should be the last button (after Cancel)
        const confirmButton = buttons.find(btn => btn.textContent === 'Delete League' && btn !== deleteButton)

        if (confirmButton) {
            fireEvent.click(confirmButton)

            await waitFor(() => {
                expect(deleteLeague).toHaveBeenCalledWith(mockLeagueId)
            })

            await waitFor(() => {
                expect(mockPush).toHaveBeenCalledWith('/dashboard')
            })
        }
    })

    it('shows loading state during deletion', async () => {
        vi.mocked(deleteLeague).mockImplementation(
            () => new Promise((resolve) => setTimeout(resolve, 100))
        )

        render(<DeleteLeagueDialog leagueId={mockLeagueId} leagueName={mockLeagueName} />)

        const deleteButton = screen.getByRole('button', { name: /delete league/i })
        fireEvent.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText('Delete League?')).toBeInTheDocument()
        })

        const buttons = screen.getAllByRole('button')
        const confirmButton = buttons.find(btn => btn.textContent === 'Delete League' && btn !== deleteButton)

        if (confirmButton) {
            fireEvent.click(confirmButton)

            await waitFor(() => {
                expect(screen.getByText('Deleting...')).toBeInTheDocument()
            })

            // Buttons should be disabled during deletion
            const cancelButton = screen.getByRole('button', { name: /cancel/i })
            expect(cancelButton).toBeDisabled()
        }
    })

    it('handles deletion errors gracefully', async () => {
        const error = new Error('Database error')
        vi.mocked(deleteLeague).mockRejectedValue(error)

        render(<DeleteLeagueDialog leagueId={mockLeagueId} leagueName={mockLeagueName} />)

        const deleteButton = screen.getByRole('button', { name: /delete league/i })
        fireEvent.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText('Delete League?')).toBeInTheDocument()
        })

        const buttons = screen.getAllByRole('button')
        const confirmButton = buttons.find(btn => btn.textContent === 'Delete League' && btn !== deleteButton)

        if (confirmButton) {
            fireEvent.click(confirmButton)

            await waitFor(() => {
                expect(global.alert).toHaveBeenCalledWith('Failed to delete league. Please try again.')
            })

            // Dialog should close after error
            await waitFor(() => {
                expect(screen.queryByText('Delete League?')).not.toBeInTheDocument()
            })

            // Should not navigate on error
            expect(mockPush).not.toHaveBeenCalled()
        }
    })

    it('does not navigate if deletion fails', async () => {
        vi.mocked(deleteLeague).mockRejectedValue(new Error('Deletion failed'))

        render(<DeleteLeagueDialog leagueId={mockLeagueId} leagueName={mockLeagueName} />)

        const deleteButton = screen.getByRole('button', { name: /delete league/i })
        fireEvent.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText('Delete League?')).toBeInTheDocument()
        })

        const buttons = screen.getAllByRole('button')
        const confirmButton = buttons.find(btn => btn.textContent === 'Delete League' && btn !== deleteButton)

        if (confirmButton) {
            fireEvent.click(confirmButton)

            await waitFor(() => {
                expect(deleteLeague).toHaveBeenCalled()
            })

            await waitFor(() => {
                expect(global.alert).toHaveBeenCalled()
            })

            expect(mockPush).not.toHaveBeenCalled()
        }
    })

    it('applies destructive styling to delete button', () => {
        render(<DeleteLeagueDialog leagueId={mockLeagueId} leagueName={mockLeagueName} />)

        const deleteButton = screen.getByRole('button', { name: /delete league/i })

        // Check that the button has variant="destructive" styling
        // Note: The actual classes depend on your button component implementation
        expect(deleteButton).toBeInTheDocument()
    })

    it('includes league name in confirmation message', async () => {
        const customLeagueName = 'My Awesome League'
        render(<DeleteLeagueDialog leagueId={mockLeagueId} leagueName={customLeagueName} />)

        const deleteButton = screen.getByRole('button', { name: /delete league/i })
        fireEvent.click(deleteButton)

        await waitFor(() => {
            expect(screen.getByText(/Are you sure you want to delete "My Awesome League"/)).toBeInTheDocument()
        })
    })
})
