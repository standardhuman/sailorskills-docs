# Handoff: Automated Boat Status Tracking System

**Date:** 2025-11-11
**Context:** YouTube Playlist Import & Active/Inactive Boat Management
**Status:** Planning Complete - Ready for Implementation

---

## Session Summary

### What Was Accomplished

#### 1. YouTube Playlist Import Issue - RESOLVED ✅
**Problem:** Some boats were showing playlists, some showing YouTube logo only, some showing nothing.

**Root Cause:**
- YouTube playlists stored in `youtube_playlists` table (not `boats.youtube_playlist_url`)
- Only 124 out of 176 boats had playlists imported from Notion
- Many playlists existed in Notion export but weren't imported due to format variations

**Solution Implemented:**
- Created import script (`scripts/import-youtube-from-export.mjs`) that handles multiple URL formats
- Used BOATY's fuzzy matching to find additional playlists in YouTube account
- Manually inserted 5 playlists you provided

**Results:**
- **Started with:** 124 playlists
- **Final count:** 156 playlists
- **Total imported:** 32 new playlists
- **Coverage:** 156 of 176 boats (89% of all boats)

#### 2. Active/Inactive Boat Status - UPDATED ✅
**Problem:** All 176 boats were marked as `is_active = true` (incorrect)

**Solution:** Updated `is_active` based on Notion `plan_status` field:
- **Active (84 boats):** Status = "Subbed"
- **Active (6 boats):** NULL status boats you specified (Blow Fish, Lil Bear, Maris, Mazu, Raindancer II, Zeno)
- **Active (3 boats):** Test boats (kept for testing)
- **Inactive (83 boats):** Expired (36), Cancelled (33), Declined (6), Paused (4), Not started (3), One Prolonged Blast (1)

**Current State:**
- **93 active boats** (down from 176)
- **88 active boats WITH playlists** (94.6% coverage! 🎉)
- **5 active boats WITHOUT playlists:** Blow Fish, Raindancer II, + 3 test boats

---

## Automated Status Tracking System - PLANNED

### Business Requirements (Your Decisions)

1. **Recurring Services:**
   - Automatically activate boat when recurring service ordered (1-mo, 2-mo, 3-mo)
   - Stay active until manually cancelled by admin

2. **One-Time Services:**
   - Activate as "one_time_active" when ordered
   - **Alert admin at 25 days** after completion
   - **Auto-expire at 30 days** after completion (set inactive)

3. **Cancellations:**
   - **Admin-only** (no customer self-service)
   - Cancel button in Operations with reason tracking
   - Deactivates schedules and cancels pending orders

4. **Reactivations:**
   - **Expired boats:** Auto-reactivate on new recurring order
   - **Cancelled boats:** Require admin approval before reactivation

5. **Paused Status:**
   - Used for both billing issues and seasonal holds
   - Keeps boat visible but flags as paused
   - Admin can pause/resume subscriptions

---

## Implementation Plan

### Phase 1: Database Schema (Week 1)

#### New Fields on `boats` Table
```sql
ALTER TABLE boats ADD COLUMN:
- status_changed_at TIMESTAMP WITH TIME ZONE
- status_changed_by UUID REFERENCES users(id)
- status_change_reason TEXT
- last_order_date DATE
- last_service_date DATE
```

#### New Table: `boat_status_history`
Tracks all status changes for audit trail:
- boat_id, old_status, new_status, changed_at, changed_by, reason, related_order_id

#### Standardize `plan_status` to ENUM
Replace inconsistent text values with:
- `active` - Active recurring subscription
- `one_time_active` - One-time service in progress
- `expired` - One-time completed >30 days ago
- `cancelled` - Manually cancelled
- `paused` - Billing issue or seasonal hold
- `declined` - Service declined
- `never_started` - No services ordered yet

#### Data Migration Required
1. Backfill `last_service_date` from `service_logs`
2. Backfill `last_order_date` from `service_orders`
3. Migrate current `plan_status` text to new ENUM
4. Create initial `boat_status_history` entries

### Phase 2: Automation Triggers (Week 2)

#### Trigger 1: Auto-Activate on Recurring Order
**When:** `service_orders` INSERT/UPDATE with interval in (1-mo, 2-mo, 3-mo) and status='confirmed'
**Do:**
- Set `boats.is_active = true`, `plan_status = 'active'`
- Update `last_order_date`
- Activate `service_schedules`
- Log to `boat_status_history`

#### Trigger 2: Complete One-Time Service
**When:** `service_orders.status` → 'completed' and interval='one-time'
**Do:**
- Set `plan_status = 'one_time_active'`
- Update `last_service_date`
- Start 30-day countdown

