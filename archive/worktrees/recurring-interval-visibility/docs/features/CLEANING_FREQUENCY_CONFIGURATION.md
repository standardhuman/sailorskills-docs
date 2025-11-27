# Cleaning Frequency Pricing Configuration

**Date**: 2025-11-07
**Status**: ✅ Core Implementation Complete
**Related Issue**: Estimator cleaning frequency intervals ramping to 200% too quickly

---

## Summary

Implemented a configurable system for managing cleaning frequency time intervals and their associated surcharge multipliers in the Estimator. Pricing administrators can now adjust these values through a formula-based interface in Settings, eliminating the need to modify hardcoded values in JavaScript.

---

## What Was Built

### 1. Database Schema (Migration 027)

**Tables Created**:

1. **`cleaning_time_intervals`**
   - Stores configurable time ranges (e.g., "0-2 months", "3-4 months")
   - Fields: `interval_key`, `min_months`, `max_months`, `display_label`, `sort_order`, `is_active`
   - Seeded with current 7 intervals

2. **`cleaning_frequency_formulas`**
   - Stores formula parameters for each paint condition
   - Fields: `paint_condition`, `base_rate`, `escalation_factor`, `max_rate`
   - Formula: `surcharge = min(base_rate + (interval_index × escalation_factor), max_rate)`
   - Seeded with approximate formulas for current progression

3. **`cleaning_frequency_overrides`**
   - Allows manual overrides for specific interval + paint condition combinations
   - Fields: `interval_key`, `paint_condition`, `override_multiplier`, `reason`
   - Seeded with all 28 current hardcoded values (4 paint conditions × 7 intervals)

**Database View**:
- **`cleaning_frequency_surcharges`** - Combines formulas and overrides to show effective surcharge percentages

**RLS Policies**:
- Public read access (needed for Estimator)
- Staff-only write access (owner and admin roles)

**Location**: `/migrations/027_add_cleaning_frequency_config.sql`

---

### 2. Settings UI

**New Section in System Configuration Page**:

Location: `sailorskills-settings/src/views/system-config.html`

**Components**:

1. **Preset Templates** (Buttons)
   - Conservative Preset: Slower escalation (max 75-90%)
   - Aggressive Preset: Faster escalation (max 100%)
   - Reset to Current: Reload from database

2. **Time Intervals Management**
   - Display list of all configurable intervals
   - Edit min/max months and display labels
   - Future: Add/delete/reorder intervals

3. **Formula Editor**
   - Separate inputs for each paint condition (Excellent, Good, Fair, Poor)
   - Three parameters per condition:
     - Base Rate (%)
     - Escalation Factor (% added per interval)
     - Max Rate (% ceiling)
   - Live updates to preview matrix as values change

4. **Live Preview Matrix**
   - Color-coded table showing calculated surcharges
   - Rows: Time intervals
   - Columns: Paint conditions
   - Colors:
     - 🟢 Green (0-24%): Low surcharge
     - 🟡 Yellow (25-49%): Medium surcharge
     - 🟠 Orange (50-79%): High surcharge
     - 🔴 Red (80-100%): Very high surcharge

**Files Modified**:
- `sailorskills-settings/src/views/system-config.html` (HTML structure)
- `sailorskills-settings/src/styles/system-config.css` (Styling)
- `sailorskills-settings/src/views/system-config.js` (JavaScript logic)

---

### 3. Estimator Integration

**New Service**:
- **`cleaningFrequencyService.js`** - Fetches configuration from database
  - 5-minute cache to minimize database queries
  - Graceful fallback to hardcoded values if database unavailable
  - Methods:
    - `getCleaningFrequencySurcharges()` - Fetch all surcharges
    - `getCleaningSurcharge(intervalKey, paintCondition)` - Get specific surcharge
    - `getCleaningTimeIntervals()` - Fetch intervals for dropdown rendering
    - `clearCache()` - Force refresh after configuration updates

