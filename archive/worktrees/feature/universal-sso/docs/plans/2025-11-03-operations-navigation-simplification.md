# Operations Navigation Simplification Design

**Date:** 2025-11-03
**Status:** Design Complete - Ready for Implementation
**Roadmap Reference:** 2025-Q4-ACTIVE.md - "Operations Navigation Optimization & Simplification"

## Executive Summary

Simplify Operations navigation from 12+ items to 4 primary items (67% reduction), consolidating related features into tab-based interfaces while maintaining ≤2 clicks to access any feature. This improves cognitive load, mobile usability, and daily workflow efficiency.

## Current State

**Current Navigation (12+ items):**
1. Dashboard
2. Boats & History
3. Packing Lists
4. Service Logs
5. Schedule
6. 📊 Forecast
7. Needs Scheduling (with badge)
8. Pending Orders (with badge)
9. Paint Alerts
10. Messages (with badge)
11. Service Requests (with badge)
12. Invoices
13. ⚙️ Settings

**Pain Points:**
- Navigation clutter causing cognitive overload
- Too many top-level items for mobile viewport
- Related features scattered across different nav items
- Difficult to maintain mental model of where features live

## Design Goals

✅ Reduce top-level navigation items by 50%+ (achieved: 67%)
✅ All features accessible within ≤2 clicks
✅ Group related functionality logically
✅ Maintain current feature set (no functionality removed)
✅ Improve mobile/tablet navigation experience
✅ Consolidate badge counts for clearer notifications

## New Navigation Structure

### Final Navigation (4 primary items)

```
┌─────────────────────────────────────────────────────────────┐
│ [Global Tier 1 Nav - from shared package]                  │
├─────────────────────────────────────────────────────────────┤
│ [Tier 2 Nav - "Operations"]                                │
├─────────────────────────────────────────────────────────────┤
│ Dashboard | Schedule | Boats | Customers                    │
└─────────────────────────────────────────────────────────────┘
```

**Badge Logic:**
- **Schedule:** Shows Pending Orders count + Needs Scheduling count
- **Customers:** Shows Unread Messages count + Pending Service Requests count

---

## Detailed Page Designs

### 1. Dashboard Page

**Purpose:** At-a-glance command center showing current status and urgent items

**Primary Cards (always visible):**

1. **Today's Services**
   - Shows services scheduled for today
   - Quick status view of active work
   - Click service → opens boat detail modal

2. **Customer Hub** *(new consolidated card)*
   - Combined Messages + Service Requests
   - Badge: "X unread messages, Y pending requests"
   - Click → navigates to Customers page
   - Preview shows most urgent/recent items

3. **Scheduling Pipeline** *(new consolidated card)*
   - Combined Pending Orders + Needs Scheduling
   - Badge: "X orders pending, Y boats need scheduling"
   - Click → navigates to Schedule page → Queue tabs
   - Visual pipeline status breakdown

4. **Actions Required**
   - Urgent items needing immediate attention
   - Includes: overdue services, critical paint alerts, low inventory

**Secondary Cards (collapsible/below fold):**
- Upcoming Services (next 7 days)
- Recently Completed
- Due This Month
- Top 5 Paint Alerts (urgent boats only)
- Inventory Alerts

**Key Features:**
- Badge counts in nav mirror dashboard widget counts
- All cards are clickable shortcuts to detailed views
- Mobile-responsive grid layout
- Maintains current dashboard functionality

---

### 2. Schedule Page

**Purpose:** Complete scheduling workflow - from order intake to calendar management to field prep

**Tab Structure:**

#### Tab 1: Calendar (default)
- Current interactive drag-and-drop calendar (React implementation)
- Month navigation with date picker
- Visual service markers with color coding
- Click service → boat detail modal
- Drag to reschedule functionality (already implemented)

#### Tab 2: Pending Orders
- Orders from Estimator awaiting confirmation
- Shows: customer, boat, service type, requested date
- Actions: Confirm (adds to calendar), Modify, Cancel
- Badge count contributes to Schedule nav badge

#### Tab 3: Needs Scheduling
- Queue of confirmed services not yet on calendar
- Priority levels: urgent, normal, low
- Service type filtering
- Actions: Schedule (opens calendar), View Details
- Badge count contributes to Schedule nav badge

