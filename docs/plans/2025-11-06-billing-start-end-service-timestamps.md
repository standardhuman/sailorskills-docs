# Billing Service - Immediate Start/End Service Timestamp Capture

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add "Start Service" and "End Service" buttons to Billing service that immediately write timestamps to service_logs table, overcoming browser session loss issues during long dives.

**Architecture:** Create a service completion UI in sailorskills-billing with two-phase workflow: (1) Start Service creates service_log with start timestamp, (2) End Service updates with end timestamp. This happens BEFORE payment processing to ensure timestamps are captured even if browser reloads.

**Tech Stack:** Vanilla JavaScript (ES6+), Supabase (PostgreSQL), Vite

**Current State:**
- service_logs table exists with `time_in`, `time_out`, `total_hours` fields
- No Start/End Service buttons exist yet
- Timestamps currently captured manually or during completion workflow
- Browser reloads during long dives (30-60+ min) lose form state

**Target State:**
- Start Service button creates service_log immediately with current timestamp
- End Service button updates service_log with end timestamp
- Timestamps persist even if browser reloads
- Later completion workflow ("Charge Customer"/"Log Only") updates remaining fields

---

## Database Schema Analysis

**Existing `service_logs` table** (Supabase):
```sql
-- Timestamp fields (already exist)
time_in TIME,
time_out TIME,
service_date DATE,
total_hours DECIMAL(4,2),

-- Service identification
boat_id UUID REFERENCES boats(id),
customer_id UUID,
service_type TEXT,
order_id UUID REFERENCES service_orders(id),

-- Condition tracking (populated later in completion workflow)
paint_condition_overall TEXT,
growth_level TEXT,
anode_conditions JSONB,
propellers JSONB,
notes TEXT,
photos TEXT[],

-- Metadata
created_at TIMESTAMP DEFAULT NOW(),
updated_at TIMESTAMP,
created_by TEXT
```

**Schema Changes Needed:**
- Add `service_started_at TIMESTAMP` - exact moment Start Service clicked
- Add `service_ended_at TIMESTAMP` - exact moment End Service clicked
- Add `in_progress BOOLEAN DEFAULT false` - track if service currently active
- These complement existing `time_in`/`time_out` fields (which may be manually edited later)

---

## Task 1: Database Migration - Add Timestamp Fields

**Files:**
- Create: `migrations/023_add_service_start_end_timestamps.sql`

**Step 1: Write migration SQL**

```sql
-- Migration 023: Add immediate service start/end timestamp capture
-- Purpose: Overcome browser session loss during long dives

ALTER TABLE service_logs
  ADD COLUMN IF NOT EXISTS service_started_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS service_ended_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS in_progress BOOLEAN DEFAULT false;

-- Add index for querying active services
CREATE INDEX IF NOT EXISTS idx_service_logs_in_progress
  ON service_logs(in_progress)
  WHERE in_progress = true;

-- Add index for querying by start time
CREATE INDEX IF NOT EXISTS idx_service_logs_started_at
  ON service_logs(service_started_at);

-- Add comment documentation
COMMENT ON COLUMN service_logs.service_started_at IS 'Exact timestamp when Start Service button clicked (captures before potential browser reload)';
COMMENT ON COLUMN service_logs.service_ended_at IS 'Exact timestamp when End Service button clicked';
COMMENT ON COLUMN service_logs.in_progress IS 'True if service is currently active (between Start and End clicks)';
```

**Step 2: Run migration on database**

```bash
# Load database connection
cd /Users/brian/app-development/sailorskills-repos
source db-env.sh

# Run migration
psql "$DATABASE_URL" -f migrations/023_add_service_start_end_timestamps.sql

# Verify columns added
psql "$DATABASE_URL" -c "\d service_logs"
```

**Expected Output:**
```
                                 Table "public.service_logs"
        Column        |           Type           | Collation | Nullable |      Default
---------------------+--------------------------+-----------+----------+-------------------
 ...
 service_started_at  | timestamp                |           |          |
 service_ended_at    | timestamp                |           |          |
 in_progress         | boolean                  |           |          | false
```

**Step 3: Commit migration**

```bash
git add migrations/023_add_service_start_end_timestamps.sql
git commit -m "feat(database): add service start/end timestamp fields

- Add service_started_at, service_ended_at timestamp columns
- Add in_progress boolean flag for active services
- Add indexes for performance
- Supports immediate timestamp capture for Billing PWA"
```

---

## Task 2: Create Service Completion UI Component

**Files:**
- Create: `sailorskills-billing/src/views/service-completion.js`
- Create: `sailorskills-billing/src/views/service-completion.html` (or add to existing HTML)
- Modify: `sailorskills-billing/index.html` (add navigation to new view)

