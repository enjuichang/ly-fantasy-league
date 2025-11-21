import { notFound, redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { acceptInvitationByToken, declineInvitationByToken } from '@/app/actions'
import { InviteActions } from './invite-actions'

interface InvitePageProps {
  params: Promise<{
    token: string
    locale: string
  }>
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { token, locale } = await params
  const session = await auth()

  // Require authentication
  if (!session?.user?.email) {
    redirect(`/${locale}/sign-in?callbackUrl=/${locale}/invite/${token}`)
  }

  // Fetch invitation by token
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      league: {
        include: {
          members: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true
                }
              }
            }
          }
        }
      }
    }
  })

  // Check if invitation exists
  if (!invitation) {
    notFound()
  }

  // Check if invitation email matches signed-in user
  if (invitation.email !== session.user.email) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-red-600">Email Mismatch</CardTitle>
            <CardDescription>
              This invitation was sent to <strong>{invitation.email}</strong>, but you're signed in as <strong>{session.user.email}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Please sign in with the correct email address or ask the commissioner to send an invitation to your current email.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if user is already a member
  const existingMember = invitation.league.members.find(
    (m: any) => m.user.email === session?.user?.email
  )

  if (existingMember) {
    redirect(`/${locale}/leagues/${invitation.leagueId}`)
  }

  // Check if invitation has been declined
  if (invitation.status === 'DECLINED') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Invitation Declined</CardTitle>
            <CardDescription>
              You previously declined this invitation to join <strong>{invitation.league.name}</strong>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              If you'd like to join, please contact the league commissioner for a new invitation.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Check if invitation has been accepted
  if (invitation.status === 'ACCEPTED') {
    redirect(`/${locale}/leagues/${invitation.leagueId}`)
  }

  const t = await getTranslations('invitePage')
  const commissioner = invitation.league.members.find((m: any) => m.role === 'COMMISSIONER')

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">{t('title')}</CardTitle>
          <CardDescription>
            {commissioner?.user.name && (
              t('invitedBy', { commissioner: commissioner.user.name })
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* League Information */}
          <div className="bg-muted p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-4">{invitation.league.name}</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t('members')}</p>
                <p className="font-medium">{invitation.league.members.length}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('commissioner')}</p>
                <p className="font-medium">{commissioner?.user.name || 'Unknown'}</p>
              </div>
            </div>
          </div>

          {/* Game Description */}
          <div className="text-sm text-muted-foreground">
            <p>{t('description')}</p>
          </div>

          {/* Action Buttons */}
          <InviteActions
            invitationId={invitation.id}
            leagueId={invitation.leagueId}
            locale={locale}
          />
        </CardContent>
      </Card>
    </div>
  )
}
