# Custom Cleaning Frequency Progression

**Date**: 2025-11-07
**Status**: ✅ Deployed
**Migration**: 028_update_cleaning_frequency_custom_progression.sql

---

## Summary

Implemented custom "gradual-then-steep" cleaning frequency progression with:
- **Conservative max (60%)** for well-maintained boats (Excellent/Good/Fair paint)
- **Aggressive max (200%)** for neglected boats (Poor paint)

This pricing strategy rewards regular maintenance while heavily penalizing boats that are both in poor condition AND haven't been cleaned in a long time.

---

## Complete Surcharge Matrix

```
Time Since Cleaning         Excellent  Good   Fair   Poor
──────────────────────────  ─────────  ─────  ─────  ──────
Within 2 months                  0%     0%     0%     30%
3-4 months ago                   5%     5%     5%     50%
5-6 months ago                  12%    12%    12%     75%
7-8 months ago                  22%    22%    22%    105%
9-12 months ago                 35%    35%    35%    140%
13-24 months ago                48%    48%    48%    170%
Over 24 months / Unsure         60%    60%    60%    200%
```

---

## Progression Characteristics

### Gradual-Then-Steep Pattern

**Early intervals** (0-6 months):
- Small increments: +5%, +7%
- Allows some slack for boats that are mostly maintained

**Middle intervals** (7-12 months):
- Moderate increments: +10%, +13%
- Signals increasing difficulty/time required

**Late intervals** (13-24+ months):
- Larger increments: +13%, +12%
- But capped at reasonable max for good paint

### Paint Condition Tiers

**Tier 1: Excellent/Good/Fair (60% max)**
- Unified max surcharge regardless of paint quality
- Simplifies pricing
- Rewards all boats with decent paint maintenance

**Tier 2: Poor (200% max)**
- Starts higher (30% base even with recent cleaning)
- Escalates much faster (+20%, +25%, +30% jumps)
- Reflects reality: poor paint + fouling = extremely difficult job

---

## Business Rationale

### Why 60% Max for Good Paint?

1. **Rewards maintenance**: Boats that keep paint in good shape shouldn't be penalized as heavily
2. **Competitive pricing**: 60% surcharge keeps prices reasonable vs. competitors
3. **Customer retention**: Prevents shocking customers with 2x+ price increases
4. **Fair difficulty assessment**: Even neglected good paint is manageable work

### Why 200% Max for Poor Paint?

1. **Reflects true difficulty**: Poor paint + heavy fouling = 2-3x the work
2. **Material costs**: May require additional tools, chemicals, or prep
3. **Time intensive**: Scraping around degraded paint is slow, careful work
4. **Discourages problem boats**: Signals that poor maintenance = high cost
5. **Business protection**: Ensures profitability on the hardest jobs

---

## Customer Pricing Examples

**Scenario: 40-foot boat, recurring cleaning service ($1.50/ft base rate)**

### Well-Maintained Boat
```
Base cost: $60
Paint: Excellent
Last cleaned: 9-12 months ago
Surcharge: 35% ($21.00)
Total: $81.00
```

### Moderately Maintained Boat
```
Base cost: $60
Paint: Fair
Last cleaned: 13-24 months ago
Surcharge: 48% ($28.80)
Total: $88.80
```

### Neglected Boat (Worst Case)
```
Base cost: $60
Paint: Poor
Last cleaned: 24+ months / unsure
Surcharge: 200% ($120.00)
Total: $180.00
```

**Price spread**: $60 - $180 (3x difference between best and worst)

---

## Comparison to Previous Progression

### Excellent Paint

**Before:**
```
0% → 0% → 25% → 40% → 70% → 85% → 100%
```
- Notable jump: 40% → 70% (30 point increase)
- Max: 100%

**After:**
```
0% → 5% → 12% → 22% → 35% → 48% → 60%
```
- Smoother: largest jump is 13 points
- Max: 60% (40% reduction in max surcharge)

### Poor Paint

**Before:**
```
30% → 50% → 80% → 90% → 95% → 100% → 100%
```
- Max: 100%
- Topped out too early (95% by 9-12 months)

**After:**
```
30% → 50% → 75% → 105% → 140% → 170% → 200%
```
- Max: 200% (100% increase in max surcharge)
- Continues to escalate throughout all intervals
- More accurately reflects increasing difficulty