**Updated Files**:
- **`calculator.js`**:
  - Changed `getGrowthSurcharge()` from sync to async
  - Attempts to fetch from database first, falls back to hardcoded values
  - Maintains backward compatibility

- **`formHandler.js`**:
  - Updated `calculateAndDisplayCost()` to async
  - Now awaits `calculateServiceCost()`

---

## Current Data

### Seeded Formula Approximations

| Paint Condition | Base Rate | Escalation Factor | Max Rate |
|-----------------|-----------|-------------------|----------|
| Excellent       | 0%        | 15%               | 100%     |
| Good            | 0%        | 15.5%             | 100%     |
| Fair            | 0%        | 16.5%             | 100%     |
| Poor            | 30%       | 14%               | 100%     |

### Current Surcharge Progression (from Overrides)

| Time Since Cleaning | Excellent | Good  | Fair  | Poor  |
|---------------------|-----------|-------|-------|-------|
| 0-2 months          | 0%        | 0%    | 0%    | 30%   |
| 3-4 months          | 0%        | 0%    | 25%   | 50%   |
| 5-6 months          | 25%       | 25%   | 40%   | 80%   |
| 7-8 months          | 40%       | 40%   | 70%   | 90%   |
| 9-12 months         | 70%       | 75%   | 85%   | 95%   |
| 13-24 months        | 85%       | 90%   | 95%   | 100%  |
| 24+ months          | 100%      | 100%  | 100%  | 100%  |

### Notable Escalation Issues (as originally reported)

- **Excellent paint**: Jumps 30% points (40% → 70%) between 7-8 and 9-12 months
- **Good paint**: Jumps 35% points (40% → 75%) between 7-8 and 9-12 months
- **Fair paint**: Early jump of 25% (0% → 25%) at 3-4 months, then 30% jump at 7-8 months
- **Poor paint**: Aggressive escalation with 30% point jumps early (30% → 50% → 80%)

---

## How to Use

### For Pricing Administrators

1. **Access Settings**:
   - Navigate to https://sailorskills-settings.vercel.app/src/views/system-config.html
   - Scroll to "Cleaning Frequency Pricing" section

2. **Review Current Values**:
   - Check the live preview matrix
   - Identify steep escalations (red cells = very high surcharges)

3. **Adjust Formulas**:
   - **Option A: Use Presets**
     - Click "Conservative Preset" for gentler progression (recommended)
     - Click "Aggressive Preset" for steeper progression

   - **Option B: Manual Adjustment**
     - Modify Base Rate, Escalation Factor, or Max Rate for each paint condition
     - Watch preview matrix update in real-time
     - Adjust until progression feels appropriate

4. **Save Changes**:
   - *Note*: Save functionality needs to be integrated with main "Save All Changes" button
   - Changes persist in database and apply immediately to Estimator

### For Developers

**Query current config**:
```sql
SELECT * FROM cleaning_frequency_surcharges
WHERE paint_condition = 'excellent'
ORDER BY sort_order;
```

**Update a formula**:
```sql
UPDATE cleaning_frequency_formulas
SET escalation_factor = 12.00
WHERE paint_condition = 'excellent';
```

**Add a manual override**:
```sql
INSERT INTO cleaning_frequency_overrides
(interval_key, paint_condition, override_multiplier, reason)
VALUES ('9-12_months', 'excellent', 0.55, 'Reduce steep jump');
```

---

## What's Working

✅ Database migration and seeding
✅ Settings UI renders correctly
✅ Formula editor with live preview
✅ Preset templates (Conservative/Aggressive)
✅ Database view calculates surcharges correctly
✅ Estimator fetches configuration from database
✅ Graceful fallback to hardcoded values
✅ 5-minute caching for performance

---

## What's Not Yet Implemented

### High Priority

1. **Save Functionality**
   - Formula changes are not yet saved to database
   - Need to wire up save button in Settings UI
   - Should call `saveCleaningFrequency()` function (already exists)

2. **Dynamic Interval Dropdown in Estimator**
   - Currently hardcoded in `estimator.html`
   - Should fetch from `cleaning_time_intervals` table
   - Would allow adding/removing/reordering intervals without code changes

