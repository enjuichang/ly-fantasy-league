import { Resend } from 'resend'
import { LeagueInvitationEmail } from '../../emails/league-invitation'
import { render } from '@react-email/render'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendInvitationEmailParams {
  to: string
  leagueName: string
  commissionerName: string
  token: string
  locale?: string
}

export async function sendInvitationEmail({
  to,
  leagueName,
  commissionerName,
  token,
  locale = 'en'
}: SendInvitationEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate environment variable
    if (!process.env.RESEND_API_KEY) {
      console.error('[EMAIL] RESEND_API_KEY not configured')
      return { success: false, error: 'Email service not configured' }
    }

    if (!process.env.APP_URL) {
      console.error('[EMAIL] APP_URL not configured')
      return { success: false, error: 'App URL not configured' }
    }

    // Construct invitation URL
    const inviteUrl = `${process.env.APP_URL}/${locale}/invite/${token}`

    // Render the email template
    const emailHtml = await render(
      LeagueInvitationEmail({
        leagueName,
        commissionerName,
        inviteUrl,
      })
    )

    // Send the email
    const { data, error } = await resend.emails.send({
      from: 'Fantasy Legislative Yuan <invitation@notification.ly-fantasy.com>', // TODO: Update with your verified domain
      to,
      subject: `${commissionerName} invited you to join ${leagueName}`,
      html: emailHtml,
    })

    if (error) {
      console.error('[EMAIL] Failed to send invitation:', error)
      return { success: false, error: error.message }
    }

    console.log('[EMAIL] Invitation sent successfully:', { to, leagueName, id: data?.id })
    return { success: true }
  } catch (error) {
    console.error('[EMAIL] Unexpected error sending invitation:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
