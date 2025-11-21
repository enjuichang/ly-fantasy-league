# Manual Migrations

This directory contains one-off migration scripts for data transformations and verification.

## Scripts

### migrate-floor-speech-category.ts
**Purpose**: Renamed `FLOOR_SPEECH` category to `WRITTEN_SPEECH` in the database.

**When**: 2024-11-20

**What it does**:
- Updates all existing `FLOOR_SPEECH` scores to `WRITTEN_SPEECH`
- This was done to distinguish between written interpellations and oral floor speeches

**Usage**:
```bash
npx tsx prisma/migrations-manual/migrate-floor-speech-category.ts
```

### verify-floor-speech.ts
**Purpose**: Verification script for floor speech scores.

**What it does**:
- Checks `WRITTEN_SPEECH` and `FLOOR_SPEECH` scores for specific legislators
- Useful for debugging and verifying data integrity

**Usage**:
```bash
npx tsx prisma/migrations-manual/verify-floor-speech.ts
```

### check-tpp.ts
**Purpose**: TPP (Taiwan People's Party) legislator data verification.

**What it does**:
- Checks interpellation counts for TPP legislators
- Used during debugging of floor speech scoring

**Usage**:
```bash
npx tsx prisma/migrations-manual/check-tpp.ts
```

## Guidelines

- These scripts are **one-off** and should not be run repeatedly
- Always backup the database before running migration scripts
- Document the purpose and date of each migration
- Keep scripts for historical reference even after execution