### Medium Priority

3. **Interval Editing**
   - Interval management UI is rendered but non-functional
   - Need to implement:
     - Add new interval
     - Edit min/max months
     - Delete interval
     - Reorder intervals (drag-and-drop)

4. **Override Management**
   - No UI for creating/editing manual overrides
   - Currently can only modify via SQL

5. **Shared Package Service**
   - Consider moving `cleaningFrequencyService.js` to sailorskills-shared
   - Would allow reuse across multiple services
   - Add validation and error handling

### Low Priority

6. **Integration Testing**
   - End-to-end test: Change formula in Settings → Verify price change in Estimator
   - Test fallback behavior when database unavailable
   - Test cache invalidation

7. **Audit Logging**
   - Track who changed what and when
   - Link to existing `updated_by` field in formulas table

8. **Documentation**
   - User guide for pricing administrators
   - Formula tuning recommendations
   - Migration guide from hardcoded to configured values

---

## Technical Notes

### Why Overrides Instead of Formulas?

The initial seeding uses overrides (not formulas) to match the exact current hardcoded values. This ensures:
- Zero pricing changes during migration
- Ability to A/B test formula vs. hardcoded approaches
- Safety net if formulas produce unexpected results

**Future**: Once formulas are tuned and tested, overrides can be deleted to rely solely on formula calculations.

### Formula Calculation

```javascript
surcharge = min(
  base_rate + (interval_index × escalation_factor),
  max_rate
)
```

**Example** (Excellent paint):
- Interval 0 (0-2 months): `min(0 + (0 × 15), 100) = 0%`
- Interval 2 (5-6 months): `min(0 + (2 × 15), 100) = 30%`
- Interval 4 (9-12 months): `min(0 + (4 × 15), 100) = 60%`

This produces a linear escalation, much smoother than the current hardcoded jumps.

### Caching Strategy

The Estimator caches configuration for 5 minutes to avoid repeated database queries during user interactions. Cache is invalidated after saves in Settings (future enhancement).

---

## Next Steps for User

### Immediate Review

1. **Access Settings UI** (http://localhost:5179/src/views/system-config.html)
2. **Review current surcharge matrix** - Identify problematic escalations
3. **Test presets**:
   - Click "Conservative Preset"
   - Check if progression looks better
   - Click "Aggressive Preset"
   - Compare to current values

### Recommended Approach

**Phase 1: Test Formula-Based Approach**
1. Click "Conservative Preset" in Settings
2. Review preview matrix
3. If satisfied, implement save functionality
4. Deploy and monitor Estimator pricing

**Phase 2: Fine-Tune Formulas**
1. Adjust escalation factors based on business feedback
2. Test with sample boat sizes/conditions
3. Compare pricing to historical averages

**Phase 3: Remove Overrides**
1. Once formulas are proven reliable
2. Delete rows from `cleaning_frequency_overrides` table
3. System will automatically use formula-calculated values

---

## Migration Impact

**Database Changes**: Low risk
- New tables only, no modifications to existing schema
- Public read access maintains compatibility

**Estimator Behavior**: Zero change initially
- Database returns exact same values as hardcoded logic
- Graceful fallback ensures continuity

**Settings UI**: New feature
- No changes to existing pricing configuration
- Isolated in new section

---

## Questions for User

1. **Progression preferences**:
   - Should escalation be linear (formula-based)?
   - Or keep non-linear jumps (current hardcoded)?

2. **Interval flexibility**:
   - Do you want to add/remove/reorder intervals?
   - Or are current 7 intervals sufficient?

3. **Override strategy**:
   - Transition to formulas immediately?
   - Or keep overrides and tune formulas first?

4. **Conservative vs. Aggressive**:
   - Which preset feels more appropriate?
   - Need custom tuning?

---

**Status**: Ready for review and testing
**Next Action**: User evaluation of Settings UI and preset options
**Blocking**: None (system fully functional with current hardcoded values)
