# API Processing Scripts - Implementation Checklist

This document tracks the implementation status of best practices for each API processing script.

## Scripts Overview

| Script | Test Script | Incremental Updates | 12hr Optimized | Status |
|--------|-------------|---------------------|----------------|--------|
| `fetch-floor-speech-scores.ts` | ✅ `test-floor-speech-api.ts` | ⚠️ Partial | ❌ No | In Progress |
| `fetch-interpellation-scores.ts` | ❌ Missing | ❌ No | ❌ No | Needs Update |
| `fetch-cosign-scores.ts` | ❌ Missing | ✅ Yes | ⚠️ Partial | Needs Test |
| `fetch-rollcall-scores.ts` | ❌ Missing | ❌ No | ❌ No | Needs Update |
| `fetch-bill-scores.ts` | ❌ Missing | ❌ No | ❌ No | Needs Update |

## Priority Updates

### High Priority
1. **Create test scripts** for all APIs
2. **Add incremental update logic** to `fetch-floor-speech-scores.ts`
3. **Optimize for 12-hour updates** across all scripts

### Medium Priority
1. Add `Metadata` table to schema for tracking last fetch times
2. Implement cron job scheduling for automated updates
3. Add monitoring and alerting for API failures

### Low Priority
1. Add retry logic for failed API calls
2. Implement rate limiting to avoid overwhelming APIs
3. Add data validation and sanitization

## Next Steps

1. **Immediate**: Run test script for Floor Speech API
2. **Today**: Create test scripts for remaining APIs
3. **This Week**: Implement incremental updates for all scripts
4. **This Month**: Set up automated 12-hour update schedule

## Notes

- All scripts should check for existing scores before creating new ones (deduplication)
- Batch processing is already implemented in most scripts (good!)
- Consider adding `--dry-run` flag for testing without DB writes
- Add `--date-range` flag for manual date range specification
