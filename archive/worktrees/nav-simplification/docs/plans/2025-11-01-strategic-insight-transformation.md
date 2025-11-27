# Strategic Business Intelligence: Insight Service - Design Document

**Date:** 2025-11-01
**Status:** Approved
**Target Service:** sailorskills-insight
**Timeline:** Q1 2026 (7-8 weeks)
**Priority:** High (foundational for business intelligence)

---

## Executive Summary

Create **Insight** - a strategic business intelligence & planning hub that enables data-driven decision-making through adaptive perspectives, interactive what-if scenario modeling, and comprehensive business analytics.

**Service Naming:**
- **New name:** `sailorskills-insight`
- **Previous name:** `sailorskills-dashboard` (being renamed)
- **URL:** `insight.sailorskills.com` (or `insights.sailorskills.com`)
- **Rationale:** Avoids confusion with operational "dashboards" in Operations, Inventory, Billing, and other services. "Insight" clearly signals strategic analysis vs. day-to-day operations.

**Key Capabilities:**
- Four adaptive perspectives (Executive, Financial, Operations, Customer)
- Interactive what-if scenarios (pricing, capacity, hiring, retention)
- Real-time business intelligence with materialized database views
- Critical alerts integration across all services
- Comprehensive analytics answering: profitability by service type, capacity utilization, pricing optimization, customer value segmentation

---

## Product Vision

### Current State (sailorskills-dashboard)
- Displays basic widgets (Revenue, Customers, Bookings, Inventory)
- Simple metrics aggregation from Supabase
- No strategic planning capabilities
- Limited comparative analysis
- Name causes confusion with operational dashboards in other services

### Target State (sailorskills-insight)
- **Renamed service:** "Insight" clearly differentiates strategic BI from operational dashboards
- **Hybrid operational + strategic hub:** Critical operational alerts (3-5 items) + deep strategic analysis
- **Perspective-based interface:** Single interface with switchable views for different roles/needs
- **Interactive modeling:** Adjust inputs to see business impact before making decisions
- **Materialized views:** Pre-calculated complex metrics for instant performance
- **Comprehensive BI:** Answer strategic questions about profitability, pricing, capacity, customer value

---

## Architecture

### Overall Pattern: Adaptive Dashboard with Perspectives

**Single-page application** with perspective switcher (tabs/dropdown):
- **Executive Overview:** High-level daily check-in (30 seconds)
- **Financial Performance:** Revenue analysis, pricing, forecasting
- **Operations Efficiency:** Capacity, technician performance, scheduling
- **Customer Intelligence:** LTV segmentation, churn risk, retention

Each perspective shows **6-8 focused widgets** relevant to that lens.

### Data Architecture

**Materialized Views in Supabase:**
- Pre-calculate complex aggregations (profitability, LTV, capacity, technician performance)
- Refresh every 15 minutes via Supabase scheduled function
- Dashboard queries views directly for instant load times
- Views auto-update when underlying data changes

**Technical Stack:**
- Vite (dev server + build)
- Vanilla JavaScript (matches existing patterns)
- Chart.js for visualizations (trends, comparisons)
- Supabase client-side SDK
- Responsive CSS grid layout

---

## Perspective Definitions

### 1. Executive Overview Perspective
**Purpose:** 30-second daily check-in showing overall health

**Widgets:**
1. **KPI Summary Cards:** Total Revenue (month), Active Customers, Services Completed, Goal Progress %
2. **Revenue Trend Chart:** Last 90 days with comparison to prior period (line chart)
3. **Goal Tracker Widget:** Monthly targets (revenue, services, new customers) with progress bars
4. **Critical Alerts:** Top 3-5 urgent items (overdue invoices, low inventory, unscheduled pending orders)
5. **Customer Health Score:** Retention rate, churn risk count
6. **Upcoming Capacity:** Next 7 days schedule density (% booked)

### 2. Financial Performance Perspective
**Purpose:** Monthly financial reviews, pricing decisions

