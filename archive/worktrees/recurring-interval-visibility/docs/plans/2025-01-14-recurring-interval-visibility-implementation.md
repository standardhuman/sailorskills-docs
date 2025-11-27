# Recurring Service Interval Visibility - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Display recurring service interval information clearly in customer/admin emails and throughout Operations views so the team and customers know exactly what service frequency was selected.

**Architecture:** Frontend enhancements + email template updates. No database schema changes required - all data already exists in service_orders, service_schedules, and customer_services tables. Shared utility functions for consistent interval formatting across all views.

**Tech Stack:**
- Email: TypeScript (Deno edge function), HTML email templates
- Operations: Vanilla JavaScript ES6+, Vite, Supabase client
- Testing: Playwright (E2E)

---

## Phase 1: Email Template Enhancements

### Task 1: Add formatServiceInterval Helper Function

**Files:**
- Modify: `sailorskills-shared/supabase/functions/create-payment-intent/index.ts:265` (after generateOrderConfirmationEmail function)

**Step 1: Add formatServiceInterval function**

Add this function after the `generateOrderConfirmationEmail` function (around line 265):

```typescript
/**
 * Format service interval code to human-readable text
 * @param interval - Service interval code ('1', '2', '3', '6', 'one-time')
 * @returns Formatted interval text
 */
function formatServiceInterval(interval: string): string {
  const intervalMap: Record<string, string> = {
    'one-time': 'One-time service',
    '1': 'Monthly (every month)',
    '2': 'Bi-monthly (every 2 months)',
    '3': 'Quarterly (every 3 months)',
    '6': 'Biannual (every 6 months)'
  };
  return intervalMap[interval] || 'One-time service';
}
```

**Step 2: Verify the function location**

Check: Function should be placed after `generateOrderConfirmationEmail` and before `serve()` call
Expected: Clean TypeScript, no syntax errors

**Step 3: Commit**

```bash
git add sailorskills-shared/supabase/functions/create-payment-intent/index.ts
git commit -m "feat(email): add formatServiceInterval helper function"
```

---

### Task 2: Update Customer Confirmation Email Template

**Files:**
- Modify: `sailorskills-shared/supabase/functions/create-payment-intent/index.ts:184-264` (generateOrderConfirmationEmail function)

**Step 1: Add serviceInterval parameter**

Update function signature (line 184):

```typescript
function generateOrderConfirmationEmail(
  orderNumber: string,
  customerName: string,
  serviceType: string,
  estimatedAmount: number,
  isRecurring: boolean,
  serviceInterval: string  // NEW PARAMETER
): string {
```

**Step 2: Add service frequency row to order details table**

Find the table with service details (around line 221-233) and add new row after "Service:" row:

```typescript
              <tr>
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Service:</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${serviceType}</td>
              </tr>
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Service Frequency:</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${formatServiceInterval(serviceInterval)}</td>
              </tr>
```

**Step 3: Update payment message to include interval**

Find the `paymentMessage` variable (around line 191-199) and update:

```typescript
  const paymentMessage = isRecurring
    ? `<p style="margin: 20px 0; padding: 15px; background-color: #e8f4f8; border-left: 4px solid #345475; color: #345475;">
         <strong>Payment Method Saved!</strong><br>
         Your card is securely saved and will be charged after each service completion (${formatServiceInterval(serviceInterval)}).
       </p>`
    : `<p style="margin: 20px 0; padding: 15px; background-color: #e8f4f8; border-left: 4px solid #345475; color: #345475;">
         <strong>Payment Method Saved!</strong><br>
         Your card is securely saved and will be charged $${estimatedAmount.toFixed(2)} after service completion.
       </p>`
```

**Step 4: Commit**

```bash
git add sailorskills-shared/supabase/functions/create-payment-intent/index.ts
git commit -m "feat(email): add service interval to customer confirmation email"
```

---

### Task 3: Update Admin Notification Email Template

**Files:**
- Modify: `sailorskills-shared/supabase/functions/create-payment-intent/index.ts:64-181` (generateAdminNotificationEmail function)

**Step 1: Add serviceInterval parameter**

Update function signature (line 64):

```typescript
function generateAdminNotificationEmail(
  orderNumber: string,
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  serviceType: string,
  estimatedAmount: number,
  boatName: string,
  marinaName: string,
  dock: string,
  slipNumber: string,
  isRecurring: boolean,
  customerNotes: string,
  serviceInterval: string  // NEW PARAMETER
): string {
```

**Step 2: Update "Service Type" row to show interval**

Find the "Service Type" row in the order details table (around line 116-119) and update:

```typescript
              <tr style="background-color: #f9f9f9;">
                <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Service Type:</td>
                <td style="padding: 12px; border: 1px solid #ddd;">${isRecurring ? `Recurring (${formatServiceInterval(serviceInterval)})` : 'One-time'}</td>
              </tr>
```

**Step 3: Commit**

```bash
git add sailorskills-shared/supabase/functions/create-payment-intent/index.ts
git commit -m "feat(email): add service interval to admin notification email"
```

---

### Task 4: Update Email Function Calls to Pass serviceInterval

**Files:**
- Modify: `sailorskills-shared/supabase/functions/create-payment-intent/index.ts:636-687` (email sending section)

**Step 1: Update customer confirmation email call**

Find the call to `generateOrderConfirmationEmail` (around line 639-644) and add serviceInterval parameter:

```typescript
      const emailHtml = generateOrderConfirmationEmail(
        orderNumber,
        formData.customerName,
        formData.service,
        formData.estimate,
        isRecurring,
        formData.serviceInterval  // NEW PARAMETER
      )
```

**Step 2: Update admin notification email call**

Find the call to `generateAdminNotificationEmail` (around line 663-676) and add serviceInterval parameter:

```typescript
      const adminEmailHtml = generateAdminNotificationEmail(
        orderNumber,
        formData.customerName,
        formData.customerEmail,
        formData.customerPhone,
        formData.service,
        formData.estimate,
        formData.boatName || 'N/A',
        formData.marinaName || 'N/A',
        formData.dock || 'N/A',
        formData.slipNumber || 'N/A',
        isRecurring,
        formData.customerNotes || '',
        formData.serviceInterval  // NEW PARAMETER
      )
```

**Step 3: Commit**

```bash
git add sailorskills-shared/supabase/functions/create-payment-intent/index.ts
git commit -m "feat(email): pass serviceInterval to email generation functions"
```

---

### Task 5: Test Email Changes Manually

**Files:**
- Test: Estimator checkout flow

