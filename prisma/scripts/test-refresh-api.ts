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
const combinedEnv = { ...env, ...envLocal }

async function testRefreshApi() {
    const secret = combinedEnv.CRON_SECRET
    if (!secret) {
        console.error('❌ CRON_SECRET not found in environment variables')
        return
    }

    console.log('🚀 Testing /api/refresh-data endpoint...')
    console.log('Target: http://localhost:3000/api/refresh-data?type=rollcall')

    try {
        const response = await fetch('http://localhost:3000/api/refresh-data?type=rollcall', {
            headers: {
                'Authorization': `Bearer ${secret}`
            }
        })

        console.log(`Status: ${response.status} ${response.statusText}`)

        const text = await response.text()
        try {
            const json = JSON.parse(text)
            console.log('Response:', JSON.stringify(json, null, 2))
        } catch {
            console.log('Response (Text):', text)
        }

    } catch (error) {
        console.error('❌ Failed to call API:', error)
        console.log('Make sure the dev server is running on localhost:3000')
    }
}

testRefreshApi()
