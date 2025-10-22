# Pending Orders Queue - Implementation Prompts

**Feature:** Pending Orders Queue & Confirmation Workflow
**Service:** sailorskills-operations
**Priority:** High (Critical workflow gap)
**Estimated Effort:** 1-2 days

---

## Overview

Create a dedicated "Pending Orders" inbox to manage incoming orders from the Estimator service. Currently, orders go straight to the calendar without a confirmation step. This feature adds proper order intake workflow with confirmation, scheduling, and status management.

---

## Architecture Context

**Data Flow:**
```
Estimator (creates order)
  → service_orders table (status='pending')
    → Operations Pending Orders View (NEW)
      → Confirm & Schedule → status='confirmed', set scheduled_date
        → Appears in Calendar/Schedule view
```

**Database:**
- Table: `service_orders` (already exists in `/database/COMPLETE-SETUP.sql:289-296`)
- Current schema:
  ```sql
  CREATE TABLE service_orders (
    id UUID PRIMARY KEY,
    boat_id UUID REFERENCES boats(id),
    scheduled_date DATE NOT NULL,
    service_type TEXT NOT NULL,
    status TEXT DEFAULT 'confirmed',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  ```

**Required Enhancements:**
1. Expand `status` column to support: `pending`, `confirmed`, `in_progress`, `completed`, `declined`
2. Add optional fields: `estimated_amount DECIMAL(10,2)`, `order_number TEXT`, `customer_notes TEXT`
3. Handle `scheduled_date` as nullable for pending orders

---

## Implementation Prompts

### PROMPT 1: Database Schema Updates

**Agent Type:** general-purpose
**Task:** Update service_orders table schema to support pending orders workflow

**Prompt:**
```
You are implementing database schema changes for the Pending Orders Queue feature in sailorskills-operations.

CONTEXT:
- Working directory: /Users/brian/app-development/sailorskills-repos/sailorskills-operations
- Database: Supabase PostgreSQL
- Existing table: service_orders (see database/COMPLETE-SETUP.sql:289-296)

TASK:
Create a new migration file: database/migration-pending-orders-schema.sql

REQUIREMENTS:

1. ALTER service_orders table:
   - Make scheduled_date nullable (pending orders don't have dates yet)
   - Add status check constraint: CHECK (status IN ('pending', 'confirmed', 'in_progress', 'completed', 'declined'))
   - Add estimated_amount DECIMAL(10,2) (optional, from Estimator)
   - Add order_number TEXT (optional, human-readable order ID like "ORD-2025-001")
   - Add customer_notes TEXT (optional, special requests from customer)
   - Add confirmed_at TIMESTAMPTZ (timestamp when status changed to confirmed)
   - Add confirmed_by TEXT (admin user who confirmed, future use)

2. Create indexes:
   - idx_service_orders_status ON service_orders(status)
   - idx_service_orders_scheduled_date ON service_orders(scheduled_date) WHERE scheduled_date IS NOT NULL
   - idx_service_orders_created_at ON service_orders(created_at DESC)

3. Update existing orders:
   - Set status='confirmed' for any orders with NULL status
   - Set confirmed_at=created_at for existing confirmed orders

4. Add RLS policies (if not already exist):
   - Public can view confirmed/completed orders only
   - Service role can insert/update all orders

5. Create helper function:
   - generate_order_number() - generates sequential order numbers like "ORD-2025-001"

FOLLOW THESE PATTERNS:
- Use IF NOT EXISTS / IF EXISTS checks (idempotent migrations)
- Use DO $$ blocks for conditional logic
- Add helpful comments
- Follow existing migration file patterns in database/ directory

VALIDATION:
After creating the file, output SQL that can be run in Supabase SQL Editor to:
1. Verify new columns exist
2. Check constraint is applied
3. Indexes created
4. Sample insert with status='pending' works

DO NOT:
- Drop existing data
- Remove columns
- Change primary keys or foreign keys

DELIVERABLE:
- File: /Users/brian/app-development/sailorskills-repos/sailorskills-operations/database/migration-pending-orders-schema.sql
- Ready to run in Supabase SQL Editor
```

---

### PROMPT 2: Pending Orders View - HTML & Navigation

**Agent Type:** general-purpose
**Task:** Create the Pending Orders view structure and integrate into navigation

**Prompt:**
```
You are implementing the Pending Orders Queue view UI for sailorskills-operations.

CONTEXT:
- Working directory: /Users/brian/app-development/sailorskills-repos/sailorskills-operations
- Tech stack: Vanilla JavaScript, Vite, Supabase
- Architecture: Hash-based routing (#dashboard, #boats, etc.)
- See exploration summary for patterns: Navigation (src/navigation.js), Views (src/views/*)

TASK:
Create Pending Orders view and integrate into navigation

STEP 1: Add navigation link
File: index.html

Find the <nav class="sub-nav"> section and add new link AFTER #dashboard and BEFORE #boats:

```html
<a href="#pending-orders" class="nav-link">
  <span class="nav-icon">📥</span>
  Pending Orders
  <span id="pending-count-badge" class="badge badge-warning" style="display: none;">0</span>
</a>
```

STEP 2: Add view container
File: index.html

Add new view section in <main class="main-content"> AFTER #dashboard-view:

```html
<section id="pending-orders-view" class="view">
  <div class="view-header">
    <h1>Pending Orders</h1>
    <p class="view-description">Review and confirm incoming service orders</p>
  </div>

  <div id="pending-orders-filters" class="filters-bar">
    <input
      type="text"
      id="pending-orders-search"
      class="form-control"
      placeholder="Search by boat or customer name..."
    >
    <select id="pending-orders-service-filter" class="form-control">
      <option value="">All Service Types</option>
      <option value="Bottom Cleaning">Bottom Cleaning</option>
      <option value="Anode Replacement">Anode Replacement</option>
      <option value="Propeller Service">Propeller Service</option>
      <option value="Full Service">Full Service</option>
    </select>
    <select id="pending-orders-sort" class="form-control">
      <option value="created_desc">Newest First</option>
      <option value="created_asc">Oldest First</option>
      <option value="amount_desc">Highest Amount</option>
      <option value="amount_asc">Lowest Amount</option>
    </select>
  </div>

  <div id="pending-orders-empty-state" style="display: none;" class="empty-state">
    <h3>No Pending Orders</h3>
    <p>All orders have been processed. New orders from the Estimator will appear here.</p>
  </div>

  <div id="pending-orders-container" class="orders-grid">
    <!-- Order cards will be rendered here -->
  </div>

  <div id="pending-orders-loading" class="loading-spinner">
    <span>Loading orders...</span>
  </div>