**Step 1: Create service completion HTML structure**

Add to `sailorskills-billing/index.html` (or create separate file):

```html
<!-- Service Completion View -->
<section id="service-completion-view" class="view">
  <h2>Service Completion</h2>

  <!-- Boat Selection -->
  <div class="completion-select-boat card">
    <h3>Select Boat</h3>
    <select id="completion-boat-select" class="form-control">
      <option value="">-- Select a boat --</option>
      <!-- Populated dynamically from scheduled services -->
    </select>
    <div id="boat-details" class="boat-details" style="display: none;">
      <!-- Boat name, customer, service type displayed here -->
    </div>
  </div>

  <!-- Service Controls -->
  <div id="service-controls" class="card" style="display: none;">
    <!-- Before service started -->
    <div id="service-not-started" class="service-state">
      <button id="start-service-btn" class="btn btn-primary btn-lg">
        🟢 Start Service
      </button>
      <p class="help-text">Click when you arrive at the boat and begin work</p>
    </div>

    <!-- Service in progress -->
    <div id="service-in-progress" class="service-state" style="display: none;">
      <div class="alert alert-info">
        <strong>Service in Progress</strong>
        <p>Started: <span id="service-start-time"></span></p>
        <p>Duration: <span id="service-duration"></span></p>
      </div>
      <button id="end-service-btn" class="btn btn-success btn-lg">
        🔴 End Service
      </button>
      <p class="help-text">Click when you finish work and leave the boat</p>
    </div>

    <!-- Service ended -->
    <div id="service-ended" class="service-state" style="display: none;">
      <div class="alert alert-success">
        <strong>Service Complete</strong>
        <p>Started: <span id="final-start-time"></span></p>
        <p>Ended: <span id="final-end-time"></span></p>
        <p>Duration: <span id="final-duration"></span></p>
      </div>
      <button id="continue-to-completion-btn" class="btn btn-primary">
        Continue to Billing & Documentation →
      </button>
    </div>
  </div>

  <!-- Service Log ID (hidden, for tracking) -->
  <input type="hidden" id="current-service-log-id" value="">
</section>
```

**Step 2: Add CSS styles**

Create or add to `sailorskills-billing/src/styles/service-completion.css`:

```css
/* Service Completion View Styles */

.completion-select-boat {
  margin-bottom: 2rem;
}

#completion-boat-select {
  font-size: 1.1rem;
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.boat-details {
  padding: 1rem;
  background: var(--ss-bg-subtle);
  border-radius: var(--ss-radius-sm);
  margin-top: 1rem;
}

.boat-details h4 {
  margin: 0 0 0.5rem 0;
  color: var(--ss-text-dark);
}

.boat-details p {
  margin: 0.25rem 0;
  color: var(--ss-text-medium);
}

.service-controls {
  text-align: center;
  padding: 2rem;
}

.service-state {
  min-height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.btn-lg {
  font-size: 1.5rem;
  padding: 1rem 2rem;
  min-width: 250px;
}

.help-text {
  margin-top: 1rem;
  color: var(--ss-text-light);
  font-size: 0.9rem;
}

#service-duration {
  font-weight: 600;
  color: var(--ss-info);
}

.alert {
  margin-bottom: 1.5rem;
  padding: 1rem;
  border-radius: var(--ss-radius-sm);
  text-align: left;
}

.alert-info {
  background: #e3f2fd;
  border-left: 4px solid var(--ss-info);
}

.alert-success {
  background: #e8f5e9;
  border-left: 4px solid var(--ss-success);
}

.alert strong {
  display: block;
  margin-bottom: 0.5rem;
  font-size: 1.1rem;
}

.alert p {
  margin: 0.25rem 0;
}
```

**Step 3: Commit HTML/CSS structure**

```bash
git add sailorskills-billing/index.html sailorskills-billing/src/styles/service-completion.css
git commit -m "feat(ui): add service completion view HTML structure

- Add boat selection dropdown
- Add Start Service, End Service, Continue buttons
- Add service state display (not started, in progress, ended)
- Add duration timer display
- Style service completion controls"
```

---

## Task 3: Implement Start Service Button Logic

**Files:**
- Create: `sailorskills-billing/src/views/service-completion.js`

**Step 1: Create service completion module skeleton**