#### Cron Job 1: Alert Before Expiration (Daily)
**Check:** Boats with `plan_status = 'one_time_active'` completed 25 days ago
**Do:**
- Send email to admin: "Boat X expires in 5 days"
- Show in Operations dashboard alert
- Allow admin to extend or convert to recurring

#### Cron Job 2: Auto-Expire One-Time Services (Daily)
**Check:** Boats with `plan_status = 'one_time_active'` completed 30 days ago
**Do:**
- Set `is_active = false`, `plan_status = 'expired'`
- Deactivate `service_schedules`
- Log to history
- Send notification to admin

**Implementation:** Supabase Edge Function `/supabase/functions/check-expiring-services/index.ts` with daily cron schedule

### Phase 3: Admin UI - Operations (Week 3)

#### Cancellation Workflow
**Location:** `/sailorskills-operations/src/views/boats/`

**Components:**
- `CancelSubscriptionModal.js` - Modal with reason dropdown + notes
- Cancel button on boat detail page

**Actions:**
1. Show modal with cancellation reasons (Customer request, Non-payment, Service issue, Other)
2. On confirm:
   - Deactivate all `service_schedules` for boat
   - Cancel pending/confirmed `service_orders`
   - Set `is_active = false`, `plan_status = 'cancelled'`
   - Record admin user and reason
   - Create history entry

#### Pause/Resume Workflow
**Components:**
- `PauseResumeControls.js` - Pause/Resume buttons

**Pause:**
- Set `plan_status = 'paused'`
- Optionally pause schedule generation
- Record reason (Billing / Seasonal / Other)

**Resume:**
- Set `plan_status = 'active'`
- Reactivate schedules
- Log history

#### Status Enhancements
**Components:**
- `StatusBadge.js` - Color-coded status indicator (Green=Active, Yellow=Paused, Red=Cancelled, Gray=Expired)
- `StatusHistoryModal.js` - Timeline of status changes

**Boat List Updates:**
- Add status badge column
- Add status filter dropdown
- Add quick action buttons per row

### Phase 4: Reactivation Approval (Week 4)

#### Reactivation Logic

**Expired Boats (Auto):**
- When new recurring order created for expired boat → auto-activate

**Cancelled Boats (Manual):**
- When new recurring order created for cancelled boat:
  - Set order `status = 'pending_approval'`
  - Add to reactivation queue
  - Notify admin
  - Wait for approval

#### Reactivation Queue View
**Location:** `/sailorskills-operations/src/views/reactivation-queue.js`

**Shows:**
- Boat name
- Original cancellation reason and date
- New order details
- Approve/Deny buttons

**Actions:**
- Approve → Set boat active, confirm order, notify customer
- Deny → Cancel order, notify customer

---

## Technical Details

### Database Tables Used

#### `boats`
- `is_active` (boolean) - Main active/inactive flag
- `plan_status` (enum/text) - Detailed subscription status
- New fields for tracking (see Phase 1)

#### `service_orders`
- `service_interval` - "1-mo", "2-mo", "3-mo", "one-time"
- `status` - "pending", "confirmed", "in_progress", "completed", "cancelled", "pending_approval"
- `completed_at` - Timestamp for expiration calculation

#### `service_schedules`
- `is_active` - Should be synced with boat status
- `interval_months` - Recurring pattern

#### `service_logs`
- Historical record of completed services
- Used to backfill `last_service_date`

### API Endpoints to Create

**Operations Service** (`/sailorskills-operations/src/api/boat-status.js`):
```javascript
POST /api/boats/:id/cancel - Cancel subscription
POST /api/boats/:id/pause - Pause subscription
POST /api/boats/:id/resume - Resume subscription
GET /api/boats/:id/status-history - Get status timeline
GET /api/reactivation-queue - Get pending reactivations
POST /api/reactivation-queue/:id/approve - Approve reactivation
POST /api/reactivation-queue/:id/deny - Deny reactivation
```

### Supabase Edge Functions

**File:** `/supabase/functions/check-expiring-services/index.ts`
```typescript
// Runs daily via cron
// 1. Check for boats at 25 days (send alerts)
// 2. Expire boats at 30 days
// 3. Log all actions to boat_status_history
```

**Cron Configuration:**
```bash
supabase functions deploy check-expiring-services
# Set up cron via Supabase dashboard to run daily at 2am
```

---

## Files to Create

### Migrations
- [ ] `/migrations/XXX_add_boat_status_tracking.sql`
- [ ] `/migrations/XXX_create_boat_status_history.sql`
- [ ] `/migrations/XXX_standardize_plan_status.sql`
- [ ] `/migrations/XXX_boat_status_triggers.sql`
- [ ] `/migrations/XXX_backfill_status_data.sql`