</section>
```

STEP 3: Add navigation handler
File: src/main.js

Add to the navigation event listener section (after existing view listeners):

```javascript
// Pending Orders view
const pendingOrdersLink = document.querySelector('.sub-nav a[href="#pending-orders"]');
if (pendingOrdersLink) {
  pendingOrdersLink.addEventListener('click', () => {
    setTimeout(() => {
      initPendingOrdersView();
    }, 100);
  });
}
```

STEP 4: Update route handler
File: src/navigation.js

Add 'pending-orders' to the switchView cases (if not auto-handled by existing code).

STEP 5: Add to index
File: src/main.js

Add import at top:
```javascript
import { initPendingOrdersView } from './views/pending-orders.js';
```

Add to initial route handler (for direct navigation):
```javascript
if (window.location.hash === '#pending-orders') {
  initPendingOrdersView();
}
```

STEP 6: Add badge update function
File: src/main.js

Add global function to update pending count badge:
```javascript
// Update pending orders badge
window.app.updatePendingOrdersBadge = async function() {
  try {
    const { count, error } = await window.app.supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    const badge = document.getElementById('pending-count-badge');
    if (badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
      }
    }
  } catch (error) {
    console.error('Failed to update pending orders badge:', error);
  }
};

// Call on app init
window.app.updatePendingOrdersBadge();

// Refresh badge every 60 seconds
setInterval(() => window.app.updatePendingOrdersBadge(), 60000);
```

DELIVERABLES:
- Updated index.html with navigation link and view container
- Updated src/main.js with navigation handler and badge function
- Updated src/navigation.js if needed
- Navigation functional (clicking link shows empty view)

VALIDATION:
1. Start dev server: npm run dev
2. Click "Pending Orders" link
3. View should activate (no errors in console)
4. Badge should show/hide based on pending count
```

---

### PROMPT 3: Pending Orders View Logic - Data Fetching & Rendering

**Agent Type:** general-purpose
**Task:** Implement the Pending Orders view JavaScript logic

**Prompt:**
```
You are implementing the Pending Orders Queue view logic for sailorskills-operations.

CONTEXT:
- Working directory: /Users/brian/app-development/sailorskills-repos/sailorskills-operations
- Database: Supabase, service_orders table with boat relationship
- Patterns: See views/boats.js, views/dashboard.js for data fetching patterns
- Global Supabase: window.app.supabase

TASK:
Create src/views/pending-orders.js with full view logic

REQUIREMENTS:

1. EXPORTS:
   - initPendingOrdersView() - Main initialization function
   - refreshPendingOrders() - Reload data (called after actions)

2. DATA FETCHING:
   ```javascript
   async function fetchPendingOrders() {
     const { data: orders, error } = await window.app.supabase
       .from('service_orders')
       .select(`
         *,
         boat:boats (
           id,
           boat_name,
           customer_name,
           boat_type,
           marina_location,
           boat_length_ft
         )
       `)
       .eq('status', 'pending')
       .order('created_at', { ascending: false });

     if (error) throw error;
     return orders || [];
   }
   ```

3. RENDER ORDER CARDS:
   Each order should display as a card with:
   - Order number (if available) or "New Order"
   - Boat name (linked to boat detail)
   - Customer name
   - Service type (with icon or badge)
   - Estimated amount (if available, formatted as currency)
   - Created date (formatted as "2 days ago" or "Jan 15, 2025")
   - Customer notes (if any)
   - Action buttons: "View Details", "Confirm & Schedule", "Decline"

   Card HTML structure:
   ```html
   <div class="order-card" data-order-id="${order.id}">
     <div class="order-header">
       <h3 class="order-number">${order.order_number || 'New Order'}</h3>
       <span class="order-age">${formatTimeAgo(order.created_at)}</span>
     </div>
     <div class="order-details">
       <div class="order-boat">
         <strong>${order.boat.boat_name}</strong>
         <span class="boat-info">${order.boat.boat_type} • ${order.boat.boat_length_ft}ft</span>
       </div>
       <div class="order-customer">
         <span class="label">Customer:</span> ${order.boat.customer_name}
       </div>
       <div class="order-service">
         <span class="label">Service:</span>
         <span class="badge badge-info">${order.service_type}</span>
       </div>
       ${order.estimated_amount ? `
         <div class="order-amount">
           <span class="label">Estimated:</span>
           <strong>$${order.estimated_amount.toFixed(2)}</strong>
         </div>
       ` : ''}
       ${order.customer_notes ? `
         <div class="order-notes">
           <span class="label">Notes:</span> ${order.customer_notes}
         </div>
       ` : ''}
     </div>
     <div class="order-actions">
       <button class="btn btn-secondary btn-view-details" data-order-id="${order.id}">
         View Details
       </button>
       <button class="btn btn-primary btn-confirm-schedule" data-order-id="${order.id}">
         Confirm & Schedule
       </button>
       <button class="btn btn-danger-outline btn-decline" data-order-id="${order.id}">
         Decline
       </button>
     </div>
   </div>
   ```

4. FILTERING & SORTING:
   - Search: Filter by boat name or customer name (case-insensitive)
   - Service type filter: Show only selected service type
   - Sort: created_desc, created_asc, amount_desc, amount_asc
   - Update URL params to persist filters (optional)

5. EMPTY STATE:
   - Show #pending-orders-empty-state when no orders match filters
   - Hide #pending-orders-loading after data loads

6. EVENT HANDLERS:
   - Search input: Debounce 300ms, re-render with filters
   - Service filter: Immediate re-render
   - Sort dropdown: Immediate re-render
   - "View Details": Open order detail modal (stub for now, call openOrderDetailModal(orderId))
   - "Confirm & Schedule": Open schedule modal (stub for now, call openConfirmScheduleModal(orderId))
   - "Decline": Open decline confirmation (call handleDeclineOrder(orderId))

7. HELPER FUNCTIONS:
   ```javascript
   function formatTimeAgo(timestamp) {
     const now = new Date();
     const created = new Date(timestamp);
     const diffMs = now - created;
     const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
     const diffDays = Math.floor(diffHours / 24);

     if (diffHours < 1) return 'Just now';
     if (diffHours < 24) return `${diffHours}h ago`;
     if (diffDays === 1) return 'Yesterday';
     return `${diffDays} days ago`;
   }

   function formatCurrency(amount) {
     return new Intl.NumberFormat('en-US', {
       style: 'currency',
       currency: 'USD'
     }).format(amount);
   }
   ```

8. ERROR HANDLING:
   - Try/catch around fetchPendingOrders
   - Show toast error if fetch fails: showError('Failed to load pending orders')
   - Log errors to console for debugging

9. INITIALIZATION:
   ```javascript
   export async function initPendingOrdersView() {
     try {
       showLoadingState();
       await loadPendingOrders();
       setupEventHandlers();
       hideLoadingState();
     } catch (error) {
       console.error('Init pending orders view error:', error);
       showError('Failed to initialize pending orders view');
     }
   }
   ```

FOLLOW PATTERNS FROM:
- src/views/boats.js (list rendering, filtering, sorting)
- src/views/dashboard.js (data fetching, error handling)

USE COMPONENTS:
- Toast notifications: import { showSuccess, showError } from '../components/toast.js'
- Modals: import { openModal, closeModal } from '../components/modal.js'
- Confirm dialog: import { confirmDialog } from '../components/confirm-dialog.js'

DELIVERABLES:
- File: /Users/brian/app-development/sailorskills-repos/sailorskills-operations/src/views/pending-orders.js
- Fully functional view with data fetching, rendering, filtering, sorting
- Event handlers stubbed for modals (implement in next prompt)

VALIDATION:
1. View loads pending orders from database
2. Cards render correctly with all fields
3. Filters and sort work
4. Empty state shows when no orders
5. Clicking buttons triggers console.log (stub actions)
```