```javascript
// sailorskills-billing/src/views/service-completion.js

import { showSuccess, showError } from '../components/toast.js';

let serviceLogId = null;
let startTime = null;
let durationInterval = null;

/**
 * Initialize service completion view
 */
export async function initServiceCompletionView() {
  await loadScheduledBoats();
  attachEventListeners();
  checkForActiveService();
}

/**
 * Load boats with scheduled services for today
 */
async function loadScheduledBoats() {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: orders, error } = await window.app.supabase
      .from('service_orders')
      .select(`
        id,
        boat_id,
        service_type,
        scheduled_date,
        boats (
          id,
          boat_name,
          customers (customer_name)
        )
      `)
      .eq('scheduled_date', today)
      .eq('status', 'confirmed')
      .order('scheduled_date');

    if (error) throw error;

    const select = document.getElementById('completion-boat-select');
    select.innerHTML = '<option value="">-- Select a boat --</option>';

    orders.forEach(order => {
      const option = document.createElement('option');
      option.value = order.id;
      option.dataset.boatId = order.boat_id;
      option.dataset.serviceType = order.service_type;
      option.textContent = `${order.boats.boat_name} - ${order.boats.customers.customer_name}`;
      select.appendChild(option);
    });

  } catch (error) {
    console.error('Error loading scheduled boats:', error);
    showError('Failed to load scheduled services');
  }
}

/**
 * Attach event listeners to buttons
 */
function attachEventListeners() {
  document.getElementById('completion-boat-select').addEventListener('change', handleBoatSelection);
  document.getElementById('start-service-btn').addEventListener('click', handleStartService);
  document.getElementById('end-service-btn').addEventListener('click', handleEndService);
  document.getElementById('continue-to-completion-btn').addEventListener('click', handleContinueToCompletion);
}

/**
 * Handle boat selection from dropdown
 */
async function handleBoatSelection(event) {
  const select = event.target;
  const selectedOption = select.options[select.selectedIndex];

  if (!selectedOption.value) {
    document.getElementById('service-controls').style.display = 'none';
    return;
  }

  const boatId = selectedOption.dataset.boatId;
  const serviceType = selectedOption.dataset.serviceType;
  const boatName = selectedOption.textContent.split(' - ')[0];
  const customerName = selectedOption.textContent.split(' - ')[1];

  // Display boat details
  const boatDetails = document.getElementById('boat-details');
  boatDetails.innerHTML = `
    <h4>${boatName}</h4>
    <p><strong>Customer:</strong> ${customerName}</p>
    <p><strong>Service:</strong> ${serviceType}</p>
  `;
  boatDetails.style.display = 'block';

  // Check if service already started for this boat
  await checkExistingServiceLog(boatId);

  // Show service controls
  document.getElementById('service-controls').style.display = 'block';
}

/**
 * Check if service log already exists for this boat (in case of browser reload)
 */
async function checkExistingServiceLog(boatId) {
  try {
    const today = new Date().toISOString().split('T')[0];

    const { data: existingLog, error } = await window.app.supabase
      .from('service_logs')
      .select('*')
      .eq('boat_id', boatId)
      .eq('service_date', today)
      .eq('in_progress', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

    if (existingLog) {
      // Service already started - show in-progress state
      serviceLogId = existingLog.id;
      startTime = new Date(existingLog.service_started_at);
      showServiceInProgress();
    } else {
      // No active service - show start button
      showServiceNotStarted();
    }
  } catch (error) {
    console.error('Error checking existing service log:', error);
  }
}

/**
 * Show UI state: Service not started
 */
function showServiceNotStarted() {
  document.getElementById('service-not-started').style.display = 'flex';
  document.getElementById('service-in-progress').style.display = 'none';
  document.getElementById('service-ended').style.display = 'none';
}

/**
 * Show UI state: Service in progress
 */
function showServiceInProgress() {
  document.getElementById('service-not-started').style.display = 'none';
  document.getElementById('service-in-progress').style.display = 'flex';
  document.getElementById('service-ended').style.display = 'none';

  // Display start time
  document.getElementById('service-start-time').textContent = startTime.toLocaleTimeString();

  // Start duration counter
  startDurationCounter();
}

/**
 * Show UI state: Service ended
 */
function showServiceEnded(endTime, duration) {
  document.getElementById('service-not-started').style.display = 'none';
  document.getElementById('service-in-progress').style.display = 'none';
  document.getElementById('service-ended').style.display = 'flex';

  document.getElementById('final-start-time').textContent = startTime.toLocaleTimeString();
  document.getElementById('final-end-time').textContent = endTime.toLocaleTimeString();
  document.getElementById('final-duration').textContent = formatDuration(duration);

  // Stop duration counter
  if (durationInterval) {
    clearInterval(durationInterval);
    durationInterval = null;
  }
}

/**
 * Start duration counter (updates every second)
 */
function startDurationCounter() {
  updateDuration();
  durationInterval = setInterval(updateDuration, 1000);
}

/**
 * Update duration display
 */
function updateDuration() {
  const now = new Date();
  const elapsed = Math.floor((now - startTime) / 1000); // seconds
  document.getElementById('service-duration').textContent = formatDuration(elapsed);
}

/**
 * Format duration in seconds to human-readable string
 */
function formatDuration(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  } else {
    return `${secs}s`;
  }
}

export {
  initServiceCompletionView,
  loadScheduledBoats,
  handleBoatSelection,
  checkExistingServiceLog,
  showServiceNotStarted,
  showServiceInProgress,
  showServiceEnded,
  startDurationCounter,
  updateDuration,
  formatDuration
};
```

