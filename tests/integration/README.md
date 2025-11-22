# Integration Tests for Fetch Scripts & Point Values

This directory contains integration tests that verify fetch scripts and database point values are working correctly.

## Directory Structure

```
tests/integration/
├── fetchers/                    # Tests for data fetching scripts
│   ├── test-fetch-propose.test.ts
│   ├── test-fetch-cosign.test.ts
│   └── test-fetch-written.test.ts
├── database/                    # Tests for database integrity
│   └── test-point-values.test.ts
├── api-validation/              # Tests for external API validation
│   ├── test-all-interpellations.test.ts
│   ├── test-api-interpellation.test.ts
│   ├── test-floor-speech-api.test.ts
│   ├── test-scoring.test.ts
│   └── test-written-interpellation.test.ts
└── run-all-integration-tests.ts # Master test runner
```

## Test Categories

### Fetchers (`fetchers/`)
Tests that verify data fetching workflows with the database:

#### `test-fetch-propose.test.ts`
- Fetches propose bills for a single legislator
- Verifies base proposals = 3 points
- Verifies passed bonus = 6 points
- **Run:** `npm run test:fetch-propose`

#### `test-fetch-cosign.test.ts`
- Fetches cosign bills for a single legislator
- Verifies all scores = 3 points
- Confirms only passed bills (三讀) are counted
- **Run:** `npm run test:fetch-cosign`

#### `test-fetch-written.test.ts`
- Fetches written interpellations for a single legislator
- Verifies all scores = 3 points
- Validates total points = count × 3
- **Run:** `npm run test:fetch-written`

### Database (`database/`)
Tests for database integrity and point values:

#### `test-point-values.test.ts`
- ✅ PROPOSE_BILL base = 3 points
- ✅ PROPOSE_BILL passed bonus = 6 points (total 9)
- ✅ COSIGN_BILL = 3 points  
- ✅ WRITTEN_SPEECH = 3 points
- ✅ No old point values exist
- **Run:** `npm run test:points`

### API Validation (`api-validation/`)
Tests for external Taiwan Legislative Yuan API validation:
- Tests API responses and data quality
- Validates API endpoints before integration
- Ensures data format compatibility

## Quick Start

```bash
# Test point values only (fastest)
npm run test:points

# Test all integration tests
npm run test:all-integration

# Test individual fetchers
npm run test:fetch-propose
npm run test:fetch-cosign
npm run test:fetch-written
```

## When to Run Tests

- ✅ After updating point values
- ✅ After refactoring fetch scripts
- ✅ Before deploying to production
- ✅ After database migrations
- ✅ When debugging scoring issues

## Test Results

All tests should PASS with:
- ✅ Correct point values
- ✅ No errors during fetching
- ✅ Proper data validation

## Troubleshooting

If tests fail:

1. **Check database**: Ensure scores were updated with `update-points.ts`
2. **Verify fetchers**: Check that fetch scripts use correct point values
3. **Review logs**: Look for API errors or connection issues
4. **Re-run updates**: If needed, run `tsx prisma/scripts/utils/update-points.ts`

