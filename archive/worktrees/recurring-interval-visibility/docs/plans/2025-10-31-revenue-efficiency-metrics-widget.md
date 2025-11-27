# Revenue Efficiency Metrics Widget - Design Document

**Date:** 2025-10-31
**Status:** Approved
**Target Service:** sailorskills-dashboard
**Priority:** Medium (Q1 2026 roadmap item, moved to immediate implementation)

---

## Overview

Add Revenue Efficiency Metrics widget to the Dashboard to track operational performance and profitability. This widget displays key performance indicators showing how effectively the business converts time and labor into revenue.

**Metrics Displayed:**
- **Dollars per Hour**: Total revenue / total service hours
- **Average Dollars per Boat**: Total revenue / number of boats serviced
- **Boats per Hour**: Number of boats serviced / total service hours

**Primary Use Cases:**
- Track operational performance over time
- Make pricing decisions based on efficiency data
- Evaluate service profitability across different service types
- General business intelligence dashboard

---

## Architecture

### Approach: Client-Side Calculation

**Decision:** Follow existing Dashboard widget pattern - query Supabase directly from `dashboard.js` and calculate metrics client-side.

**Rationale:**
- Consistency with existing widgets (Revenue, Bookings, Customers, Inventory)
- No database migration required
- Rapid development
- Sufficient performance at current scale (~28-500 services/month)
- Easy debugging with all logic in one place

**Future Consideration:** If scale exceeds 1,000 services/month, migrate to database view for pre-calculated aggregations.

---

## Data Flow

1. **Query Supabase:**
   - Join `service_logs` (WHERE `total_hours IS NOT NULL AND total_hours > 0`)
   - With `invoices` (WHERE `status != 'void'`)
   - ON `service_logs.invoice_id = invoices.id`
   - Filter by selected date range based on `service_logs.service_date`

2. **Calculate Metrics (JavaScript):**
   ```javascript
   totalRevenue = SUM(invoices.amount)
   totalHours = SUM(service_logs.total_hours)
   uniqueBoats = COUNT(DISTINCT service_logs.boat_id)

   dollarsPerHour = totalRevenue / totalHours
   dollarsPerBoat = totalRevenue / uniqueBoats
   boatsPerHour = uniqueBoats / totalHours
   ```

3. **Update DOM:**
   - Format currency with `formatCurrency()` helper
   - Round rates to 2 decimals
   - Display whole numbers for counts

4. **Refresh:**
   - Auto-refresh every 5 minutes (matches other widgets)
   - Manual refresh via widget header button
   - Refresh on date range change

---

## UI Components

### Widget Structure

**Location:** After Inventory widget in widgets grid

**Widget HTML:**
```html
<div class="widget" id="efficiency-widget">
  <div class="widget-header">
    <h2>⚡ Efficiency Metrics</h2>
    <span class="widget-refresh" data-widget="efficiency">↻</span>
  </div>
  <div class="widget-content">
    <div class="metric-primary">
      <div class="metric-value" id="efficiency-dollars-per-hour">$0</div>
      <div class="metric-label">Dollars per Hour</div>
    </div>
    <div class="metrics-secondary">
      <div class="metric">
        <div class="metric-value" id="efficiency-dollars-per-boat">$0</div>
        <div class="metric-label">Avg per Boat</div>
      </div>
      <div class="metric">
        <div class="metric-value" id="efficiency-boats-per-hour">0</div>
        <div class="metric-label">Boats/Hour</div>
      </div>
    </div>
    <div class="metric-footer">
      <small id="efficiency-period">Last 30 days</small>
    </div>
  </div>
  <div class="widget-loading">Loading...</div>
  <div class="widget-error">Failed to load efficiency data</div>
</div>
```

### Date Range Selector

**Location:** Above widgets grid (new controls bar) or inside efficiency widget header

**Options:**
- "7 Days"
- "30 Days" (default, highlighted)
- "90 Days"
- "YTD" (Year to Date)

**Behavior:**
- Clicking button refreshes only efficiency widget
- Highlights active selection
- Updates footer text to show selected range

### Service Type Breakdown Toggle

**Location:** Inside efficiency widget, below main metrics

**Two States:**
1. **"All Services" (default):** Aggregate metrics across all service types
2. **"By Service Type":** Expands to show breakdown table

**Breakdown Table:**
- **Columns:** Service Type | Revenue | Hours | $/Hour | Boats | $/Boat
- **Rows:** One per service type (diving, pressure washing, bottom painting, etc.)
- **Sorting:** By revenue (highest first)
- **Purpose:** Identify which services are most/least efficient

---

## Data Handling & Edge Cases

### Data Quality Filters

**Include only services that have:**
- `service_logs.total_hours IS NOT NULL AND total_hours > 0`
- `service_logs.invoice_id IS NOT NULL` (successfully linked to invoice)
- `invoices.status != 'void'`