**Step 2: Test module imports and initialization**

```bash
# Start dev server
cd sailorskills-billing
npm run dev

# Open browser to http://localhost:5173
# Check console for errors
# Verify boat dropdown loads
```

**Expected:** Boat dropdown populates with today's scheduled services

**Step 3: Commit initialization code**

```bash
git add sailorskills-billing/src/views/service-completion.js
git commit -m "feat(service-completion): add view initialization and UI state management

- Load scheduled boats for today from service_orders
- Handle boat selection and display details
- Check for existing in-progress services (browser reload recovery)
- Implement UI state transitions (not started, in progress, ended)
- Add duration counter with 1-second updates
- Add duration formatting helper"
```

---

## Task 4: Implement Start Service API Call

**Files:**
- Modify: `sailorskills-billing/src/views/service-completion.js`

**Step 1: Add handleStartService function**

Add to `service-completion.js` after `attachEventListeners()`:

```javascript
/**
 * Handle Start Service button click
 * Creates service_log immediately with current timestamp
 */
async function handleStartService() {
  try {
    const select = document.getElementById('completion-boat-select');
    const selectedOption = select.options[select.selectedIndex];

    if (!selectedOption.value) {
      showError('Please select a boat first');
      return;
    }

    const orderId = selectedOption.value;
    const boatId = selectedOption.dataset.boatId;
    const serviceType = selectedOption.dataset.serviceType;

    // Get customer_id from boat
    const { data: boat, error: boatError } = await window.app.supabase
      .from('boats')
      .select('customer_id')
      .eq('id', boatId)
      .single();

    if (boatError) throw boatError;

    // Create service log immediately with start timestamp
    const now = new Date();
    const serviceDate = now.toISOString().split('T')[0];
    const serviceTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    const { data: serviceLog, error: insertError } = await window.app.supabase
      .from('service_logs')
      .insert({
        boat_id: boatId,
        customer_id: boat.customer_id,
        order_id: orderId,
        service_type: serviceType,
        service_date: serviceDate,
        service_started_at: now.toISOString(), // CRITICAL: Immediate timestamp capture
        time_in: serviceTime, // Also set time_in for compatibility
        in_progress: true, // Mark as active
        created_by: 'billing_service',
        created_at: now.toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // Store service log ID and start time
    serviceLogId = serviceLog.id;
    startTime = now;
    document.getElementById('current-service-log-id').value = serviceLogId;

    console.log('✅ Service started - service_log created:', serviceLogId);
    showSuccess('Service started! Timestamp captured.');

    // Transition to in-progress state
    showServiceInProgress();

  } catch (error) {
    console.error('Error starting service:', error);
    showError(`Failed to start service: ${error.message}`);
  }
}
```

**Step 2: Test Start Service button**

Manual test flow:
1. Select a boat from dropdown
2. Click "Start Service" button
3. Verify toast: "Service started! Timestamp captured."
4. Verify UI transitions to "Service in Progress" state
5. Check database:
```sql
SELECT id, boat_id, service_started_at, time_in, in_progress, created_at
FROM service_logs
WHERE in_progress = true
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:**
- New service_log row created
- `service_started_at` contains exact timestamp
- `time_in` also populated (for compatibility)
- `in_progress = true`
- Duration counter starts updating every second

**Step 3: Test browser reload recovery**

1. Start a service
2. Wait 10 seconds (duration counter shows "10s")
3. Refresh browser (F5)
4. Select same boat from dropdown
5. Verify: UI shows "Service in Progress" with correct start time and duration continues from where it left off

**Step 4: Commit Start Service implementation**

```bash
git add sailorskills-billing/src/views/service-completion.js
git commit -m "feat(service-completion): implement Start Service with immediate timestamp capture

- Create service_log immediately when Start Service clicked
- Write service_started_at timestamp to database instantly
- Set in_progress flag for browser reload recovery
- Also populate time_in field for compatibility
- Show success toast and transition to in-progress UI
- Handle errors gracefully with user feedback"
```

---

## Task 5: Implement End Service API Call

**Files:**
- Modify: `sailorskills-billing/src/views/service-completion.js`

**Step 1: Add handleEndService function**

Add to `service-completion.js` after `handleStartService()`:

```javascript
/**
 * Handle End Service button click
 * Updates service_log with end timestamp
 */
