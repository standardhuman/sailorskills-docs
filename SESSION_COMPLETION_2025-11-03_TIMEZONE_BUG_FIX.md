# Session Completion - Timezone Bug Fix

**Date:** 2025-11-03
**Duration:** ~2 hours
**Status:** ✅ COMPLETE - Critical Bug Fixed

---

## The Bug

Boats with December pattern dates were incorrectly showing:
- **Service Month:** "November 2025" (should be "December 2025")
- **Widget:** Appearing in "Due This Month" November widget (should only appear in December)

### Affected Boats
- Andiamo (3-month interval, starts March → Dec 1 service)
- Amaterasu (3-month interval, starts September → Dec 1 service)
- Bee Mused (3-month interval, starts September → Dec 1 service)
- **Plus 18 other boats** - all with December pattern dates

---

## Root Cause: Timezone Conversion Bug

### The Problem

**Database Storage:**
```
pattern_date: "2025-12-01"  (date-only string, no time/timezone)
```

**JavaScript Parsing:**
```javascript
new Date("2025-12-01")
// Interprets as: 2025-12-01T00:00:00Z (UTC midnight)
// Converts to PST: 2025-11-30T16:00:00-08:00 (Nov 30, 4 PM)
// Result: November 30, 2025 ❌
```

**Impact:**
- `getMonth()` returns `10` (November) instead of `11` (December)
- `toLocaleString()` returns "November 2025" instead of "December 2025"
- `isInMonth()` checks match November, not December

### Debug Evidence

Console output showed:
```javascript
🔍 API Andiamo: {
  schedule_pattern_date: "2025-12-01",  // ✓ Database correct
  ...
}

🔍 DEBUG Andiamo: {
  schedule_pattern_date: "2025-12-01",
  calculated_patternDate: "Sun Nov 30 2025 16:00:00 GMT-0800",  // ❌ Shifted!
  pattern_month: 10,  // ❌ November (0-indexed)
  serviceMonth: "November 2025"  // ❌ Wrong month
}
```

---

## The Solution

### Added `parseLocalDate()` Helper Function

**File:** `src/utils/service-predictor.js`

```javascript
/**
 * Parse a date string safely, treating date-only strings as local dates
 * to avoid timezone shifts (e.g., "2025-12-01" should be Dec 1 local, not Nov 30)
 */
function parseLocalDate(dateValue) {
  if (!dateValue) return null;
  if (dateValue instanceof Date) return dateValue;

  const dateStr = String(dateValue);

  // If it's a date-only string (YYYY-MM-DD), parse as local date
  // Otherwise new Date() treats it as UTC and timezone shifts occur
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed
  }

  // For timestamps with time component, use normal parsing
  return new Date(dateStr);
}
```

### Updated Pattern Prediction

**Before:**
```javascript
const patternDate = schedule.pattern_date ? new Date(schedule.pattern_date) :
                   calculatePatternDate(...);
```

**After:**
```javascript
const patternDate = schedule.pattern_date ? parseLocalDate(schedule.pattern_date) :
                   calculatePatternDate(...);
```

---

## How It Works Now

### Correct Parsing

**Database:**
```
pattern_date: "2025-12-01"
```

**JavaScript (with fix):**
```javascript
parseLocalDate("2025-12-01")
// Parses as: new Date(2025, 11, 1)  // month 11 = December
// Result: Mon Dec 01 2025 00:00:00 GMT-0800 ✓
// getMonth() = 11 (December) ✓
// serviceMonth = "December 2025" ✓
```

### Widget Behavior

**Before Fix:**
- 21 boats showing in November widget ❌
- All had pattern_date = December 1
- Displayed "📅 November 2025" ❌

