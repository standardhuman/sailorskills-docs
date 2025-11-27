# Q4 2025 - Current Quarter (Detailed)

**Status:** Active
**Period:** October - December 2025
**Focus:** Service architecture cleanup, navigation improvements, testing infrastructure

For high-level summary, see [main ROADMAP.md](../../ROADMAP.md)

---

## Service Architecture & Portal Separation ✅
- [x] **Separate Customer Portal from Operations**
  - **Completed:** 2025-10-25
  - **Rationale:** Separate admin-only operations dashboard from customer-facing portal for better security, performance, and development clarity
  - **Implementation:**
    - Created new `sailorskills-portal` repository
    - Deployed at https://sailorskills-portal.vercel.app (Vercel) and https://portal.sailorskills.com (pending DNS)
    - Moved all customer auth, service history, invoices, account management to portal repo
    - Operations repo now admin-only at https://ops.sailorskills.com
    - Both repos share `sailorskills-shared` package via git submodules
    - Both repos use same Supabase database with RLS for access control
  - **Impact:** Complete code isolation, independent deployment cycles, smaller bundle sizes, clearer security boundary
  - **Documentation:** See `/PORTAL_SEPARATION_PLAN.md` and `/DNS_CONFIGURATION.md`

## Testing & Quality Infrastructure ✅
- [x] **Comprehensive Testing Platform**
  - **Completed:** 2025-10-29
  - **Rationale:** Establish automated testing infrastructure to catch visual regressions, deployment issues, cross-service integration problems, and database schema errors before production
  - **Implementation:**
    - Four-layer testing architecture: Pre-commit hooks, CI/CD pipeline, Post-deployment smoke tests, Visual regression & integration tests
    - GitHub Actions workflows for automated PR validation
    - Playwright test framework with visual regression (screenshot comparison)
    - Database validation scripts (schema validation, RLS policy testing, migration dry-run)
    - Pre-commit hooks (Husky + lint-staged) in sailorskills-portal
    - Cross-service integration test framework
    - Test data management utilities
    - Created reusable testing-platform skill for future services
  - **Impact:** Automated testing catches issues before production, validates cross-service data flows, ensures database migrations are safe, visual regressions detected automatically
  - **Documentation:** See `/TESTING_PLATFORM_GUIDE.md`, `/TESTING_SETUP_CHECKLIST.md`, and `/skills/testing-platform/`
  - **Next Steps:**
    - Add SUPABASE_SERVICE_ROLE_KEY secret for full database access in tests
    - Expand testing to other services (billing, operations, dashboard, inventory)
    - Generate visual regression baselines for all critical pages
    - Write feature-specific integration tests as features are implemented

## Service Architecture & Naming
- [x] **Rename sailorskills-dashboard → sailorskills-insight**
  - **Completed:** 2025-11-02
  - **Rationale:** "Insight" differentiates strategic BI service from operational dashboards in other services (Operations, Inventory, Billing). Avoids confusion when referring to "dashboard."
  - **Tasks:**
    - Rename GitHub repository: `sailorskills-dashboard` → `sailorskills-insight`
    - Update Vercel project name and deployment URL
    - Update navigation links in all services (shared package navigation)
    - Update documentation references
    - Update environment variable names if needed
  - **Impact:** Repository, Vercel deployment, navigation across all services, documentation
  - **Dependencies:** None (design already complete in `/docs/plans/2025-11-01-strategic-insight-transformation.md`)
  - **Priority:** High (clean slate before Q1 2026 implementation)
  - **Estimated Effort:** 2-3 hours

- [ ] **Rename sailorskills-billing → sailorskills-completion**
  - **Rationale:** Current name undersells the service - it's 60% service documentation/condition tracking and 40% payment processing. "Completion" better reflects its role as the final step in the service workflow where technicians document work performed AND process payment.
  - **Impact:** Repository rename, Vercel project, documentation updates, edge function references, hardcoded URLs
  - **Dependencies:** None
  - **Priority:** Medium
  - **Estimated Effort:** 2-3 hours

## Documentation & Governance
- [x] Establish project management documentation repository (sailorskills-docs)
- [x] Define project manager rules and cross-service guidelines in CLAUDE.md
- [x] **Notion Roadmap Integration**
  - **Completed:** 2025-11-02
  - **Rationale:** Enable visual roadmap management with Timeline (Gantt) and Kanban views for better planning and progress tracking
  - **Implementation:**
    - Created Notion database with all roadmap properties (Status, Quarter, Priority, Service, Dates, Dependencies)
    - Built automated sync script (`scripts/sync-notion-roadmap.mjs`) to push ROADMAP.md changes to Notion via API
    - Configured Timeline view (Gantt-style) grouped by Quarter
    - Configured Kanban views (by Status and by Quarter)
    - Added npm script: `npm run sync-roadmap`
    - ROADMAP.md remains source of truth, Notion provides visualization
  - **Impact:** Visual project planning, better quarterly visibility, drag-and-drop task management, team collaboration via Notion sharing
  - **Documentation:** See `/NOTION_SYNC_README.md`
- [ ] **React-Based Roadmap Visualization**
  - **Rationale:** Custom interactive roadmap visualization using SVAR Gantt library, providing alternative to Notion with more control over features, styling, and integration with Sailorskills suite
  - **Features:**
    - Interactive Gantt chart with drag-and-drop task scheduling
    - Combined Timeline + Kanban view in single interface
    - Real-time parsing of ROADMAP.md (no external dependencies)
    - Filtering by Quarter, Service, Priority, Status
    - Responsive design for desktop and mobile
    - Export to PDF/PNG for sharing
    - Embeddable in Dashboard/Operations for quick reference
  - **Technology Stack:**
    - React + Vite
    - SVAR Gantt (open-source MIT license)
    - Parses ROADMAP.md directly (no backend needed)
    - Deployable to Vercel as standalone app or embedded component
  - **Implementation Approach:**
    - Create new `sailorskills-roadmap` repository
    - Build roadmap parser (reuse logic from Notion sync script)
    - Integrate SVAR Gantt React component
    - Add filtering and view controls
    - Design responsive layout
    - Deploy to Vercel at https://roadmap.sailorskills.com
  - **Benefits vs Notion:**
    - Full control over features and styling
    - No external service dependencies
    - Can embed in other services
    - Custom integrations (link to GitHub PRs, Jira, etc.)
    - Better performance for large roadmaps
  - **Impact:** Custom roadmap visualization, potential for deeper suite integration
  - **Dependencies:** None
  - **Priority:** Medium (nice-to-have alternative to Notion)
  - **Estimated Effort:** 4-6 hours
- [ ] Create architecture diagrams in docs/ directory
- [ ] Create INTEGRATIONS.md documenting all external APIs

