#!/usr/bin/env tsx
/**
 * Comprehensive test of all legislators to see how many have interpellations
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testAllLegislators() {
    console.log('='.repeat(80))
    console.log('Testing ALL Legislators for Written Interpellations')
    console.log('='.repeat(80))
    console.log()

    const legislators = await prisma.legislator.findMany({
        orderBy: { nameCh: 'asc' }
    })

    console.log(`Testing ${legislators.length} legislators...\n`)

    let withData = 0
    let withoutData = 0
    let errors = 0
    const results: Array<{ name: string, count: number, error?: string }> = []

    for (const legislator of legislators) {
        const encodedName = encodeURIComponent(legislator.nameCh)
        const apiUrl = `https://ly.govapi.tw/v2/legislators/11/${encodedName}/interpellations`

        try {
            const response = await fetch(apiUrl)

            if (response.ok) {
                const data = await response.json()

                if (data.error) {
                    results.push({ name: legislator.nameCh, count: 0, error: data.message })
                    errors++
                } else if (data.interpellations) {
                    const count = data.interpellations.length
                    results.push({ name: legislator.nameCh, count })

                    if (count > 0) {
                        withData++
                        console.log(`✓ ${legislator.nameCh}: ${count} interpellations`)
                    } else {
                        withoutData++
                    }
                } else {
                    results.push({ name: legislator.nameCh, count: 0, error: 'Unknown response' })
                    errors++
                }
            } else {
                results.push({ name: legislator.nameCh, count: 0, error: `HTTP ${response.status}` })
                errors++
            }
        } catch (error) {
            results.push({ name: legislator.nameCh, count: 0, error: String(error) })
            errors++
        }

        // Small delay to avoid overwhelming API
        await new Promise(resolve => setTimeout(resolve, 200))
    }

    console.log()
    console.log('='.repeat(80))
    console.log('Summary')
    console.log('='.repeat(80))
    console.log(`Total legislators tested: ${legislators.length}`)
    console.log(`With interpellations: ${withData}`)
    console.log(`Without interpellations: ${withoutData}`)
    console.log(`Errors: ${errors}`)
    console.log()

    // Show legislators with data
    console.log('Legislators with written interpellations:')
    console.log('-'.repeat(80))
    const withDataResults = results.filter(r => r.count > 0)
    if (withDataResults.length === 0) {
        console.log('None')
    } else {
        for (const result of withDataResults) {
            console.log(`  ${result.name}: ${result.count}`)
        }
    }

    console.log()
    console.log('Legislators with errors:')
    console.log('-'.repeat(80))
    const errorResults = results.filter(r => r.error)
    if (errorResults.length === 0) {
        console.log('None')
    } else {
        for (const result of errorResults.slice(0, 10)) {
            console.log(`  ${result.name}: ${result.error}`)
        }
        if (errorResults.length > 10) {
            console.log(`  ... and ${errorResults.length - 10} more`)
        }
    }
}

testAllLegislators()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
