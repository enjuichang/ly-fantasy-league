# Test Suite for Fetch Scripts & Point Values

This directory contains comprehensive test scripts to verify that all fetch scripts and point values are working correctly after refactoring.

## Test Scripts

### 1. `test-point-values.ts`
Verifies all point values in the database are correct:
- ✅ PROPOSE_BILL base = 3 points
- ✅ PROPOSE_BILL passed bonus = 6 points (total 9)
- ✅ COSIGN_BILL = 3 points  
- ✅ WRITTEN_SPEECH = 3 points
- ✅ No old point values exist

**Run with:** `npm run test:points`

### 2. `test-fetch-propose.ts`
Tests the propose bill fetcher:
- Fetches propose bills for a single legislator
- Verifies base proposals = 3 points
- Verifies passed bonus = 6 points
- Checks for errors

**Run with:** `npm run test:fetch-propose`

### 3. `test-fetch-cosign.ts`
Tests the cosign bill fetcher:
- Fetches cosign bills for a single legislator
- Verifies all scores = 3 points
- Confirms only passed bills (三讀) are counted
- Checks for errors

**Run with:** `npm run test:fetch-cosign`

### 4. `test-fetch-written.ts`
Tests the written interpellation fetcher:
- Fetches written interpellations for a single legislator
- Verifies all scores = 3 points
- Validates total points = count × 3
- Checks for errors

**Run with:** `npm run test:fetch-written`

### 5. `run-all-tests.ts`
Master test runner that executes all tests in sequence:
- Runs all 4 test scripts above
- Provides a comprehensive summary
- Exit code 0 if all pass, 1 if any fail

**Run with:** `npm run test:all-fetchers`

## Quick Start

```bash
# Test point values only (fastest)
npm run test:points

# Test all fetchers and point values
npm run test:all-fetchers

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