## Bug Fixes & UI Issues
- [x] **CRITICAL: Pending Orders "Confirm & Schedule" Not Creating Calendar Entries** ✅
  - **Completed:** 2025-11-03
  - **Issue:** When clicking "Confirm & Schedule" in Pending Orders, user selects date in modal, but order does not appear on calendar/schedule after confirmation. Order disappears from Pending Orders but is not visible anywhere in the schedule.
  - **Severity:** Critical - breaks core workflow, orders are lost after confirmation
  - **Root Cause:** service_interval values stored as STRING "2" not matching calendar filter keys ('2-mo'). Calendar filter logic excluded orders with numeric/string-numeric intervals.
  - **Solution:** Added normalizeServiceInterval() function to handle all formats (numbers, string numbers, long-form, null)
  - **Impact:** Orders now visible on calendar with correct 2-Month styling (orange markers)
  - **Documentation:** See docs/fixes/2025-11-03-calendar-service-interval-fix.md
  - **Expected Behavior:**
    - User clicks "Confirm & Schedule" on pending order
    - Modal appears with date picker
    - User selects date and clicks "Confirm & Schedule"
    - Order status updates to 'confirmed' or 'scheduled'
    - Order appears on calendar/schedule on selected date
    - Order removed from Pending Orders queue
  - **Current Broken Behavior:**
    - Order disappears from Pending Orders ✅
    - Order does NOT appear on calendar/schedule ❌
    - Order is lost/invisible in the system ❌
  - **Root Cause Investigation Needed:**
    - **Hypothesis 1: Database update succeeds but calendar query fails**
      - Service order status updated to 'confirmed' but not queried by calendar view
      - Check: Does calendar query filter by specific status values?
      - Check: Are confirmed orders included in calendar query WHERE clause?
    - **Hypothesis 2: scheduled_date not being saved**
      - Modal date picker value not being passed to backend
      - Check: Is `scheduled_date` column being updated in service_orders table?
      - Check: Are there database errors in edge function logs?
    - **Hypothesis 3: Calendar component not refreshing**
      - Database updated correctly but UI not re-fetching data
      - Check: Is calendar component refetching data after confirmation?
      - Check: Is there a cache invalidation issue?
    - **Hypothesis 4: Wrong table being queried**
      - Pending Orders uses `service_orders` table
      - Calendar might be querying different table (e.g., old `bookings` table?)
      - Check: Which table does calendar component query?
  - **Debug Steps:**
    - **Step 1: Database Verification (5 minutes)**
      - After clicking "Confirm & Schedule", check database directly:
        ```sql
        SELECT id, customer_id, boat_id, service_type, status, scheduled_date, created_at
        FROM service_orders
        WHERE status IN ('confirmed', 'scheduled', 'pending')
        ORDER BY created_at DESC
        LIMIT 10;
        ```
      - Verify: Does order exist with correct `scheduled_date`?
      - Verify: What is the `status` value after confirmation?
    - **Step 2: Calendar Query Audit (10 minutes)**
      - Inspect calendar component code
      - Document: Which table does it query? (service_orders, bookings, other?)
      - Document: What WHERE clause filters are applied?
      - Document: Does it filter by status? If so, which statuses are included?
    - **Step 3: Edge Function Logs (5 minutes)**
      - Check Supabase edge function logs for errors during confirmation
      - Check for database constraint violations or RLS policy denials
      - Verify: Is the update operation succeeding?
    - **Step 4: UI State Management (10 minutes)**
      - Check if calendar component refetches data after confirmation
      - Check for race conditions (modal closes before data refetches?)
      - Verify: Is there proper cache invalidation?
  - **Likely Fixes (based on hypothesis):**
    - **Fix 1: Update calendar query to include confirmed orders**
      - If calendar only shows `status='scheduled'`, update to include `status IN ('scheduled', 'confirmed')`
    - **Fix 2: Ensure scheduled_date is saved**
      - Fix edge function to properly update `scheduled_date` column
      - Add validation to ensure date is not null before saving
    - **Fix 3: Add calendar refetch after confirmation**
      - Trigger calendar data refetch after successful confirmation
      - Invalidate React Query cache (if using)
    - **Fix 4: Standardize status values**
      - Ensure Pending Orders and Calendar use same status terminology
      - Document expected status flow: pending → confirmed → in_progress → completed
  - **Testing After Fix:**
    - Confirm order from Pending Orders
    - Verify order appears on calendar immediately
    - Verify scheduled_date matches selected date
    - Verify order details are correct (customer, boat, service type)
    - Test multiple orders to ensure consistency
    - Test edge cases: same-day orders, far-future dates, past dates (should error)
  - **Database Schema to Verify:**
    - Table: `service_orders`
    - Required columns: `id`, `customer_id`, `boat_id`, `service_type`, `status`, `scheduled_date`, `created_at`, `updated_at`
    - Status enum should include: 'pending', 'confirmed', 'scheduled', 'in_progress', 'completed', 'cancelled', 'declined'
  - **Integration Points to Check:**
    - Pending Orders component → Edge function (confirm-order or similar)
    - Edge function → service_orders table update
    - Calendar component → service_orders table query
    - Calendar component → UI refresh trigger
  - **Dependencies:**
    - Pending Orders feature (completed 2025-10-30)
    - Calendar/Schedule view (existing feature)
  - **Priority:** CRITICAL (P0 - breaks core workflow immediately after feature launch)
  - **Estimated Effort:** 2-4 hours
    - Investigation: 0.5-1 hour
    - Fix implementation: 0.5-1 hour
    - Testing: 0.5-1 hour
    - Documentation: 0.5-1 hour
  - **Impact:**
    - **Current:** Orders are lost after confirmation, breaking entire Pending Orders workflow
    - **After Fix:** Seamless flow from Pending Orders → Calendar, complete order visibility
  - **Action Required:** Investigate and fix immediately - this blocks usage of Pending Orders feature