---

### PROMPT 4: Order Detail Modal

**Agent Type:** general-purpose
**Task:** Implement the order detail modal component

**Prompt:**
```
You are implementing the Order Detail Modal for the Pending Orders Queue in sailorskills-operations.

CONTEXT:
- Working directory: /Users/brian/app-development/sailorskills-repos/sailorskills-operations
- Modal system: src/components/modal.js (openModal, closeModal functions)
- Data source: service_orders table + boat relationship

TASK:
Implement openOrderDetailModal(orderId) function in src/views/pending-orders.js

REQUIREMENTS:

1. FUNCTION SIGNATURE:
   ```javascript
   async function openOrderDetailModal(orderId)
   ```

2. DATA FETCHING:
   Fetch order with full boat details:
   ```javascript
   const { data: order, error } = await window.app.supabase
     .from('service_orders')
     .select(`
       *,
       boat:boats (
         id,
         boat_name,
         customer_name,
         customer_email,
         customer_phone,
         boat_type,
         hull_type,
         boat_length_ft,
         boat_year,
         marina_location,
         dock_number,
         slug
       )
     `)
     .eq('id', orderId)
     .single();
   ```

3. MODAL CONTENT:
   Display comprehensive order information in organized sections:

   ```html
   <div class="order-detail-modal">
     <div class="order-detail-section">
       <h3>Order Information</h3>
       <div class="detail-row">
         <span class="label">Order Number:</span>
         <span>${order.order_number || 'N/A'}</span>
       </div>
       <div class="detail-row">
         <span class="label">Status:</span>
         <span class="badge badge-${getStatusBadgeClass(order.status)}">${order.status}</span>
       </div>
       <div class="detail-row">
         <span class="label">Service Type:</span>
         <span>${order.service_type}</span>
       </div>
       <div class="detail-row">
         <span class="label">Estimated Amount:</span>
         <span>${order.estimated_amount ? formatCurrency(order.estimated_amount) : 'Not specified'}</span>
       </div>
       <div class="detail-row">
         <span class="label">Created:</span>
         <span>${formatDate(order.created_at)}</span>
       </div>
       ${order.customer_notes ? `
         <div class="detail-row">
           <span class="label">Customer Notes:</span>
           <p class="notes-text">${order.customer_notes}</p>
         </div>
       ` : ''}
     </div>

     <div class="order-detail-section">
       <h3>Boat Information</h3>
       <div class="detail-row">
         <span class="label">Boat Name:</span>
         <span><strong>${order.boat.boat_name}</strong></span>
       </div>
       <div class="detail-row">
         <span class="label">Type:</span>
         <span>${order.boat.boat_type} (${order.boat.hull_type})</span>
       </div>
       <div class="detail-row">
         <span class="label">Length:</span>
         <span>${order.boat.boat_length_ft} ft</span>
       </div>
       <div class="detail-row">
         <span class="label">Year:</span>
         <span>${order.boat.boat_year || 'N/A'}</span>
       </div>
       <div class="detail-row">
         <span class="label">Location:</span>
         <span>${order.boat.marina_location}${order.boat.dock_number ? ` - Dock ${order.boat.dock_number}` : ''}</span>
       </div>
     </div>

     <div class="order-detail-section">
       <h3>Customer Information</h3>
       <div class="detail-row">
         <span class="label">Name:</span>
         <span>${order.boat.customer_name}</span>
       </div>
       ${order.boat.customer_email ? `
         <div class="detail-row">
           <span class="label">Email:</span>
           <span><a href="mailto:${order.boat.customer_email}">${order.boat.customer_email}</a></span>
         </div>
       ` : ''}
       ${order.boat.customer_phone ? `
         <div class="detail-row">
           <span class="label">Phone:</span>
           <span><a href="tel:${order.boat.customer_phone}">${order.boat.customer_phone}</a></span>
         </div>
       ` : ''}
     </div>

     <div class="order-detail-actions">
       <button class="btn btn-secondary" onclick="window.app.viewBoatHistory('${order.boat.id}')">
         View Boat History
       </button>
       <button class="btn btn-primary" onclick="window.app.confirmScheduleFromDetail('${order.id}')">
         Confirm & Schedule
       </button>
     </div>
   </div>
   ```

4. MODAL CONFIGURATION:
   ```javascript
   await openModal('Order Details', content, {
     size: 'large',
     closeOnOverlay: true
   });
   ```

5. HELPER FUNCTIONS:
   ```javascript
   function getStatusBadgeClass(status) {
     const classes = {
       'pending': 'warning',
       'confirmed': 'success',
       'in_progress': 'info',
       'completed': 'success',
       'declined': 'danger'
     };
     return classes[status] || 'secondary';
   }

   function formatDate(dateString) {
     return new Date(dateString).toLocaleDateString('en-US', {
       year: 'numeric',
       month: 'long',
       day: 'numeric',
       hour: '2-digit',
       minute: '2-digit'
     });
   }
   ```

6. GLOBAL FUNCTIONS:
   Expose functions for button actions:
   ```javascript
   window.app.viewBoatHistory = function(boatId) {
     closeModal();
     // Navigate to boats view and open boat detail
     window.location.hash = '#boats';
     setTimeout(() => {
       if (window.app.boats && window.app.boats.showBoatDetail) {
         window.app.boats.showBoatDetail(boatId);
       }
     }, 200);
   };

   window.app.confirmScheduleFromDetail = function(orderId) {
     closeModal();
     openConfirmScheduleModal(orderId);
   };
   ```

7. ERROR HANDLING:
   - Handle order not found
   - Handle missing boat data
   - Show user-friendly error modal if data fetch fails

DELIVERABLES:
- Implemented openOrderDetailModal() in src/views/pending-orders.js
- Modal displays all order, boat, and customer information
- Action buttons functional (navigate to boat history, open schedule modal)

VALIDATION:
1. Click "View Details" on any pending order
2. Modal opens with complete information
3. "View Boat History" navigates correctly
4. "Confirm & Schedule" opens schedule modal
```

