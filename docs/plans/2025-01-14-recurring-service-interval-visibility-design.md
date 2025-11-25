# Recurring Service Interval Visibility - Design Document

**Date:** 2025-01-14
**Status:** Design Complete - Ready for Implementation
**Estimated Effort:** 8-12 hours
**Priority:** High - Customer communication clarity

---

## Problem Statement

When customers sign up for recurring services in the Estimator, they select a service interval (monthly, bi-monthly, quarterly, etc.). However, this critical information is not clearly communicated in:

1. **Customer confirmation emails** - Customers don't receive confirmation of their chosen interval
2. **Admin notification emails** - Operations team only sees "Recurring" vs "One-time", not the specific interval
3. **Operations Customer Modal** - No overview of service plans across all customer boats
4. **Operations Boats table** - Missing service interval column for quick reference
5. **Customer profile view** - No dedicated comprehensive customer view

This creates confusion about service expectations and makes it harder to manage recurring service schedules.

---

## Current State Analysis

### ✅ What's Working

**Data Capture:**
- Estimator checkout properly captures interval: '1', '2', '3', '6', or 'one-time'
- `create-payment-intent` edge function stores in multiple tables:
  - `service_orders.service_interval`
  - `service_schedules.interval_months` (converted: 1, 2, 3, 6)
  - `customer_services.frequency` (mapped: monthly, two_months, quarterly, biannual)

**Current Displays:**
- Pending Orders view: Shows interval correctly
- Service History Modal: Shows service schedule with interval

### ❌ What's Missing

**Email Communication:**
- Customer confirmation: No interval shown
- Admin notification: Only "Recurring" flag, not specific interval

**Operations Views:**
- Customer Modal: No service plan overview
- Boats table: Missing service interval column
- Customer Profile: View doesn't exist

---

## Design Solution

### Component 1: Email Template Enhancements

#### 1.1 Customer Confirmation Email

**Location:** `sailorskills-shared/supabase/functions/create-payment-intent/index.ts`
**Function:** `generateOrderConfirmationEmail()`

**Changes:**
1. Add new row to order details table after "Service":
   ```html
   <tr>
     <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Service Frequency:</td>
     <td style="padding: 12px; border: 1px solid #ddd;">${formatServiceInterval(serviceInterval)}</td>
   </tr>
   ```

2. Enhance payment message to include interval:
   - Current: "Your card is securely saved and will be charged after each service completion."
   - Enhanced: "Your card is securely saved and will be charged after each service completion (${formatServiceInterval(serviceInterval)})."

**New Parameter:**
- Add `serviceInterval` parameter to `generateOrderConfirmationEmail()`

#### 1.2 Admin Notification Email

**Location:** `sailorskills-shared/supabase/functions/create-payment-intent/index.ts`
**Function:** `generateAdminNotificationEmail()`

**Changes:**
1. Update "Service Type" row in order details:
   ```html
   <tr style="background-color: #f9f9f9;">
     <td style="padding: 12px; border: 1px solid #ddd; font-weight: bold;">Service Type:</td>
     <td style="padding: 12px; border: 1px solid #ddd;">${isRecurring ? `Recurring (${formatServiceInterval(serviceInterval)})` : 'One-time'}</td>
   </tr>
   ```

2. Add complete wizard data section showing:
   - Boat length (already shown)
   - Boat type (catamaran/monohull) - from `serviceDetails.boatType`
   - Hull type - from `serviceDetails.hullType`
   - Twin engines - from `serviceDetails.twinEngines`
   - Service details JSON (collapsible section for reference)

**New Parameters:**
- Add `serviceInterval` parameter
- Add `serviceDetails` parameter

#### 1.3 Shared Helper Function

**Location:** `sailorskills-shared/supabase/functions/create-payment-intent/index.ts`
**New Function:**

```typescript
function formatServiceInterval(interval: string): string {
  const intervalMap = {
    'one-time': 'One-time service',
    '1': 'Monthly (every month)',
    '2': 'Bi-monthly (every 2 months)',
    '3': 'Quarterly (every 3 months)',
    '6': 'Biannual (every 6 months)'
  };
  return intervalMap[interval] || 'One-time service';
}
```

