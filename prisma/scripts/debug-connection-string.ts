import fs from 'fs'
import path from 'path'

function parseEnv(filePath: string) {
    if (!fs.existsSync(filePath)) return {}
    const content = fs.readFileSync(filePath, 'utf-8')
    const env: Record<string, string> = {}
    content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/)
        if (match) {
            const key = match[1].trim()
            let value = match[2].trim()
            // Remove quotes if present
            if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                value = value.slice(1, -1)
            }
            env[key] = value
        }
    })
    return env
}

const envLocal = parseEnv(path.resolve(process.cwd(), '.env.local'))
const env = parseEnv(path.resolve(process.cwd(), '.env'))

// Merge .env.local over .env
const combinedEnv = { ...env, ...envLocal }
const dbUrl = combinedEnv.DATABASE_URL

function maskPassword(url: string) {
    try {
        const parsed = new URL(url)
        const password = parsed.password
        const masked = password.substring(0, 2) + '*'.repeat(Math.max(0, password.length - 2))
        parsed.password = masked
        return {
            safeUrl: parsed.toString(),
            passwordLength: password.length,
            hasSpecialChars: /[@#/:?&]/.test(password),
            hasHash: password.includes('#'),
            hasAt: password.includes('@'),
            hasQuestion: password.includes('?'),
            protocol: parsed.protocol,
            hostname: parsed.hostname,
            port: parsed.port,
            pathname: parsed.pathname,
            search: parsed.search
        }
    } catch (e) {
        return { error: 'Invalid URL format' }
    }
}

console.log('--- Database Connection String Diagnosis ---')
if (!dbUrl) {
    console.error('❌ DATABASE_URL is not defined in .env or .env.local')
} else {
    console.log('✅ DATABASE_URL found')
    const diagnosis = maskPassword(dbUrl)
    console.log('Parsed Details:', JSON.stringify(diagnosis, null, 2))

    if (diagnosis.hasHash) {
        console.warn('⚠️  WARNING: Password contains "#". If not URL encoded (%23), this might cut off the connection string if not quoted in .env!')
    }
    if (diagnosis.hasAt) {
        console.warn('⚠️  WARNING: Password contains "@". This MUST be URL encoded as %40, otherwise it breaks the URL parsing.')
    }
    if (diagnosis.hasQuestion) {
        console.warn('⚠️  WARNING: Password contains "?". This MUST be URL encoded as %3F.')
    }

    if (dbUrl.includes('aws-1-us-east-1.pooler.supabase.com')) {
        if (diagnosis.port === '6543' && !diagnosis.search.includes('pgbouncer=true')) {
            console.warn('⚠️  WARNING: Port 6543 (Transaction Pooler) usually requires ?pgbouncer=true')
        }
    }
}
console.log('--------------------------------------------')