---

### PROMPT 5: Confirm & Schedule Modal

**Agent Type:** general-purpose
**Task:** Implement the Confirm & Schedule workflow modal

**Prompt:**
```
You are implementing the Confirm & Schedule Modal for the Pending Orders Queue in sailorskills-operations.

CONTEXT:
- Working directory: /Users/brian/app-development/sailorskills-repos/sailorskills-operations
- Modal system: src/components/modal.js (openFormModal function)
- Goal: Confirm order and set scheduled_date, update status to 'confirmed'

TASK:
Implement openConfirmScheduleModal(orderId) function in src/views/pending-orders.js

REQUIREMENTS:

1. FUNCTION SIGNATURE:
   ```javascript
   async function openConfirmScheduleModal(orderId)
   ```

2. DATA FETCHING:
   Fetch order with boat name for context:
   ```javascript
   const { data: order, error } = await window.app.supabase
     .from('service_orders')
     .select('*, boat:boats(boat_name, customer_name)')
     .eq('id', orderId)
     .single();
   ```

3. FORM CONTENT:
   Date picker with context information:
   ```html
   <div class="confirm-schedule-form">
     <div class="order-context">
       <p><strong>Boat:</strong> ${order.boat.boat_name}</p>
       <p><strong>Customer:</strong> ${order.boat.customer_name}</p>
       <p><strong>Service:</strong> ${order.service_type}</p>
     </div>

     <div class="form-group">
       <label for="scheduled-date">Schedule Service Date <span class="required">*</span></label>
       <input
         type="date"
         id="scheduled-date"
         name="scheduled_date"
         class="form-control"
         min="${new Date().toISOString().split('T')[0]}"
         required
       >
       <small class="form-hint">Select the date when this service will be performed</small>
     </div>

     <div class="form-group">
       <label for="admin-notes">Admin Notes (Optional)</label>
       <textarea
         id="admin-notes"
         name="admin_notes"
         class="form-control"
         rows="3"
         placeholder="Internal notes about this scheduling..."
       ></textarea>
     </div>

     <div class="form-group">
       <label>
         <input type="checkbox" name="send_confirmation" checked>
         Send confirmation email to customer
       </label>
     </div>
   </div>
   ```

4. FORM SUBMISSION:
   ```javascript
   const { modal, form } = await openFormModal(
     'Confirm & Schedule Service',
     formContent,
     {
       size: 'medium',
       onSubmit: async (form, modal) => {
         const formData = new FormData(form);
         const scheduledDate = formData.get('scheduled_date');
         const adminNotes = formData.get('admin_notes');
         const sendConfirmation = formData.get('send_confirmation') === 'on';

         if (!scheduledDate) {
           showError('Please select a scheduled date');
           return;
         }

         try {
           // Update order status and scheduled_date
           const { error: updateError } = await window.app.supabase
             .from('service_orders')
             .update({
               status: 'confirmed',
               scheduled_date: scheduledDate,
               confirmed_at: new Date().toISOString(),
               confirmed_by: 'admin', // TODO: Get actual user from auth
               admin_notes: adminNotes || null
             })
             .eq('id', orderId);

           if (updateError) throw updateError;

           // TODO: Send confirmation email if checked
           if (sendConfirmation) {
             console.log('TODO: Send confirmation email');
             // await sendOrderConfirmationEmail(order, scheduledDate);
           }

           await closeModal();
           showSuccess(`Order confirmed and scheduled for ${formatDate(scheduledDate)}`);

           // Refresh views
           await refreshPendingOrders();
           await window.app.updatePendingOrdersBadge();

           // Optionally navigate to schedule view
           // window.location.hash = '#schedule';

         } catch (error) {
           console.error('Confirm schedule error:', error);
           showError('Failed to confirm order. Please try again.');
         }
       }
     }
   );
   ```

5. CONFLICT DETECTION (ENHANCEMENT):
   Before showing the form, check for scheduling conflicts:
   ```javascript
   async function checkSchedulingConflicts(date) {
     const { data: existingOrders, error } = await window.app.supabase
       .from('service_orders')
       .select('id, boat:boats(boat_name)')
       .eq('scheduled_date', date)
       .eq('status', 'confirmed');

     if (existingOrders && existingOrders.length > 0) {
       return {
         hasConflicts: true,
         count: existingOrders.length,
         boats: existingOrders.map(o => o.boat.boat_name)
       };
     }
     return { hasConflicts: false };
   }
   ```

   Add warning to form if conflicts exist:
   ```html
   ${conflicts.hasConflicts ? `
     <div class="alert alert-warning">
       ⚠️ ${conflicts.count} service(s) already scheduled for this date:
       ${conflicts.boats.join(', ')}
     </div>
   ` : ''}
   ```

6. CALENDAR INTEGRATION:
   Add button to view schedule:
   ```html
   <div class="form-helper">
     <button type="button" class="btn btn-link" onclick="window.app.openScheduleCalendar()">
       View Schedule Calendar
     </button>
   </div>
   ```

   ```javascript
   window.app.openScheduleCalendar = function() {
     window.open('#schedule', '_blank'); // Open in new tab
   };
   ```

7. ERROR HANDLING:
   - Validate date is not in the past
   - Handle database update failures gracefully
   - Show specific error messages

DELIVERABLES:
- Implemented openConfirmScheduleModal() in src/views/pending-orders.js
- Form validates scheduled date
- Successfully updates order status to 'confirmed'
- Refreshes pending orders view after confirmation
- Updates pending count badge
- Shows success/error messages

VALIDATION:
1. Click "Confirm & Schedule" on pending order
2. Modal opens with date picker
3. Select future date and submit
4. Order disappears from pending queue
5. Order appears in Schedule view with selected date
6. Badge count decrements
```