---

## Implementation Details

### Database Structure

**Tables Used:**
- `cleaning_frequency_overrides`: Stores all 28 custom values (4 conditions × 7 intervals)
- `cleaning_frequency_surcharges` (view): Calculates effective surcharges

**Why Overrides?**

Using manual overrides instead of formulas because:
1. "Gradual-then-steep" is non-linear (can't be expressed as simple base + index × factor)
2. Provides exact control over each value
3. Easy to fine-tune specific intervals
4. Can be updated via Settings UI in the future

### Migration Applied

**File**: `migrations/028_update_cleaning_frequency_custom_progression.sql`

**Actions:**
1. Deleted all existing overrides (28 rows)
2. Inserted new custom progression (28 rows)
3. Added comment explaining the pricing strategy

### Backward Compatibility

- No breaking changes
- Estimator continues to fetch from same database view
- Falls back to hardcoded values if database unavailable
- All existing code works without modification

---

## Testing Results

### Database Verification ✅

```bash
node test-cleaning-frequency-save.mjs
```

- All 28 overrides loaded correctly
- View calculates surcharges properly
- RLS policies allow public read access

### Estimator Integration ✅

```bash
node test-estimator-pricing.mjs
```

- Pricing calculator uses new surcharges
- Fallback to hardcoded values works if needed
- Cache refreshes properly (5-minute TTL)

### Settings UI ✅

- Preview matrix displays new progression
- Color coding reflects new ranges (60% = yellow, 200% = dark red)
- Save functionality persists changes
- Preset templates work alongside custom values

---

## Adjusting Values (Future)

### Via Settings UI (Future Enhancement)

Once interval editing is implemented, admins will be able to:
1. Adjust individual surcharge percentages
2. Add/remove time intervals
3. Test different progressions with live preview
4. Save and deploy changes instantly

### Via SQL (Current Method)

To adjust specific values:

```sql
-- Reduce Poor paint max from 200% to 150%
UPDATE cleaning_frequency_overrides
SET override_multiplier = 150
WHERE interval_key = 'over_24_months_unsure'
  AND paint_condition = 'poor';

-- Add gentle start for Fair paint
UPDATE cleaning_frequency_overrides
SET override_multiplier = 3
WHERE interval_key = '3-4_months'
  AND paint_condition = 'fair';
```

---

## Business Metrics to Monitor

After deploying this pricing:

1. **Conversion rate**: Does conservative pricing for good paint increase bookings?
2. **Average job value**: Has the 200% max for poor paint affected overall revenue?
3. **Customer feedback**: Are price increases (especially for poor paint) well-received?
4. **Profitability**: Does 200% surcharge adequately cover poor paint difficulty?
5. **Paint distribution**: What % of customers have poor vs. excellent paint?

---

## Recommendations

### Short-term (Next 30 days)

1. **Monitor customer reactions** to the 200% surcharge for poor paint
2. **Track completion times** for jobs with different paint conditions
3. **Gather field team feedback** on whether 60% max for good paint is sufficient

### Medium-term (Next 90 days)

4. **A/B test** slight variations in the progression
5. **Analyze pricing** by marina/location to see if adjustments needed
6. **Build override management UI** in Settings for easier tuning

### Long-term

7. **Consider dynamic pricing** based on season, demand, or availability
8. **Add paint degradation tracking** to suggest repainting timelines
9. **Implement pricing calculator** for customers on marketing site

---

## Support & Troubleshooting

### Verifying Current Progression

```bash
source db-env.sh
psql "$DATABASE_URL" -c "SELECT * FROM cleaning_frequency_surcharges ORDER BY sort_order, paint_condition;"
```

### Reverting to Previous Progression

```bash
# Re-run migration 027 to restore original values
psql "$DATABASE_URL" -f migrations/027_add_cleaning_frequency_config.sql
```

### Clearing Estimator Cache

The Estimator caches surcharges for 5 minutes. To force immediate refresh:
- Restart the Estimator development server
- Or wait 5 minutes for cache to expire naturally

---

**Status**: ✅ Production-ready
**Last Updated**: 2025-11-07
**Next Review**: Monitor for 30 days, then assess if adjustments needed