**Step 1: Deploy edge function to test environment**

```bash
cd sailorskills-shared
supabase functions deploy create-payment-intent --project-ref fzygakldvvzxmahkdylq
```

Expected: Function deployed successfully

**Step 2: Test customer confirmation email**

1. Navigate to Estimator: https://diving.sailorskills.com
2. Complete wizard for recurring service (select "Every 2 months")
3. Complete checkout with test card: 4242 4242 4242 4242
4. Check email for confirmation
5. Verify "Service Frequency: Bi-monthly (every 2 months)" appears

Expected: Email shows interval correctly

**Step 3: Test admin notification email**

1. Check admin email (standardhuman@gmail.com)
2. Verify "Service Type: Recurring (Bi-monthly (every 2 months))" appears

Expected: Admin email shows interval correctly

**Step 4: Test all interval types**

Repeat for each interval:
- Monthly (1)
- Bi-monthly (2) ✓ already tested
- Quarterly (3)
- Biannual (6)
- One-time

Expected: Each shows correct formatted text

**Step 5: Document test results**

Create test summary in commit message.

---

## Phase 2: Operations - Customer Modal Enhancement

### Task 6: Create getCustomerServicePlans Utility Function

**Files:**
- Create: `sailorskills-operations/src/utils/customer-service-plans.js`

**Step 1: Create utility file with service plan fetcher**

```javascript
/**
 * Customer Service Plans Utility
 * Fetches and formats customer service plan data
 */

/**
 * Format frequency code to human-readable text
 * @param {string} frequency - Frequency code from customer_services table
 * @returns {string} Formatted frequency text
 */
export function formatFrequency(frequency) {
  const frequencyMap = {
    'monthly': 'Monthly',
    'two_months': 'Every 2 months',
    'quarterly': 'Quarterly',
    'biannual': 'Every 6 months',
    'one-time': 'One-time'
  };
  return frequencyMap[frequency] || frequency;
}

/**
 * Format interval months to short badge text
 * @param {number} intervalMonths - Interval in months
 * @returns {string} Short interval text for badges
 */
export function formatIntervalShort(intervalMonths) {
  const intervalMap = {
    1: '1-mo',
    2: '2-mo',
    3: '3-mo',
    6: '6-mo'
  };
  return intervalMap[intervalMonths] || 'One-time';
}

/**
 * Get all active service plans for a customer
 * @param {string} customerId - Supabase customer ID
 * @param {string} stripeCustomerId - Stripe customer ID
 * @returns {Promise<Array>} Service plans with boat information
 */
export async function getCustomerServicePlans(customerId, stripeCustomerId) {
  // Try customer_services table first (primary source)
  const { data: customerServices, error: csError } = await window.app.supabase
    .from('customer_services')
    .select(`
      *,
      boat:boats(id, name, length)
    `)
    .eq('customer_id', stripeCustomerId)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (!csError && customerServices && customerServices.length > 0) {
    return customerServices;
  }

  // Fallback to service_schedules if customer_services is empty
  const { data: schedules, error: schedError } = await window.app.supabase
    .from('service_schedules')
    .select(`
      *,
      boat:boats(id, name, length),
      original_order:service_orders!service_schedules_order_id_fkey(service_type, service_interval)
    `)
    .eq('customer_id', customerId)
    .order('next_service_date', { ascending: true });

  if (schedError) {
    console.error('Error fetching service schedules:', schedError);
    return [];
  }

  // Map schedules to customer_services format for consistency
  return (schedules || []).map(schedule => ({
    boat_id: schedule.boat_id,
    boat: schedule.boat,
    frequency: mapIntervalToFrequency(schedule.interval_months),
    service_name: schedule.original_order?.service_type || 'Recurring Service',
    next_service_date: schedule.next_service_date,
    status: 'active'
  }));
}

/**
 * Map interval months to frequency code
 * @param {number} intervalMonths - Interval in months
 * @returns {string} Frequency code
 */
function mapIntervalToFrequency(intervalMonths) {
  const map = {
    1: 'monthly',
    2: 'two_months',
    3: 'quarterly',
    6: 'biannual'
  };
  return map[intervalMonths] || 'one-time';
}

/**
 * Format date for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
export function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
```

**Step 2: Verify file syntax**

Check: No TypeScript/import errors
Expected: Clean JavaScript

**Step 3: Commit**

```bash
git add sailorskills-operations/src/utils/customer-service-plans.js
git commit -m "feat(ops): add customer service plans utility functions"
```

---

### Task 7: Add Service Plans Section to Customer Modal

**Files:**
- Modify: `sailorskills-operations/src/views/boats/modals/CustomerModal.js:16-66`

**Step 1: Import the new utility functions**

Add import at top of file (after existing imports):

```javascript
import { getCustomerServicePlans, formatFrequency, formatDate } from '../../../utils/customer-service-plans.js';
```

**Step 2: Fetch service plans in showCustomerModal function**

Add this query after the boats query (around line 23):

```javascript
    // Get service plans for this customer
    const customerId = boats && boats.length > 0 ? boats[0].customer_id : null;
    const stripeCustomerId = boats && boats.length > 0 ? boats[0].customer_id : null;
    const servicePlans = customerId ? await getCustomerServicePlans(customerId, stripeCustomerId) : [];
```

**Step 3: Add service plans section to modal content**

Insert this section after the customer info div and before the boats list (around line 47):

