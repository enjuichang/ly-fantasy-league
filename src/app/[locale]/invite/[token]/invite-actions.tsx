'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { acceptInvitationByToken, declineInvitationByToken } from '@/app/actions'
import { useTranslations } from 'next-intl'

interface InviteActionsProps {
  invitationId: string
  leagueId: string
  locale: string
}

export function InviteActions({ invitationId, leagueId, locale }: InviteActionsProps) {
  const router = useRouter()
  const t = useTranslations('invitePage')
  const [isAccepting, setIsAccepting] = useState(false)
  const [isDeclining, setIsDeclining] = useState(false)

  async function handleAccept() {
    setIsAccepting(true)
    try {
      const result = await acceptInvitationByToken(invitationId)
      if (result.success) {
        router.push(`/${locale}/leagues/${leagueId}`)
      } else {
        alert(result.message)
        setIsAccepting(false)
      }
    } catch (error) {
      console.error('Error accepting invitation:', error)
      alert('Failed to accept invitation')
      setIsAccepting(false)
    }
  }

  async function handleDecline() {
    if (!confirm(t('confirmDecline'))) {
      return
    }

    setIsDeclining(true)
    try {
      const result = await declineInvitationByToken(invitationId)
      if (result.success) {
        router.push(`/${locale}/dashboard`)
      } else {
        alert(result.message)
        setIsDeclining(false)
      }
    } catch (error) {
      console.error('Error declining invitation:', error)
      alert('Failed to decline invitation')
      setIsDeclining(false)
    }
  }

  return (
    <div className="flex gap-3">
      <Button
        onClick={handleAccept}
        disabled={isAccepting || isDeclining}
        className="flex-1"
        size="lg"
      >
        {isAccepting ? t('accepting') : t('accept')}
      </Button>
      <Button
        onClick={handleDecline}
        disabled={isAccepting || isDeclining}
        variant="outline"
        className="flex-1"
        size="lg"
      >
        {isDeclining ? t('declining') : t('decline')}
      </Button>
    </div>
  )
}