**After Fix:**
- 0 boats showing in November widget ✓ (correct - they're due in December)
- Will appear in December widget when that month comes
- Display "📅 December 2025" ✓

---

## Testing Results

### Verification Queries

**Database Check:**
```sql
SELECT boat_name, pattern_date,
       EXTRACT(MONTH FROM pattern_date) as month_num
FROM service_schedules ss
JOIN boats b ON b.id = ss.boat_id
WHERE boat_name IN ('Andiamo', 'Amaterasu', 'Bee Mused');

-- Results: All show month_num = 12 (December) ✓
```

**Frontend Check:**
```javascript
// Console logs after fix showed:
parseLocalDate("2025-12-01")
// Returns: Mon Dec 01 2025 00:00:00 GMT-0800 ✓
// getMonth() = 11 ✓
// serviceMonth = "December 2025" ✓
```

### Production Verification

- ✅ Boats no longer appear in November "Due This Month" widget
- ✅ Pattern dates correctly interpreted as December
- ✅ Service month displays "December 2025" not "November 2025"
- ✅ Boats will appear in correct month's widget

---

## Files Modified

1. **src/utils/service-predictor.js** (+19 lines)
   - Added `parseLocalDate()` helper function
   - Updated `getBoatPatternPrediction()` to use helper
   - Fixed both `pattern_date` and `scheduled_date` parsing

2. **src/api/predictions.js** (-20 lines)
   - Removed debug logging

**Total:** 2 files, net -1 line (added helper, removed debug)

---

## Git Commits

```
c877612 - fix(operations): correct timezone bug in pattern date parsing
784478e - debug: add comprehensive logging to trace November bug
0afb8e2 - debug: add logging to trace serviceMonth calculation bug
```

**Main Fix Commit:** `c877612`

---

## Impact

### Boats Affected
- **21 boats total** with December 2025 pattern dates
- All were incorrectly showing in November
- All now correctly filtered out of November widget

### System-Wide Impact
- ✅ **Dashboard Widget:** Shows correct boats for current month
- ✅ **Forecast Page:** Displays correct service months
- ✅ **Pattern Calculations:** Accurate month predictions
- ✅ **isInMonth() Filtering:** Works correctly for month selection

---

## Technical Details

### Why This Bug Happened

JavaScript's `Date` constructor behavior:
- `new Date("2025-12-01")` → Interprets as UTC
- `new Date("2025-12-01T00:00:00")` → Also interprets as UTC if no timezone
- `new Date(2025, 11, 1)` → Interprets as local time ✓

For date-only strings without timezone info, JavaScript defaults to UTC, causing PST (UTC-8) to shift the date backward by 8 hours.

### Pattern Recognition

The fix detects date-only strings with regex:
```javascript
/^\d{4}-\d{2}-\d{2}$/
```

This matches:
- ✓ "2025-12-01"
- ✓ "2025-11-30"
- ✗ "2025-12-01T08:00:00.000Z" (has time, parse normally)
- ✗ "2025-12-01T00:00:00-08:00" (has timezone, parse normally)

---

## Prevention

### For Future Date Fields

When adding new date fields to the database:

**If date-only (no time needed):**
```javascript
// ✓ Use parseLocalDate()
const myDate = parseLocalDate(schedule.my_date_field);
```

**If timestamp (includes time):**
```javascript
// ✓ Normal parsing is fine
const myDate = new Date(schedule.my_timestamp_field);
```

### Database Considerations

**Current Schema:**
- `pattern_date` and `scheduled_date` store as `DATE` type
- PostgreSQL returns as "YYYY-MM-DD" string
- Must use `parseLocalDate()` in frontend

**Alternative (not recommended):**
- Could store as `TIMESTAMP` with explicit timezone
- But date-only is semantically correct for service dates
- Better to fix parsing than change schema

---

## Testing Checklist

- [x] Database shows correct December dates
- [x] Frontend parseLocalDate() returns December dates
- [x] Service month displays "December 2025"
- [x] Boats excluded from November widget
- [x] Pattern calculation returns correct month
- [x] isInMonth() filtering works correctly
- [x] No console errors
- [x] Deployed to production
- [x] Verified in production

---

## Related Issues

### About Plan Status

**Note:** During investigation, we found:
- Andiamo, Amaterasu, Shirley Jean have `plan_status = NULL` in database
- User reported seeing "Expired" status
- This is **NOT a bug** - these are different fields:
  - `boats.plan_status` = subscription status (Subbed, Cancelled, etc.)
  - Status badges in UI show service prediction status (Future, Due Soon, Overdue)

The timezone bug was the only actual issue.

---

## Lessons Learned

1. **Always check timezone handling** when parsing date strings
2. **Date-only strings need special handling** in JavaScript
3. **Debug logging is invaluable** for tracking data transformations
4. **Test with real database values**, not just hardcoded test data
5. **Browser console logging** can show exact transformation steps

---

## Production Status

- **URL:** https://ops.sailorskills.com
- **Status:** ✅ Live and working correctly
- **Verified:** 2025-11-03 at ~16:00 PST
- **Impact:** 21 boats now correctly scheduled

---

## Next Steps (Optional)

### Potential Enhancements
1. Add unit tests for `parseLocalDate()` function
2. Add E2E tests for month filtering accuracy
3. Audit other date fields for similar timezone issues
4. Consider adding JSDoc timezone warnings to date parameters

### Known Non-Issues
- ✅ One-time services correctly excluded (interval_months=0)
- ✅ Cancelled/Expired boats filtered out
- ✅ Pattern calculation handles year rollovers
- ✅ Deviation tracking works correctly

---

## Summary

**Problem:** Timezone bug caused December dates to appear as November
**Cause:** JavaScript parsing "YYYY-MM-DD" strings as UTC, shifting to previous day in PST
**Solution:** Added `parseLocalDate()` helper to parse date-only strings in local time
**Result:** All boats now show correct service months and appear in correct month widgets

**Status:** ✅ COMPLETE - Bug Fixed and Deployed

---

**Session completed successfully with critical timezone bug resolved!**