**Widgets:**
1. **Revenue by Service Type:** Bar chart comparing diving, pressure washing, bottom painting, etc. with profitability %
2. **Pricing Analysis Widget:** Avg price/service, price trends over time, recommended adjustments
3. **Profit Margin Trends:** Gross margin by month with cost breakdown (line chart)
4. **Revenue Forecast:** Projection for next 30/90 days based on historical patterns + scheduled services
5. **Payment Status Summary:** Paid vs pending vs overdue amounts (pie chart)
6. **Cost Tracking:** Labor costs ($/hour by technician), material costs from inventory

### 3. Operations Efficiency Perspective
**Purpose:** Optimize field operations, technician performance

**Widgets:**
1. **Capacity Utilization Chart:** % of available hours booked (daily/weekly view)
2. **$/Hour by Technician:** Performance comparison with targets (bar chart, requires Q1 User Accounts)
3. **Service Duration Analysis:** Actual vs estimated time (scatter plot), identify bottlenecks
4. **Schedule Density Heatmap:** Visual calendar showing busy/slow periods
5. **Equipment & Inventory Alerts:** Low stock items, maintenance due
6. **Route Efficiency:** Services grouped by marina/location (future enhancement)

### 4. Customer Intelligence Perspective
**Purpose:** Growth strategies, retention, segmentation

**Widgets:**
1. **LTV Segmentation:** Top 20% customers by lifetime value (table with drill-down), service preferences
2. **Churn Risk Indicators:** Customers who haven't booked in X months, declining frequency
3. **Service Mix by Customer:** What services do high-value customers use most? (stacked bar)
4. **Acquisition Channels:** Where customers come from (referrals, estimator, repeat)
5. **Customer Journey Visualization:** Average path from quote → first service → recurring (timeline)
6. **Retention Metrics:** Monthly recurring customers, one-time vs subscription split

---

## Interactive What-If Scenario Modeling

### What-If Mode Toggle
- Button in top-right: "💡 What-If Mode" (default: OFF)
- When enabled, editable fields appear in relevant widgets
- Calculations update in real-time as inputs are adjusted
- Color-coded: Green = positive impact, Red = negative impact, Gray = current baseline
- "Reset to Current" button restores actual values
- Optional: "Save Scenario" stores inputs to localStorage for later comparison

### Financial Performance Scenarios

**Pricing Scenarios:**
- Adjustable sliders: "What if I raise diving prices by 15%?"
- Input fields: New price per service type
- Instant calculation: Projected revenue impact, demand elasticity warning (if raising 20%+)
- Shows: Current monthly revenue → Projected revenue (assuming demand stays constant or drops X%)

**Service Mix Scenarios:**
- Drag sliders: "What if I do 30% more bottom painting, 10% less diving?"
- Shows: Revenue impact, labor hour impact, profitability change
- Highlights: Which mix maximizes $/hour

### Operations Efficiency Scenarios

**Capacity Scenarios:**
- Input: "What if I add 10 more service hours/week?"
- Shows: Additional revenue potential, optimal service types to fill those hours
- Warns: Inventory needs, equipment requirements

**Hiring Scenarios:**
- Input: "What if I hire a technician at $X/hour?"
- Shows: Break-even point (services/month needed), profit impact at different utilization rates
- Compares: Solo operation vs 2-person team profitability

### Customer Intelligence Scenarios

**Retention Scenarios:**
- Input: "What if I reduce churn by 5%?"
- Shows: LTV impact, monthly recurring revenue increase
- Calculates: How much can I spend on retention (discounts, customer service) before it's unprofitable?

### Technical Implementation
- **Live calculation in JavaScript** (no backend needed)
- Scenarios **don't save to database** - just interactive exploration
- Uses current data from materialized views as baseline

---

## Database Materialized Views

### 1. mv_service_profitability
**Purpose:** Pre-calculate profitability by service type with labor costs

