import { execSync } from 'child_process'

/**
 * Run all test scripts in sequence and report results
 */
async function runAllTests() {
    console.log('🚀 Running All Fetch & Point Value Tests\n')
    console.log('='.repeat(60))

    const tests = [
        {
            name: 'Point Values Verification',
            script: 'npx tsx tests/integration/database/test-point-values.test.ts'
        },
        {
            name: 'Propose Bill Fetcher',
            script: 'npx tsx tests/integration/fetchers/test-fetch-propose.test.ts'
        },
        {
            name: 'Cosign Bill Fetcher',
            script: 'npx tsx tests/integration/fetchers/test-fetch-cosign.test.ts'
        },
        {
            name: 'Written Interpellation Fetcher',
            script: 'npx tsx tests/integration/fetchers/test-fetch-written.test.ts'
        }
    ]

    const results: { name: string; passed: boolean; error?: string }[] = []

    for (const test of tests) {
        console.log(`\n${'='.repeat(60)}`)
        console.log(`Running: ${test.name}`)
        console.log('='.repeat(60))

        try {
            execSync(test.script, {
                stdio: 'inherit',
                cwd: process.cwd()
            })
            results.push({ name: test.name, passed: true })
        } catch (error) {
            results.push({
                name: test.name,
                passed: false,
                error: error instanceof Error ? error.message : String(error)
            })
        }
    }

    // Print summary
    console.log('\n\n' + '='.repeat(60))
    console.log('TEST SUMMARY')
    console.log('='.repeat(60))

    results.forEach(result => {
        const status = result.passed ? '✅ PASSED' : '❌ FAILED'
        console.log(`${status} - ${result.name}`)
        if (result.error) {
            console.log(`  Error: ${result.error}`)
        }
    })

    const totalPassed = results.filter(r => r.passed).length
    const totalTests = results.length

    console.log('\n' + '='.repeat(60))
    console.log(`Results: ${totalPassed}/${totalTests} tests passed`)
    console.log('='.repeat(60))

    // Exit with appropriate code
    process.exit(totalPassed === totalTests ? 0 : 1)
}

runAllTests().catch((error) => {
    console.error('❌ Test runner failed:', error)
    process.exit(1)
})