---

### PROMPT 6: Decline Order Workflow

**Agent Type:** general-purpose
**Task:** Implement the decline order workflow

**Prompt:**
```
You are implementing the Decline Order workflow for the Pending Orders Queue in sailorskills-operations.

CONTEXT:
- Working directory: /Users/brian/app-development/sailorskills-repos/sailorskills-operations
- Confirm dialog: src/components/confirm-dialog.js
- Goal: Update order status to 'declined' with optional reason

TASK:
Implement handleDeclineOrder(orderId) function in src/views/pending-orders.js

REQUIREMENTS:

1. FUNCTION SIGNATURE:
   ```javascript
   async function handleDeclineOrder(orderId)
   ```

2. CONFIRMATION DIALOG:
   Use custom confirmDialog with reason input:
   ```javascript
   const { modal, form } = await openFormModal(
     'Decline Order',
     `
       <div class="decline-form">
         <p class="warning-text">
           ⚠️ Are you sure you want to decline this service order?
         </p>
         <p class="info-text">
           The customer should be notified about the decline and reason.
         </p>

         <div class="form-group">
           <label for="decline-reason">Reason for Decline <span class="required">*</span></label>
           <select id="decline-reason" name="decline_reason" class="form-control" required>
             <option value="">Select a reason...</option>
             <option value="scheduling_conflict">Scheduling Conflict</option>
             <option value="service_unavailable">Service Not Available</option>
             <option value="location_not_served">Location Not Served</option>
             <option value="customer_request">Customer Request</option>
             <option value="other">Other</option>
           </select>
         </div>

         <div class="form-group">
           <label for="decline-notes">Additional Notes (Optional)</label>
           <textarea
             id="decline-notes"
             name="decline_notes"
             class="form-control"
             rows="3"
             placeholder="Add details about the decline..."
           ></textarea>
         </div>

         <div class="form-group">
           <label>
             <input type="checkbox" name="notify_customer" checked>
             Notify customer via email
           </label>
         </div>
       </div>
     `,
     {
       size: 'medium',
       onSubmit: async (form, modal) => {
         const formData = new FormData(form);
         const reason = formData.get('decline_reason');
         const notes = formData.get('decline_notes');
         const notifyCustomer = formData.get('notify_customer') === 'on';

         if (!reason) {
           showError('Please select a reason for declining');
           return;
         }

         try {
           // Update order status to declined
           const { error: updateError } = await window.app.supabase
             .from('service_orders')
             .update({
               status: 'declined',
               decline_reason: reason,
               decline_notes: notes || null,
               declined_at: new Date().toISOString(),
               declined_by: 'admin' // TODO: Get actual user
             })
             .eq('id', orderId);

           if (updateError) throw updateError;

           // TODO: Send notification email if checked
           if (notifyCustomer) {
             console.log('TODO: Send decline notification email');
             // await sendOrderDeclineEmail(order, reason, notes);
           }

           await closeModal();
           showSuccess('Order declined successfully');

           // Refresh views
           await refreshPendingOrders();
           await window.app.updatePendingOrdersBadge();

         } catch (error) {
           console.error('Decline order error:', error);
           showError('Failed to decline order. Please try again.');
         }
       }
     }
   );
   ```

3. SCHEMA REQUIREMENTS:
   Add decline-related fields to service_orders table (include in migration):
   - decline_reason TEXT
   - decline_notes TEXT
   - declined_at TIMESTAMPTZ
   - declined_by TEXT

4. REVERSAL OPTION (FUTURE):
   Add ability to undo decline:
   ```javascript
   async function undoDeclineOrder(orderId) {
     const confirmed = await confirmDialog(
       'Undo decline and return this order to pending status?'
     );

     if (confirmed) {
       const { error } = await window.app.supabase
         .from('service_orders')
         .update({
           status: 'pending',
           decline_reason: null,
           decline_notes: null,
           declined_at: null,
           declined_by: null
         })
         .eq('id', orderId);

       if (!error) {
         showSuccess('Order returned to pending');
         await refreshPendingOrders();
       }
     }
   }
   ```

5. DECLINED ORDERS VIEW (FUTURE ENHANCEMENT):
   Add filter to view declined orders:
   ```javascript
   // In pending-orders.js, add tab or filter
   <div class="view-tabs">
     <button class="tab active" data-status="pending">Pending</button>
     <button class="tab" data-status="declined">Declined</button>
   </div>
   ```

DELIVERABLES:
- Implemented handleDeclineOrder() in src/views/pending-orders.js
- Confirmation dialog with reason selection
- Updates order status to 'declined'
- Refreshes pending orders view
- Shows success/error messages

VALIDATION:
1. Click "Decline" on pending order
2. Modal opens with reason selection
3. Select reason and submit
4. Order disappears from pending queue
5. Badge count decrements
6. Order marked as declined in database
```