### Supabase Functions
- [ ] `/supabase/functions/check-expiring-services/index.ts`

### Operations Service - Components
- [ ] `/sailorskills-operations/src/views/boats/components/CancelSubscriptionModal.js`
- [ ] `/sailorskills-operations/src/views/boats/components/PauseResumeControls.js`
- [ ] `/sailorskills-operations/src/views/boats/components/StatusBadge.js`
- [ ] `/sailorskills-operations/src/views/boats/components/StatusHistoryModal.js`

### Operations Service - Views
- [ ] `/sailorskills-operations/src/views/reactivation-queue.js`

### Operations Service - API
- [ ] `/sailorskills-operations/src/api/boat-status.js`

### Documentation
- [ ] `/docs/features/BOAT_STATUS_AUTOMATION.md`

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
- [ ] Verify backfilled last_order_date accurate
- [ ] Verify all plan_status values migrated correctly
- [ ] Verify no orphaned active schedules for inactive boats

---

## Success Metrics

After implementation:
- ✅ 100% of recurring orders auto-activate boats
- ✅ 100% of one-time services expire automatically after 30 days
- ✅ 0% manual status updates needed (except cancellations/pauses)
- ✅ Clear audit trail for all status changes
- ✅ Admin receives alerts 5 days before expiration
- ✅ Cancelled boats require approval before reactivation

---

## Current Database State (Reference)

### Boats by Status
- **Total boats:** 176
- **Active (is_active=true):** 93
- **Inactive (is_active=false):** 83

### Active Boats Breakdown
- **With playlists:** 88 (94.6% coverage)
- **Without playlists:** 5 (Blow Fish, Raindancer II, + 3 test boats)

### Plan Status Distribution
- **Subbed:** 84 boats
- **Expired:** 36 boats
- **Cancelled:** 33 boats
- **Declined:** 6 boats
- **Paused:** 4 boats
- **Not started:** 3 boats
- **NULL:** 9 boats (6 real boats + 3 test)
- **"1":** 1 boat (Zeno - unclear status)

---

## Scripts Created During Session

### `scripts/import-youtube-from-export.mjs`
Imports YouTube playlists from Notion export markdown files.
- Handles multiple URL formats (📺, ▶️, etc.)
- Extracts playlist ID from URL
- Matches boat names to database
- Inserts into `youtube_playlists` table

**Usage:**
```bash
node scripts/import-youtube-from-export.mjs [--dry-run]
```

### `sailorskills-video/find_playlists_for_boats.py`
Uses BOATY's fuzzy matching to find playlists in YouTube account.
- Searches all 190+ playlists in account
- Matches boat names with prefix, contains, etc.
- Outputs JSON with matched playlists

**Usage:**
```bash
cd sailorskills-video
source boaty_venv/bin/activate
python3 find_playlists_for_boats.py
# Creates: found_playlists.json
```

---

## Questions Answered During Session

1. **How to determine active boats?**
   - Using `boats.is_active` boolean flag
   - Updated based on Notion `plan_status` field
   - 93 active, 83 inactive

2. **Why different playlist displays?**
   - Individual videos: Boats with service videos from `boaty_videos` table
   - YouTube logo + link: Boats with playlists but no individual videos
   - Nothing: Boats without playlists

3. **Which boats should be active?**
   - Only "Subbed" status from Notion
   - Plus specific NULL status boats with recent services

4. **One-time service expiration?**
   - Hybrid: Alert at 25 days, auto-expire at 30 days

5. **Customer cancellation?**
   - Admin-only, no customer self-service

6. **Reactivation rules?**
   - Auto for expired, manual approval for cancelled

7. **Paused status meaning?**
   - Both billing issues and seasonal holds

---

## Next Steps

1. **Review this handoff** - Confirm plan aligns with vision
2. **Phase 1: Database migration** - Create status tracking schema
3. **Phase 2: Automation** - Build triggers and cron jobs
4. **Phase 3: Admin UI** - Build cancellation/pause workflows
5. **Phase 4: Reactivation** - Build approval queue

**Estimated Timeline:** 4 weeks (1 week per phase)

---

## Notes & Observations

- Current system has 120 active `service_schedules` but only 93 active boats - may have orphaned schedules
- Test boats kept active for testing purposes
- Some boats have recent service dates but NULL status (Lil Bear, Maris, Mazu, Zeno) - might be legitimate active boats not marked in Notion
- BOATY's fuzzy matching is excellent - found 7 playlists not in Notion export
- Portal display logic is working correctly - the issue was missing data, not code

---

**Ready for implementation when you approve the plan!**