**Usage:**
- Consistent formatting across customer and admin emails
- Maps raw interval codes to human-readable text
- Handles edge cases with fallback

---

### Component 2: Operations - Customer Modal Enhancement

**Location:** `sailorskills-operations/src/views/boats/modals/CustomerModal.js`

#### 2.1 New "Active Service Plans" Section

**Placement:** Between customer info and boats list

**Query:**
```javascript
const { data: servicePlans } = await window.app.supabase
  .from('customer_services')
  .select(`
    *,
    boat:boats(id, name, length)
  `)
  .eq('customer_id', stripeCustomerId)
  .eq('status', 'active')
  .order('created_at', { ascending: false });
```

**Fallback Query (if customer_services is empty):**
```javascript
const { data: schedules } = await window.app.supabase
  .from('service_schedules')
  .select(`
    *,
    boat:boats(id, name, length)
  `)
  .eq('customer_id', customerId)
  .order('next_service_date', { ascending: true });
```

#### 2.2 Service Plan Card Layout

```html
<div class="service-plans-section" style="background: var(--bg-secondary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
  <h4 style="margin-top: 0;">Active Service Plans (${servicePlans.length})</h4>

  ${servicePlans.length > 0 ? `
    <div class="service-plans-grid" style="display: grid; gap: 0.75rem;">
      ${servicePlans.map(plan => `
        <div class="service-plan-card"
             style="padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer;"
             data-boat-id="${plan.boat_id}"
             onclick="openServiceHistory('${plan.boat_id}', '${plan.boat.name}')">

          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1;">
              <strong>${plan.boat.name}</strong> (${plan.boat.length} ft)
              <div style="margin-top: 0.25rem; color: var(--text-secondary); font-size: 0.9em;">
                ${formatFrequency(plan.frequency)} - ${plan.service_name}
              </div>
            </div>
            <span class="status-badge status-${plan.status}">${plan.status}</span>
          </div>

          ${plan.next_service_date ? `
            <div style="margin-top: 0.5rem; font-size: 0.9em; color: var(--text-secondary);">
              Next service: ${formatDate(plan.next_service_date)}
            </div>
          ` : ''}
        </div>
      `).join('')}
    </div>
  ` : `
    <p style="color: var(--text-secondary); margin: 0.5rem 0;">
      No recurring service plans.
      <button class="btn btn-sm btn-primary" onclick="setupRecurringService()">Set up recurring service</button>
    </p>
  `}
</div>
```

#### 2.3 Helper Functions

**New utility:** `getCustomerServicePlans(customerId, stripeCustomerId)`
- Returns normalized service plan data
- Handles both customer_services and service_schedules
- Used across multiple views for consistency

**Frequency formatter:**
```javascript
function formatFrequency(frequency) {
  const frequencyMap = {
    'monthly': 'Monthly',
    'two_months': 'Every 2 months',
    'quarterly': 'Quarterly',
    'biannual': 'Every 6 months',
    'one-time': 'One-time'
  };
  return frequencyMap[frequency] || frequency;
}
```

---

### Component 3: Service History Modal Enhancement

**Location:** `sailorskills-operations/src/views/boats/modals/ServiceHistoryModal.js`

#### 3.1 Enhanced Service Schedule Section

**Current display:**
```html
<p><strong>Interval:</strong> ${serviceSchedule.service_interval}</p>
```

**Enhanced display:**
```html
<div class="service-plan-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
  <div>
    <h4 style="margin: 0 0 0.5rem 0;">Service Plan</h4>
    <div style="display: flex; gap: 1rem; align-items: center;">
      <span class="service-plan-badge" style="background: var(--primary-color); color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-weight: 600;">
        ${formatServiceInterval(serviceSchedule.interval_months)}
      </span>
      <span style="color: var(--text-secondary);">
        ${serviceSchedule.service_type || 'Recurring Cleaning & Anodes'}
      </span>
    </div>
  </div>
  <div style="text-align: right; font-size: 0.9em; color: var(--text-secondary);">
    Active since ${formatDate(serviceSchedule.created_at)}
  </div>
</div>
```