---

### PROMPT 7: Styling & Polish

**Agent Type:** general-purpose
**Task:** Add CSS styling for the Pending Orders view

**Prompt:**
```
You are adding CSS styling for the Pending Orders Queue view in sailorskills-operations.

CONTEXT:
- Working directory: /Users/brian/app-development/sailorskills-repos/sailorskills-operations
- Style file: styles/main.css
- Design system: Uses sailorskills-shared design tokens (CSS variables)
- Existing patterns: See cards, badges, buttons in styles/main.css

TASK:
Add CSS for Pending Orders view to styles/main.css

REQUIREMENTS:

1. ORDERS GRID LAYOUT:
   ```css
   .orders-grid {
     display: grid;
     grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
     gap: 1.5rem;
     padding: 1rem 0;
   }

   @media (max-width: 768px) {
     .orders-grid {
       grid-template-columns: 1fr;
     }
   }
   ```

2. ORDER CARD STYLING:
   ```css
   .order-card {
     background: var(--color-white);
     border: 1px solid var(--color-border);
     border-radius: 0; /* Sharp corners per design system */
     padding: 1.5rem;
     transition: box-shadow 0.2s ease;
   }

   .order-card:hover {
     box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
   }

   .order-header {
     display: flex;
     justify-content: space-between;
     align-items: center;
     margin-bottom: 1rem;
     padding-bottom: 0.75rem;
     border-bottom: 1px solid var(--color-border);
   }

   .order-number {
     font-size: 1.125rem;
     font-weight: 600;
     margin: 0;
     color: var(--color-text-primary);
   }

   .order-age {
     font-size: 0.875rem;
     color: var(--color-text-secondary);
   }

   .order-details {
     display: flex;
     flex-direction: column;
     gap: 0.75rem;
     margin-bottom: 1.25rem;
   }

   .order-details .label {
     font-size: 0.875rem;
     color: var(--color-text-secondary);
     margin-right: 0.5rem;
   }

   .order-boat {
     display: flex;
     flex-direction: column;
     gap: 0.25rem;
   }

   .order-boat strong {
     font-size: 1.125rem;
     color: var(--color-text-primary);
   }

   .boat-info {
     font-size: 0.875rem;
     color: var(--color-text-secondary);
   }

   .order-amount strong {
     font-size: 1.125rem;
     color: var(--color-success);
   }

   .order-notes {
     background: var(--color-background);
     padding: 0.75rem;
     border-left: 3px solid var(--color-info);
   }

   .order-notes .label {
     display: block;
     margin-bottom: 0.25rem;
     font-weight: 600;
   }

   .notes-text {
     margin: 0;
     font-size: 0.9375rem;
     line-height: 1.5;
   }

   .order-actions {
     display: flex;
     gap: 0.5rem;
     flex-wrap: wrap;
   }

   .order-actions .btn {
     flex: 1;
     min-width: 120px;
   }
   ```

3. FILTERS BAR:
   ```css
   .filters-bar {
     display: flex;
     gap: 1rem;
     margin-bottom: 1.5rem;
     flex-wrap: wrap;
   }

   .filters-bar .form-control {
     flex: 1;
     min-width: 200px;
   }

   @media (max-width: 768px) {
     .filters-bar {
       flex-direction: column;
     }

     .filters-bar .form-control {
       width: 100%;
     }
   }
   ```

4. BADGE STYLING (for nav badge):
   ```css
   .nav-link .badge {
     margin-left: 0.5rem;
     padding: 0.25rem 0.5rem;
     font-size: 0.75rem;
     font-weight: 600;
     border-radius: 12px;
   }

   .badge-warning {
     background-color: var(--color-warning);
     color: var(--color-white);
   }
   ```

5. EMPTY STATE:
   ```css
   .empty-state {
     text-align: center;
     padding: 4rem 2rem;
     color: var(--color-text-secondary);
   }

   .empty-state h3 {
     margin-bottom: 0.5rem;
     color: var(--color-text-primary);
   }

   .empty-state p {
     font-size: 1rem;
     max-width: 400px;
     margin: 0 auto;
   }
   ```

6. LOADING SPINNER:
   ```css
   .loading-spinner {
     text-align: center;
     padding: 3rem 0;
     color: var(--color-text-secondary);
   }

   .loading-spinner span {
     display: inline-block;
     animation: pulse 1.5s ease-in-out infinite;
   }

   @keyframes pulse {
     0%, 100% { opacity: 1; }
     50% { opacity: 0.5; }
   }
   ```

7. ORDER DETAIL MODAL:
   ```css
   .order-detail-modal {
     display: flex;
     flex-direction: column;
     gap: 1.5rem;
   }

   .order-detail-section {
     padding-bottom: 1rem;
     border-bottom: 1px solid var(--color-border);
   }

   .order-detail-section:last-of-type {
     border-bottom: none;
   }

   .order-detail-section h3 {
     margin-bottom: 1rem;
     font-size: 1.125rem;
     color: var(--color-text-primary);
   }

   .detail-row {
     display: flex;
     justify-content: space-between;
     padding: 0.5rem 0;
     border-bottom: 1px solid var(--color-border-light);
   }

   .detail-row:last-child {
     border-bottom: none;
   }

   .detail-row .label {
     font-weight: 600;
     color: var(--color-text-secondary);
     margin-right: 1rem;
   }

   .detail-row a {
     color: var(--color-primary);
     text-decoration: none;
   }

   .detail-row a:hover {
     text-decoration: underline;
   }

   .order-detail-actions {
     display: flex;
     gap: 0.75rem;
     justify-content: flex-end;
     padding-top: 1rem;
   }
   ```

8. CONFIRM SCHEDULE FORM:
   ```css
   .confirm-schedule-form .order-context {
     background: var(--color-background);
     padding: 1rem;
     margin-bottom: 1.5rem;
     border-left: 3px solid var(--color-primary);
   }

   .confirm-schedule-form .order-context p {
     margin: 0.25rem 0;
   }

   .form-hint {
     display: block;
     margin-top: 0.25rem;
     font-size: 0.875rem;
     color: var(--color-text-secondary);
   }

   .form-helper {
     margin-top: 1rem;
     text-align: center;
   }

   .alert {
     padding: 1rem;
     margin: 1rem 0;
     border-left: 4px solid;
   }

   .alert-warning {
     background-color: #fff3cd;
     border-color: var(--color-warning);
     color: #856404;
   }
   ```

9. DECLINE FORM:
   ```css
   .decline-form .warning-text {
     color: var(--color-danger);
     font-weight: 600;
     margin-bottom: 0.5rem;
   }

   .decline-form .info-text {
     color: var(--color-text-secondary);
     margin-bottom: 1.5rem;
   }
   ```

10. RESPONSIVE ADJUSTMENTS:
    ```css
    @media (max-width: 576px) {
      .order-card {
        padding: 1rem;
      }

      .order-actions {
        flex-direction: column;
      }

      .order-actions .btn {
        width: 100%;
      }

      .order-detail-modal .detail-row {
        flex-direction: column;
        gap: 0.25rem;
      }
    }
    ```

DELIVERABLES:
- CSS added to /Users/brian/app-development/sailorskills-repos/sailorskills-operations/styles/main.css
- Pending Orders view styled consistently with existing design system
- Responsive design works on mobile

VALIDATION:
1. View looks clean and organized
2. Cards have proper spacing and hover effects
3. Modals are styled consistently
4. Mobile responsiveness works
5. No CSS variable errors in console
```