async function handleEndService() {
  try {
    if (!serviceLogId) {
      showError('No active service found');
      return;
    }

    // Capture end timestamp immediately
    const now = new Date();
    const serviceTime = now.toTimeString().split(' ')[0]; // HH:MM:SS

    // Calculate total hours
    const durationMs = now - startTime;
    const totalHours = (durationMs / (1000 * 60 * 60)).toFixed(2);

    // Update service log with end timestamp
    const { data: updatedLog, error: updateError } = await window.app.supabase
      .from('service_logs')
      .update({
        service_ended_at: now.toISOString(), // CRITICAL: Immediate end timestamp
        time_out: serviceTime, // Also set time_out for compatibility
        total_hours: parseFloat(totalHours), // Calculated duration
        in_progress: false, // Mark as no longer active
        updated_at: now.toISOString()
      })
      .eq('id', serviceLogId)
      .select()
      .single();

    if (updateError) throw updateError;

    console.log('✅ Service ended - service_log updated:', serviceLogId);
    console.log(`Duration: ${totalHours} hours`);
    showSuccess(`Service ended! Duration: ${formatDuration(Math.floor(durationMs / 1000))}`);

    // Transition to ended state
    showServiceEnded(now, Math.floor(durationMs / 1000));

  } catch (error) {
    console.error('Error ending service:', error);
    showError(`Failed to end service: ${error.message}`);
  }
}
```

**Step 2: Test End Service button**

Manual test flow:
1. Start a service (as tested in Task 4)
2. Wait at least 10 seconds
3. Click "End Service" button
4. Verify toast: "Service ended! Duration: Xm Ys"
5. Verify UI transitions to "Service Complete" state
6. Check database:
```sql
SELECT id, service_started_at, service_ended_at, time_in, time_out,
       total_hours, in_progress
FROM service_logs
WHERE id = '<service_log_id>';
```

**Expected:**
- service_log updated with `service_ended_at` timestamp
- `time_out` populated
- `total_hours` calculated correctly
- `in_progress = false`
- UI shows start time, end time, and final duration
- "Continue to Billing & Documentation" button appears

**Step 3: Test edge case - End without Start**

1. Refresh browser
2. Select a boat
3. Try clicking "End Service" without clicking "Start Service" first
4. Verify error toast: "No active service found"

**Step 4: Commit End Service implementation**

```bash
git add sailorskills-billing/src/views/service-completion.js
git commit -m "feat(service-completion): implement End Service with immediate timestamp capture

- Update service_log immediately when End Service clicked
- Write service_ended_at timestamp to database instantly
- Calculate and store total_hours duration
- Clear in_progress flag
- Also populate time_out field for compatibility
- Show success toast with duration and transition to ended UI
- Handle errors and edge cases (no active service)"
```

---

## Task 6: Implement Continue to Completion Workflow

**Files:**
- Modify: `sailorskills-billing/src/views/service-completion.js`
- Modify: `sailorskills-billing/src/views/service-logs.js` (or existing completion form)

**Step 1: Add handleContinueToCompletion function**

Add to `service-completion.js` after `handleEndService()`:

```javascript
/**
 * Handle Continue to Billing & Documentation button
 * Navigates to full service completion form with timestamps pre-filled
 */
