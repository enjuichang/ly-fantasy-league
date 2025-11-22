# Test Suite Organization

## Directory Structure

```
tests/
├── integration/               # Integration tests (external dependencies)
│   ├── api-fetching/         # API and fetch workflow tests
│   ├── api-validation/       # External API validation
│   ├── database/             # Database integrity tests
│   ├── fetchers/             # Fetch script integration tests
│   └── run-all-integration-tests.ts
│
├── unit/                      # Unit tests (isolated, fast)
│   ├── components/           # React component tests
│   │   ├── ErrorIndicator.test.tsx
│   │   ├── LeaveIndicator.test.tsx
│   │   ├── MatchupDisplay.test.tsx
│   │   ├── PlayerHistoryModal.test.tsx
│   │   └── TeamRoster.test.tsx
│   │
│   └── lib/                  # Utility function tests
│       ├── database.test.ts
│       ├── draft-logic.test.ts
│       ├── matchup-logic.test.ts
│       ├── party-utils.test.ts
│       ├── point-values.test.ts
│       ├── scoring-calculations.test.ts
│       └── utils.test.ts
│
├── helpers/                   # Test helpers and utilities
└── setup.ts                   # Test setup configuration
```

## Test Categories

### Integration Tests (`tests/integration/`)
Tests that interact with external systems (database, APIs, etc.):
- **Database tests**: Verify database state and point values
- **Fetcher tests**: Test complete fetch workflows
- **API validation**: Validate external Taiwan API responses

**Run with:**
```bash
npm run test:integration
npm run test:all-integration  # Run all integration tests
npm run test:points           # Quick point value check
```

### Unit Tests (`tests/unit/`)
Isolated, fast-running tests for individual functions and components:

#### Component Tests (`tests/unit/components/`)
React component behavior and rendering:
- User interactions (buttons, forms)
- Conditional rendering
- Props handling
- UI state management

#### Library Tests (`tests/unit/lib/`)
Pure function logic testing:
- Scoring calculations
- Draft algorithms
- Matchup logic
- Party utilities
- Point value rules

**Run with:**
```bash
npm run test:unit             # Run all unit tests
npm test                      # Run all tests (unit + integration)
```

## Test Rules

### Unit Tests
- ✅ No database access
- ✅ No external API calls
- ✅ Fast execution (< 100ms per test)
- ✅ Test one thing at a time
- ✅ Use mocks for dependencies

### Integration Tests
- ✅ Can access database
- ✅ Can call external APIs
- ✅ Test complete workflows
- ✅ Verify system integration
- ⚠️  Slower execution acceptable

### Component Tests
- ✅ Test user-facing behavior
- ✅ Test rendering logic
- ✅ Test event handlers
- ✅ Mock external dependencies
- ✅ Use React Testing Library

## Test Coverage

### Current Coverage

**Unit Tests:** 91 tests passing
- ✅ Point values (all categories)
- ✅ Scoring calculations
- ✅ Draft logic
- ✅ Matchup logic
- ✅ Party utilities
- ✅ Component rendering
- ✅ User interactions

**Integration Tests:** 12 tests
- ✅ Database point values
- ✅ Fetch propose bills
- ✅ Fetch cosign bills
- ✅ Fetch written interpellations
- ✅ API validation

## Running Tests

### Quick Commands
```bash
# All tests
npm test

# Unit tests only (fast)
npm run test:unit

# Integration tests only
npm run test:integration

# With UI
npm run test:ui

# With coverage report
npm run test:coverage
```

### Watch Mode
```bash
npm test -- --watch
```

### Specific File
```bash
npm test tests/unit/lib/point-values.test.ts
```

## Writing New Tests

### Unit Test Template
```typescript
import { describe, it, expect } from 'vitest'

describe('Feature Name', () => {
    it('should do something specific', () => {
        const result = functionUnderTest()
        expect(result).toBe(expected)
    })
})
```

### Component Test Template
```typescript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

describe('ComponentName', () => {
    it('renders correctly', () => {
        render(<Component prop="value" />)
        expect(screen.getByText('Expected Text')).toBeInTheDocument()
    })
})
```

## Best Practices

1. **Descriptive Test Names**: Use "should..." or "renders..." format
2. **AAA Pattern**: Arrange, Act, Assert
3. **One Assertion Per Test**: Focus on single behavior
4. **Test Behavior, Not Implementation**: Test what, not how
5. **Keep Tests Independent**: No test should depend on another
6. **Mock External Dependencies**: Database, APIs, etc.
7. **Use Test Data Builders**: Create reusable test data

## Continuous Integration

All tests run automatically on:
- ✅ Pull requests
- ✅ Main branch pushes
- ✅ Pre-deployment checks

Failed tests block deployment to ensure code quality.
