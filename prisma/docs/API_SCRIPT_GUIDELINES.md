# API Processing Script Guidelines

## Overview
This document outlines best practices for creating and maintaining API processing scripts for the Fantasy Legislative Yuan application.

## Core Requirements

### 1. Test Scripts
Each API processing script must have a corresponding test script to verify:
- API connectivity and response format
- Data consistency and expected fields
- Error handling and edge cases

**Naming Convention**: `test-[feature]-api.ts`

**Example Structure**:
```typescript
// test-floor-speech-api.ts
async function testAPI() {
  console.log('Testing Floor Speech API...')
  
  // Test 1: Basic connectivity
  const response = await fetch(apiUrl)
  if (!response.ok) throw new Error('API unreachable')
  
  // Test 2: Response format
  const data = await response.json()
  if (!Array.isArray(data)) throw new Error('Unexpected format')
  
  // Test 3: Required fields
  const sample = data[0]
  const requiredFields = ['smeeting_date', 'speechers']
  requiredFields.forEach(field => {
    if (!(field in sample)) throw new Error(`Missing field: ${field}`)
  })
  
  console.log('✅ All tests passed')
}
```

### 2. Incremental Updates
Scripts should check existing data to avoid reprocessing:

```typescript
// Get the latest score date from DB
const latestScore = await prisma.score.findFirst({
  where: { category: 'FLOOR_SPEECH' },
  orderBy: { date: 'desc' }
})

const startDate = latestScore 
  ? new Date(latestScore.date.getTime() + 24 * 60 * 60 * 1000) // Next day
  : new Date('2024-02-01') // Default start

// Only fetch data from startDate onwards
```

### 3. 12-Hour Update Optimization
Scripts must be optimized for frequent updates:

**Performance Optimizations**:
- **Batch Processing**: Process legislators in parallel batches (5-10 at a time)
- **Date Range Filtering**: Only fetch recent data (last 14 days for 12-hour updates)
- **Caching**: Store last fetch timestamp to avoid redundant API calls
- **Deduplication**: Check for existing scores before creating new ones

**Example**:
```typescript
// Check last fetch time
const lastFetch = await prisma.metadata.findUnique({
  where: { key: 'floor_speech_last_fetch' }
})

const now = new Date()
const twelveHoursAgo = new Date(now.getTime() - 12 * 60 * 60 * 1000)

if (lastFetch && new Date(lastFetch.value) > twelveHoursAgo) {
  console.log('⏭️  Skipping: Last fetch was less than 12 hours ago')
  return
}

// Update timestamp after successful fetch
await prisma.metadata.upsert({
  where: { key: 'floor_speech_last_fetch' },
  update: { value: now.toISOString() },
  create: { key: 'floor_speech_last_fetch', value: now.toISOString() }
})
```

## Script Template

```typescript
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Configuration
const CATEGORY = 'SCORE_CATEGORY'
const BATCH_SIZE = 5
const LOOKBACK_DAYS = 14 // For 12-hour updates

async function getDateRange() {
  // Get latest score to determine start date
  const latestScore = await prisma.score.findFirst({
    where: { category: CATEGORY },
    orderBy: { date: 'desc' }
  })
  
  const endDate = new Date()
  const startDate = latestScore
    ? new Date(Math.max(
        latestScore.date.getTime(),
        endDate.getTime() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000
      ))
    : new Date('2024-02-01')
  
  return { startDate, endDate }
}

async function fetchData(startDate: Date, endDate: Date) {
  // Implement API fetching logic
}

async function processData(data: any[], legislatorId: string) {
  // Check for existing scores
  const existingScore = await prisma.score.findFirst({
    where: {
      legislatorId,
      category: CATEGORY,
      date: scoreDate
    }
  })
  
  if (existingScore) {
    console.log('⊘ Score already exists, skipping...')
    return 0
  }
  
  // Create new score
  await prisma.score.create({ /* ... */ })
  return 1
}

async function main() {
  const { startDate, endDate } = await getDateRange()
  console.log(`Fetching data from ${startDate.toISOString()} to ${endDate.toISOString()}`)
  
  const legislators = await prisma.legislator.findMany()
  
  // Process in batches
  for (let i = 0; i < legislators.length; i += BATCH_SIZE) {
    const batch = legislators.slice(i, i + BATCH_SIZE)
    await Promise.allSettled(
      batch.map(leg => processLegislator(leg))
    )
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## Checklist for New Scripts

- [ ] Create test script (`test-[feature]-api.ts`)
- [ ] Implement incremental update logic (check latest score)
- [ ] Add batch processing for parallel execution
- [ ] Implement deduplication (check existing scores)
- [ ] Add date range filtering for efficiency
- [ ] Include error handling and logging
- [ ] Document API endpoints and response format
- [ ] Add command-line arguments for testing (e.g., `--legislator=name`)

## Maintenance

### Running Scripts
```bash
# Test API connectivity
npx tsx prisma/test-[feature]-api.ts

# Full fetch (initial run)
npx tsx prisma/fetch-[feature]-scores.ts

# Incremental update (12-hour cron)
npx tsx prisma/fetch-[feature]-scores.ts --incremental
```

### Monitoring
- Log total scores created vs skipped
- Track API response times
- Monitor error rates
- Alert on unexpected data format changes

## Database Schema Addition

Consider adding a `Metadata` table for tracking fetch timestamps:

```prisma
model Metadata {
  key       String   @id
  value     String
  updatedAt DateTime @updatedAt
}
```