```javascript
      ${servicePlans && servicePlans.length > 0 ? `
        <div class="service-plans-section" style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
          <h4 style="margin-top: 0;">Active Service Plans (${servicePlans.length})</h4>
          <div class="service-plans-grid" style="display: grid; gap: 0.75rem;">
            ${servicePlans.map(plan => `
              <div class="service-plan-card"
                   style="padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; background: white;"
                   data-boat-id="${plan.boat_id}"
                   onclick="window.showServiceHistory('${plan.boat_id}', '${plan.boat?.name || 'Unknown'}')">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                  <div style="flex: 1;">
                    <strong>${plan.boat?.name || 'Unknown'}</strong> ${plan.boat?.length ? `(${plan.boat.length} ft)` : ''}
                    <div style="margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.9em;">
                      ${formatFrequency(plan.frequency)} - ${plan.service_name || 'Recurring Service'}
                    </div>
                  </div>
                  <span class="status-badge status-${plan.status}" style="background: var(--status-active, #10b981); color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85em;">${plan.status}</span>
                </div>
                ${plan.next_service_date ? `
                  <div style="margin-top: 0.5rem; font-size: 0.9em; color: var(--text-secondary);">
                    Next service: ${formatDate(plan.next_service_date)}
                  </div>
                ` : ''}
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
```

**Step 4: Make showServiceHistory globally accessible**

Add this export at the end of the file:

```javascript
// Make function globally accessible for onclick handlers
window.showServiceHistory = showServiceModal;
```

**Step 5: Commit**

```bash
git add sailorskills-operations/src/views/boats/modals/CustomerModal.js
git commit -m "feat(ops): add service plans section to customer modal"
```

---

### Task 8: Test Customer Modal Changes

**Files:**
- Test: Operations Customer Modal

**Step 1: Start Operations dev server**

```bash
cd sailorskills-operations
npm run dev
```

Expected: Server running on http://localhost:5173

**Step 2: Navigate to Boats view**

1. Open http://localhost:5173
2. Navigate to Boats view
3. Click on a customer name (choose one with recurring service)

Expected: Customer Modal opens

**Step 3: Verify service plans section**

Check for:
- "Active Service Plans (N)" heading
- Service plan cards showing boat name, interval, service name
- "Next service" date displayed
- Status badge shows "active"
- Clicking card opens Service History Modal

Expected: All elements display correctly

**Step 4: Test with customer with no recurring services**

1. Find customer with only one-time services
2. Click customer name
3. Verify no service plans section appears (or shows empty state)

Expected: No service plans section for one-time only customers

**Step 5: Document test results**

Note any issues or edge cases discovered.

---

## Phase 3: Service History Modal Enhancement

### Task 9: Enhance Service Schedule Display

**Files:**
- Modify: `sailorskills-operations/src/views/boats/modals/ServiceHistoryModal.js:59-78`

**Step 1: Import formatting utilities**

Add import at top of file:

```javascript
import { formatIntervalShort, formatDate } from '../../../utils/customer-service-plans.js';
```

**Step 2: Enhance schedule section display**

Replace the existing service schedule info section (lines 59-78) with:

```javascript
      <div class="service-schedule-info" style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
        ${serviceSchedule ? `
          <div class="service-plan-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1rem;">
            <div>
              <h4 style="margin: 0 0 0.5rem 0;">Service Plan</h4>
              <div style="display: flex; gap: 1rem; align-items: center; flex-wrap: wrap;">
                <span class="service-plan-badge" style="background: var(--primary-color, #3b82f6); color: white; padding: 0.35rem 0.75rem; border-radius: 4px; font-weight: 600; font-size: 0.9em;">
                  ${formatIntervalShort(serviceSchedule.interval_months)}
                </span>
                <span style="color: var(--text-secondary); font-size: 0.95em;">
                  ${serviceSchedule.service_type || 'Recurring Cleaning & Anodes'}
                </span>
              </div>
            </div>
            <div style="text-align: right; font-size: 0.85em; color: var(--text-secondary);">
              ${serviceSchedule.created_at ? `Active since ${formatDate(serviceSchedule.created_at)}` : ''}
            </div>
          </div>
          <div class="schedule-details" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
            ${serviceSchedule.start_month ? `
              <div>
                <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 0.25rem;">Start Month</div>
                <div style="font-weight: 600;">${getMonthName(serviceSchedule.start_month)}</div>
              </div>
            ` : ''}
            ${serviceSchedule.scheduled_date ? `
              <div>
                <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 0.25rem;">Next Service</div>
                <div style="font-weight: 600;">${formatDate(serviceSchedule.scheduled_date)}</div>
              </div>
            ` : ''}
            ${serviceSchedule.preferred_day_of_week ? `
              <div>
                <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 0.25rem;">Preferred Day</div>
                <div style="font-weight: 600;">${serviceSchedule.preferred_day_of_week}</div>
              </div>
            ` : ''}
          </div>
          ${serviceSchedule.notes ? `
            <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid var(--border-color, #e5e7eb);">
              <div style="font-size: 0.85em; color: var(--text-secondary); margin-bottom: 0.25rem;">Notes</div>
              <div style="font-size: 0.95em;">${serviceSchedule.notes}</div>
            </div>
          ` : ''}
        ` : '<p style="margin: 0; color: var(--text-secondary);">No service schedule configured</p>'}
        <div style="margin-top: 1rem; text-align: right;">
          <button class="btn btn-sm ${serviceSchedule ? 'btn-secondary edit-schedule-modal-btn' : 'btn-primary add-schedule-modal-btn'}"
                  data-boat-id="${boatId}"
                  ${serviceSchedule ? `data-schedule='${JSON.stringify(serviceSchedule).replace(/'/g, '&apos;')}'` : ''}>
            ${serviceSchedule ? 'Edit Schedule' : '+ Add Schedule'}
          </button>
        </div>
      </div>
```

**Step 3: Commit**

```bash
git add sailorskills-operations/src/views/boats/modals/ServiceHistoryModal.js
git commit -m "feat(ops): enhance service schedule display in history modal"
```

---

### Task 10: Test Service History Modal Changes

**Files:**
- Test: Service History Modal

**Step 1: Navigate to Service History Modal**

1. Open Operations (http://localhost:5173)
2. Navigate to Boats view
3. Click on a boat with recurring service
4. Click "Service History" or open from Customer Modal

Expected: Service History Modal opens

**Step 2: Verify enhanced schedule display**

Check for:
- "Service Plan" heading
- Interval badge (e.g., "2-mo") with colored background
- Service type displayed
- "Active since" date in top right
- Schedule details in grid layout
- Edit Schedule button

Expected: All elements display correctly

**Step 3: Test with boat without schedule**

1. Find boat without service schedule
2. Open Service History Modal
3. Verify "No service schedule configured" message
4. Verify "+ Add Schedule" button appears

Expected: Empty state displays correctly

**Step 4: Document test results**

Note styling and layout observations.

---

## Phase 4: Boats Table/List View Enhancement

### Task 11: Add Service Plan Column to Boats Query

**Files:**
- Modify: `sailorskills-operations/src/views/boats.js` (boats data fetching section)

**Step 1: Find the boats query**

Locate the Supabase query that fetches boats (search for `.from('boats')`).

**Step 2: Update query to include service plan data**

Modify the `.select()` to include service plan join:

```javascript
  const { data: boats, error } = await window.app.supabase
    .from('boats')
    .select(`
      *,
      service_plan:customer_services!customer_services_boat_id_fkey(
        frequency,
        next_service_date,
        status
      )
    `)
    .order('customer_name');
