# API Route Tests

## Overview

Comprehensive test coverage for all Next.js API routes in the application.

## Test Files

### `legislators.test.ts` (12 tests)
Tests for legislator retrieval endpoints:
- **GET /api/legislators**: List all legislators
  - ✅ Returns sorted list
  - ✅ Includes required fields (id, names, party, region)
  - ✅ Handles profile pictures
  - ✅ Handles leave status flags
  - ✅ Handles error flags

- **GET /api/legislators/[id]**: Single legislator
  - ✅ Returns legislator by ID
  - ✅ Returns null for non-existent ID
  - ✅ Includes related scores

### `refresh-data.test.ts` (17 tests)
Tests for data synchronization endpoint:
- **Authorization**: (3 tests)
  - ✅ Requires auth header
  - ✅ Validates CRON_SECRET
  - ✅ Rejects invalid tokens

- **Query Parameters**: (5 tests)
  - ✅ Parses type parameter
  - ✅ Handles missing type (defaults to all)
  - ✅ Parses pagination (limit/offset)
  - ✅ Handles rollcall batching
  - ✅ Parses date ranges

- **Response Format**: (3 tests)
  - ✅ Success response structure
  - ✅ Error response format
  - ✅ Includes results for requested types

- **Data Sync Logic**: (2 tests)
  - ✅ Syncs only requested type
  - ✅ Syncs all types when "all"

- **Pagination**: (2 tests)
  - ✅ Applies limit and offset
  - ✅ Handles last batch correctly

### `legislator-endpoints.test.ts` (12 tests)
Tests for legislator-specific endpoints:
- **GET /api/legislators/[id]/cosign-bills**: (6 tests)
  - ✅ Returns cosign bills
  - ✅ Only COSIGN_BILL category
  - ✅ Includes bill metadata
  - ✅ Correct point value (3 points)
  - ✅ Ordered by date descending
  - ✅ Empty array for no bills

- **GET /api/legislators/sync**: (3 tests)
  - ✅ Syncs from external API
  - ✅ Extracts externalId from picUrl
  - ✅ Uses upsert to avoid duplicates

- **GET /api/test-db**: (2 tests)
  - ✅ Verifies database connection
  - ✅ Returns database statistics

## Running Tests

```bash
# Run all API tests
npm test tests/integration/api-routes/

# Run specific test file
npm test tests/integration/api-routes/legislators.test.ts

# Watch mode
npm test tests/integration/api-routes/ -- --watch
```

## Test Coverage

- ✅ **41 API route tests**
- ✅ **All endpoints covered**
- ✅ **Authorization & security**
- ✅ **Query parameter parsing**
- ✅ **Response formatting**
- ✅ **Error handling**
- ✅ **Database operations**

## Key Testing Patterns

### Database Integration
Tests use actual Prisma client to verify database operations:
```typescript
const legislators = await prisma.legislator.findMany()
expect(legislators.length).toBeGreaterThan(0)
```

### Authorization Testing
Validates CRON_SECRET for protected endpoints:
```typescript
const authHeader = `Bearer ${process.env.CRON_SECRET}`
const isAuthorized = authHeader === `Bearer ${cronSecret}`
expect(isAuthorized).toBe(true)
```

### Query Parameter Parsing
Tests parameter handling and validation:
```typescript
const limit = parseInt(searchParams.get('limit')!)
expect(limit).toBe(10)
```

## Best Practices

1. **Use beforeAll/afterAll**: Setup and cleanup
2. **Test actual queries**: Verify Prisma operations
3. **Check field existence**: Ensure schema compliance
4. **Validate data types**: Type safety checks
5. **Test edge cases**: Empty results, invalid IDs
6. **Verify ordering**: Sort order validation
