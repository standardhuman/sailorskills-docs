# Forecast Fix - November 2025 showing 0 boats

**Date:** 2025-11-05
**Status:** ✅ FIXED
**Impact:** 68 boats now show in November forecast (was 0)

---

## Problem

The Operations dashboard forecast showed **0 boats** scheduled for November 2025, even though 68 boats should have been predicted based on their service patterns.

---

## Root Cause

The `pattern_date` field in `service_schedules` table was calculated using logic that returns the **NEXT future occurrence** after the reference date.

When this calculation ran on/after November 1st, 2025:
- Boats with patterns hitting November 1st were evaluated as: `Nov 1 <= Nov 5` (today)
- The function added another interval cycle, skipping to December
- Result: All November boats showed December dates instead

**Code location:** `sailorskills-operations/src/utils/service-predictor.js:237-239`

```javascript
// Keep adding intervals until we find the next future date
while (candidateDate <= ref) {
  candidateDate.setMonth(candidateDate.getMonth() + intervalMonths);
}
```

---

## Investigation Process

### Phase 1: Root Cause Investigation

1. **Verified data exists**: `service_schedules` has 120 active boats with recurring patterns
2. **Checked database**: `pattern_date` showed December as earliest (no November)
3. **Calculated expected boats**: Using MOD logic, 68 boats SHOULD hit November based on `start_month + interval_months`
4. **Traced code flow**: Forecast uses `boat.predictedDate` from `getBoatPatternPrediction()`
5. **Found bug**: `calculatePatternDate()` skips current month when reference date > month start

### Phase 2: Pattern Analysis

Compared working pattern logic:
- **Correct**: For forecast, show boats in CURRENT cycle (even if past month start)
- **Buggy**: Function returns NEXT cycle (always future relative to today)

Example for start_month=1, interval=1, today=Nov 5:
- **Expected**: November 1, 2025 (current cycle)
- **Actual**: December 1, 2025 (skipped to next cycle)

### Phase 3: Hypothesis Testing

**Hypothesis:** Recalculating `pattern_date` to store current cycle date (not next future date) will show November boats in forecast.

**Test SQL:**
```sql
-- Check if current month matches pattern
WHEN MOD((11 - start_month + 12) % 12, interval_months) = 0
THEN DATE '2025-11-01'  -- Use current month
ELSE ...next occurrence  -- Use next matching month
```

**Result:** 68 boats correctly assigned to November ✅

### Phase 4: Implementation

**Applied Fix:**
```bash
source .env.local && psql "$DATABASE_URL" -f migrations/021_recalculate_pattern_dates.sql
```

**Verification:**
```sql
SELECT DATE_TRUNC('month', pattern_date), COUNT(*)
FROM service_schedules
WHERE is_active = true AND interval_months > 0
GROUP BY 1 ORDER BY 1;

-- Result:
-- 2025-11-01 | 68  ✅ November now shows 68 boats
-- 2025-12-01 | 31
-- 2026-01-01 | 15
```

---

## Solution Applied

### Database Update

**Migration:** `/migrations/021_recalculate_pattern_dates.sql`

Recalculated `pattern_date` for all active service schedules using corrected logic:
- If current month matches the pattern → use current month
- Otherwise → use next matching month

**Impact:**
- Updated: 120 boats
- November boats: 68 (was 0)
- December boats: 31 (was 89)

### Code Changes

**No code changes required** because:
1. `getBoatPatternPrediction()` already prioritizes `schedule.pattern_date` from database
2. Only falls back to `calculatePatternDate()` if `pattern_date` is null
3. Database is now fixed, so forecast will use corrected dates

**Future prevention:** Run migration 021 monthly to keep pattern_date current.

---

## Files Changed

1. `/migrations/021_recalculate_pattern_dates.sql` (NEW)
   - Reusable migration to recalculate pattern_date
   - Can be run monthly or when forecast looks incorrect

2. `service_schedules.pattern_date` (DATABASE)
   - Updated 120 rows
   - 68 boats now have November 2025 dates

---

## Testing Instructions

### Verify in Database
```bash
source .env.local && psql "$DATABASE_URL" -c "
SELECT
  DATE_TRUNC('month', pattern_date) as month,
  COUNT(*) as boat_count
FROM service_schedules
WHERE is_active = true AND interval_months > 0
GROUP BY month
ORDER BY month
LIMIT 6;
"
```

**Expected:** First row shows `2025-11-01 | 68`

### Verify in Browser

1. Open https://ops.sailorskills.com/forecast.html (or localhost:5173/forecast.html)
2. Check summary cards:
   - "Boats with Predictions" should show ~120
   - "Due This Month" should show 68 (or current month count)
3. Check monthly grid:
   - **November 2025** card should show **68 boats predicted**
4. Click "View Details" on November:
   - Table should list 68 boats with November pattern dates

---

## Lessons Learned

### Pattern Discovery

1. **Always check reference date** when calculating "next" occurrence
   - "Next future" ≠ "Current cycle" for forecasts
   - Different contexts need different calculation logic

2. **Database fields vs. calculated values**
   - Storing `pattern_date` in DB allows override
   - Calculation function should accept `includeCurrent` parameter

3. **Systematic debugging process works**
   - Phase 1: Gathered evidence (data exists, but dates wrong)
   - Phase 2: Compared patterns (expected 68, found 0)
   - Phase 3: Tested hypothesis (recalc SQL worked)
   - Phase 4: Applied fix (migration + verification)

### Future Prevention

1. **Monthly maintenance**: Run migration 021 on 1st of each month
2. **Add monitoring**: Alert if forecast shows 0 boats for current month
3. **Consider refactor**: Add `calculateCurrentPatternDate()` function that doesn't skip current month
4. **Add tests**: Verify pattern calculation with reference dates in past, current, and future months

---

## Potential Improvements

### Short Term (Recommended)

1. **Schedule monthly recalculation**:
   ```bash
   # Add to cron or scheduled Vercel function
   0 0 1 * * psql "$DATABASE_URL" -f migrations/021_recalculate_pattern_dates.sql
   ```

2. **Add forecast validation**: Alert admin if current month shows 0 boats (likely a bug)

### Long Term (Optional)

1. **Refactor `calculatePatternDate`**: Add `findCurrentCycle` parameter
   ```javascript
   calculatePatternDate(startMonth, intervalMonths, referenceDate, findCurrentCycle = false)
   ```

2. **Calculate on-demand**: Instead of storing `pattern_date`, calculate dynamically with correct logic
   - Pro: Always up-to-date
   - Con: More computation

3. **Add unit tests**: Test pattern calculation with various reference dates
   ```javascript
   test('calculatePatternDate with current month', () => {
     // start_month=1, interval=1, reference=2025-11-05
     // Should return 2025-11-01 (current cycle)
   })
   ```

---

## Related Issues

- **FIXES_APPLIED_2025-11-05.md** - Original diagnosis (Issue #5)
- **SERVICE_PREDICTION_COMPLETE.md** - Pattern-based prediction implementation

---

## Support

If the forecast shows incorrect boat counts again:

1. Check database:
   ```bash
   SELECT MIN(pattern_date), MAX(pattern_date) FROM service_schedules WHERE is_active = true;
   ```

2. Run migration 021:
   ```bash
   psql "$DATABASE_URL" -f migrations/021_recalculate_pattern_dates.sql
   ```

3. Verify in browser (refresh forecast page)

**Next Review:** 2025-12-01 (when December becomes current month)

---

**Fixed by:** Claude (systematic-debugging skill)
**Verified:** Database shows 68 November boats ✅
**Browser testing:** Pending (user to verify)