function handleContinueToCompletion() {
  if (!serviceLogId) {
    showError('No service log found');
    return;
  }

  // Navigate to full completion form view
  // Pass service_log_id as URL parameter
  window.location.hash = `#service-completion-form?log_id=${serviceLogId}`;

  // Alternatively, if using modal:
  // openServiceCompletionForm(serviceLogId);
}
```

**Step 2: Modify existing service completion form to handle pre-filled timestamps**

If `sailorskills-billing` has an existing service log form (from Operations), modify it to:
1. Accept `log_id` parameter
2. Load existing service_log data
3. Display timestamps as read-only (already captured)
4. Allow editing other fields (condition tracking, notes, photos)
5. On submit, UPDATE the existing service_log instead of INSERT

Example modification to `service-log-form.js` (if it exists):

```javascript
export async function openServiceCompletionForm(serviceLogId) {
  // Load existing service log
  const { data: serviceLog, error } = await window.app.supabase
    .from('service_logs')
    .select('*')
    .eq('id', serviceLogId)
    .single();

  if (error) {
    showError('Failed to load service log');
    return;
  }

  // Open form with pre-filled data
  const formContent = `
    <!-- Display timestamps as read-only -->
    <div class="form-group">
      <label>Service Started</label>
      <input type="text" class="form-control"
             value="${new Date(serviceLog.service_started_at).toLocaleString()}"
             readonly style="background: #f5f5f5;">
    </div>

    <div class="form-group">
      <label>Service Ended</label>
      <input type="text" class="form-control"
             value="${new Date(serviceLog.service_ended_at).toLocaleString()}"
             readonly style="background: #f5f5f5;">
    </div>

    <div class="form-group">
      <label>Total Duration</label>
      <input type="text" class="form-control"
             value="${serviceLog.total_hours} hours"
             readonly style="background: #f5f5f5;">
    </div>

    <!-- Editable fields for condition tracking -->
    <div class="form-group">
      <label for="paint-condition">Paint Condition</label>
      <select id="paint-condition" class="form-control">
        <option value="">-- Select --</option>
        <option value="excellent">Excellent</option>
        <option value="good">Good</option>
        <option value="fair">Fair</option>
        <option value="poor">Poor</option>
      </select>
    </div>

    <!-- More condition fields... -->
    <!-- Notes, photos, etc. -->
  `;

  // Open modal/form with UPDATE logic instead of INSERT
  // (Implementation depends on existing form system)
}
```

**Step 3: Test full workflow end-to-end**

1. Start service (timestamps captured)
2. Browser reload (verify recovery)
3. End service (timestamps updated)
4. Click "Continue to Billing & Documentation"
5. Verify: Form opens with timestamps pre-filled and read-only
6. Fill condition tracking fields
7. Submit form
8. Verify: service_log updated with all fields (timestamps preserved)

**Step 4: Commit navigation integration**

```bash
git add sailorskills-billing/src/views/service-completion.js sailorskills-billing/src/views/service-log-form.js
git commit -m "feat(service-completion): integrate with full completion workflow

- Add Continue to Billing & Documentation button handler
- Navigate to completion form with service_log_id parameter
- Modify completion form to accept pre-filled timestamps
- Display timestamps as read-only (already captured)
- UPDATE existing service_log instead of INSERT new one
- Complete end-to-end workflow: Start → End → Document → Complete"
```

---

## Task 7: Add Navigation Menu Entry

**Files:**
- Modify: `sailorskills-billing/index.html`
- Modify: `sailorskills-billing/src/main.js`

**Step 1: Add navigation link to Service Completion view**

Add to navigation menu in `index.html`:

```html
<!-- Add to existing navigation -->
<nav class="main-nav">
  <a href="#dashboard">Dashboard</a>
  <a href="#service-completion">Service Completion</a> <!-- NEW -->
  <a href="#invoices">Invoices</a>
  <a href="#settings">Settings</a>
</nav>
```

**Step 2: Wire up view routing in main.js**

Add to `main.js`:

```javascript
import { initServiceCompletionView } from './views/service-completion.js';

// Route handlers
const routes = {
  'dashboard': loadDashboard,
  'service-completion': loadServiceCompletion, // NEW
  'invoices': loadInvoices,
  // ... other routes
};

async function loadServiceCompletion() {
  showView('service-completion-view');
  await initServiceCompletionView();
}
```

**Step 3: Test navigation**

1. Load http://localhost:5173
2. Click "Service Completion" in nav menu
3. Verify view loads
4. Verify boat dropdown populates
5. Test full workflow again through navigation

**Step 4: Commit navigation changes**

```bash
git add sailorskills-billing/index.html sailorskills-billing/src/main.js
git commit -m "feat(nav): add Service Completion to navigation menu

- Add Service Completion link to main navigation
- Wire up route handler in main.js
- Integrate with existing view routing system"
```

---

## Task 8: Testing & Documentation

**Files:**
- Create: `sailorskills-billing/tests/service-completion.spec.js`
- Update: `sailorskills-billing/CLAUDE.md`
- Create: `docs/features/SERVICE_COMPLETION_TIMESTAMPS.md`

**Step 1: Write Playwright test**

Create `tests/service-completion.spec.js`:

```javascript
import { test, expect } from '@playwright/test';