```sql
CREATE MATERIALIZED VIEW mv_service_profitability AS
SELECT
  service_type,
  COUNT(*) as service_count,
  SUM(invoices.amount) as total_revenue,
  SUM(service_logs.total_hours) as total_hours,
  AVG(invoices.amount) as avg_revenue_per_service,
  SUM(invoices.amount) / SUM(service_logs.total_hours) as dollars_per_hour,
  date_trunc('month', service_logs.service_date) as month
FROM service_logs
JOIN invoices ON service_logs.invoice_id = invoices.id
WHERE invoices.status != 'void'
GROUP BY service_type, month;

CREATE INDEX idx_mv_service_profitability_month ON mv_service_profitability(month);
CREATE INDEX idx_mv_service_profitability_type ON mv_service_profitability(service_type);
```

### 2. mv_customer_lifetime_value
**Purpose:** Customer LTV with segmentation

```sql
CREATE MATERIALIZED VIEW mv_customer_lifetime_value AS
SELECT
  customers.id as customer_id,
  customers.name,
  COUNT(DISTINCT service_logs.id) as total_services,
  SUM(invoices.amount) as lifetime_revenue,
  MIN(service_logs.service_date) as first_service_date,
  MAX(service_logs.service_date) as last_service_date,
  CURRENT_DATE - MAX(service_logs.service_date) as days_since_last_service,
  CASE WHEN COUNT(DISTINCT service_logs.id) > 1
    THEN (MAX(service_logs.service_date) - MIN(service_logs.service_date)) / (COUNT(DISTINCT service_logs.id) - 1)
    ELSE NULL
  END as avg_days_between_services,
  NTILE(3) OVER (ORDER BY SUM(invoices.amount) DESC) as value_segment
FROM customers
LEFT JOIN boats ON boats.customer_id = customers.id
LEFT JOIN service_logs ON service_logs.boat_id = boats.id
LEFT JOIN invoices ON service_logs.invoice_id = invoices.id
WHERE invoices.status != 'void' OR invoices.id IS NULL
GROUP BY customers.id, customers.name;

CREATE INDEX idx_mv_customer_ltv_segment ON mv_customer_lifetime_value(value_segment);
CREATE INDEX idx_mv_customer_ltv_revenue ON mv_customer_lifetime_value(lifetime_revenue DESC);
```

### 3. mv_capacity_utilization
**Purpose:** Daily capacity metrics

```sql
CREATE MATERIALIZED VIEW mv_capacity_utilization AS
SELECT
  service_date,
  COUNT(DISTINCT service_logs.id) as services_completed,
  SUM(total_hours) as hours_used,
  COUNT(DISTINCT boat_id) as boats_serviced,
  (SUM(total_hours) / 8.0) * 100 as capacity_utilization_percent
FROM service_logs
WHERE total_hours IS NOT NULL
GROUP BY service_date
ORDER BY service_date DESC;

CREATE INDEX idx_mv_capacity_date ON mv_capacity_utilization(service_date DESC);
```

### 4. mv_technician_performance
**Purpose:** Performance by technician (Q1 2026 - requires User Accounts)

```sql
CREATE MATERIALIZED VIEW mv_technician_performance AS
SELECT
  users.id as technician_id,
  users.full_name,
  date_trunc('month', service_logs.service_date) as month,
  COUNT(DISTINCT service_logs.id) as services_completed,
  SUM(service_logs.total_hours) as hours_worked,
  SUM(invoices.amount) as revenue_generated,
  SUM(invoices.amount) / SUM(service_logs.total_hours) as dollars_per_hour,
  AVG(service_logs.total_hours) as avg_service_duration
FROM service_logs
JOIN invoices ON service_logs.invoice_id = invoices.id
JOIN users ON service_logs.technician_id = users.id
WHERE invoices.status != 'void'
GROUP BY users.id, users.full_name, month;

CREATE INDEX idx_mv_tech_perf_month ON mv_technician_performance(month);
CREATE INDEX idx_mv_tech_perf_tech ON mv_technician_performance(technician_id);
```

### Refresh Strategy
- **Auto-refresh:** Supabase scheduled function every 15 minutes
- **Manual refresh:** Button in Dashboard UI for immediate updates
- **Refresh command:** `REFRESH MATERIALIZED VIEW CONCURRENTLY <view_name>`