#### 3.2 Service Plan Status Indicator

Add status badges when plan is paused or cancelled:
```javascript
${serviceSchedule.status && serviceSchedule.status !== 'active' ? `
  <div class="status-alert" style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 0.75rem; margin-top: 0.5rem;">
    <strong>⚠️ Plan ${serviceSchedule.status}</strong>
    ${serviceSchedule.status_reason ? `<br><small>${serviceSchedule.status_reason}</small>` : ''}
  </div>
` : ''}
```

#### 3.3 Query Enhancement

Update service_schedules query to include service_type from original order:
```javascript
const { data: serviceSchedule } = await window.app.supabase
  .from('service_schedules')
  .select(`
    *,
    original_order:service_orders!service_schedules_order_id_fkey(service_type)
  `)
  .eq('boat_id', boatId)
  .maybeSingle();
```

---

### Component 4: Boats Table/List View Enhancement

**Location:** `sailorskills-operations/src/views/boats.js`

#### 4.1 New "Service Plan" Column

**Table Header:**
```html
<th class="sortable" data-sort="service_plan">Service Plan</th>
```

**Table Cell:**
```html
<td>
  ${boat.service_plan ? `
    <span class="service-plan-badge service-plan-${boat.service_plan.status}"
          title="Next service: ${formatDate(boat.service_plan.next_service_date)}">
      ${formatIntervalShort(boat.service_plan.frequency)}
    </span>
  ` : `
    <span style="color: var(--text-secondary); font-size: 0.9em;">One-time</span>
  `}
</td>
```

#### 4.2 Badge Styling

```css
/* Add to sailorskills-operations/src/styles/boats.css */

.service-plan-badge {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85em;
  font-weight: 600;
  cursor: help;
}

.service-plan-active {
  background: var(--status-active);
  color: white;
}

.service-plan-due-soon {
  background: var(--status-warning);
  color: var(--text-primary);
}

.service-plan-overdue {
  background: var(--status-error);
  color: white;
}
```

#### 4.3 Query Enhancement

Update boats query to include service plan data:
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

#### 4.4 Filter Enhancement

Add service plan filter:
```html
<select id="service-plan-filter">
  <option value="all">All Plans</option>
  <option value="monthly">Monthly</option>
  <option value="two_months">Bi-monthly</option>
  <option value="quarterly">Quarterly</option>
  <option value="biannual">Biannual</option>
  <option value="one-time">One-time only</option>
</select>
```

#### 4.5 Sort Logic

Add sorting by service interval:
```javascript
function sortByServicePlan(boats, ascending) {
  const planOrder = {
    'monthly': 1,
    'two_months': 2,
    'quarterly': 3,
    'biannual': 4,
    'one-time': 5
  };

  return boats.sort((a, b) => {
    const aVal = planOrder[a.service_plan?.frequency] || 999;
    const bVal = planOrder[b.service_plan?.frequency] || 999;
    return ascending ? aVal - bVal : bVal - aVal;
  });
}
```

---

### Component 5: Customer Profile View (New)

**Location:** `sailorskills-operations/src/views/customer-profile.js` (new file)

#### 5.1 Navigation Integration

**Add to navigation:** `sailorskills-operations/src/navigation.js`
```javascript
{
  id: 'customer-profile',
  label: 'Customer Profile',
  icon: '👤',
  view: 'customer-profile',
  hidden: true // Only accessible via direct link
}
```

**Access points:**
- Customer Modal: Add "View Full Profile" button
- Boats view: Click customer name opens profile
- Search: New customer search feature

#### 5.2 Profile Layout Structure

