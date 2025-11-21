import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

interface LeagueInvitationEmailProps {
  leagueName: string
  commissionerName: string
  inviteUrl: string
}

export const LeagueInvitationEmail = ({
  leagueName = 'My League',
  commissionerName = 'Commissioner',
  inviteUrl = 'https://example.com/invite/token',
}: LeagueInvitationEmailProps) => (
  <Html>
    <Head />
    <Preview>
      {commissionerName} invited you to join {leagueName} on Fantasy Legislative Yuan
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={h1}>
            <span style={flyText}>FLY</span>
          </Heading>
          <Text style={tagline}>Fantasy Legislative Yuan</Text>
        </Section>

        <Section style={content}>
          <Heading style={h2}>You've Been Invited!</Heading>

          <Text style={text}>
            <strong>{commissionerName}</strong> has invited you to join their league:
          </Text>

          <Section style={leagueCard}>
            <Text style={leagueNameStyle}>{leagueName}</Text>
          </Section>

          <Text style={text}>
            Draft your team of Taiwanese legislators and compete based on real legislative data.
            Track bill proposals, speeches, votes, and more to win your league!
          </Text>

          <Section style={buttonContainer}>
            <Button style={button} href={inviteUrl}>
              View Invitation
            </Button>
          </Section>

          <Text style={footerText}>
            This link will take you to a page where you can review the league details and accept or decline the invitation.
          </Text>
        </Section>

        <Section style={footer}>
          <Text style={footerSmall}>
            Fantasy Legislative Yuan | Draft, Compete, Win
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export default LeagueInvitationEmail

// Styles
const main = {
  backgroundColor: '#f5f5f5',
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
}

const container = {
  margin: '0 auto',
  padding: '20px 0',
  maxWidth: '600px',
}

const header = {
  background: 'linear-gradient(135deg, #094D92 0%, #68B684 100%)',
  borderRadius: '12px 12px 0 0',
  padding: '32px 24px',
  textAlign: 'center' as const,
}

const flyText = {
  fontSize: '48px',
  fontWeight: '900',
  color: '#ffffff',
  letterSpacing: '-2px',
}

const tagline = {
  color: '#ffffff',
  fontSize: '14px',
  margin: '8px 0 0 0',
  fontWeight: '500',
}

const h1 = {
  margin: '0',
  padding: '0',
}

const h2 = {
  color: '#094D92',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 16px 0',
}

const content = {
  backgroundColor: '#ffffff',
  padding: '32px 24px',
  borderRadius: '0 0 12px 12px',
}

const text = {
  color: '#374151',
  fontSize: '16px',
  lineHeight: '24px',
  margin: '0 0 16px 0',
}

const leagueCard = {
  backgroundColor: '#f9fafb',
  border: '2px solid #094D92',
  borderRadius: '8px',
  padding: '20px',
  margin: '24px 0',
  textAlign: 'center' as const,
}

const leagueNameStyle = {
  color: '#094D92',
  fontSize: '20px',
  fontWeight: '700',
  margin: '0',
}

const buttonContainer = {
  textAlign: 'center' as const,
  margin: '32px 0',
}

const button = {
  background: 'linear-gradient(135deg, #094D92 0%, #68B684 100%)',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '14px 32px',
}

const footerText = {
  color: '#6b7280',
  fontSize: '14px',
  lineHeight: '20px',
  margin: '0',
}

const footer = {
  marginTop: '24px',
  textAlign: 'center' as const,
}

const footerSmall = {
  color: '#9ca3af',
  fontSize: '12px',
  margin: '0',
}