```

**Step 3: Commit**

```bash
git add sailorskills-operations/src/views/boats.js
git commit -m "feat(ops): add service plan data to boats query"
```

---

### Task 12: Add Service Plan Column to Boats Table

**Files:**
- Modify: `sailorskills-operations/src/views/boats.js` (table rendering section)

**Step 1: Import utility functions**

Add import at top of file:

```javascript
import { formatIntervalShort, formatDate } from './utils/customer-service-plans.js';
```

**Step 2: Add column header**

Find the table header row and add new `<th>` after the "Marina" column:

```javascript
<th class="sortable" data-sort="service_plan">Service Plan</th>
```

**Step 3: Add column data cell**

Find the table row rendering and add new `<td>` after the marina cell:

```javascript
<td>
  ${boat.service_plan && boat.service_plan.length > 0 ? `
    <span class="service-plan-badge service-plan-${boat.service_plan[0].status}"
          title="Next service: ${formatDate(boat.service_plan[0].next_service_date)}"
          style="display: inline-block; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.85em; font-weight: 600; cursor: help; background: var(--status-active, #10b981); color: white;">
      ${formatIntervalShort(getIntervalFromFrequency(boat.service_plan[0].frequency))}
    </span>
  ` : `
    <span style="color: var(--text-secondary); font-size: 0.9em;">One-time</span>
  `}
</td>
```

**Step 4: Add helper function to convert frequency to interval**

Add this function in the boats.js file:

```javascript
function getIntervalFromFrequency(frequency) {
  const map = {
    'monthly': 1,
    'two_months': 2,
    'quarterly': 3,
    'biannual': 6
  };
  return map[frequency] || 0;
}
```

**Step 5: Commit**

```bash
git add sailorskills-operations/src/views/boats.js
git commit -m "feat(ops): add service plan column to boats table"
```

---

### Task 13: Add Service Plan Sorting Logic

**Files:**
- Modify: `sailorskills-operations/src/views/boats.js` (sorting section)

**Step 1: Find the sorting logic**

Locate the function that handles table sorting (likely `handleSort` or similar).

**Step 2: Add service_plan sort case**

Add this case to the sort switch/if statement:

```javascript
case 'service_plan':
  sortedBoats = boats.sort((a, b) => {
    const aInterval = a.service_plan?.[0]?.frequency ? getIntervalFromFrequency(a.service_plan[0].frequency) : 999;
    const bInterval = b.service_plan?.[0]?.frequency ? getIntervalFromFrequency(b.service_plan[0].frequency) : 999;
    return ascending ? aInterval - bInterval : bInterval - aInterval;
  });
  break;
```

**Step 3: Commit**

```bash
git add sailorskills-operations/src/views/boats.js
git commit -m "feat(ops): add sorting by service plan"
```

---

### Task 14: Add Service Plan Filter

**Files:**
- Modify: `sailorskills-operations/src/views/boats.js` (filter UI and logic)

**Step 1: Add filter dropdown to UI**

Find the filters section (likely near search box) and add:

```html
<select id="service-plan-filter" class="filter-select">
  <option value="all">All Plans</option>
  <option value="monthly">Monthly</option>
  <option value="two_months">Bi-monthly</option>
  <option value="quarterly">Quarterly</option>
  <option value="biannual">Biannual</option>
  <option value="one-time">One-time only</option>
</select>
```

**Step 2: Add filter event listener**

Add event listener in the init/setup function:

```javascript
document.getElementById('service-plan-filter')?.addEventListener('change', (e) => {
  const filterValue = e.target.value;
  applyServicePlanFilter(filterValue);
});
```

**Step 3: Implement filter function**

Add this function:

```javascript
function applyServicePlanFilter(filterValue) {
  if (filterValue === 'all') {
    renderBoats(allBoats);
    return;
  }

  const filtered = allBoats.filter(boat => {
    if (filterValue === 'one-time') {
      return !boat.service_plan || boat.service_plan.length === 0;
    }
    return boat.service_plan?.[0]?.frequency === filterValue;
  });

  renderBoats(filtered);
}
```

**Step 4: Commit**

```bash
git add sailorskills-operations/src/views/boats.js
git commit -m "feat(ops): add service plan filtering to boats view"
```

---

### Task 15: Test Boats Table Enhancements

**Files:**
- Test: Operations Boats view

**Step 1: Reload Operations and navigate to Boats**

1. Refresh http://localhost:5173
2. Navigate to Boats view

Expected: Boats table loads

**Step 2: Verify service plan column appears**

Check for:
- "Service Plan" column header
- Interval badges (1-mo, 2-mo, 3-mo, 6-mo) for recurring services
- "One-time" text for boats without recurring service
- Hover tooltip shows next service date

Expected: Column displays correctly

**Step 3: Test sorting by service plan**

1. Click "Service Plan" column header
2. Verify boats sort by interval (monthly first, then bi-monthly, etc.)
3. Click again to reverse sort

Expected: Sorting works correctly

**Step 4: Test service plan filter**

1. Select "Monthly" from service plan filter
2. Verify only monthly service boats shown
3. Test each filter option
4. Test "All Plans" to show all boats again

Expected: Filtering works correctly

**Step 5: Document test results**

Note any visual or functional issues.

---

## Phase 5: Customer Profile View

### Task 16: Create Customer Profile View File

**Files:**
- Create: `sailorskills-operations/src/views/customer-profile.js`

**Step 1: Create view file structure**

```javascript
/**
 * Customer Profile View
 * Comprehensive customer information page
 */

import { getCustomerServicePlans, formatFrequency, formatDate } from '../utils/customer-service-plans.js';
import { showError } from '../components/toast.js';

let currentCustomer = null;

/**
 * Initialize Customer Profile View
 * @param {string} customerId - Customer ID to load
 */
export async function initCustomerProfileView(customerId) {
  if (!customerId) {
    showError('No customer ID provided');
    return;
  }

  await loadCustomerProfile(customerId);
}

/**
 * Load complete customer profile data
 * @param {string} customerId - Customer ID
 */
