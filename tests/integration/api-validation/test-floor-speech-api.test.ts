// Helper to convert Date to ROC string
function toRocDate(date: Date): string {
    const year = date.getFullYear() - 1911
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    return `${year}${month}${day}`
}

async function testFloorSpeechAPI() {
    console.log('🧪 Testing Floor Speech API...\n')

    try {
        // Test 1: Basic connectivity
        console.log('Test 1: API Connectivity')
        const testDate = new Date('2024-03-01')
        const from = toRocDate(testDate)
        const to = toRocDate(new Date('2024-03-07'))
        const url = `https://www.ly.gov.tw/WebAPI/LegislativeSpeech.aspx?from=${from}&to=${to}&mode=JSON`

        console.log(`  URL: ${url}`)
        const response = await fetch(url)

        if (!response.ok) {
            throw new Error(`API returned status ${response.status}`)
        }
        console.log('  ✅ API is reachable\n')

        // Test 2: Response format
        console.log('Test 2: Response Format')
        const data = await response.json() as any[]

        if (!Array.isArray(data)) {
            throw new Error('Response is not an array')
        }
        console.log(`  ✅ Response is an array (${data.length} records)\n`)

        if (data.length === 0) {
            console.log('  ⚠️  No data for test date range')
            return
        }

        // Test 3: Required fields
        console.log('Test 3: Required Fields')
        const sample = data[0]
        const requiredFields = [
            'smeeting_date',
            'meeting_status',
            'meeting_name',
            'meeting_content',
            'speechers',
            'meeting_unit'
        ]

        const missingFields: string[] = []
        requiredFields.forEach(field => {
            if (!(field in sample)) {
                missingFields.push(field)
            }
        })

        if (missingFields.length > 0) {
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`)
        }
        console.log('  ✅ All required fields present\n')

        // Test 4: Data consistency
        console.log('Test 4: Data Consistency')
        console.log(`  Sample record:`)
        console.log(`    Date: ${sample.smeeting_date}`)
        console.log(`    Meeting: ${sample.meeting_name}`)
        console.log(`    Speechers: ${sample.speechers ? sample.speechers.substring(0, 50) + '...' : 'null'}`)

        // Check date format (should be ROC format like "113/03/01")
        if (sample.smeeting_date && !/^\d{3}\/\d{2}\/\d{2}$/.test(sample.smeeting_date)) {
            console.log(`  ⚠️  Unexpected date format: ${sample.smeeting_date}`)
        } else {
            console.log('  ✅ Date format is correct (ROC format)\n')
        }

        // Test 5: Speechers parsing
        console.log('Test 5: Speechers Field Parsing')
        if (sample.speechers) {
            const parts = sample.speechers.split(',')
            const names = parts.map((part: string) => {
                const match = part.trim().match(/^\d+\s+(.+)$/)
                return match ? match[1].trim() : null
            }).filter((name: string | null) => name !== null)

            console.log(`  ✅ Parsed ${names.length} legislator names from speechers field`)
            console.log(`  Sample names: ${names.slice(0, 3).join(', ')}`)
        } else {
            console.log('  ⚠️  Speechers field is null/empty for this record')
        }

        console.log('\n✅ All tests passed!')
        console.log('\n📊 Summary:')
        console.log(`  - API is accessible`)
        console.log(`  - Response format is valid`)
        console.log(`  - All required fields present`)
        console.log(`  - Data format is consistent`)

    } catch (error) {
        console.error('\n❌ Test failed:', error)
        process.exit(1)
    }
}

testFloorSpeechAPI()
