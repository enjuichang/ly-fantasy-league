#!/usr/bin/env tsx
/**
 * Test script to verify the propose and cosign scoring changes:
 * 1. Cosign points only for 三讀 (third reading)
 * 2. Propose bill scoring split into two events (propose: 6pts, pass: 6pts)
 */

import { PrismaClient } from '@prisma/client'
import { syncProposeScores, syncCosignScores } from '../src/lib/fetchers'

const prisma = new PrismaClient()

async function main() {
    console.log('='.repeat(80))
    console.log('Testing Scoring Changes')
    console.log('='.repeat(80))
    console.log()

    // Test with just 1 legislator to see detailed output
    const limit = 1
    const offset = 0

    console.log('📋 TEST 1: Propose Bill Scoring (should create 2 separate scores if passed)')
    console.log('-'.repeat(80))
    const proposeResults = await syncProposeScores(prisma, undefined, limit, offset)
    console.log()
    console.log('Results:', proposeResults)
    console.log()

    console.log('📋 TEST 2: Cosign Bill Scoring (should only award points for 三讀)')
    console.log('-'.repeat(80))
    const cosignResults = await syncCosignScores(prisma, undefined, limit, offset)
    console.log()
    console.log('Results:', cosignResults)
    console.log()

    console.log('='.repeat(80))
    console.log('✅ Testing completed!')
    console.log('='.repeat(80))
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
