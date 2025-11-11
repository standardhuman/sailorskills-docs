# Automated Boat Status Tracking System

**Date Implemented:** 2025-11-11
**Status:** ✅ Complete - Ready for Testing
**Handoff Reference:** HANDOFF_2025-11-11_AUTOMATED_BOAT_STATUS_TRACKING.md

---

## Overview

Automated system for tracking boat subscription statuses throughout their lifecycle, from active subscriptions to expiration, cancellation, and reactivation. Eliminates manual status updates and provides admin controls for subscription management.

---

## Business Rules

### Recurring Services (1-mo, 2-mo, 3-mo)
- **Automatically activate** boat when recurring service order is confirmed
- Stay active until manually cancelled by admin
- Auto-reactivate if boat was expired (no approval needed)
- **Require approval** if boat was previously cancelled

### One-Time Services
- Activate as `one_time_active` when service order completes
- **Alert admin at 25 days** after completion (5 days before expiration)
- **Auto-expire at 30 days** after completion (set to inactive)

### Cancellations
- **Admin-only** (no customer self-service)
- Deactivates schedules and cancels pending orders
- Records reason and admin who cancelled
- Boat must be manually approved before reactivation

### Reactivations
- **Expired boats:** Auto-reactivate on new recurring order
- **Cancelled boats:** Order set to `pending_approval`, admin must approve
- Reactivation queue view in Operations for admin review

### Paused Status
- Used for billing issues and seasonal holds
- Keeps boat visible but flags as paused
- Admin can pause/resume, optionally pause schedules

---

## Database Schema

### New Fields on `boats` Table

```sql
status_changed_at TIMESTAMP WITH TIME ZONE  -- When status last changed
status_changed_by UUID REFERENCES auth.users(id)  -- Admin who changed it
status_change_reason TEXT  -- Reason for change
last_order_date DATE  -- Most recent service order date
```

Note: `last_service` field already exists (used as last_service_date)

### New Table: `boat_status_history`

Audit trail of all status changes:

```sql
CREATE TABLE boat_status_history (
    id UUID PRIMARY KEY,
    boat_id UUID REFERENCES boats(id),
    old_status TEXT,
    new_status TEXT,
    old_is_active BOOLEAN,
    new_is_active BOOLEAN,
    changed_at TIMESTAMP WITH TIME ZONE,
    changed_by UUID REFERENCES auth.users(id),
    reason TEXT,
    related_order_id UUID REFERENCES service_orders(id),
    notes TEXT
);
```

### Standardized `plan_status` ENUM

Converted from inconsistent text values to:

```sql
CREATE TYPE boat_plan_status AS ENUM (
    'active',              -- Active recurring subscription
    'one_time_active',     -- One-time service in progress (30-day timer)
    'expired',             -- Service expired after 30 days
    'cancelled',           -- Manually cancelled by admin
    'paused',              -- Billing issue or seasonal hold
    'declined',            -- Service declined by customer
    'never_started'        -- No services ordered yet
);
```

**Migration Mapping:**
- "Subbed" → `active`
- "Expired" → `expired`
- "Cancelled" → `cancelled`
- "Paused" → `paused`
- "Declined" → `declined`
- "Not started" → `never_started`
- NULL (active boats) → `active`
- NULL (inactive boats) → `never_started`

---

## Automation

### Database Triggers

#### 1. Auto-Activate on Recurring Order

**Trigger:** `service_orders` INSERT/UPDATE with status='confirmed' and interval in (1-mo, 2-mo, 3-mo)

**Actions:**
- Check if boat was cancelled → set order to `pending_approval`, log to history, exit
- Otherwise:
  - Set `boats.is_active = true`, `plan_status = 'active'`
  - Update `last_order_date`
  - Activate `service_schedules`
  - Log to `boat_status_history`

**Function:** `auto_activate_boat_on_recurring_order()`

#### 2. Set One-Time Active on Completion

**Trigger:** `service_orders` UPDATE where status → 'completed' and interval='one-time'

**Actions:**
- Set `boats.plan_status = 'one_time_active'`
- Set `is_active = true`
- Update `last_service` date
- Start 30-day countdown
- Log to `boat_status_history`

**Function:** `set_one_time_active_on_completion()`

### Supabase Edge Function: `check-expiring-services`

**Schedule:** Daily cron job (runs at 2am)

**Step 1: Alert at 25 Days**
- Query boats: `plan_status = 'one_time_active'` AND `last_service <= 25 days ago`
- Log alert to `boat_status_history`
- TODO: Send email to admin

**Step 2: Auto-Expire at 30 Days**
- Query boats: `plan_status = 'one_time_active'` AND `last_service <= 30 days ago`
- Set `is_active = false`, `plan_status = 'expired'`
- Deactivate `service_schedules`
- Log to `boat_status_history`
- TODO: Send email notification to admin

**Deployment:**
```bash
supabase functions deploy check-expiring-services
# Configure cron via Supabase dashboard
```