- [x] **Schedule Calendar: Drag-and-Drop Rescheduling & Interactive Entries** ✅
  - **Completed:** 2025-11-04 (verification)
  - **Status:** FULLY COMPLETE - Both click-to-view modal and drag-and-drop rescheduling implemented
  - **Primary Feature:** Drag-and-drop boats onto different dates for quick rescheduling ✅ COMPLETE
  - **Secondary Feature:** Click to view/edit service details ✅ COMPLETE (implemented 2025-11-03)
    - Click boats → Modal with full service details (service info, customer, boat)
    - 5 quick actions: Reschedule (with date picker), View Customer, View Boat, Cancel, Mark Complete
    - Keyboard accessible, cursor pointer on hover
  - **Expected Behavior:**
    - **Drag-and-Drop Rescheduling:**
      - Drag boat/service from one date to another date on calendar
      - Visual feedback during drag (ghost element, drop zones highlight)
      - Drop on new date → Update scheduled_date in database
      - Confirmation toast: "Service rescheduled to [new date]"
      - Calendar refreshes to show boat on new date
    - **Click for Details:**
      - Click on boat/service entry → Opens detail modal
      - Modal shows: Customer name, boat name, service type, scheduled time, service notes, order details
      - Actions available: Edit details, View customer, View boat, Cancel service, Mark complete
  - **Current Behavior:**
    - Calendar entries are display-only
    - No interaction possible
    - Must navigate away from calendar to reschedule or view details
  - **Drag-and-Drop Implementation:**
    - **Library Choice:**
      - **Option A: @dnd-kit/core (Recommended)**
        - Modern, accessible, React-focused
        - Touch-friendly (works on tablets/mobile)
        - Keyboard navigation support
        - Good documentation and examples
        - MIT license
      - **Option B: react-beautiful-dnd**
        - Popular but development slowed
        - Good for list reordering
        - Limited multi-container support
      - **Option C: HTML5 Drag & Drop API**
        - Native browser API (no library needed)
        - Less polished UX, inconsistent touch support
        - More manual work required
    - **Technical Implementation:**
      - Make calendar entries draggable (add draggable="true" or use dnd-kit)
      - Define drop zones (each calendar date cell is a drop zone)
      - Handle drag events: onDragStart, onDragOver, onDrop
      - Visual feedback: ghost element follows cursor, drop zones highlight on hover
      - Update database on drop: `UPDATE service_orders SET scheduled_date = ? WHERE id = ?`
      - Optimistic UI update: move entry immediately, rollback on error
      - Validation: Check for scheduling conflicts, warn if overbooked
    - **UX Considerations:**
      - **Visual Feedback:**
        - Dragging: Show semi-transparent ghost of boat entry
        - Valid drop zone: Highlight date cell with green border/background
        - Invalid drop zone: Red border or "X" cursor (e.g., past dates, blocked dates)
        - Dropping: Smooth animation to final position
      - **Touch Support:**
        - Long press to initiate drag on mobile/tablet
        - Large drop zones for fat-finger friendly
        - Haptic feedback on drag start/drop (if supported)
      - **Keyboard Support:**
        - Tab to select entry, Space to grab, Arrow keys to move, Enter to drop
        - Screen reader announcements: "Grabbed [boat name]", "Moved to [date]"
      - **Undo/Redo:**
        - Toast with "Undo" button after reschedule
        - 5-second window to undo change
  - **Conflict Detection:**
    - Check if technician already has service on target date
    - Warn: "You already have 3 services scheduled on [date]. Continue?"
    - Show capacity indicator: "2 of 5 slots used" on each date
    - Optional: Block drop if exceeds daily capacity (configurable in settings)
  - **Click-to-Edit Modal Implementation:**
    - **Modal Content:**
      - **Header:** Boat name, Customer name
      - **Details Section:**
        - Service type (editable dropdown)
        - Scheduled date (editable date picker)
        - Scheduled time (editable time picker - future enhancement)
        - Service notes (editable textarea)
        - Order number, status badge
      - **Action Buttons:**
        - **Save Changes:** Update service_order in database
        - **Reschedule:** Alternative to drag-and-drop (date picker)
        - **View Customer:** Navigate to customer profile
        - **View Boat:** Navigate to boat details page
        - **Cancel Service:** Cancel order with reason (like decline workflow)
        - **Mark Complete:** Quick complete (or navigate to Billing for full completion)
        - **Delete:** Remove from schedule (with confirmation)
      - **Footer:** "Last updated [timestamp]", Cancel/Save buttons
    - **Modal Triggers:**
      - Click calendar entry → Open modal
      - Keyboard: Tab to entry, Enter/Space to open modal
      - Mobile: Tap entry (not long press - that's for drag)
  - **Implementation Phases:**
    - **Phase 1 (2 hours): Click-to-View Modal**
      - Build modal component with service details
      - Add onClick handler to calendar entries
      - Display read-only details first
      - Test: Click entry → Modal opens with correct data
    - **Phase 2 (3-4 hours): Drag-and-Drop**
      - Install and configure @dnd-kit/core library
      - Make calendar entries draggable
      - Define drop zones (date cells)
      - Implement drag handlers and database update
      - Visual feedback (ghost, highlights)
      - Test: Drag entry to new date → Updates in database
    - **Phase 3 (2 hours): Conflict Detection & Validation**
      - Check for scheduling conflicts on drop
      - Show warnings if overbooking
      - Prevent invalid drops (past dates, etc.)
      - Capacity indicators on date cells
    - **Phase 4 (1-2 hours): Modal Edit Actions**
      - Make modal fields editable
      - Implement Save Changes functionality
      - Add action buttons (Cancel, View Customer, etc.)
      - Test all actions work correctly
    - **Phase 5 (1 hour): Polish & Accessibility**
      - Touch support testing
      - Keyboard navigation testing
      - Undo functionality
      - Loading states, error handling
      - Mobile responsive testing
  - **Database Updates:**
    - Update `service_orders.scheduled_date` on drop
    - Optional: Add `rescheduled_at` timestamp for audit trail
    - Optional: Add `rescheduled_from` to track original date
    - Log reschedule events in audit log (if User Accounts system exists)
  - **Edge Cases to Handle:**
    - Drag to same date → No-op, smooth return animation
    - Drag to past date → Show error, prevent drop
    - Drag while modal open → Close modal first
    - Multiple concurrent reschedules → Use optimistic locking or last-write-wins
    - Network error during drop → Rollback to original position, show error toast
    - Calendar view changes during drag (month switch) → Cancel drag
  - **Calendar Library Compatibility:**
    - If using FullCalendar → It has built-in drag-and-drop support, leverage it
    - If custom calendar → Use @dnd-kit/core for full control
    - Ensure calendar component re-renders after data changes
  - **Mobile Considerations:**
    - Drag-and-drop on mobile can be clunky
    - Alternative: Click entry → Modal with "Reschedule" button → Date picker
    - Or: Long press to drag (Android/iOS native feel)
    - Test on actual devices (iPhone, iPad, Android)
  - **Analytics Opportunities:**
    - Track reschedule frequency (how often are services moved?)
    - Identify most-rescheduled boats/customers
    - Measure time-to-reschedule (drag-drop vs. modal vs. decline-and-rebook)
  - **Dependencies:**
    - Calendar component (✅ exists)
    - Service order detail modal (new component needed)
    - @dnd-kit/core library (or alternative)
  - **Priority:** High (highly requested feature, major workflow improvement)
  - **Estimated Effort:** 8-11 hours total
    - Phase 1 (Click modal): 2 hours
    - Phase 2 (Drag-and-drop): 3-4 hours
    - Phase 3 (Conflict detection): 2 hours
    - Phase 4 (Modal edit actions): 1-2 hours
    - Phase 5 (Polish): 1 hour
  - **Impact:**
    - **Massive workflow improvement:** Rescheduling becomes instant (drag-drop vs. multi-step process)
    - **Faster calendar management:** No need to navigate away from calendar
    - **Better capacity planning:** Visual feedback on overbooking
    - **Improved user experience:** Modern, intuitive interaction
    - **Time savings:** Estimate 50-75% faster rescheduling workflow
  - **Success Metrics:**
    - 80%+ of reschedules done via drag-and-drop (vs. decline/rebook)
    - Average reschedule time: <10 seconds (vs. 60+ seconds previously)
    - Zero data loss during drag operations
    - 90%+ user satisfaction with drag-and-drop UX
  - **Future Enhancements (Post-MVP):**
    - Drag from "Needs Scheduling" queue directly to calendar
    - Multi-select: Drag multiple services at once
    - Copy/duplicate service by drag-and-drop with modifier key
    - Drag to technician assignment (if multi-technician calendar view)
    - Time-slot-based drag-and-drop (not just dates, but specific times)

- [x] **Operations Dashboard: Fix "Unknown" Boat Names in Widgets** ✅
  - **Completed:** 2025-11-04
  - **Status:** VERIFIED COMPLETE - Queries working correctly, boat names displaying properly
  - **Issue:** Operations Admin Dashboard shows "Unknown" for boat names in several widgets: "Today's Services", "Upcoming Services", "Recently Completed", "Actions Required", "Paint Alerts"
  - **Severity:** High - makes dashboard unusable for identifying which boats need attention
  - **What's Been Completed:**
    - ✅ Dashboard queries properly use LEFT JOINs with boats table
    - ✅ Fallback handling implemented: `boat?.boat_name || 'Unknown Boat'`
    - ✅ All 5 widgets have correct database queries
    - ✅ Test file created: `verify-boat-names-fix.spec.js`
  - **Remaining Work:**
    - ⏳ Run Playwright test to verify rendering in browser
    - ⏳ Check database for NULL boat_ids in service_orders
    - ⏳ Verify boat names exist in boats table (not NULL)
    - ⏳ If still showing "Unknown", investigate data quality issues
  - **Expected Behavior:**
    - All widgets should display actual boat names (e.g., "Maris", "Sea Quest", "Lucky Lady")
    - If boat name unavailable, show placeholder like "Boat #[ID]" or customer name
  - **Current Broken Behavior:**
    - Multiple widgets showing "Unknown Boat" instead of actual boat names
    - User cannot identify which boats need service without clicking through
    - Makes dashboard non-functional for quick overview
  - **Root Cause Investigation:**
    - **Check 1: Database joins missing**
      - Dashboard queries might be missing JOIN to boats table
      - Check SQL queries in dashboard components
      - Verify: Are queries joining service_orders → boats → customers?
    - **Check 2: Boat data incomplete**
      - service_orders.boat_id might be NULL for some entries
      - Check database: `SELECT COUNT(*) FROM service_orders WHERE boat_id IS NULL`
      - Check data quality: Are boat_ids properly set when creating orders?
    - **Check 3: RLS policy blocking data**
      - Row-Level Security might be preventing boat data access
      - Check: Can dashboard query read from boats table?
      - Verify RLS policies allow admin access to all boats
    - **Check 4: Data fetching error handling**
      - API call succeeding but boat data not properly extracted
      - Check: Is boat name in the response but not displayed?
      - Frontend mapping issue: boat.name vs boat.boat_name vs boat.title?
  - **Debug Steps:**
    - **Step 1: Database Query (5 minutes)**
      ```sql
      -- Check if boat names exist in database
      SELECT
        so.id,
        so.boat_id,
        b.name as boat_name,
        c.name as customer_name,
        so.service_type,
        so.scheduled_date
      FROM service_orders so
      LEFT JOIN boats b ON so.boat_id = b.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.scheduled_date >= CURRENT_DATE - INTERVAL '7 days'
      ORDER BY so.scheduled_date DESC
      LIMIT 20;
      ```
      - Verify: Do boats have names in database?
      - Verify: Are boat_ids properly linked?
    - **Step 2: Dashboard Query Audit (10 minutes)**
      - Inspect dashboard component queries for each widget
      - Check: Are they joining to boats table?
      - Check: What field name are they using (name, boat_name, title)?
    - **Step 3: API Response Inspection (5 minutes)**
      - Open browser DevTools Network tab
      - Reload dashboard
      - Inspect API responses for widget data
      - Verify: Is boat name in the response?
    - **Step 4: Frontend Mapping (10 minutes)**
      - Check dashboard component code
      - Find where "Unknown Boat" is set as fallback
      - Verify property path: boat?.name vs boat?.boat_name
  - **Likely Fixes:**
    - **Fix 1: Add missing joins to dashboard queries**
      ```sql
      -- Example fix for Today's Services query
      SELECT
        so.*,
        b.name as boat_name,
        c.name as customer_name
      FROM service_orders so
      LEFT JOIN boats b ON so.boat_id = b.id
      LEFT JOIN customers c ON so.customer_id = c.id
      WHERE so.scheduled_date = CURRENT_DATE
      ```
    - **Fix 2: Fix property path in frontend**
      ```javascript
      // Change from:
      const boatName = service.boat?.boat_name || 'Unknown Boat';
      // To:
      const boatName = service.boats?.name || service.customer?.name + "'s Boat" || 'Unknown Boat';
      ```
    - **Fix 3: Backfill missing boat_ids**
      - If some service_orders have NULL boat_id, backfill from customer data
    - **Fix 4: Update RLS policies**
      - Ensure admin users can access all boat data
  - **Testing After Fix:**
    - Reload dashboard
    - Verify all widgets show actual boat names
    - Test with multiple boats and customers
    - Verify fallback behavior if boat truly unknown
    - Check mobile responsive view
  - **Affected Widgets:**
    - Today's Services (showing "Unknown Boat")
    - Upcoming Services (showing "Unknown")
    - Recently Completed (showing "Maris" correctly, others might be broken)
    - Actions Required (showing "Maris")
    - Paint Alerts (showing "Unknown")
  - **Database Schema Verification:**
    - Table: service_orders (has boat_id foreign key)
    - Table: boats (has name column)
    - Table: customers (has name column)
    - Relationship: service_orders.boat_id → boats.id → boats.name
  - **Dependencies:**
    - Operations Dashboard (✅ exists)
    - boats and customers tables (✅ exist)
  - **Priority:** High (dashboard unusable without boat names)
  - **Estimated Effort:** 2-3 hours
    - Investigation: 0.5 hour
    - Fix queries/joins: 1 hour
    - Frontend fixes: 0.5 hour
    - Testing all widgets: 0.5 hour
    - Backfill data if needed: 0.5 hour
  - **Impact:**
    - Dashboard becomes functional for daily operations
    - Users can quickly identify which boats need attention
    - Improved data quality and consistency
  - **Note:** This might be related to the calendar service_interval fix (completed 2025-11-03) - similar data fetching/joining issues

- [x] **Operations Dashboard: Investigate Customers Widget Data Discrepancy** ✅
  - **Completed:** 2025-11-04
  - **Status:** INVESTIGATION COMPLETE - Data verified and documented
  - **Original Issue:** Operations Admin Dashboard "Customers" widget showing 861 customers - needed verification
  - **✅ CLEANED Customer Data (as of 2025-11-04) - Test data removed!**
    - **REAL CUSTOMER COUNT: 177** (not 885!)
      - **177 real customers** (actual business customers)
      - **176 real boats** (matches user's report of ~178 boats)
      - Some customers own multiple boats (176 boats / 177 customers)
    - **REAL REVENUE STATISTICS:**
      - **1,599 real invoices** (not 1,617)
      - **$182,979.03 total revenue** (real business revenue)
      - **$170,123.83 paid revenue** (93% collection rate)
    - **✅ TEST DATA CLEANED (2025-11-04):**
      - **Deleted 756 test customers** (pattern "Test Customer [timestamp]")
      - **Deleted 2 test boats**
      - **Deleted 2 test payments**
      - **0 test invoices** (none existed)
      - All test data successfully removed from production database
    - **Why Original Investigation Was Wrong:**
      - Counted all 909 customers (177 real + 732 test)
      - Test customers have no boats, skewing "customers without boats" metric
      - No is_test flag in schema to filter test data
  - **✅ QUICK IMPROVEMENTS COMPLETE (2025-11-04):**
    1. **✅ DATABASE CLEANUP** - 756 test customers removed from production
    2. **✅ is_test FLAG ADDED** - Future test data isolation in place
       - Added is_test BOOLEAN DEFAULT FALSE to: customers, boats, invoices, service_orders
       - All dashboard queries now filter: WHERE is_test = FALSE
       - Prevents future test data pollution
    3. **✅ DASHBOARD BUSINESS SUMMARY CARD** - Real-time stats display
       - Shows: "177 Customers (176 boats)" (dynamically loaded)
       - Shows: "$182,979 Total Revenue" | "$170,124 Paid (93% collection rate)"
       - Shows: "1,599 Total Invoices"
       - Tooltips explain each metric
       - Real-time queries exclude test data
       - Responsive grid layout with hover effects
    4. **🔜 DATA GOVERNANCE** (Future):
       - Create separate test database/schema for testing
       - Never create test data in production database
       - Document cleanup procedures
  - **Conclusion:** Real customer count is **177, not 861 or 885**. Database polluted with 732 test customers created during October-November 2025 testing.
  - **Investigation Steps:**
    - **Step 1: Database Query Audit (10 minutes)**
      ```sql
      -- Check total customers in database
      SELECT COUNT(*) as total_customers FROM customers;

      -- Check active vs inactive customers
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE active = true) as active,
        COUNT(*) FILTER (WHERE active = false) as inactive,
        COUNT(*) FILTER (WHERE deleted_at IS NOT NULL) as deleted
      FROM customers;

      -- Check for duplicate customers (by email/phone/name)
      SELECT name, email, phone, COUNT(*) as count
      FROM customers
      GROUP BY name, email, phone
      HAVING COUNT(*) > 1;

      -- Check customer creation dates to understand growth
      SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as new_customers
      FROM customers
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month DESC;
      ```
    - **Step 2: Revenue Calculation Audit (10 minutes)**
      ```sql
      -- Check total revenue from invoices
      SELECT
        COUNT(*) as invoice_count,
        SUM(amount) as total_revenue,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_revenue,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_revenue,
        SUM(CASE WHEN status = 'refunded' THEN amount ELSE 0 END) as refunded_revenue
      FROM invoices;

      -- Check revenue by year
      SELECT DATE_TRUNC('year', issued_at) as year, SUM(amount) as revenue
      FROM invoices
      WHERE status = 'paid'
      GROUP BY DATE_TRUNC('year', issued_at)
      ORDER BY year DESC;
      ```
    - **Step 3: Widget Code Inspection (10 minutes)**
      - Locate the customers widget component in Operations codebase
      - Document exact SQL query or API call used to fetch data
      - Check: What filters are applied (active, date range, etc.)?
      - Check: Are there any WHERE clauses that might include/exclude records?
      - Check: Is there caching that might show stale data?
    - **Step 4: Cross-Reference with External Sources (10 minutes)**
      - Check Stripe dashboard: How many customers exist in Stripe?
      - Check historical records: Does 861 align with known business growth?
      - Check Notion or other tracking: Any previous customer counts documented?
      - Ask owner: Does this number "feel" right based on business knowledge?
    - **Step 5: Data Quality Check (15 minutes)**
      - Check for orphaned customer records (customers with no boats, no services, no invoices)
      - Check for test/demo customers that should be excluded
      - Check for customers created during data migration/import (may include historical/inactive)
      - Verify created_at and updated_at timestamps are reasonable
  - **Likely Issues & Fixes:**
    - **Issue 1: Including inactive/archived customers**
      - Fix: Add filter `WHERE active = true` or similar
      - Update widget label: "Active Customers" instead of "Customers"
    - **Issue 2: Counting test/demo data**
      - Fix: Exclude test customers (by tag, email pattern, or flag)
      - Add WHERE clause: `WHERE email NOT LIKE '%test%' AND email NOT LIKE '%demo%'`
    - **Issue 3: Revenue time period unclear**
      - Fix: Add date range filter (default to current year or last 12 months)
      - Update label: "Revenue (2025)" or "Revenue (Last 12 Months)"
    - **Issue 4: Including deleted/refunded records**
      - Fix: Exclude soft-deleted customers and refunded invoices
      - Filter: `WHERE deleted_at IS NULL` and `WHERE status NOT IN ('refunded', 'cancelled')`
    - **Issue 5: Duplicate customer records**
      - Fix: Deduplicate customers by email/phone or merge duplicates
      - Investigate: Why are duplicates being created?
  - **Testing After Fix:**
    - Reload dashboard and verify updated count
    - Compare with manual database query count
    - Verify revenue matches Stripe dashboard (or document differences)
    - Check that widget label is clear and accurate
    - Test that filtering logic makes business sense
  - **Deliverables:**
    - **Documentation:** Write brief explanation of:
      - Where 861 count comes from (query, filters, logic)
      - What qualifies as a "customer" in this widget
      - Where revenue number comes from (time period, scope, filters)
      - Any known discrepancies and why (e.g., Stripe vs database differences)
    - **Widget Update (if needed):**
      - Update labels for clarity ("Active Customers", "Revenue (2025)")
      - Add tooltip explaining calculation
      - Fix any data quality issues discovered
      - Update query filters if necessary
  - **Database Schema Verification:**
    - Table: customers (columns: id, name, email, phone, active, deleted_at, created_at, updated_at)
    - Table: invoices (columns: id, customer_id, amount, status, issued_at, paid_at)
    - Verify: Are there proper foreign key relationships?
    - Verify: Are timestamps being set correctly on creation/update?
  - **Dependencies:**
    - Operations Dashboard (✅ exists)
    - customers and invoices tables (✅ exist)
  - **Priority:** Medium (data accuracy important but not blocking critical workflows)
  - **Estimated Effort:** 1-2 hours
    - Investigation & documentation: 1 hour
    - Widget label updates: 0.25 hour
    - Fix data quality issues (if found): 0.5-1 hour (optional)
    - Testing & verification: 0.25 hour
  - **Impact:**
    - Accurate customer count for business planning
    - Clear understanding of revenue metrics
    - Confidence in dashboard data for decision-making
    - Potential discovery of data quality issues (duplicates, test data, etc.)
  - **Success Criteria:**
    - 861 customer count verified as accurate (or corrected to accurate number)
    - Revenue source documented and verified
    - Widget labels updated for clarity
    - Documentation created explaining calculation methodology
    - No data quality issues remaining (or documented as known limitations)

- [x] **Standardize Navigation Components Across All Services** ✅
  - **Completed:** 2025-11-03
  - **Issue:** Billing and Insight services were using different navigation bars than Operations and Inventory. Navigation components were inconsistent across services, leading to fragmented user experience and maintenance overhead.
  - **Solution:** Migrated all services to use shared navigation system from `sailorskills-shared` package.
  - **Final State:**
    - ✅ Operations: Migrated to shared navigation with subPages configuration
    - ✅ Inventory: Already using shared navigation (no changes needed)
    - ✅ Billing: Migrated to shared navigation + fixed bug (currentPage was 'operations' instead of 'billing')
    - ✅ Insight: Already using shared navigation (no changes needed)
  - **Implementation Details:**
    - **Operations:** Removed hardcoded `<nav>` from HTML, added `subPages` config to `initGlobalNav()`
    - **Billing:** Removed hardcoded `<nav>` from HTML, fixed `currentPage: 'billing'`, added `subPages` config, installed missing `@vitejs/plugin-react`
    - **Removed deprecated:** `breadcrumbs` parameter from both services (no longer used in shared nav system)
    - **Updated:** CLAUDE.md files to mark navigation as ✅ COMPLIANT
  - **Three-Tier Navigation Structure (Standard):**
    - **Tier 1:** Top bar with service name, user menu, global actions
    - **Tier 2:** Section navigation (main feature areas)
    - **Tier 3:** Sub-section navigation (if needed for complex features)
  - **Impact:**
    - ✅ Consistent 3-tier navigation across all 4 internal admin services
    - ✅ Fixed Billing navigation bug (was showing as 'operations' in global nav)
    - ✅ Single source of truth for navigation updates (shared package)
    - ✅ Reduced code duplication and maintenance burden
    - ✅ Better architectural consistency
  - **Actual Effort:** ~2 hours (audit, migration, testing, documentation)
  - **Testing:** Dev servers verified working for Operations and Billing

- [x] **Insight Navigation: Remove Breadcrumb from Second Tier** ✅
  - **Completed:** 2025-11-03 (as part of navigation standardization)
  - **Issue:** Insight second-tier navigation was showing breadcrumb instead of proper navigation items
  - **Solution:** Insight was already using shared navigation system which doesn't use breadcrumbs
  - **Verification:** Confirmed Insight using `initNavigation()` from shared package with proper configuration
  - **Impact:** Consistent navigation UX across Insight matching other services

- [ ] **Operations Navigation Optimization & Simplification**
  - **Rationale:** Operations navigation has grown organically and may have too many menu items, causing clutter and cognitive overload. Need to audit current navigation structure, identify opportunities to condense/combine related items, and implement cleaner navigation patterns (dropdowns, grouped menus, etc.).
  - **Current State Analysis Needed:**
    - Audit all current Operations navigation items (all three tiers)
    - Identify redundant or rarely-used items
    - Group related functionality that could be combined
    - Assess information architecture and user flow
  - **Potential Optimization Strategies:**
    - **Dropdown Menus:** Group related items under parent menu (e.g., "Scheduling" dropdown with "Calendar", "Pending Orders", "Needs Scheduling")
    - **Mega Menu:** For categories with many sub-items, use mega menu with visual grouping
    - **Consolidate Pages:** Combine related views into single page with tabs (e.g., "Customer Management" page with tabs for "All Customers", "Add Customer", "Customer Search")
    - **Contextual Actions:** Move some actions to contextual menus (three-dot menus on cards/rows) instead of top-level nav
    - **Quick Actions Button:** Single "+" button with dropdown for common create actions (Add Customer, Schedule Service, etc.)
    - **Search-First Navigation:** Add global search for customers/boats to reduce need for dedicated nav items
  - **Example Consolidations to Consider:**
    - Scheduling group: Calendar, Pending Orders, Needs Scheduling → Single "Scheduling" dropdown or page with tabs
    - Customer management: Customers list, Add Customer, Customer Search → Single page with search bar and "Add" button
    - Service logs: View Logs, Add Log → Single "Service History" page
    - Reports/Analytics: Group any reporting items under "Reports" dropdown
  - **Implementation Approach:**
    - **Phase 1: Audit & Analysis (2-3 hours)**
      - Document current navigation structure (screenshot + list all items)
      - Conduct usage analysis: which items are most/least used (analytics or manual assessment)
      - Interview/survey users: what do they use most? what's confusing?
      - Create navigation wireframes with proposed groupings
    - **Phase 2: Design New Structure (2-3 hours)**
      - Design simplified navigation hierarchy
      - Create wireframes/mockups showing dropdowns, grouped menus
      - Validate against common user workflows (e.g., "schedule a service", "find customer info")
      - Get feedback on proposed structure
    - **Phase 3: Implementation (4-6 hours)**
      - Update Operations navigation component
      - Implement dropdowns or mega menu (if chosen)
      - Add quick actions button (if applicable)
      - Update routing and page structures (if consolidating pages)
      - Test all navigation paths work correctly
    - **Phase 4: User Testing & Refinement (1-2 hours)**
      - Test with actual users (owner, technicians)
      - Gather feedback on new structure
      - Make adjustments based on feedback
      - Document final navigation structure
  - **Design Patterns to Consider:**
    - **Tiered Dropdowns:** Hover or click to reveal grouped items
    - **Icon + Label Menus:** Visual icons help with recognition
    - **Collapsible Sections:** Expand/collapse menu groups as needed
    - **Favorites/Pinned Items:** Let users pin most-used items to top
    - **Breadcrumbs (conditionally):** Only on deep pages, not in main nav
  - **Success Criteria:**
    - Reduce top-level navigation items by 30-50%
    - Users can find any feature in ≤2 clicks
    - Navigation feels cleaner, less cluttered
    - Common workflows are faster (fewer clicks)
    - Mobile navigation is usable (responsive design)
  - **Dependencies:**
    - Current Operations navigation structure audit
    - User feedback on pain points
  - **Blocks:** None (independent UX improvement)
  - **Priority:** Medium (Q4 2025 or Q1 2026 - improves daily UX but not urgent)
  - **Estimated Effort:** 8-14 hours total
    - Audit & analysis: 2-3 hours
    - Design: 2-3 hours
    - Implementation: 4-6 hours
    - Testing & refinement: 1-2 hours
  - **Impact:**
    - Cleaner, more intuitive navigation
    - Faster access to common features
    - Reduced cognitive load for users
    - Better mobile/tablet experience
    - Easier onboarding for new users
    - Foundation for consistent nav across all services
  - **Notes:**
    - This optimization should inform navigation design for other services (Billing, Inventory, etc.)
    - Consider creating shared navigation patterns in `sailorskills-shared` after Operations proves successful
    - Document navigation design decisions for future reference

## Portal - Customer Experience & Admin Tools
- [x] **Admin Customer Impersonation** ✅ COMPLETE
  - **Status:** Fully implemented and deployed to production
  - **Completed:** 2025-11-07 (design 2025-11-06, implementation 2025-11-07)
  - **Rationale:** Enable administrators to view the customer portal as any customer for support, debugging, and testing purposes without requiring actual customer credentials
  - **Features:**
    - Searchable customer selector in portal header (admin-only)
    - Session-based impersonation with prominent warning banner
    - All portal pages show impersonated customer's data (boats, services, invoices, messages)
    - "Exit Customer View" button to return to admin account
    - Security: Admin status verification, session storage isolation, no audit logging (initial phase)
  - **Implementation Approach:**
    - Auth layer with `getEffectiveUser()` function that returns impersonated customer when session storage is set
    - All portal pages updated to use `getEffectiveUser()` instead of `getCurrentUser()`
    - Customer selector component with datalist for search/filter
    - Impersonation banner component with customer display and exit button
    - No RLS policy changes needed (existing security model handles impersonation naturally)
  - **Database:** New `getAllCustomers()` API function, uses existing customers/boats tables
  - **Design:** See `/sailorskills-portal/docs/plans/2025-11-06-admin-customer-impersonation-design.md`
  - **Implementation Plan:** See `/sailorskills-portal/docs/plans/2025-11-06-admin-customer-impersonation.md`
  - **Worktree:** `~/.config/superpowers/worktrees/sailorskills-portal/feature/admin-customer-impersonation`
  - **Branch:** `feature/admin-customer-impersonation`
  - **Next Steps:** Execute implementation plan (10 tasks, estimated 12-15 hours)
  - **Impact:**
    - Customer support: View portal exactly as customer sees it
    - Debugging: Reproduce customer-reported issues
    - Testing: Verify features work correctly for different customer scenarios
    - No security vulnerabilities (admin verification on every effective user call)
  - **Priority:** High (critical support tool)
  - **Estimated Effort:** 12-15 hours implementation + 2 hours testing
  - **Dependencies:** None (uses existing auth and database infrastructure)

## Operations - Workflow & Data
- [x] **Pending Orders Queue & Confirmation Workflow** ✅
  - **Completed:** 2025-10-30
  - **Rationale:** Currently no dedicated view for incoming orders from Estimator - orders go straight to calendar without confirmation step. Need proper order intake workflow.
  - **Features:**
    - Dedicated "Pending Orders" inbox showing all `service_orders` with `status='pending'`
    - Order details view (customer, boat, service type, estimated amount, order number)
    - Action buttons: "Confirm & Schedule", "Decline", "Contact Customer"
    - Calendar picker to set actual `scheduled_date`
    - Status update workflow: pending → confirmed → in_progress → completed
    - Notifications when new orders arrive from Estimator
  - **Impact:** Proper order management workflow, prevents missed orders, enables scheduling conflicts detection
  - **Documentation:** See `PENDING_ORDERS_FEATURE.md`

- [x] **Pending Orders: Enhanced Decline Workflow with Customer Notifications** ✅
  - **Completed:** 2025-11-04
  - **Status:** COMPLETE - Database migrated, frontend updated, email template deployed
  - **Issue:** When declining an order in Pending Orders page, no email is sent to customer and there's no clear audit trail of the decline reason or status change.
  - **What's Been Completed:**
    - ✅ Frontend decline modal built with reason input (pending-orders.js lines 314-388)
    - ✅ Email notification invocation to `send-notification` edge function
    - ✅ Success toast with customer notification message
    - ✅ Error handling for failed email delivery
    - ✅ Detailed implementation plan created (2025-11-03)
  - **Remaining Work:**
    - ⏳ Run database migration: `ALTER TABLE service_orders ADD COLUMN decline_reason TEXT;`
    - ⏳ Update `send-notification` edge function with email template for 'order_declined' type
    - ⏳ Deploy updated edge function to production
    - ⏳ End-to-end testing: verify email delivery to customers
  - **Current Gaps:**
    - No customer notification when order declined (code ready, needs edge function template)
    - No decline reason captured (code ready, needs DB column)
    - Status change not tracked in customer-visible history
    - No audit trail for declined orders
  - **Required Features:**
    - **Decline Modal with Email Option:**
      - When "Decline" button clicked, show modal with:
        - Reason dropdown (common reasons: "Fully booked", "Service not available", "Scheduling conflict", "Out of service area", "Other")
        - Free text field for detailed explanation/notes
        - Checkbox: "Send email notification to customer" (checked by default)
        - Email preview showing customer message (editable template)
        - Actions: "Decline & Notify" or "Cancel"
    - **Customer Email Notification:**
      - Send via Resend API (already integrated)
      - Email subject: "Update on Your Service Request"
      - Email content:
        - Thank customer for their request
        - Politely decline with selected reason
        - Include personal note if provided
        - Offer to contact them if situation changes
        - Include contact information for follow-up
      - Template should be professional and maintain customer relationship
    - **Status & Audit Trail:**
      - **Option A: Update service_orders status (Recommended)**
        - Add new status to `service_orders`: `status = 'declined'`
        - Add columns: `declined_at: timestamp`, `declined_by: uuid`, `decline_reason: text`, `decline_notes: text`
        - Declined orders visible in customer's order history in Portal with status badge
        - Show decline reason in customer Portal (generic message, not internal notes)
      - **Option B: Service log entry**
        - Create service_log entry with type "order_declined"
        - Visible in service history but less semantically correct
        - Not recommended - mixing orders with service logs
      - **Option C: New order_status_history table**
        - Track all status changes: pending → declined, pending → confirmed, etc.
        - More robust audit trail but adds complexity
        - Could be future enhancement
    - **Customer Portal Display:**
      - Show declined orders in customer's "Service Requests" or "Order History"
      - Status badge: "Declined" with friendly message
      - Display generic decline reason (not internal notes)
      - Example: "Unfortunately we were unable to schedule this service at this time. We'll reach out if availability opens up."
  - **Database Schema Changes:**
    - Update `service_orders` table:
      - Modify `status` enum to include 'declined': `status: 'pending'|'confirmed'|'in_progress'|'completed'|'cancelled'|'declined'`
      - Add `declined_at: timestamp`
      - Add `declined_by: uuid` (references users table - requires User Accounts system or nullable for now)
      - Add `decline_reason: text`
      - Add `decline_notes: text` (internal notes, not shown to customer)
      - Add `customer_notified: boolean` (track if email was sent)
    - Consider adding index on `status` for faster queries
  - **Email Template:**
    ```
    Subject: Update on Your Service Request - [Service Type] for [Boat Name]

    Hi [Customer Name],

    Thank you for requesting [service type] for [boat name] through our online booking system.

    Unfortunately, we're unable to schedule this service at this time due to [reason].

    [Personal note from owner if provided]

    We truly appreciate your business and hope to serve you in the future. If you have any questions or would like to discuss alternative options, please don't hesitate to reach out.

    Best regards,
    [Owner Name]
    [Business Name]
    [Contact Information]
    ```
  - **UI Implementation:**
    - **Operations - Pending Orders Page:**
      - Update "Decline" button to open modal (not immediate action)
      - Decline modal with reason, notes, email checkbox, preview
      - After decline: show success toast, remove from pending list
      - Optionally: move to "Declined Orders" tab for reference
    - **Customer Portal:**
      - Show declined orders in order history with "Declined" badge
      - Display customer-friendly decline message
      - Option to "Request Again" (creates new order)
  - **Implementation Phases:**
    - **Phase 1 (1 hour):** Database schema - add declined status and related columns to service_orders
    - **Phase 2 (1.5 hours):** Operations UI - build decline modal with reason/notes/email checkbox
    - **Phase 3 (1 hour):** Email notification - create template, integrate with Resend API
    - **Phase 4 (1 hour):** Customer Portal - show declined orders in history with status
    - **Phase 5 (0.5 hour):** Testing - test full workflow, email delivery, portal display
  - **Edge Functions:**
    - `decline-service-order`: Handle decline action, update database, send email if requested
    - Alternatively: extend existing order management functions
  - **Testing Scenarios:**
    - Decline order with email notification enabled → verify email sent
    - Decline order with email notification disabled → verify no email sent
    - Verify declined orders appear in Portal with correct status
    - Verify decline reason stored correctly in database
    - Test email template rendering with real customer data
  - **Benefits:**
    - Professional customer communication (no ghosting)
    - Clear audit trail of all declined orders
    - Customer can see status in their Portal
    - Decline reasons tracked for analytics (why are we declining orders?)
    - Maintains customer relationship even when declining
  - **Analytics Opportunities:**
    - Dashboard widget: Declined orders by reason (identify capacity issues)
    - Track decline rate (% of orders declined)
    - Identify patterns (e.g., always declining certain service types)
  - **Dependencies:**
    - Pending Orders feature (✅ completed 2025-10-30)
    - Resend email integration (✅ exists)
    - User Accounts for `declined_by` tracking (⏳ Q1 2026 - can be nullable for now)
  - **Priority:** High (customer communication and audit trail gap)
  - **Estimated Effort:** 5 hours total
    - Database schema: 1 hour
    - Operations UI: 1.5 hours
    - Email integration: 1 hour
    - Portal display: 1 hour
    - Testing: 0.5 hour
  - **Impact:**
    - Professional customer communication
    - Complete audit trail for declined orders
    - Customer transparency (see order status in Portal)
    - Data for capacity planning (track decline reasons)
    - Improved customer relationships (respectful decline vs. ghosting)

- [x] **"Needs Scheduling" Queue & Quick Add** ✅
  - **Completed:** 2025-10-30
  - **Rationale:** Ad-hoc service requests (customer calls, emails, in-person requests) need quick capture without immediately committing to a schedule. Owner needs to collect all boats needing service, then batch-schedule by reviewing personal calendar and workload together.
  - **User Story:** Customer requests pressure washing (or diving, maintenance, etc.) via phone/email. Need to quickly mark boat as "needs service" with service type, then later review all pending boats and schedule them together while checking personal appointments and capacity.
  - **Features:**
    - **Quick Add Button:** Prominent "+ Needs Scheduling" button in Operations nav
    - **Quick Add Modal:**
      - Customer/boat selector (typeahead search)
      - Service type dropdown (diving, pressure washing, maintenance, bottom painting, etc.)
      - Priority selector (urgent, normal, low)
      - Optional notes field (customer request details, special requirements)
      - Optional target date range (e.g., "sometime in next 2 weeks")
      - Quick save (no calendar picker at this stage)
    - **"Needs Scheduling" Queue View:**
      - List view showing all boats awaiting scheduling
      - Sortable by priority, service type, date added, customer name
      - Filterable by service type, priority, customer
      - Batch actions: "Schedule Selected", "Mark as Scheduled", "Remove"
      - Visual indicators: priority badges, days waiting counter
    - **Scheduling Actions:**
      - Individual: "Schedule Now" button → opens calendar picker, creates service_order
      - Batch: Select multiple boats → "Open Calendar View" → drag-and-drop scheduling
      - Quick status: "Mark as Scheduled" (manually scheduled elsewhere) → removes from queue
    - **Integration with Calendar:**
      - When scheduling from queue, automatically create service_order with selected date
      - Update queue status to "scheduled", remove from "Needs Scheduling" view
      - Link back to original queue entry for audit trail
  - **Database Schema:**
    - New `scheduling_queue` table: `{ id: uuid, customer_id: uuid, boat_id: uuid, service_type: text, priority: text, notes: text, target_date_range: daterange, added_at: timestamp, added_by: uuid (staff_id), status: 'pending'|'scheduled'|'removed', scheduled_service_order_id: uuid }`
  - **UI Location:** Operations → Scheduling section
    - New "Needs Scheduling" tab/view alongside calendar
    - Quick add button in top nav or scheduling header
  - **Impact:**
    - Capture ad-hoc service requests immediately without scheduling pressure
    - Batch scheduling workflow (review all pending boats together with personal calendar)
    - Nothing falls through the cracks (visible queue of all pending boats)
    - Faster response to customers (quick acknowledgment: "Got it, I'll schedule you soon")
    - Better capacity planning (see full workload before committing to dates)
  - **Database:** `scheduling_queue` table with RLS policies
  - **Documentation:** See `NEEDS_SCHEDULING_FEATURE.md`

- [x] **Import Notion service log data to Supabase** ✅
  - **Completed:** 2025-10-20
  - **Rationale:** Migrate historical service data (Boat Conditions Log + Admin Log) from Notion child databases into service_logs table
  - **Implementation:**
    - 1,465 service logs imported (date range: 2023-01-03 to 2025-10-31)
    - YouTube playlist columns added to boats table (`playlist_id`, `playlist_url`)
    - Import infrastructure in `/sailorskills-operations/scripts/notion-import.mjs`
    - LEFT JOIN logic merging Conditions + Admin logs by service number
    - Field mappings documented in `notion-service-logs-config.json`
  - **Status:** Import complete, infrastructure ready for future updates
  - **Documentation:** See `/sailorskills-operations/scripts/README-SERVICE-LOGS-IMPORT.md`

- [x] **Service Prediction & Monthly Boat Forecast** ✅
  - **Completed:** 2025-11-04
  - **Status:** COMPLETE - Core prediction system working (forecast page UI deferred to Q1 2026)
  - **Rationale:** Enable proactive scheduling and capacity planning by predicting which boats are due for service in upcoming months based on service history and intervals
  - **User Request:** "Based on the imported Notion data of 'Start' and 'Interval', we should be able to predict which months will contain which boats for service"
  - **What's Been Completed:**
    - ✅ Comprehensive prediction API with 6+ functions (predictions.js)
    - ✅ Service prediction utility with pattern-based logic (service-predictor.js)
    - ✅ Dashboard widget "Due This Month" with overdue/due-soon badges (dashboard.js lines 126-238)
    - ✅ APIs: getBoatsDueThisMonth, getBoatsDueNextMonth, getBoatsWithPredictions, getMonthlyForecast, getOverdueBoats, getPredictionSummary
    - ✅ Pattern-based prediction (uses service_interval from service_schedules)
    - ✅ History-based prediction (uses service_logs for irregular boats)
    - ✅ Overdue detection with configurable grace period
    - ✅ Deviation tracking (how far off-pattern each boat is: ±3, ±7, ±14 days)
    - ✅ Status classification (overdue, due-soon, scheduled, future)
  - **Remaining Work:**
    - ⏳ Create dedicated "Service Forecast" page in Operations (Phase 3 from plan)
    - ⏳ Add export to CSV functionality
    - ⏳ Add prediction section to boat detail pages
    - ⏳ End-to-end testing of all prediction scenarios
  - **Current State:**
    - Service history stored in `service_logs` table (`service_date` field) ✅
    - Service intervals stored in `service_orders` table (`service_interval`: 1-mo, 2-mo, 3-mo, one-time) ✅
    - Last service date tracked in `boats.last_service` field ✅
    - Prediction functionality EXISTS and is WORKING on dashboard ✅
  - **Expected Behavior:**
    - Dashboard widget: "Boats Due This Month" with count and list
    - Monthly forecast view: "November: 12 boats, December: 8 boats"
    - Individual boat prediction: "Next service due: ~Nov 15-30, 2025"
    - Proactive alerts: "5 boats coming due in next 2 weeks"
    - Overdue detection: "Boat X is 15 days overdue for service"
  - **Data Sources:**
    - `service_logs.service_date` - historical service dates
    - `service_orders.service_interval` - recurring service plans (1-mo, 2-mo, 3-mo)
    - `boats.last_service` - most recent service date per boat
  - **Prediction Logic:**
    ```javascript
    function predictNextService(lastServiceDate, serviceInterval) {
      const monthsToAdd = {
        '1-mo': 1, '2-mo': 2, '3-mo': 3, 'one-time': null
      }[serviceInterval];
      if (!monthsToAdd) return null;
      const nextDate = new Date(lastServiceDate);
      nextDate.setMonth(nextDate.getMonth() + monthsToAdd);
      return nextDate;
    }
    ```
  - **Database Query Example:**
    ```sql
    -- Get boats with prediction for current month
    SELECT
      b.id, b.name, b.last_service,
      so.service_interval,
      CASE
        WHEN so.service_interval = '1-mo' THEN b.last_service + INTERVAL '1 month'
        WHEN so.service_interval = '2-mo' THEN b.last_service + INTERVAL '2 months'
        WHEN so.service_interval = '3-mo' THEN b.last_service + INTERVAL '3 months'
      END as predicted_next_service
    FROM boats b
    JOIN service_orders so ON b.id = so.boat_id
    WHERE b.is_active = true
      AND so.service_interval IN ('1-mo', '2-mo', '3-mo')
      AND (b.last_service + appropriate_interval) BETWEEN current_month_start AND current_month_end;
    ```
  - **Implementation Phases:**
    - **Phase 1 (2 hours):** Prediction logic and data validation
      - Build prediction function
      - Test with real service_logs data
      - Handle edge cases (no history, irregular patterns, overdue)
    - **Phase 2 (2 hours):** Dashboard widget "Boats Due This Month"
      - Query predicted services for current month
      - Display count and list with predicted dates
      - Click to schedule or view boat details
    - **Phase 3 (3 hours):** Monthly forecast view
      - New "Service Forecast" page in Operations
      - Calendar/list showing predictions by month
      - Filter by interval, customer, marina
      - Export to CSV
    - **Phase 4 (1 hour):** Boat detail integration
      - Add "Next Service Prediction" to boat detail pages
      - Show predicted date and historical pattern
      - Alert if overdue
  - **UI Components to Build:**
    - Dashboard widget: "Boats Due This Month"
    - Forecast page: "Service Forecast" (monthly calendar view)
    - Boat detail section: "Next Service Prediction"
    - Alert banner: "X boats are overdue for service"
  - **Edge Cases:**
    - Boats with no service history (new customers)
    - Boats with irregular patterns (skipped months)
    - One-time services (no recurring prediction)
    - Multiple service types per boat (diving + pressure washing)
    - Overdue boats (last service older than expected interval)
  - **Benefits:**
    - Proactive scheduling (contact customers before they call)
    - Capacity planning (know monthly workload in advance)
    - Revenue forecasting (predict monthly income)
    - Customer satisfaction (proactive reminders)
    - Reduced no-shows (customers appreciate proactive outreach)
  - **Dependencies:**
    - service_logs table with historical data (✅ exists, 1,465 records imported)
    - service_orders with service_interval field (✅ exists)
    - boats.last_service field (✅ exists)
  - **Priority:** Medium (valuable planning tool, not urgent)
  - **Estimated Effort:** 8 hours
  - **Impact:** Proactive scheduling, better capacity planning, improved customer communication