---

## UI/UX Design

### Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ 🏠 Sailorskills Dashboard                    [Date: 30d ▾]  │
├─────────────────────────────────────────────────────────────┤
│ 🚨 Critical Alerts: 3 overdue invoices | Low stock: zincs   │
├─────────────────────────────────────────────────────────────┤
│ [Executive] [Financial] [Operations] [Customer]  [💡What-If]│
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Widget 1    │  │  Widget 2    │  │  Widget 3    │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Widget 4    │  │  Widget 5    │  │  Widget 6    │      │
│  │              │  │              │  │              │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Key UI Components

**Perspective Switcher:**
- Tab-based navigation (default: Executive)
- Active tab highlighted
- URL updates: `/dashboard#executive`, `/dashboard#financial` (bookmarkable)

**Critical Alerts Bar:**
- Always visible across all perspectives
- Shows 3-5 most urgent items from Operations, Billing, Inventory
- Click alert → navigate to that service (deep link)
- Examples: "12 boats need scheduling", "5 invoices overdue 30+ days", "Zinc inventory: 3 remaining"

**Widget Design Pattern:**
- Card-based layout (3-column grid on desktop, stacks on mobile)
- Header: Title + info icon (explains metric)
- Body: Primary metric (large) + supporting data (small)
- Footer: Trend indicator (↑ +12% vs last period)
- Optional: Mini chart (sparkline, bar, pie)

**Data Loading States:**
- Skeleton screens while loading (no spinners)
- "Last updated: 2 minutes ago" timestamp
- Manual refresh button per widget + global refresh
- Error state: "Data unavailable - refresh to retry"

**Responsive Design:**
- Desktop: 3-column widget grid
- Tablet: 2-column widget grid
- Mobile: Single column, stacked widgets

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Prerequisites:** Q1 User Accounts system complete

- Create 4 materialized views (service_profitability, customer_ltv, capacity_utilization, technician_performance)
- Set up auto-refresh schedule (Supabase function every 15 min)
- Build perspective switcher UI framework
- Implement global date range selector
- Critical alerts bar (pulls from Operations, Billing, Inventory)

### Phase 2: Executive Overview Perspective (Week 2-3)
- KPI summary cards (revenue, customers, services, goals)
- Revenue trend chart (90-day line graph)
- Goal tracker widget (manual goal input → localStorage, track progress)
- Customer health score
- Upcoming capacity (7-day schedule density)
- Test with real data, validate calculations

### Phase 3: Financial Performance Perspective (Week 3-4)
- Revenue by service type (bar chart with profitability %)
- Pricing analysis widget (avg price trends, recommendations)
- Profit margin trends (line chart with cost breakdown)
- Revenue forecast (simple linear projection based on last 90 days + scheduled services)
- Payment status summary (pie chart: paid/pending/overdue)
- Cost tracking (labor + materials)

### Phase 4: Operations Efficiency Perspective (Week 4-5)
- Capacity utilization chart (daily/weekly bars)
- $/hour by technician (bar chart comparison, requires User Accounts)
- Service duration analysis (actual vs estimated scatter plot)
- Schedule density heatmap (calendar visualization)
- Equipment & inventory alerts (low stock integration)

### Phase 5: Customer Intelligence Perspective (Week 5-6)
- LTV segmentation (top 20% table with drill-down)
- Churn risk indicators (customers inactive 90+ days)
- Service mix by customer (which services do high-value customers use?)
- Acquisition channels (source tracking)
- Customer journey visualization (average path timeline)
- Retention metrics (MRR, one-time vs recurring split)

### Phase 6: What-If Scenario Modeling (Week 6-7)
- What-If Mode toggle implementation
- Pricing scenarios (sliders, instant calculation)
- Service mix scenarios (drag sliders, show impact)
- Capacity scenarios (add hours, show revenue potential)
- Hiring scenarios (break-even calculator)
- Retention scenarios (churn reduction impact)
- Reset/Save functionality