```html
<div class="customer-profile-view">
  <!-- Header Section -->
  <div class="profile-header">
    <div class="customer-info">
      <h1>${customer.name}</h1>
      <div class="contact-info">
        <a href="mailto:${customer.email}">${customer.email}</a> •
        <a href="tel:${customer.phone}">${customer.phone}</a>
      </div>
      <div class="account-meta">
        Customer since ${formatDate(customer.created_at)}
      </div>
    </div>
    <div class="quick-actions">
      <button class="btn btn-primary" onclick="composeEmail('${customer.email}')">
        📧 Email
      </button>
      <button class="btn btn-secondary" onclick="editCustomer('${customer.id}')">
        ✏️ Edit
      </button>
    </div>
  </div>

  <!-- Service Plans Panel -->
  <div class="service-plans-panel panel">
    <h2>Active Service Plans</h2>
    <div class="plans-grid">
      <!-- Service plan cards with timeline -->
    </div>
    <div class="revenue-summary">
      <div class="stat">
        <label>Monthly Recurring</label>
        <value>$${monthlyRevenue}</value>
      </div>
      <div class="stat">
        <label>Annual Value</label>
        <value>$${annualRevenue}</value>
      </div>
    </div>
  </div>

  <!-- Boats Section -->
  <div class="boats-section panel">
    <h2>Boats (${boats.length})</h2>
    <div class="boats-grid">
      <!-- Boat cards -->
    </div>
  </div>

  <!-- Order History -->
  <div class="order-history panel">
    <h2>Order History</h2>
    <div class="orders-table">
      <!-- Orders table with filters -->
    </div>
  </div>

  <!-- Notes & Communications -->
  <div class="notes-section panel">
    <h2>Notes</h2>
    <textarea id="customer-notes">${customer.notes}</textarea>
    <button onclick="saveNotes()">Save Notes</button>
  </div>

  <!-- Quick Stats Dashboard -->
  <div class="stats-dashboard panel">
    <h2>Service Statistics</h2>
    <div class="stats-grid">
      <div class="stat-card">
        <label>Total Services</label>
        <value>${stats.total_services}</value>
      </div>
      <div class="stat-card">
        <label>Total Hours</label>
        <value>${stats.total_hours}</value>
      </div>
      <div class="stat-card">
        <label>Lifetime Value</label>
        <value>$${stats.lifetime_value}</value>
      </div>
      <div class="stat-card">
        <label>Last Service</label>
        <value>${formatDate(stats.last_service_date)}</value>
      </div>
    </div>
  </div>
</div>
```

#### 5.3 Data Loading

**Main query:**
```javascript
async function loadCustomerProfile(customerId) {
  // Customer data
  const { data: customer } = await window.app.supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  // Service plans
  const { data: servicePlans } = await window.app.supabase
    .from('customer_services')
    .select(`
      *,
      boat:boats(*)
    `)
    .eq('customer_id', customer.stripe_customer_id)
    .order('created_at', { ascending: false });

  // Boats
  const { data: boats } = await window.app.supabase
    .from('boats')
    .select('*')
    .eq('customer_id', customerId)
    .order('name');

  // Orders
  const { data: orders } = await window.app.supabase
    .from('service_orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  // Statistics
  const { data: stats } = await window.app.supabase
    .rpc('get_customer_statistics', { customer_id_param: customerId });

  return { customer, servicePlans, boats, orders, stats };
}
```

#### 5.4 Styling

**New file:** `sailorskills-operations/src/styles/customer-profile.css`

```css
.customer-profile-view {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--border-color);
}

.panel {
  background: white;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.stat-card {
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  text-align: center;
}

/* More styling... */
```

---

## Implementation Order

### Phase 1: Email Enhancements (2-3 hours)
1. Add `formatServiceInterval()` helper function
2. Update `generateOrderConfirmationEmail()` - add interval parameter and display
3. Update `generateAdminNotificationEmail()` - add interval and service details
4. Update edge function calls to pass interval
5. Test with all interval types ('1', '2', '3', '6', 'one-time')