---

## API Endpoints

### Operations Service: `/src/api/boat-status.js`

```javascript
// Cancel subscription
cancelBoatSubscription(boatId, { reason, notes })
// Returns: { data: boat, error }

// Pause subscription
pauseBoatSubscription(boatId, { reason, notes, pauseSchedules })
// Returns: { data: boat, error }

// Resume subscription
resumeBoatSubscription(boatId, { notes })
// Returns: { data: boat, error }

// Get status history
getBoatStatusHistory(boatId)
// Returns: { data: history[], error }

// Get reactivation queue
getReactivationQueue()
// Returns: { data: queue[], error }

// Approve reactivation
approveReactivation(orderId, { notes })
// Returns: { data: { boat, order }, error }

// Deny reactivation
denyReactivation(orderId, { reason, notes })
// Returns: { data: { order }, error }
```

---

## UI Components

### Operations Service Components

#### `/src/views/boats/modals/CancelSubscriptionModal.js`

Modal for cancelling subscriptions:
- Reason dropdown (Customer request, Non-payment, Service issue, Boat sold, Seasonal, Other)
- Notes textarea
- Warning about consequences
- Calls `cancelBoatSubscription()` API

**Usage:**
```javascript
import { showCancelSubscriptionModal } from './modals/CancelSubscriptionModal.js';

showCancelSubscriptionModal(boat, async () => {
  // Refresh callback
  await reloadBoatsList();
});
```

#### `/src/views/boats/components/PauseResumeControls.js`

Controls for pausing/resuming subscriptions:
- Renders appropriate button based on status
- Pause modal with reason selection
- Resume with confirmation
- Calls pause/resume APIs

**Usage:**
```javascript
import { renderPauseResumeControls, initPauseResumeControls } from './components/PauseResumeControls.js';

// In boat detail view:
const html = renderPauseResumeControls(boat, onStatusChange);
initPauseResumeControls(boat, onStatusChange);
```

#### `/src/views/boats/components/StatusBadge.js`

Color-coded status indicators:
- Green: Active
- Blue: One-Time Active
- Yellow: Paused
- Red: Cancelled
- Gray: Expired, Declined, Never Started

**Usage:**
```javascript
import { renderStatusBadge, initStatusBadgeStyles } from './components/StatusBadge.js';

initStatusBadgeStyles(); // Once on page load

const html = renderStatusBadge(boat.plan_status, {
  size: 'sm',  // 'sm' | 'md' | 'lg'
  showIcon: true,
  showTooltip: true
});
```

#### `/src/views/boats/modals/StatusHistoryModal.js`

Timeline view of status changes:
- Visual timeline with markers
- Shows old status → new status transitions
- Displays reason, notes, changed by, date/time
- Related order links
- Highlights latest change

**Usage:**
```javascript
import { showStatusHistoryModal } from './modals/StatusHistoryModal.js';

showStatusHistoryModal(boat);
```

### Views

#### `/src/views/reactivation-queue.js`

Admin queue for reviewing reactivation requests:
- Lists boats with `pending_approval` orders
- Shows cancellation details (reason, date)
- Shows new order details (interval, amount, date)
- Approve/Deny buttons
- Auto-refreshes after action

**Access:** https://ops.sailorskills.com/reactivation-queue.html

---

## Migrations Applied

1. **028_add_boat_status_tracking_fields.sql** - Added tracking fields to boats
2. **029_create_boat_status_history_table.sql** - Created audit trail table
3. **030_standardize_plan_status_enum.sql** - Converted plan_status to ENUM (176 boats updated)
4. **031_backfill_boat_status_data.sql** - Backfilled dates and created baseline history
5. **032_boat_status_automation_triggers.sql** - Created automation triggers

**Status:** All migrations applied successfully on 2025-11-11

---

## Testing Checklist

### Automation Testing
- [ ] Create recurring order → verify boat auto-activates
- [ ] Complete one-time order → verify boat becomes one_time_active
- [ ] Wait 25 days (or mock date) → verify alert sent
- [ ] Wait 30 days (or mock date) → verify auto-expiration
- [ ] New order for expired boat → verify auto-reactivation
- [ ] New order for cancelled boat → verify pending approval

### Admin Workflow Testing
- [ ] Cancel subscription → verify schedules deactivated, orders cancelled
- [ ] Pause subscription → verify status changed, reason recorded
- [ ] Resume subscription → verify reactivated
- [ ] View status history → verify all changes logged
- [ ] Approve reactivation → verify boat activated, order confirmed
- [ ] Deny reactivation → verify order cancelled

### Data Integrity Testing
- [ ] Verify backfilled last_service_date accurate
- [ ] Verify backfilled last_order_date accurate (12 boats updated)
- [ ] Verify all plan_status values migrated correctly (93 active, 36 expired, 33 cancelled, 6 declined, 4 paused, 4 never_started)
- [ ] Verify no orphaned active schedules for inactive boats