---

### PROMPT 8: Integration & Testing

**Agent Type:** general-purpose
**Task:** Integration testing and final polish

**Prompt:**
```
You are performing integration testing and final polish for the Pending Orders Queue feature in sailorskills-operations.

CONTEXT:
- Working directory: /Users/brian/app-development/sailorskills-repos/sailorskills-operations
- Feature: Complete Pending Orders Queue workflow
- Testing: Playwright MCP (per user instructions)

TASK:
Test the complete workflow and fix any issues

TESTING CHECKLIST:

1. DATABASE MIGRATION:
   - [ ] Run migration file in Supabase SQL Editor
   - [ ] Verify new columns added to service_orders
   - [ ] Verify indexes created
   - [ ] Test sample insert with status='pending'

2. NAVIGATION:
   - [ ] "Pending Orders" link appears in nav
   - [ ] Badge shows correct count (or hidden if 0)
   - [ ] Clicking link shows pending orders view
   - [ ] View activates properly (no console errors)

3. DATA FETCHING:
   - [ ] Pending orders load from database
   - [ ] Boat information joins correctly
   - [ ] Loading spinner shows/hides properly
   - [ ] Empty state shows when no orders

4. FILTERING & SORTING:
   - [ ] Search filters by boat/customer name
   - [ ] Service type filter works
   - [ ] Sort dropdown changes order
   - [ ] Filters clear properly

5. ORDER CARDS:
   - [ ] All fields display correctly
   - [ ] Time ago updates appropriately
   - [ ] Currency formats correctly
   - [ ] Notes display when present
   - [ ] Action buttons enabled

6. VIEW DETAILS MODAL:
   - [ ] Modal opens with complete order info
   - [ ] Boat details display correctly
   - [ ] Customer contact links work
   - [ ] "View Boat History" navigates correctly
   - [ ] "Confirm & Schedule" opens next modal

7. CONFIRM & SCHEDULE WORKFLOW:
   - [ ] Modal opens with date picker
   - [ ] Min date prevents past dates
   - [ ] Conflict detection works (if implemented)
   - [ ] Form validation works
   - [ ] Submit updates database correctly
   - [ ] Order disappears from pending queue
   - [ ] Badge count updates
   - [ ] Success message shows

8. DECLINE WORKFLOW:
   - [ ] Decline confirmation opens
   - [ ] Reason required validation works
   - [ ] Submit updates database correctly
   - [ ] Order disappears from pending queue
   - [ ] Badge count updates
   - [ ] Success message shows

9. CROSS-SERVICE INTEGRATION:
   - [ ] Confirmed orders appear in Schedule view
   - [ ] Dashboard shows today's confirmed orders
   - [ ] Boat detail shows order history

10. RESPONSIVE DESIGN:
    - [ ] Mobile view works (cards stack)
    - [ ] Filters responsive on small screens
    - [ ] Modals usable on mobile
    - [ ] Touch targets adequate

11. ERROR HANDLING:
    - [ ] Network errors show user-friendly messages
    - [ ] Database errors don't crash app
    - [ ] Invalid data handled gracefully
    - [ ] Console free of errors

CREATE TEST DATA:
```javascript
// Run in browser console to create test pending orders
const createTestOrders = async () => {
  const boats = await window.app.supabase
    .from('boats')
    .select('id, boat_name')
    .limit(3);

  for (const boat of boats.data) {
    await window.app.supabase
      .from('service_orders')
      .insert({
        boat_id: boat.id,
        service_type: 'Bottom Cleaning',
        status: 'pending',
        estimated_amount: 250.00,
        customer_notes: 'Please call before arriving'
      });
  }

  console.log('Test orders created');
  await window.app.updatePendingOrdersBadge();
};