test.describe('Service Completion - Timestamp Capture', () => {

  test.beforeEach(async ({ page }) => {
    // Navigate to service completion view
    await page.goto('http://localhost:5173/#service-completion');
    await page.waitForSelector('#completion-boat-select');
  });

  test('should capture start timestamp immediately', async ({ page }) => {
    // Select a boat
    await page.selectOption('#completion-boat-select', { index: 1 });

    // Wait for boat details to appear
    await page.waitForSelector('#boat-details', { state: 'visible' });

    // Click Start Service
    const startTime = Date.now();
    await page.click('#start-service-btn');

    // Verify success toast
    await expect(page.locator('.toast.success')).toContainText('Service started');

    // Verify UI transitioned to in-progress
    await expect(page.locator('#service-in-progress')).toBeVisible();

    // Verify database entry (using test database)
    // ... query service_logs table to verify timestamp within 2 seconds of click
  });

  test('should recover from browser reload', async ({ page }) => {
    // Start service
    await page.selectOption('#completion-boat-select', { index: 1 });
    await page.click('#start-service-btn');
    await page.waitForSelector('#service-in-progress', { state: 'visible' });

    // Wait 5 seconds
    await page.waitForTimeout(5000);

    // Reload browser
    await page.reload();

    // Select same boat
    await page.selectOption('#completion-boat-select', { index: 1 });

    // Verify UI shows in-progress state
    await expect(page.locator('#service-in-progress')).toBeVisible();

    // Verify duration counter is running
    const duration = await page.locator('#service-duration').textContent();
    expect(duration).toMatch(/\d+s/); // Should show seconds elapsed
  });

  test('should capture end timestamp and calculate duration', async ({ page }) => {
    // Start service
    await page.selectOption('#completion-boat-select', { index: 1 });
    await page.click('#start-service-btn');
    await page.waitForSelector('#service-in-progress', { state: 'visible' });

    // Wait 10 seconds
    await page.waitForTimeout(10000);

    // End service
    const endTime = Date.now();
    await page.click('#end-service-btn');

    // Verify success toast
    await expect(page.locator('.toast.success')).toContainText('Service ended');

    // Verify UI transitioned to ended state
    await expect(page.locator('#service-ended')).toBeVisible();

    // Verify duration displayed
    const duration = await page.locator('#final-duration').textContent();
    expect(duration).toMatch(/10s/); // Should show ~10 seconds

    // Verify database entry
    // ... query service_logs to verify service_ended_at timestamp
  });

  test('should prevent ending service without starting', async ({ page }) => {
    // Try clicking End Service without starting
    // (This test assumes End button is disabled/hidden before start)

    await page.selectOption('#completion-boat-select', { index: 1 });

    // Verify End Service button is not visible
    await expect(page.locator('#end-service-btn')).not.toBeVisible();
  });
});
```

**Step 2: Run tests**

```bash
# Run Playwright tests
cd sailorskills-billing
npx playwright test tests/service-completion.spec.js

# Expected: All tests pass
```

**Step 3: Write feature documentation**

Create `docs/features/SERVICE_COMPLETION_TIMESTAMPS.md`:

```markdown
# Service Completion - Immediate Timestamp Capture

**Feature:** Start Service / End Service buttons in Billing service
**Status:** ✅ Implemented (2025-11-06)
**Roadmap:** Q1 2026 - Billing PWA Quick Fix

## Problem Solved

Browser sessions reload during long dives (30-60+ minutes), losing form state and preventing accurate time tracking. Technicians had to manually remember start/end times or re-enter data after surfacing.

## Solution

Capture timestamps IMMEDIATELY when Start/End Service buttons are clicked, writing directly to database before any form state loss can occur.

## User Workflow

