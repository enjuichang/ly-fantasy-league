# Scripts Organization

All utility and test scripts have been reorganized into the `prisma/scripts` directory structure.

## Directory Structure

```
prisma/scripts/
├── fetch/                      # Data fetching scripts from external APIs
│   ├── fetch-cosign-scores.ts
│   ├── fetch-floor-speech.ts
│   ├── fetch-propose-scores.ts
│   ├── fetch-rollcall.ts
│   └── fetch-written-interpellation.ts
│
├── seed/                       # Database seeding scripts
│   ├── seed.ts
│   └── seed-historical-scores.ts
│
├── test-apis/                  # API testing and verification scripts
│   ├── test-all-interpellations.ts
│   ├── test-api-interpellation.ts
│   ├── test-floor-speech-api.ts
│   ├── test-scoring.ts
│   └── test-written-interpellation.ts
│
└── utils/                      # Utility and maintenance scripts
    ├── check-matchups.ts
    ├── check-rollcall.ts
    ├── check-written-scores-db.ts
    ├── clean-mock-data.ts
    ├── clear-bill-scores.ts
    ├── demo-new-scoring.ts
    ├── populate-written-scores.ts
    ├── regenerate-schedule.ts
    ├── update-points.ts
    └── verify-scoring.ts
```

## Purpose of Each Directory

### `fetch/`
Scripts that fetch data from Taiwan Legislative Yuan APIs and populate the database with scores.

### `seed/`
Scripts for initial database seeding and historical data population.

### `test-apis/`
Scripts to test API endpoints and verify data responses before using them in production fetchers.

### `utils/`
Maintenance and utility scripts for:
- Database cleanup and updates
- Score verification
- Data checking and debugging
- Schedule regeneration

## Cleanup Performed

- ✅ Moved all scripts from root `scripts/` to `prisma/scripts/`
- ✅ Organized scripts into logical subdirectories
- ✅ Removed empty `scripts/` directory
- ✅ Deleted `.DS_Store` files from repository
- ✅ All scripts are now properly organized by function
