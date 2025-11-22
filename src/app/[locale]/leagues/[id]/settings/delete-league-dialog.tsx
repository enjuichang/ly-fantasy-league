'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { deleteLeague } from '@/app/actions'
import { useRouter } from 'next/navigation'

interface DeleteLeagueDialogProps {
    leagueId: string
    leagueName: string
}

export function DeleteLeagueDialog({ leagueId, leagueName }: DeleteLeagueDialogProps) {
    const [open, setOpen] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)
    const t = useTranslations()
    const router = useRouter()

    const handleDelete = async () => {
        setIsDeleting(true)
        try {
            await deleteLeague(leagueId)
            // Navigate to dashboard after successful deletion
            router.push('/dashboard')
        } catch (error) {
            console.error('Failed to delete league:', error)
            alert(t('settings.delete.error'))
            setIsDeleting(false)
            setOpen(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                    {t('settings.delete.button')}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t('settings.delete.confirmTitle')}</DialogTitle>
                    <DialogDescription>
                        {t('settings.delete.confirmMessage', { leagueName })}
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    <p className="text-sm text-muted-foreground">
                        {t('settings.delete.warning')}
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                        <li>{t('settings.delete.items.teams')}</li>
                        <li>{t('settings.delete.items.rosters')}</li>
                        <li>{t('settings.delete.items.matchups')}</li>
                        <li>{t('settings.delete.items.invitations')}</li>
                        <li>{t('settings.delete.items.activity')}</li>
                    </ul>
                </div>
                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => setOpen(false)}
                        disabled={isDeleting}
                    >
                        {t('settings.delete.cancel')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isDeleting}
                    >
                        {isDeleting ? t('settings.delete.deleting') : t('settings.delete.confirm')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