createTestOrders();
```

PLAYWRIGHT TEST SCRIPT:
```javascript
// tests/pending-orders.spec.js
import { test, expect } from '@playwright/test';

test.describe('Pending Orders Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForSelector('.sub-nav');
  });

  test('should display pending orders', async ({ page }) => {
    await page.click('a[href="#pending-orders"]');
    await page.waitForSelector('#pending-orders-view.active');

    const cards = await page.locator('.order-card').count();
    expect(cards).toBeGreaterThan(0);
  });

  test('should filter orders by search', async ({ page }) => {
    await page.click('a[href="#pending-orders"]');
    await page.fill('#pending-orders-search', 'Test Boat');
    await page.waitForTimeout(500); // Debounce

    const cards = await page.locator('.order-card').all();
    for (const card of cards) {
      const text = await card.textContent();
      expect(text.toLowerCase()).toContain('test boat');
    }
  });

  test('should open order detail modal', async ({ page }) => {
    await page.click('a[href="#pending-orders"]');
    await page.click('.btn-view-details:first-of-type');

    const modal = await page.locator('.modal.active');
    expect(modal).toBeVisible();
    expect(await modal.locator('h2').textContent()).toBe('Order Details');
  });

  test('should confirm and schedule order', async ({ page }) => {
    await page.click('a[href="#pending-orders"]');
    const initialCount = await page.locator('.order-card').count();

    await page.click('.btn-confirm-schedule:first-of-type');
    await page.fill('#scheduled-date', '2025-12-31');
    await page.click('button[type="submit"]');

    await page.waitForTimeout(1000);
    const newCount = await page.locator('.order-card').count();
    expect(newCount).toBe(initialCount - 1);
  });

  test('should update badge count', async ({ page }) => {
    const badge = page.locator('#pending-count-badge');
    const count = await badge.textContent();
    expect(parseInt(count)).toBeGreaterThanOrEqual(0);
  });
});
```

FIXES & POLISH:

1. Add console.log for debugging in development:
   ```javascript
   if (import.meta.env.DEV) {
     console.log('[PendingOrders] Orders loaded:', orders.length);
   }
   ```

2. Add loading states to buttons:
   ```javascript
   async function handleConfirmSchedule(e) {
     const btn = e.target;
     btn.disabled = true;
     btn.textContent = 'Confirming...';
     try {
       await confirmSchedule();
     } finally {
       btn.disabled = false;
       btn.textContent = 'Confirm & Schedule';
     }
   }
   ```

3. Add keyboard shortcuts (optional):
   ```javascript
   document.addEventListener('keydown', (e) => {
     if (e.key === 'Escape' && window.app.currentView === 'pending-orders') {
       closeModal();
     }
   });
   ```

4. Add real-time updates (optional, future):
   ```javascript
   // Subscribe to service_orders changes
   const subscription = window.app.supabase
     .channel('service_orders_changes')
     .on('postgres_changes', {
       event: '*',
       schema: 'public',
       table: 'service_orders',
       filter: 'status=eq.pending'
     }, (payload) => {
       console.log('Order changed:', payload);
       refreshPendingOrders();
       window.app.updatePendingOrdersBadge();
     })
     .subscribe();
   ```

DELIVERABLES:
- All features tested and working
- Playwright test file created
- Any bugs fixed
- Code clean and commented
- Console free of errors
- Ready for production deployment

VALIDATION:
1. Run: npm run dev
2. Test manually with test data
3. Run: npx playwright test
4. All tests pass
5. Run: npm run build (no errors)
```

---

## Implementation Order

Execute prompts in this sequence:

1. **PROMPT 1** - Database schema updates (15-30 min)
2. **PROMPT 2** - HTML & navigation setup (30-45 min)
3. **PROMPT 3** - View logic & rendering (1-2 hours)
4. **PROMPT 4** - Order detail modal (45-60 min)
5. **PROMPT 5** - Confirm & schedule workflow (1-2 hours)
6. **PROMPT 6** - Decline workflow (45-60 min)
7. **PROMPT 7** - CSS styling (45-60 min)
8. **PROMPT 8** - Integration testing & polish (1-2 hours)

**Total Estimated Time:** 8-12 hours (1-1.5 days)

---

## Success Criteria

- [ ] Pending orders display in dedicated inbox view
- [ ] Badge shows real-time count of pending orders
- [ ] Order details accessible via modal
- [ ] Confirm & Schedule workflow functional
- [ ] Decline workflow functional
- [ ] Orders transition correctly through statuses
- [ ] Confirmed orders appear in Schedule view
- [ ] Mobile responsive
- [ ] No console errors
- [ ] Playwright tests pass
- [ ] Ready for production deployment

---

## Future Enhancements

1. **Email Notifications:**
   - Send confirmation emails to customers
   - Send decline notifications with reason
   - Admin notifications for new orders

2. **Real-time Updates:**
   - Use Supabase Realtime to auto-refresh on new orders
   - Push notifications for new pending orders

3. **Order History:**
   - View all orders (pending, confirmed, completed, declined)
   - Filter/search historical orders
   - Export order data

4. **Scheduling Conflicts:**
   - Visual conflict detection
   - Suggest alternative dates
   - Capacity management

5. **Customer Communication:**
   - Two-way messaging within order detail
   - SMS notifications
   - Customer portal order tracking

---

## Related Files

**Key Files Modified:**
- `/database/migration-pending-orders-schema.sql` (new)
- `/index.html` (navigation + view container)
- `/src/main.js` (navigation handler + badge)
- `/src/views/pending-orders.js` (new, main view logic)
- `/styles/main.css` (styling)
- `/tests/pending-orders.spec.js` (new, Playwright tests)

**Related Services:**
- **Estimator:** Creates orders with status='pending'
- **Schedule:** Displays confirmed orders
- **Dashboard:** Shows today's confirmed orders

---

**Ready for Implementation!** 🚀