async function loadCustomerProfile(customerId) {
  const container = document.getElementById('customer-profile-content');
  if (!container) {
    console.error('Customer profile container not found');
    return;
  }

  container.innerHTML = '<div class="loading">Loading customer profile...</div>';

  try {
    // Fetch all customer data
    const { data: customer, error: customerError } = await window.app.supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single();

    if (customerError) throw customerError;

    // Fetch service plans
    const servicePlans = await getCustomerServicePlans(customerId, customer.stripe_customer_id);

    // Fetch boats
    const { data: boats, error: boatsError } = await window.app.supabase
      .from('boats')
      .select('*')
      .eq('customer_id', customerId)
      .order('name');

    if (boatsError) throw boatsError;

    // Fetch orders
    const { data: orders, error: ordersError } = await window.app.supabase
      .from('service_orders')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });

    if (ordersError) throw ordersError;

    // Fetch statistics
    const { data: stats, error: statsError } = await window.app.supabase
      .rpc('get_customer_statistics', { customer_id_param: customerId });

    if (statsError) {
      console.warn('Statistics not available:', statsError);
    }

    currentCustomer = customer;

    // Render profile
    renderCustomerProfile(customer, servicePlans, boats, orders, stats);

  } catch (error) {
    console.error('Error loading customer profile:', error);
    container.innerHTML = '<p class="error">Failed to load customer profile</p>';
  }
}

/**
 * Render customer profile layout
 */
function renderCustomerProfile(customer, servicePlans, boats, orders, stats) {
  const container = document.getElementById('customer-profile-content');

  container.innerHTML = `
    <div class="customer-profile-view">
      <!-- Header Section -->
      <div class="profile-header">
        <div class="customer-info">
          <h1>${customer.name}</h1>
          <div class="contact-info">
            <a href="mailto:${customer.email}">${customer.email}</a>
            ${customer.phone ? `• <a href="tel:${customer.phone}">${customer.phone}</a>` : ''}
          </div>
          <div class="account-meta">
            Customer since ${formatDate(customer.created_at)}
          </div>
        </div>
        <div class="quick-actions">
          <button class="btn btn-primary" onclick="window.composeEmail('${customer.email}')">
            📧 Email
          </button>
          <button class="btn btn-secondary" onclick="window.editCustomer('${customer.id}')">
            ✏️ Edit
          </button>
        </div>
      </div>

      <!-- Service Plans Panel -->
      ${renderServicePlansPanel(servicePlans, stats)}

      <!-- Boats Section -->
      ${renderBoatsSection(boats)}

      <!-- Order History -->
      ${renderOrderHistory(orders)}

      <!-- Notes Section -->
      ${renderNotesSection(customer)}

      <!-- Statistics Dashboard -->
      ${renderStatsDashboard(stats)}
    </div>
  `;

  // Attach event listeners
  attachProfileEventListeners();
}

