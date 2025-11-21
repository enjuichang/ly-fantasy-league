'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { inviteUser } from '@/app/actions'
import { useTranslations } from 'next-intl'

interface InviteFormProps {
  leagueId: string
}

export function InviteForm({ leagueId }: InviteFormProps) {
  const t = useTranslations('settings.invite')
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await inviteUser(leagueId, email)

      if (result.success) {
        alert('Invitation sent successfully!')
        setEmail('')
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Error inviting user:', error)
      alert('Failed to send invitation')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid w-full items-center gap-1.5">
        <Label htmlFor="email">{t('labelEmail')}</Label>
        <Input
          type="email"
          id="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={t('placeholderEmail')}
          required
          className="max-w-md"
          disabled={isSubmitting}
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Sending...' : t('submit')}
      </Button>
    </form>
  )
}