**Current Data Context:**
- ~873 linked services out of 1,463 total (60% linkage rate)
- Based on services from 2023-01-03 to 2025-10-29
- Total revenue: $186,439.03 across 1,617 invoices

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **No services in date range** | Display "No data for this period", show $0.00 for metrics |
| **Total hours = 0** | Show "N/A" for $/hour and boats/hour |
| **Boat count = 0** | Show "N/A" for $/boat |
| **Service type missing** | Group as "Other" or "Unspecified" |
| **Partial data** | Exclude services missing hours OR invoice, show count in footer: "Based on 28 of 45 services (17 missing time or invoice)" |

### Performance Optimization

- **Single query:** Fetch all data once per date range selection
- **Client-side caching:** Don't re-query when toggling aggregate/breakdown views
- **Parallel loading:** Don't block other widgets during data fetch
- **Efficient processing:** Modern browsers handle 500-1,500 records trivially

### Data Accuracy

- **Date basis:** Use `service_logs.service_date` (when work was done), not `invoices.issued_at`
- **Rationale:** Ensures metrics reflect actual operational performance in the time period
- **Alignment:** Matches operational reality and business calendar

---

## Implementation Details

### Files to Modify

**1. `sailorskills-dashboard/dashboard.html`:**
- Add efficiency widget HTML after inventory widget (line ~124)
- Add date range selector controls above widgets grid
- Optional: Add Chart.js script for trend visualization (defer to v2)

**2. `sailorskills-dashboard/js/dashboard.js`:**
- Add `loadEfficiencyWidget(dateRange = '30')` function (~100 lines)
- Add `toggleServiceTypeBreakdown()` function for expand/collapse
- Add date range click handlers
- Update `refreshAllWidgets()` to include efficiency widget
- Update `setupRefreshButtons()` case statement to handle 'efficiency'

**3. `sailorskills-dashboard/css/admin.css` (if needed):**
- Date range selector button styles
- Breakdown table styles (may already exist)
- Efficiency-widget-specific styling

### Key Functions

**`loadEfficiencyWidget(dateRange)`:**
```javascript
async function loadEfficiencyWidget(dateRange = '30') {
  // 1. Show loading state
  // 2. Calculate date range (7/30/90/YTD days ago)
  // 3. Query service_logs + invoices with filters
  // 4. Calculate aggregate metrics
  // 5. Update DOM elements
  // 6. Cache data for breakdown toggle
  // 7. Show loaded state
  // 8. Handle errors gracefully
}
```

**`toggleServiceTypeBreakdown()`:**
```javascript
function toggleServiceTypeBreakdown() {
  // 1. Check current state (collapsed/expanded)
  // 2. If expanding: group cached data by service_type
  // 3. Calculate per-service-type metrics
  // 4. Render breakdown table
  // 5. If collapsing: hide breakdown table
}
```

---

## Testing Strategy

### 1. Unit-Level Verification
- Test with each date range: 7, 30, 90, YTD days
- Verify calculations match SQL query results
- Test service type breakdown calculations independently

### 2. Edge Case Testing
- Empty date range (no services in period)
- Single service in range
- Service with 0 hours (should exclude)
- Service with missing invoice link (should exclude)
- Service with no service_type value

### 3. Visual/UX Testing
- Widget loads without blocking other widgets
- Loading state appears briefly during fetch
- Metrics format correctly (currency $XXX, decimals X.XX)
- Toggle expands/collapses smoothly
- Date range buttons highlight active selection correctly
- Responsive on mobile/tablet (if applicable)

### 4. Integration Testing
- Works alongside existing widgets (Revenue, Bookings, Customers, Inventory)
- Refresh button triggers reload
- Auto-refresh (every 5 min) doesn't break state
- No console errors or warnings
- Navigation doesn't break widget state

### 5. Production Data Testing
- Test with real production data on preview deployment
- Verify metrics are reasonable (not wildly off from manual calculations)
- Check for service types that appear in breakdown
- Confirm excluded services count is accurate

---

## Deployment

1. **Development:**
   - Implement in feature branch or worktree
   - Test locally with dev server

2. **Preview:**
   - Push to main triggers Vercel preview deployment
   - Test on preview URL with production Supabase data
   - Verify calculations with SQL queries

3. **Production:**
   - Merge to main (auto-deploys to https://sailorskills-dashboard.vercel.app)
   - Monitor for errors in Vercel logs
   - Verify widget loads correctly in production

---

## Future Enhancements (Not in Scope)

- **Trend visualization:** Line chart showing efficiency metrics over time
- **Comparison to previous period:** "↑ +12% vs last month"
- **Service-type filtering:** Filter entire dashboard by service type
- **Export to CSV:** Download efficiency data for external analysis
- **Goal tracking:** Set target $/hour and show progress
- **Database view migration:** If scale exceeds 1,000 services/month
- **Technician breakdown:** Show efficiency per technician/staff member

---

## Success Criteria

✅ Widget displays correctly alongside existing widgets
✅ Metrics calculate accurately (verified against SQL)
✅ Date range selector works (7/30/90/YTD)
✅ Service type breakdown toggle works
✅ Handles edge cases gracefully (no data, missing fields)
✅ No performance impact on dashboard load time
✅ No console errors
✅ Matches existing widget styling and behavior

---

**Design Approved:** 2025-10-31
**Next Step:** Create implementation plan and hand off to execution