#### Tab 4: Packing Lists
- **Sub-tabs:** Monthly | Weekly | Daily | Per-Boat
- **Monthly View:** Aggregate anode/tool needs for ordering materials
- **Weekly View:** Route planning for upcoming week
- **Daily View:** Pre-departure packing list for today
- **Per-Boat View:** At-boat checklist with container locations
- Integrates with inventory for stock alerts

#### Tab 5: Forecast
- Revenue/service forecasting and planning
- Current forecast.html functionality
- Analytics and projections

**Combined Badge Logic:**
- Schedule badge = Pending Orders count + Needs Scheduling count
- Example: 3 pending orders + 5 needs scheduling = badge shows "8"

**Navigation Flows:**
- Dashboard "Scheduling Pipeline" card → Schedule page, Pending Orders tab
- Dashboard "Today's Services" → Schedule page, Calendar tab (today's date)
- Direct nav click → last-used tab (defaults to Calendar)

---

### 3. Boats Page

**Purpose:** Comprehensive boat management - details, history, service tracking, paint monitoring

**Tab Structure:**

#### Tab 1: Boats List (default)
- Current boats list with advanced filtering
- Search by boat name or customer name
- Filters: Paint status, service alerts, marina, boat type, hull type, engines, thrusters, etc.
- Quick view cards: boat name, customer, last service, paint urgency
- Click boat → Boat Detail Panel slides in from right

#### Tab 2: Service Logs
- Service log entry form (current functionality)
- Mobile-friendly data entry
- Granular condition tracking (paint, anodes, growth, etc.)
- Photo uploads to Supabase Storage
- Time tracking (time in, time out, total hours)
- Can be pre-filtered by boat if coming from calendar

#### Tab 3: Paint Alerts
- Consolidated view from current paint-alerts-view
- Shows all boats by urgency: overdue → time_now → consider_soon → not_yet
- Color-coded urgency levels
- Click boat → Boat Detail Panel with paint history
- Functionally same as filtering Boats List by paint urgency

**Boat Detail Panel (slides in from right):**
- Boat specifications and details
- Service history timeline
- Anode condition tracking (per location: shaft, rudder, trim tabs, etc.)
- Paint condition history with trend analysis
- YouTube playlist embed (if available)
- Customer contact info
- Quick actions: Schedule Service, Add Log, View in Calendar

**Access Patterns:**
- Dashboard → click boat name → Boats page with detail panel
- Schedule → click service on calendar → boat detail modal/panel
- Boats nav → shows list, click boat → detail panel slides in
- Paint alerts accessible as dedicated tab OR by filtering main list

---

### 4. Customers Page

**Purpose:** Centralized customer communication hub - messages and service requests

**Tab Structure:**

#### Tab 1: Messages (default)
- Current messages functionality
- Two-column layout:
  - Left: Conversations list
  - Right: Message thread
- Filters: All boats, unread only, read only
- Badge shows unread message count
- Quick reply functionality

#### Tab 2: Service Requests
- Current service-requests functionality
- List of customer-submitted requests
- Filters: Pending, scheduled, completed, cancelled
- Shows: customer, boat, request type, date submitted, status
- Actions: Schedule (adds to Needs Scheduling queue), Respond, Mark Complete
- Badge shows pending request count

**Combined Badge Logic:**
- Customers badge = Unread messages + Pending service requests
- Example: 2 unread messages + 3 pending requests = badge shows "5"

**Layout:**
- Two-column layout for Messages tab (conversations + thread)
- Single-column list layout for Service Requests tab
- Filters at top of each tab
- Refresh button to check for new items

**Navigation Flows:**
- Dashboard "Customer Hub" card → Customers page
- Badge in nav provides quick visibility of items needing attention

---

## Items Moving to Other Services

### Moving to Billing Service

**1. Invoices Page**
- File: `invoices.html`
- Directory: `/src/invoices/`
- Rationale: Billing is source of truth for invoice data
- Implementation: Separate task in Billing service

**2. Settings (Anode Pricing)**
- Files: `settings.html`, `/src/views/settings.js`, `/src/lib/pricing.js`
- Database: `pricing_strategy` table queries
- Rationale: Pricing configuration directly affects billing/invoicing
- Implementation: Separate task in Billing service

---

## Implementation Plan

### Phase 1: Navigation Structure (1-2 hours)

**Files to modify:**
- `/sailorskills-operations/index.html` - Update sub-nav HTML

**Changes:**
```html
<!-- OLD -->
<nav class="sub-nav">
  <a href="#dashboard">Dashboard</a>
  <a href="#boats">Boats & History</a>
  <a href="#packing">Packing Lists</a>
  <a href="#service-logs">Service Logs</a>
  <a href="#schedule">Schedule</a>
  <a href="/forecast.html">📊 Forecast</a>
  <a href="#needs-scheduling">Needs Scheduling <span class="nav-badge">0</span></a>
  <a href="#pending-orders">Pending Orders <span class="nav-badge">0</span></a>
  <a href="#paint-alerts">Paint Alerts</a>
  <a href="#messages">Messages <span class="nav-badge">0</span></a>
  <a href="#service-requests">Service Requests <span class="nav-badge">0</span></a>
  <a href="/settings.html">⚙️ Settings</a>
</nav>

<!-- NEW -->
<nav class="sub-nav">
  <a href="#dashboard" class="active">Dashboard</a>
  <a href="#schedule">Schedule <span id="nav-schedule-badge" class="nav-badge" style="display: none;">0</span></a>
  <a href="#boats">Boats</a>
  <a href="#customers">Customers <span id="nav-customers-badge" class="nav-badge" style="display: none;">0</span></a>
</nav>
```

**Badge logic updates:**
```javascript
// Schedule badge = pending orders + needs scheduling
scheduleBadge = pendingOrdersCount + needsSchedulingCount;

// Customers badge = unread messages + pending requests
customersBadge = unreadMessagesCount + pendingRequestsCount;
```

### Phase 2: Dashboard Redesign (2-3 hours)

**Files to modify:**
- `/sailorskills-operations/index.html` - Dashboard view section
- `/sailorskills-operations/src/main.js` - Dashboard initialization logic

**Changes:**
- Add "Customer Hub" consolidated card
- Add "Scheduling Pipeline" consolidated card
- Make cards clickable with navigation handlers
- Update card data fetching to aggregate counts

### Phase 3: Schedule Page with Tabs (4-6 hours)

**Files to modify:**
- `/sailorskills-operations/index.html` - Schedule view section
- Create new component: `/src/components/tab-navigation.js`

**Changes:**
- Add tab navigation component
- Tab 1: Existing calendar view (already React-based)
- Tab 2: Move pending-orders-view content
- Tab 3: Move needs-scheduling-view content
- Tab 4: Move packing-view content (with sub-tabs)
- Tab 5: Integrate forecast.html content

**Tab Navigation Component:**
```javascript
export function initTabNavigation(containerId, tabs) {
  // Render tab headers
  // Handle tab switching
  // Update URL hash for deep linking
  // Remember last active tab in localStorage
}
```

### Phase 4: Boats Page with Tabs (3-4 hours)

**Files to modify:**
- `/sailorskills-operations/index.html` - Boats view section

**Changes:**
- Tab 1: Existing boats-view (boats list + filters)
- Tab 2: Move service-logs-view content
- Tab 3: Move paint-alerts-view content
- Boat detail panel remains as-is (already slides in)

### Phase 5: Customers Page with Tabs (2-3 hours)

**Files to create:**
- New view section in `index.html`: `#customers-view`

**Changes:**
- Tab 1: Move messages-view content
- Tab 2: Move service-requests-view content
- Combined badge logic for nav

### Phase 6: URL Routing & Deep Linking (1-2 hours)

**Files to modify:**
- `/sailorskills-operations/src/navigation.js`

**Add support for:**
- `/index.html#schedule?tab=packing-lists`
- `/index.html#boats?tab=paint-alerts&boat=<id>`
- `/index.html#customers?tab=service-requests`

### Phase 7: Mobile Responsiveness (2-3 hours)

**Files to modify:**
- `/sailorskills-operations/styles/main.css`
- Add: `/sailorskills-operations/src/styles/tab-navigation.css`

**Changes:**
- Tab navigation responsive (horizontal scroll or dropdown)
- Boat detail panel → full overlay on mobile
- Badge visibility on mobile nav
- Touch-friendly tab switching

### Phase 8: Testing & Refinement (2-3 hours)

**Test scenarios:**
- [ ] All 4 nav items work
- [ ] Badge counts update correctly
- [ ] Tab switching works on all pages
- [ ] Deep linking works
- [ ] Dashboard cards navigate correctly
- [ ] Boat detail panel works
- [ ] Mobile navigation works
- [ ] All existing features still accessible
- [ ] No broken links

**Playwright tests to update:**
- Update nav selectors to new structure
- Test tab navigation
- Test badge count updates
- Test deep linking

---

## Migration Tasks (Separate Implementation)

### Task 1: Move Invoices to Billing

**Steps:**
1. Copy files to Billing service:
   - `invoices.html`
   - `/src/invoices/invoices.js`
   - Related invoice query utilities
2. Update Billing navigation to include Invoices
3. Test invoice viewing in Billing
4. Remove from Operations after verification
5. Update any cross-service links

### Task 2: Move Settings to Billing

**Steps:**
1. Copy files to Billing service:
   - `settings.html`
   - `/src/views/settings.js`
   - `/src/lib/pricing.js`
2. Update Billing navigation to include Settings
3. Test pricing configuration in Billing
4. Remove from Operations after verification
5. Update any cross-service references

---

## Success Criteria

✅ Navigation reduced from 12+ items to 4 items (67% reduction)
✅ All features accessible within ≤2 clicks
✅ Badge counts accurately reflect aggregated notifications
✅ Tab navigation works smoothly on desktop and mobile
✅ Deep linking works for all tab-based views
✅ Mobile navigation is clean and usable
✅ No functionality lost in consolidation
✅ User workflows are faster (fewer clicks to common tasks)
✅ All Playwright tests pass with updated selectors

---

## Estimated Effort

**Total:** 17-24 hours

- Phase 1: Navigation Structure (1-2 hours)
- Phase 2: Dashboard Redesign (2-3 hours)
- Phase 3: Schedule Page with Tabs (4-6 hours)
- Phase 4: Boats Page with Tabs (3-4 hours)
- Phase 5: Customers Page with Tabs (2-3 hours)
- Phase 6: URL Routing & Deep Linking (1-2 hours)
- Phase 7: Mobile Responsiveness (2-3 hours)
- Phase 8: Testing & Refinement (2-3 hours)

**Migration tasks** (separate): 4-6 hours total

---

## Risks & Mitigation

**Risk:** Users accustomed to old navigation structure may be confused
**Mitigation:** Tab labels match old nav items; features are in logical locations

**Risk:** Breaking changes to existing deep links
**Mitigation:** Implement URL redirect mapping from old structure to new tabs

**Risk:** Mobile tab navigation may be cramped
**Mitigation:** Implement horizontal scroll or dropdown for tabs on small screens

**Risk:** Badge consolidation may hide important details
**Mitigation:** Dashboard cards show breakdown; clicking badge navigates to detail

---

## Future Enhancements

- User-customizable dashboard cards (show/hide, reorder)
- Keyboard shortcuts for tab navigation (1-4 for main nav, Q/W/E for tabs)
- "Favorites" or pinned items for quick access
- Search bar in nav for quick feature access
- Tab state persistence across sessions

---

## Appendix: Navigation Mapping

| Old Navigation Item | New Location |
|---------------------|--------------|
| Dashboard | Dashboard (primary nav) |
| Boats & History | Boats → Boats List tab (primary nav) |
| Packing Lists | Schedule → Packing Lists tab |
| Service Logs | Boats → Service Logs tab |
| Schedule | Schedule → Calendar tab (primary nav) |
| Forecast | Schedule → Forecast tab |
| Needs Scheduling | Schedule → Needs Scheduling tab |
| Pending Orders | Schedule → Pending Orders tab |
| Paint Alerts | Boats → Paint Alerts tab |
| Messages | Customers → Messages tab (primary nav) |
| Service Requests | Customers → Service Requests tab |
| Invoices | **MOVED TO BILLING SERVICE** |
| Settings | **MOVED TO BILLING SERVICE** |

---

**Document Status:** Complete - Ready for Implementation
**Next Step:** Create worktree and implementation plan