### Phase 7: Polish & Testing (Week 7-8)
- Responsive design testing (mobile/tablet)
- Performance optimization (lazy load widgets)
- Error handling and edge cases
- Documentation for users
- Integration testing with other services
- User acceptance testing

---

## Dependencies

### Critical Dependencies
- **Q1 2026 User Accounts System:** Provides `technician_id` and user attribution for technician performance tracking
- **Existing Tables:** `service_logs`, `invoices`, `customers`, `boats` (already populated with historical data)
- **Dashboard Codebase:** `sailorskills-insight` repository (exists, needs enhancement)

### Nice-to-Have Dependencies
- **Q2 2026 Ownership Tracking:** Enables per-owner profitability views (can be added later)

---

## Success Metrics

**Quantitative:**
- Dashboard loads in <2 seconds
- Materialized views refresh successfully every 15 minutes
- All 4 perspectives functional with 6-8 widgets each
- What-if scenarios calculate in <500ms
- 100% responsive (mobile/tablet/desktop)

**Qualitative:**
- Can answer: "Which service types are most profitable?"
- Can answer: "What's my current capacity utilization?"
- Can answer: "Should I raise prices? By how much?"
- Can answer: "Who are my top 20% customers by LTV?"
- Can model: "What if I hire another technician?"
- Can model: "What if I reduce churn by 5%?"

---

## Strategic Business Questions Answered

This Dashboard design addresses **all four current gaps**:

1. ✅ **Profitability by service type:** Financial Performance perspective, Revenue by Service Type widget
2. ✅ **Capacity utilization:** Operations Efficiency perspective, Capacity Utilization Chart widget
3. ✅ **Pricing optimization:** Financial Performance perspective, Pricing Analysis widget + What-If pricing scenarios
4. ✅ **Customer value segmentation:** Customer Intelligence perspective, LTV Segmentation widget

---

## Future Enhancements (Post-Q1 2026)

- **Export/Reporting:** PDF export of perspectives, scheduled email reports
- **Advanced Forecasting:** ML-based revenue predictions (vs simple linear projection)
- **Multi-Owner Views:** Per-owner profitability dashboards (requires Q2 Ownership tracking)
- **Mobile App:** Native mobile dashboard for on-the-go insights
- **Custom Widgets:** User-configurable widget library
- **API Access:** Expose dashboard data via REST API for external tools
- **Real-Time Updates:** WebSocket-based live updates (vs 15-min refresh)

---

## Estimated Effort

**Total:** 7-8 weeks in Q1 2026

**Breakdown:**
- Foundation: 2 weeks
- Executive Perspective: 1 week
- Financial Perspective: 1 week
- Operations Perspective: 1 week
- Customer Perspective: 1 week
- What-If Scenarios: 1 week
- Polish & Testing: 1 week

**Team Size:** 1 developer (full-time)

---

## Appendix: Widget Specifications

### Example Widget Spec: Revenue by Service Type

**Data Source:** `mv_service_profitability` materialized view

**Query:**
```javascript
const { data } = await supabase
  .from('mv_service_profitability')
  .select('service_type, total_revenue, service_count, dollars_per_hour')
  .gte('month', startDate)
  .lte('month', endDate);
```

**Visualization:** Horizontal bar chart
- X-axis: Total revenue ($)
- Y-axis: Service type (Diving, Pressure Washing, Bottom Painting, etc.)
- Color: Green (high profitability >$100/hr), Yellow (medium $50-100/hr), Red (low <$50/hr)
- Hover: Shows service count, avg $/service, $/hour

**What-If Integration:**
- Editable fields when What-If Mode enabled
- Input: Adjust price per service type (+/- %)
- Calculation: `new_revenue = total_revenue * (1 + price_change_percent) * demand_elasticity_factor`
- Display: Side-by-side comparison (Current vs Scenario)

---

**Document Version:** 1.0
**Last Updated:** 2025-11-01
**Next Review:** Q1 2026 kickoff