1. **Arrive at boat** → Navigate to Service Completion view
2. **Select boat** from dropdown (today's scheduled services)
3. **Click "Start Service"** → Timestamp captured immediately in database
4. **Perform work** → Browser can reload without losing timestamp
5. **Return to surface** → Browser recovers in-progress service automatically
6. **Click "End Service"** → End timestamp captured, duration calculated
7. **Click "Continue"** → Opens full completion form with timestamps pre-filled
8. **Document conditions** → Fill paint, growth, anode fields
9. **Submit** → Service log complete with accurate timestamps

## Technical Details

### Database Schema

New fields added to `service_logs`:
- `service_started_at TIMESTAMP` - Exact moment Start clicked
- `service_ended_at TIMESTAMP` - Exact moment End clicked
- `in_progress BOOLEAN` - Track active services

### Browser Reload Recovery

- When boat selected, check for `in_progress = true` service logs
- If found, load existing service and continue duration counter
- No data loss even if browser completely reloads

### Duration Calculation

- Client-side: Real-time counter updates every second for UI feedback
- Server-side: Accurate duration calculated as `(ended_at - started_at)` in hours
- Stored in `total_hours` field for reporting

## Files

- `/sailorskills-billing/src/views/service-completion.js` - Main logic
- `/sailorskills-billing/src/views/service-completion.html` - UI (in index.html)
- `/sailorskills-billing/src/styles/service-completion.css` - Styles
- `/migrations/023_add_service_start_end_timestamps.sql` - Database migration

## Testing

```bash
npx playwright test tests/service-completion.spec.js
```

## Future Enhancements

- GPS location capture on Start Service
- Offline mode (PWA with Service Worker)
- Photo capture during service (not just at end)
- Push notifications if service exceeds expected duration
```

**Step 4: Update CLAUDE.md**

Add to `sailorskills-billing/CLAUDE.md`:

```markdown
## Service Completion Workflow

### Immediate Timestamp Capture (2025-11-06)

**Feature:** Start/End Service buttons capture timestamps immediately to overcome browser session loss during long dives.

**Workflow:**
1. Technician selects boat from scheduled services
2. Clicks "Start Service" → Creates service_log with `service_started_at` timestamp
3. Performs work (browser can reload, timestamp is safe in database)
4. Clicks "End Service" → Updates service_log with `service_ended_at` and `total_hours`
5. Clicks "Continue" → Opens full completion form with timestamps pre-filled

**Files:**
- `src/views/service-completion.js` - Main implementation
- `tests/service-completion.spec.js` - Playwright tests
- `docs/features/SERVICE_COMPLETION_TIMESTAMPS.md` - Full documentation

**Database Fields:**
- `service_logs.service_started_at` - Exact start timestamp
- `service_logs.service_ended_at` - Exact end timestamp
- `service_logs.in_progress` - Boolean flag for active services
```

**Step 5: Commit documentation**

```bash
git add sailorskills-billing/tests/service-completion.spec.js sailorskills-billing/CLAUDE.md docs/features/SERVICE_COMPLETION_TIMESTAMPS.md
git commit -m "docs: add service completion timestamp capture documentation

- Add Playwright test suite for timestamp capture
- Add feature documentation
- Update CLAUDE.md with workflow details
- Document browser reload recovery mechanism"
```

---

## Task 9: Deploy to Production

**Files:**
- N/A (deployment configuration)

**Step 1: Push to GitHub**

```bash
git push origin main
```

**Expected:** Vercel auto-deploys to production (billing.sailorskills.com)

**Step 2: Verify deployment**

1. Visit https://billing.sailorskills.com
2. Navigate to Service Completion view
3. Test with real scheduled service
4. Verify timestamps captured correctly
5. Test browser reload recovery

**Step 3: Monitor for errors**

1. Check Vercel deployment logs
2. Check Supabase database for new service_log entries
3. Monitor for any user-reported issues

**Step 4: Announce feature to team**

Email/Slack message:
```
🎉 New Feature: Service Completion Timestamp Capture

Start/End Service buttons now capture timestamps IMMEDIATELY, solving the browser reload issue during long dives.

How to use:
1. Go to Service Completion (new nav item)
2. Select boat
3. Click "Start Service" when you begin
4. Click "End Service" when you finish
5. Continue to full documentation

Your timestamps are safe even if browser reloads!

Docs: docs/features/SERVICE_COMPLETION_TIMESTAMPS.md
```

---

## Success Criteria

**✅ Feature Complete When:**

- [ ] Database migration runs successfully in production
- [ ] Start Service button creates service_log with immediate timestamp
- [ ] End Service button updates service_log with end timestamp and duration
- [ ] Browser reload recovery works (in-progress service detected and resumed)
- [ ] Duration counter updates in real-time every second
- [ ] Navigation integration complete (Service Completion in menu)
- [ ] Continue button opens full completion form with pre-filled timestamps
- [ ] Full workflow tested end-to-end
- [ ] Playwright tests pass
- [ ] Documentation complete
- [ ] Deployed to production successfully
- [ ] Team notified and trained on new feature

---

## Rollback Plan

**If issues occur in production:**

1. **Disable Start/End Service buttons** (hide UI, don't delete code):
```javascript
// Quick fix in service-completion.js
document.getElementById('start-service-btn').disabled = true;
document.getElementById('start-service-btn').textContent = 'Feature Temporarily Disabled';
```

2. **Revert database migration** (if needed):
```sql
ALTER TABLE service_logs
  DROP COLUMN IF EXISTS service_started_at,
  DROP COLUMN IF EXISTS service_ended_at,
  DROP COLUMN IF EXISTS in_progress;
```

3. **Fallback to manual time entry** via existing service log form

4. **Fix issues and redeploy**

---

## Post-Implementation Tasks

**Week 1 After Launch:**
- Monitor database for service_log entries with new timestamps
- Track adoption rate (% of services using Start/End buttons vs. manual entry)
- Collect user feedback from technicians
- Watch for any browser-specific issues

**Week 2-4:**
- Analyze timestamp data accuracy vs. manual entry
- Calculate time savings (reduced data loss, faster entry)
- Plan Phase 2 enhancements (offline PWA, GPS, etc.)

---

**Plan Author:** Claude
**Plan Date:** 2025-11-06
**Estimated Implementation Time:** 2-3 days (16-24 hours)
**Priority:** Critical (Q1 2026 Roadmap)