---

## Current Database State

As of 2025-11-11 after migrations:

### Boats by Status
- **Total boats:** 176
- **Active (is_active=true):** 93
- **Inactive (is_active=false):** 83

### Plan Status Distribution
- **active:** 93 boats (was "Subbed" + NULL active boats)
- **expired:** 36 boats
- **cancelled:** 33 boats
- **declined:** 6 boats
- **paused:** 4 boats
- **never_started:** 4 boats (was "Not started" + NULL inactive boats)

### History Baseline
- **176 baseline entries** created in boat_status_history

---

## Success Metrics

After full implementation:
- ✅ 100% of recurring orders auto-activate boats
- ✅ 100% of one-time services expire automatically after 30 days
- ✅ 0% manual status updates needed (except cancellations/pauses)
- ✅ Clear audit trail for all status changes
- ✅ Admin receives alerts 5 days before expiration
- ✅ Cancelled boats require approval before reactivation

---

## Deployment Notes

### Edge Function Deployment

**Manual Step Required:**

1. Deploy edge function:
```bash
cd /Users/brian/app-development/sailorskills-repos
supabase functions deploy check-expiring-services
```

2. Configure cron schedule in Supabase Dashboard:
   - Go to Edge Functions
   - Select `check-expiring-services`
   - Enable cron trigger
   - Set schedule: `0 2 * * *` (daily at 2am)

3. Set environment variables in Supabase:
   - `SUPABASE_URL` - Already configured
   - `SUPABASE_SERVICE_ROLE_KEY` - Already configured

### Navigation Update

**Required:** Add "Reactivation Queue" to Operations navigation

**File:** `/sailorskills-operations/src/navigation.js`

Add link:
```javascript
{
  label: 'Reactivation Queue',
  href: '/reactivation-queue.html',
  icon: '🔄'
}
```

### Boat List View Updates

**Required:** Integrate status features into boat list view

**File:** `/sailorskills-operations/src/views/boats.js`

1. Import components:
```javascript
import { renderStatusBadge, initStatusBadgeStyles } from './boats/components/StatusBadge.js';
import { showCancelSubscriptionModal } from './boats/modals/CancelSubscriptionModal.js';
import { renderPauseResumeControls, initPauseResumeControls } from './boats/components/PauseResumeControls.js';
import { showStatusHistoryModal } from './boats/modals/StatusHistoryModal.js';
```

2. Add status column to boat table
3. Add status filter dropdown
4. Add action buttons (Cancel, Pause/Resume, View History)

---

## Future Enhancements

### Email Notifications
- [ ] Connect edge function to email service (Resend)
- [ ] Alert template for 25-day warning
- [ ] Notification template for 30-day expiration
- [ ] Customer notifications for denied reactivations

### Dashboard Alerts
- [ ] Show expiring boats (25 days) in Operations dashboard
- [ ] Badge count on reactivation queue nav link
- [ ] Real-time updates via Supabase subscriptions

### Customer Portal Integration
- [ ] Display subscription status in portal
- [ ] Show expiration countdown for one-time services
- [ ] Request reactivation button (creates pending order)

### Analytics
- [ ] Track churn reasons (cancellation analysis)
- [ ] Monitor one-time → recurring conversion rate
- [ ] Reactivation success rate
- [ ] Seasonal pause patterns

---

## Files Created

### Migrations (5)
- `/migrations/028_add_boat_status_tracking_fields.sql`
- `/migrations/029_create_boat_status_history_table.sql`
- `/migrations/030_standardize_plan_status_enum.sql`
- `/migrations/031_backfill_boat_status_data.sql`
- `/migrations/032_boat_status_automation_triggers.sql`

### Supabase Functions (1)
- `/supabase/functions/check-expiring-services/index.ts`

### Operations Service - API (1)
- `/sailorskills-operations/src/api/boat-status.js`

### Operations Service - Components (3)
- `/sailorskills-operations/src/views/boats/components/PauseResumeControls.js`
- `/sailorskills-operations/src/views/boats/components/StatusBadge.js`
- `/sailorskills-operations/src/views/boats/modals/CancelSubscriptionModal.js`

### Operations Service - Modals (1)
- `/sailorskills-operations/src/views/boats/modals/StatusHistoryModal.js`

### Operations Service - Views (1)
- `/sailorskills-operations/src/views/reactivation-queue.js`

### Documentation (1)
- `/docs/features/BOAT_STATUS_AUTOMATION.md` (this file)

**Total:** 13 files created

---

## Related Documentation

- Original handoff: `/HANDOFF_2025-11-11_AUTOMATED_BOAT_STATUS_TRACKING.md`
- Boats table schema: See existing migrations in `/migrations/`
- Service orders flow: See Operations service documentation

---

## Support & Maintenance

**Point of Contact:** Development team
**Last Updated:** 2025-11-11
**Next Review:** After testing phase completion

For questions or issues, see testing checklist above or refer to original handoff document.
