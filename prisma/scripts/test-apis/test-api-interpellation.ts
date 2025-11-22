#!/usr/bin/env tsx
/**
 * Test different legislators and check the API structure
 */

async function testMultipleLegislators() {
    const legislators = ['丁學忠', '王婉諭', '賴士葆', '柯建銘', '洪申翰']

    for (const name of legislators) {
        console.log('='.repeat(80))
        console.log(`Testing: ${name}`)
        console.log('='.repeat(80))

        const encodedName = encodeURIComponent(name)
        const apiUrl = `https://ly.govapi.tw/v2/legislators/11/${encodedName}/interpellations`

        console.log('URL:', apiUrl)

        try {
            const response = await fetch(apiUrl)

            if (response.ok) {
                const data = await response.json()

                if (data.error) {
                    console.log('❌ Error:', data.message)
                } else if (data.interpellations) {
                    console.log(`✓ Found ${data.interpellations.length} interpellations`)
                    if (data.interpellations.length > 0) {
                        console.log('Sample:', JSON.stringify(data.interpellations[0], null, 2))
                    }
                } else {
                    console.log('⚠️  Unknown response structure:', JSON.stringify(data).substring(0, 200))
                }
            } else {
                console.log('❌ HTTP Error:', response.status)
            }
        } catch (error) {
            console.error('❌ Exception:', error)
        }

        console.log()

        // Small delay to avoid overwhelming API
        await new Promise(resolve => setTimeout(resolve, 500))
    }

    // Also try without the /interpellations suffix to see what endpoints are available
    console.log('='.repeat(80))
    console.log('Checking available data for 丁學忠...')
    console.log('='.repeat(80))
    const testName = '丁學忠'
    const encodedName = encodeURIComponent(testName)
    const baseUrl = `https://ly.govapi.tw/v2/legislators/11/${encodedName}`

    console.log('Base URL:', baseUrl)

    try {
        const response = await fetch(baseUrl)
        if (response.ok) {
            const data = await response.json()
            console.log('Available data keys:', Object.keys(data))
        }
    } catch (error) {
        console.error('Error:', error)
    }
}

testMultipleLegislators()