### Phase 2: Customer Modal (2 hours)
1. Create `getCustomerServicePlans()` utility function
2. Add service plans section to Customer Modal
3. Implement service plan cards with click-to-detail
4. Test with customers having multiple boats and plans

### Phase 3: Service History Modal (1 hour)
1. Enhance schedule section display
2. Add status indicators
3. Update query to include service_type
4. Test display with active/paused/cancelled plans

### Phase 4: Boats Table (2 hours)
1. Add service_plan column to query
2. Implement service plan badge display
3. Add sorting and filtering logic
4. Style badges with status colors
5. Test with large boat lists

### Phase 5: Customer Profile View (3-4 hours)
1. Create new view file and styles
2. Implement data loading functions
3. Build profile layout components
4. Add navigation integration
5. Implement statistics calculation
6. Test complete profile functionality

---

## Database Schema Notes

### Existing Tables Used

**service_orders:**
- `service_interval` VARCHAR - '1', '2', '3', '6', 'one-time'
- Already populated correctly

**service_schedules:**
- `interval_months` INTEGER - 1, 2, 3, 6
- Converted from service_interval

**customer_services:**
- `frequency` VARCHAR - 'monthly', 'two_months', 'quarterly', 'biannual', 'one-time'
- Maps to human-readable frequencies

### No Schema Changes Required

All necessary data already exists in the database. Implementation is purely frontend/email template changes and new views.

---

## Testing Checklist

### Email Testing
- [ ] Customer confirmation email shows interval for each type (1-mo, 2-mo, 3-mo, 6-mo)
- [ ] Admin notification shows "Recurring (every X months)"
- [ ] One-time service shows "One-time service"
- [ ] Email formatting is correct in all email clients
- [ ] Service details appear in admin email

### Customer Modal Testing
- [ ] Service plans section displays for customers with recurring services
- [ ] Multiple boats show all service plans
- [ ] Clicking plan card opens Service History Modal
- [ ] Customers with no plans show appropriate message
- [ ] Status badges display correctly

### Service History Modal Testing
- [ ] Enhanced schedule section shows interval prominently
- [ ] Service type displays correctly
- [ ] Status indicators work for paused/cancelled plans
- [ ] Created date shows correctly

### Boats Table Testing
- [ ] Service plan column displays correctly
- [ ] Badges show correct interval
- [ ] Tooltip shows next service date
- [ ] Sorting by service plan works
- [ ] Filtering by plan type works
- [ ] Color coding reflects status correctly

### Customer Profile Testing
- [ ] Profile loads all customer data correctly
- [ ] Service plans panel shows active plans
- [ ] Revenue calculations accurate
- [ ] Boats section displays all boats
- [ ] Order history shows complete history
- [ ] Notes save correctly
- [ ] Statistics calculate correctly
- [ ] Navigation from other views works

---

## Success Criteria

✅ Customer confirmation emails clearly state service interval
✅ Admin notification emails show complete order information including interval
✅ Operations team can see service plans at a glance in Customer Modal
✅ Boats table provides quick reference for service intervals
✅ Customer Profile view provides comprehensive customer overview
✅ All interval information is consistent across all views
✅ No database schema changes required
✅ Implementation completed within 8-12 hour estimate

---

## Future Enhancements (Out of Scope)

- Email customers when their next service is due
- Automated service plan renewal reminders
- Customer self-service portal to view/modify plans
- Predictive analytics for service timing
- Integration with calendar for automatic scheduling
- SMS notifications for service plans

---

## Questions Resolved During Design

1. **Q:** What interval format for emails?
   **A:** "Recurring (every 2 months)" - Combined format

2. **Q:** Where to display service plans in Operations?
   **A:** All locations - Customer Modal, Service History, Boats table, and new Customer Profile

3. **Q:** Quick fix or comprehensive?
   **A:** Comprehensive overhaul (8-12 hours)

4. **Q:** Create Customer Profile view?
   **A:** Yes - comprehensive customer view with all information

---

**Design Status:** ✅ Complete and Validated
**Ready for:** Implementation Planning
**Next Step:** Create git worktree and implementation plan