function renderServicePlansPanel(servicePlans, stats) {
  const monthlyRevenue = servicePlans.reduce((sum, plan) => {
    return sum + (plan.base_price || 0) / getMonthsFromFrequency(plan.frequency);
  }, 0);
  const annualRevenue = monthlyRevenue * 12;

  return `
    <div class="service-plans-panel panel">
      <h2>Active Service Plans</h2>
      ${servicePlans.length > 0 ? `
        <div class="plans-grid">
          ${servicePlans.map(plan => `
            <div class="plan-card" data-boat-id="${plan.boat_id}">
              <strong>${plan.boat?.name || 'Unknown'}</strong>
              <div class="plan-details">
                ${formatFrequency(plan.frequency)} - ${plan.service_name}
              </div>
              ${plan.next_service_date ? `
                <div class="next-service">
                  Next: ${formatDate(plan.next_service_date)}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
        <div class="revenue-summary">
          <div class="stat">
            <label>Monthly Recurring</label>
            <value>$${monthlyRevenue.toFixed(2)}</value>
          </div>
          <div class="stat">
            <label>Annual Value</label>
            <value>$${annualRevenue.toFixed(2)}</value>
          </div>
        </div>
      ` : `
        <p>No active recurring service plans</p>
      `}
    </div>
  `;
}

function renderBoatsSection(boats) {
  return `
    <div class="boats-section panel">
      <h2>Boats (${boats.length})</h2>
      ${boats.length > 0 ? `
        <div class="boats-grid">
          ${boats.map(boat => `
            <div class="boat-card" data-boat-id="${boat.id}">
              <strong>${boat.name}</strong>
              ${boat.length ? `<div class="boat-length">${boat.length} ft</div>` : ''}
              ${boat.make && boat.model ? `<div class="boat-make">${boat.make} ${boat.model}</div>` : ''}
              ${boat.marina ? `<div class="boat-location">${boat.marina}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : `
        <p>No boats registered</p>
      `}
    </div>
  `;
}

function renderOrderHistory(orders) {
  return `
    <div class="order-history panel">
      <h2>Order History (${orders.length})</h2>
      ${orders.length > 0 ? `
        <div class="orders-table">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Service</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${orders.map(order => `
                <tr>
                  <td>${order.order_number}</td>
                  <td>${formatDate(order.created_at)}</td>
                  <td>${order.service_type}</td>
                  <td>$${(order.estimated_amount || 0).toFixed(2)}</td>
                  <td><span class="status-badge status-${order.status}">${order.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      ` : `
        <p>No order history</p>
      `}
    </div>
  `;
}

function renderNotesSection(customer) {
  return `
    <div class="notes-section panel">
      <h2>Notes</h2>
      <textarea id="customer-notes" rows="5">${customer.notes || ''}</textarea>
      <button class="btn btn-primary" onclick="window.saveCustomerNotes()">Save Notes</button>
    </div>
  `;
}

function renderStatsDashboard(stats) {
  if (!stats) {
    return '';
  }

  return `
    <div class="stats-dashboard panel">
      <h2>Service Statistics</h2>
      <div class="stats-grid">
        <div class="stat-card">
          <label>Total Services</label>
          <value>${stats.total_services || 0}</value>
        </div>
        <div class="stat-card">
          <label>Total Hours</label>
          <value>${(stats.total_hours || 0).toFixed(2)}</value>
        </div>
        <div class="stat-card">
          <label>Lifetime Value</label>
          <value>$${(stats.lifetime_value || 0).toFixed(2)}</value>
        </div>
        <div class="stat-card">
          <label>Last Service</label>
          <value>${stats.last_service_date ? formatDate(stats.last_service_date) : 'N/A'}</value>
        </div>
      </div>
    </div>
  `;
}

function attachProfileEventListeners() {
  // Boat cards click to open service history
  document.querySelectorAll('.boat-card').forEach(card => {
    card.addEventListener('click', () => {
      const boatId = card.dataset.boatId;
      // TODO: Open service history modal
      console.log('Open service history for boat:', boatId);
    });
  });

  // Plan cards click to open service history
  document.querySelectorAll('.plan-card').forEach(card => {
    card.addEventListener('click', () => {
      const boatId = card.dataset.boatId;
      // TODO: Open service history modal
      console.log('Open service history for boat:', boatId);
    });
  });
}

// Helper functions
function getMonthsFromFrequency(frequency) {
  const map = {
    'monthly': 1,
    'two_months': 2,
    'quarterly': 3,
    'biannual': 6,
    'one-time': 1
  };
  return map[frequency] || 1;
}

// Global functions for event handlers
window.composeEmail = function(email) {
  window.location.href = `mailto:${email}`;
};

window.editCustomer = function(customerId) {
  // TODO: Open customer edit form
  console.log('Edit customer:', customerId);
};

window.saveCustomerNotes = async function() {
  if (!currentCustomer) return;

  const notes = document.getElementById('customer-notes').value;

  try {
    const { error } = await window.app.supabase
      .from('customers')
      .update({ notes })
      .eq('id', currentCustomer.id);

    if (error) throw error;

    alert('Notes saved successfully');
  } catch (error) {
    console.error('Error saving notes:', error);
    alert('Failed to save notes');
  }
};
```

**Step 2: Commit**

```bash
git add sailorskills-operations/src/views/customer-profile.js
git commit -m "feat(ops): create customer profile view component"
```

---

### Task 17: Create Customer Profile Styles

**Files:**
- Create: `sailorskills-operations/src/styles/customer-profile.css`

**Step 1: Create stylesheet**

```css
/**
 * Customer Profile View Styles
 */

.customer-profile-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* Header */
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-color);
}

.profile-header h1 {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  color: var(--text-primary);
}

.contact-info {
  margin: 0.5rem 0;
  color: var(--text-secondary);
}

.contact-info a {
  color: var(--primary-color);
  text-decoration: none;
}

.contact-info a:hover {
  text-decoration: underline;
}

.account-meta {
  margin-top: 0.5rem;
  font-size: 0.9em;
  color: var(--text-secondary);
}

.quick-actions {
  display: flex;
  gap: 0.5rem;
}

/* Panels */
.panel {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.panel h2 {
  margin-top: 0;
  margin-bottom: 1rem;
  font-size: 1.5rem;
  color: var(--text-primary);
}

/* Service Plans Panel */
.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.plan-card {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.plan-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.plan-details {
  margin-top: 0.5rem;
  color: var(--text-secondary);
  font-size: 0.9em;
}

.next-service {
  margin-top: 0.5rem;
  font-size: 0.85em;
  color: var(--text-secondary);
}

.revenue-summary {
  display: flex;
  gap: 2rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 4px;
}

.revenue-summary .stat {
  flex: 1;
}

.revenue-summary label {
  display: block;
  font-size: 0.85em;
  color: var(--text-secondary);
  margin-bottom: 0.25rem;
}

.revenue-summary value {
  display: block;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
}

/* Boats Section */
.boats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1rem;
}

.boat-card {
  padding: 1rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  cursor: pointer;
  transition: box-shadow 0.2s;
}

.boat-card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}

.boat-length,
.boat-make,
.boat-location {
  margin-top: 0.25rem;
  font-size: 0.9em;
  color: var(--text-secondary);
}

/* Order History */
.orders-table {
  overflow-x: auto;
}

.orders-table table {
  width: 100%;
  border-collapse: collapse;
}

.orders-table th,
.orders-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid var(--border-color);
}

.orders-table th {
  background: var(--bg-secondary);
  font-weight: 600;
  color: var(--text-primary);
}

.orders-table tr:hover {
  background: var(--bg-tertiary);
}

/* Notes Section */
.notes-section textarea {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-family: inherit;
  font-size: 1rem;
  resize: vertical;
  margin-bottom: 1rem;
}

/* Stats Dashboard */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  text-align: center;
}

.stat-card label {
  display: block;
  font-size: 0.85em;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.stat-card value {
  display: block;
  font-size: 2rem;
  font-weight: 600;
  color: var(--primary-color);
}

/* Responsive */
@media (max-width: 768px) {
  .customer-profile-view {
    padding: 1rem;
  }

  .profile-header {
    flex-direction: column;
    gap: 1rem;
  }

  .quick-actions {
    width: 100%;
  }

  .quick-actions button {
    flex: 1;
  }

  .plans-grid,
  .boats-grid {
    grid-template-columns: 1fr;
  }

  .revenue-summary {
    flex-direction: column;
    gap: 1rem;
  }
}
```

**Step 2: Commit**

```bash
git add sailorskills-operations/src/styles/customer-profile.css
git commit -m "feat(ops): add customer profile view styles"
```

---

### Task 18: Add Customer Profile to Navigation

**Files:**
- Modify: `sailorskills-operations/src/navigation.js`
- Modify: `sailorskills-operations/index.html`

**Step 1: Import customer profile view in main.js**

Add import to main.js:

```javascript
import { initCustomerProfileView } from './views/customer-profile.js';
```

**Step 2: Add navigation entry**

Add to navigation config (if using structured navigation):

```javascript
{
  id: 'customer-profile',
  label: 'Customer Profile',
  icon: '👤',
  view: 'customer-profile',
  hidden: true // Only accessible via direct link
}
```

**Step 3: Add route handler**

Add route handling for customer profile view:

```javascript
case 'customer-profile':
  const customerId = getQueryParam('id');
  if (customerId) {
    await initCustomerProfileView(customerId);
  }
  break;
```

**Step 4: Add stylesheet link to index.html**

Add to `<head>` in index.html:

```html
<link rel="stylesheet" href="/src/styles/customer-profile.css">
```

**Step 5: Commit**

```bash
git add sailorskills-operations/src/navigation.js sailorskills-operations/index.html sailorskills-operations/src/main.js
git commit -m "feat(ops): integrate customer profile view into navigation"
```

---

### Task 19: Test Customer Profile View

**Files:**
- Test: Customer Profile View

**Step 1: Navigate to Customer Profile**

1. Open Operations (http://localhost:5173)
2. Navigate to Boats view
3. Click a customer name
4. Click "View Full Profile" button (if available) or manually navigate to `#customer-profile?id=<customer-id>`

Expected: Customer Profile view loads

**Step 2: Verify all sections render**

Check for:
- Header with customer name, email, phone
- Quick action buttons (Email, Edit)
- Active Service Plans panel with revenue summary
- Boats section with all boats
- Order history table
- Notes textarea
- Statistics dashboard

Expected: All sections display correctly

**Step 3: Test interactive elements**

1. Click boat card → Should navigate to service history
2. Click plan card → Should navigate to service history
3. Edit notes and click "Save Notes"
4. Click "Email" button → Should open mailto link
5. Test responsive layout (resize browser)

Expected: All interactions work correctly

**Step 4: Test with different customer types**

Test with:
- Customer with multiple boats and recurring services
- Customer with single boat
- Customer with no recurring services
- Customer with no orders yet

Expected: View handles all cases gracefully

**Step 5: Document test results**

Note any bugs or UI improvements needed.

---

## Phase 6: Integration Testing & Deployment

### Task 20: End-to-End Testing with Playwright

**Files:**
- Create: `sailorskills-operations/tests/recurring-interval-visibility.spec.js`

**Step 1: Create E2E test file**

```javascript
import { test, expect } from '@playwright/test';

test.describe('Recurring Service Interval Visibility', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to Operations
    await page.goto('http://localhost:5173');
    // Assume already logged in
  });

  test('Customer Modal shows service plans', async ({ page }) => {
    // Navigate to Boats view
    await page.click('text=Boats');

    // Click customer with recurring service
    await page.click('[data-customer-name="Test Customer"]');

    // Verify service plans section exists
    await expect(page.locator('.service-plans-section')).toBeVisible();
    await expect(page.locator('text=Active Service Plans')).toBeVisible();

    // Verify plan cards show interval
    await expect(page.locator('.service-plan-card')).toContainText('Every 2 months');
  });

  test('Service History Modal shows enhanced schedule', async ({ page }) => {
    await page.click('text=Boats');
    await page.click('[data-boat-id="test-boat-id"]');

    // Verify enhanced schedule display
    await expect(page.locator('.service-plan-badge')).toBeVisible();
    await expect(page.locator('text=2-mo')).toBeVisible();
    await expect(page.locator('text=Active since')).toBeVisible();
  });

  test('Boats table shows service plan column', async ({ page }) => {
    await page.click('text=Boats');

    // Verify column exists
    await expect(page.locator('th:has-text("Service Plan")')).toBeVisible();

    // Verify badges display
    await expect(page.locator('.service-plan-badge')).toHaveCount(3); // Assuming 3 recurring services
  });

  test('Service plan filtering works', async ({ page }) => {
    await page.click('text=Boats');

    const initialCount = await page.locator('.boat-row').count();

    // Filter by bi-monthly
    await page.selectOption('#service-plan-filter', 'two_months');

    const filteredCount = await page.locator('.boat-row').count();
    expect(filteredCount).toBeLessThan(initialCount);

    // Verify only bi-monthly services shown
    const badges = await page.locator('.service-plan-badge').allTextContents();
    badges.forEach(badge => {
      expect(badge).toContain('2-mo');
    });
  });

  test('Customer Profile view loads', async ({ page }) => {
    // Navigate to customer profile (assuming URL pattern)
    await page.goto('http://localhost:5173/#customer-profile?id=test-customer-id');

    // Verify profile sections
    await expect(page.locator('.customer-profile-view')).toBeVisible();
    await expect(page.locator('.service-plans-panel')).toBeVisible();
    await expect(page.locator('.boats-section')).toBeVisible();
    await expect(page.locator('.order-history')).toBeVisible();
    await expect(page.locator('.stats-dashboard')).toBeVisible();
  });
});
```

**Step 2: Run tests**

```bash
cd sailorskills-operations
npx playwright test tests/recurring-interval-visibility.spec.js
```

Expected: All tests pass

**Step 3: Fix any failing tests**

If tests fail, investigate and fix issues before proceeding.

**Step 4: Commit**

```bash
git add sailorskills-operations/tests/recurring-interval-visibility.spec.js
git commit -m "test(ops): add E2E tests for recurring interval visibility"
```

---

### Task 21: Test Email Templates in Production

**Files:**
- Test: Email templates via Estimator production flow

**Step 1: Deploy edge function to production**

```bash
cd sailorskills-shared
supabase functions deploy create-payment-intent --project-ref fzygakldvvzxmahkdylq --no-verify-jwt
```

Expected: Deployment successful

**Step 2: Test on production Estimator**

1. Navigate to https://diving.sailorskills.com
2. Complete full order flow for recurring service
3. Use test card: 4242 4242 4242 4242
4. Check customer confirmation email
5. Check admin notification email

Expected: Emails show correct interval formatting

**Step 3: Test all interval types in production**

Test orders with each interval:
- [ ] Monthly (1)
- [ ] Bi-monthly (2)
- [ ] Quarterly (3)
- [ ] Biannual (6)
- [ ] One-time

Expected: All intervals format correctly

**Step 4: Document production test results**

Note email delivery, formatting, and any issues.

---

### Task 22: Update Shared Package in All Services

**Files:**
- Modify: All service submodules that use sailorskills-shared

**Step 1: Update shared submodule in Operations**

```bash
cd sailorskills-operations/shared
git pull origin main
cd ..
git add shared
git commit -m "chore: update shared package with interval formatting"
```

**Step 2: Repeat for other services**

Update shared in:
- sailorskills-billing
- sailorskills-portal
- sailorskills-estimator
- sailorskills-settings

**Step 3: Test each service still builds**

For each service:
```bash
cd <service-directory>
npm run build
```

Expected: All services build successfully

**Step 4: Commit updates**

For each service:
```bash
git add shared
git commit -m "chore: update shared package"
```

---

### Task 23: Final Verification & Documentation

**Files:**
- Create: `docs/features/RECURRING_INTERVAL_VISIBILITY.md`

**Step 1: Create feature documentation**

```markdown
# Recurring Service Interval Visibility

**Implemented:** 2025-01-14
**Status:** ✅ Complete

## Overview

This feature enhances visibility of recurring service intervals across customer/admin emails and all Operations views, ensuring customers and the operations team always know the exact service frequency selected.

## Changes Implemented

### 1. Email Templates
- **Customer Confirmation:** Added "Service Frequency" row showing formatted interval
- **Admin Notification:** Updated "Service Type" to show "Recurring (every X months)"
- **Helper Function:** `formatServiceInterval()` for consistent formatting

**Files Modified:**
- `sailorskills-shared/supabase/functions/create-payment-intent/index.ts`

### 2. Operations - Customer Modal
- Added "Active Service Plans" section showing all recurring services
- Displays boat name, interval, service type, next service date
- Clickable cards navigate to Service History Modal

**Files Modified:**
- `sailorskills-operations/src/views/boats/modals/CustomerModal.js`
- `sailorskills-operations/src/utils/customer-service-plans.js` (new)

### 3. Operations - Service History Modal
- Enhanced service schedule section with prominent interval badge
- Added service type display
- Shows "Active since" date
- Improved layout with grid structure

**Files Modified:**
- `sailorskills-operations/src/views/boats/modals/ServiceHistoryModal.js`

### 4. Operations - Boats Table
- Added "Service Plan" column with interval badges
- Implemented sorting by service interval
- Added filtering by plan type (monthly, bi-monthly, etc.)
- Hover tooltips show next service date

**Files Modified:**
- `sailorskills-operations/src/views/boats.js`

### 5. Operations - Customer Profile View (NEW)
- Comprehensive customer information page
- Service plans overview with revenue projections
- Boats section
- Complete order history
- Customer notes (editable)
- Service statistics dashboard

**Files Created:**
- `sailorskills-operations/src/views/customer-profile.js`
- `sailorskills-operations/src/styles/customer-profile.css`

## Testing

### Manual Testing Completed
- [x] Customer confirmation emails show interval correctly
- [x] Admin notification emails show interval correctly
- [x] All interval types tested (1, 2, 3, 6, one-time)
- [x] Customer Modal displays service plans
- [x] Service History Modal shows enhanced schedule
- [x] Boats table shows service plan column
- [x] Boats table sorting works
- [x] Boats table filtering works
- [x] Customer Profile view loads correctly

### Playwright Tests
- E2E tests cover all major features
- Tests pass in local development
- Location: `sailorskills-operations/tests/recurring-interval-visibility.spec.js`

## Usage

### For Customers
- Check confirmation email for "Service Frequency" to verify selected interval
- Payment message includes interval reminder

### For Operations Team
- Check admin notification for complete order details including interval
- View Customer Modal for all active service plans across customer boats
- Use Boats table Service Plan column for quick reference
- Filter boats by service interval for route planning
- Access Customer Profile for comprehensive customer view

## Database Schema

**No schema changes required.** All data already exists in:
- `service_orders.service_interval`
- `service_schedules.interval_months`
- `customer_services.frequency`

## Configuration

No configuration changes required. Feature works with existing environment variables.

## Known Issues

None at launch.

## Future Enhancements

- Email customers before next service is due
- Automated service plan renewal reminders
- Customer self-service portal for plan management
- SMS notifications for upcoming services

## Maintenance

**Dependencies:**
- Supabase edge function: `create-payment-intent`
- Email service: Resend API
- Database tables: `customer_services`, `service_schedules`, `service_orders`

**Monitoring:**
- Check email delivery logs in Resend dashboard
- Monitor Operations UI for any display issues
- Verify queries remain performant as data grows

## Rollback Procedure

If issues arise:

1. **Email templates:** Revert edge function deployment
   ```bash
   cd sailorskills-shared
   git checkout <previous-commit>
   supabase functions deploy create-payment-intent
   ```

2. **Operations views:** Revert git commits
   ```bash
   cd sailorskills-operations
   git revert <commit-hash>
   npm run build
   vercel --prod
   ```

## Support

For issues or questions:
- Check Supabase logs for edge function errors
- Review browser console for Operations UI errors
- Contact development team

---

**Implemented by:** Claude Code
**Approved by:** Brian
**Deployed:** 2025-01-14
```

**Step 2: Commit documentation**

```bash
git add docs/features/RECURRING_INTERVAL_VISIBILITY.md
git commit -m "docs: add recurring interval visibility feature documentation"
```

---

### Task 24: Final Commit & Push

**Files:**
- All modified files in worktree

**Step 1: Verify all changes are committed**

```bash
git status
```

Expected: "nothing to commit, working tree clean"

**Step 2: Review commit history**

```bash
git log --oneline
```

Expected: Clean, descriptive commit messages following conventional commits

**Step 3: Push feature branch**

```bash
git push origin feature/recurring-interval-visibility
```

Expected: Branch pushed successfully

**Step 4: Document completion**

Note: Feature complete and ready for review/testing.

---

## Verification Checklist

Before marking complete, verify:

**Email Templates:**
- [ ] Customer confirmation shows "Service Frequency: [interval]"
- [ ] Admin notification shows "Service Type: Recurring ([interval])"
- [ ] All interval types format correctly
- [ ] One-time services show "One-time service"

**Customer Modal:**
- [ ] Active Service Plans section appears
- [ ] All recurring services listed
- [ ] Clicking plan opens Service History
- [ ] Empty state shows for no recurring services

**Service History Modal:**
- [ ] Interval badge displays prominently
- [ ] Service type shows correctly
- [ ] "Active since" date displays
- [ ] Layout is clean and organized

**Boats Table:**
- [ ] Service Plan column displays
- [ ] Badges show correct intervals (1-mo, 2-mo, etc.)
- [ ] Sorting by service plan works
- [ ] Filtering by plan type works
- [ ] Tooltips show next service date

**Customer Profile View:**
- [ ] Profile loads with all sections
- [ ] Service plans panel shows revenue
- [ ] Boats section displays all boats
- [ ] Order history table works
- [ ] Notes can be edited and saved
- [ ] Statistics display correctly
- [ ] Responsive layout works

**Testing:**
- [ ] Playwright tests pass
- [ ] Manual testing completed for all features
- [ ] Production deployment successful
- [ ] No console errors in browser
- [ ] No errors in Supabase logs

---

## Deployment Steps

### 1. Edge Function Deployment
```bash
cd sailorskills-shared
supabase functions deploy create-payment-intent --project-ref fzygakldvvzxmahkdylq
```

### 2. Operations Deployment
```bash
cd sailorskills-operations
npm run build
vercel --prod
```

### 3. Update Shared Package in Other Services
```bash
# For each service that uses shared package
cd <service-directory>
git submodule update --remote shared
git add shared
git commit -m "chore: update shared package"
npm run build
vercel --prod
```

---

## Success Metrics

**Customer Clarity:**
- Customers receive clear confirmation of selected interval
- Admin team sees complete order details in notification

**Operations Efficiency:**
- Team can quickly identify service intervals across views
- Customer Profile provides comprehensive overview
- Filtering and sorting improve workflow

**Data Integrity:**
- No database schema changes required
- All existing data displays correctly
- Consistent formatting across all views

---

**Plan Complete!**

Total estimated time: 8-12 hours
Organized into 24 bite-sized tasks with clear verification steps.

Ready for implementation using **superpowers:executing-plans** or **superpowers:subagent-driven-development**.
