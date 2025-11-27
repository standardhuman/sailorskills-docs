# Pending Orders Queue & Confirmation Workflow Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a dedicated "Pending Orders" inbox in sailorskills-operations that shows incoming orders from the Estimator, allowing admins to review, confirm, decline, or schedule services with proper status workflow.

**Architecture:** Add a new "Pending Orders" view in Operations that displays `service_orders` with `status='pending'`. Admins can review order details (customer, boat, service type, estimated amount) and take actions: confirm & schedule (opens date picker), decline (with reason), or contact customer. Status flows: pending → confirmed → in_progress → completed. This closes a critical gap where orders currently go straight to calendar without admin confirmation.

**Tech Stack:** Vanilla JS, Supabase (PostgreSQL), Vite, shared components (modal, toast), existing navigation patterns

---

## Database Schema Review

**Existing `service_orders` table:** Already has all required fields - no database changes needed!
- `id` (uuid)
- `order_number` (text)
- `customer_id`, `boat_id`, `marina_id` (uuid)
- `service_type`, `service_interval` (text)
- `estimated_amount`, `final_amount` (numeric)
- `status` (text) - values: 'pending', 'confirmed', 'in_progress', 'completed', 'cancelled'
- `scheduled_date` (date)
- `notes`, `service_details` (jsonb)
- `created_at`, `updated_at` (timestamps)

**Current status distribution:**
- `pending`: 7 orders
- `confirmed`: 3 orders

---

## Task 1: Create Pending Orders View File

**Files:**
- Create: `sailorskills-operations/src/views/pending-orders.js`

**Step 1: Write the pending orders view module**

Create the view file with data loading and rendering logic:

```javascript
// Pending Orders View - Review and confirm incoming orders from Estimator

let allOrders = [];
let boats = [];
let customers = [];

export async function initPendingOrdersView() {
  await loadAllOrders();
  setupEventHandlers();
  startPolling();
}

async function loadAllOrders() {
  const container = document.getElementById('pending-orders-list');
  container.innerHTML = '<div class="loading">Loading pending orders...</div>';

  try {
    // Get filter values
    const statusFilter = document.getElementById('order-status-filter')?.value || 'pending';

    // Build query
    let query = window.app.supabase
      .from('service_orders')
      .select(`
        *,
        boat:boats(id, boat_name, boat_type, boat_length),
        customer:customers(id, name, email, phone),
        marina:marinas(name, city)
      `)
      .order('created_at', { ascending: false });

    // Apply status filter
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    allOrders = orders || [];

    // Update badge with pending count
    const pendingCount = allOrders.filter(o => o.status === 'pending').length;
    updateOrderBadge(pendingCount);

    // Render orders
    if (allOrders.length === 0) {
      container.innerHTML = '<p class="no-results">No orders found</p>';
      return;
    }

    container.innerHTML = `
      <div class="orders-grid">
        ${allOrders.map(order => renderOrderCard(order)).join('')}
      </div>
    `;

    // Attach event handlers
    attachOrderEventHandlers();

  } catch (error) {
    console.error('Error loading orders:', error);
    container.innerHTML = '<p class="error">Error loading orders</p>';
  }
}

function renderOrderCard(order) {
  const statusClass = getStatusClass(order.status);
  const createdDate = new Date(order.created_at);

  return `
    <div class="order-card" data-order-id="${order.id}">
      <div class="order-header">
        <div class="order-number">
          <strong>Order #${order.order_number}</strong>
        </div>
        <div class="order-status">
          <span class="status-badge ${statusClass}">${order.status}</span>
        </div>
      </div>

      <div class="order-body">
        <div class="order-details">
          <div class="detail-row">
            <span class="detail-label">Customer:</span>
            <span class="detail-value"><strong>${order.customer?.name || 'Unknown'}</strong></span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Boat:</span>
            <span class="detail-value">${order.boat?.boat_name || 'Unknown'}
              ${order.boat?.boat_type ? `(${order.boat.boat_type})` : ''}
            </span>
          </div>
          <div class="detail-row">
            <span class="detail-label">Service:</span>
            <span class="detail-value">${order.service_type || 'Not specified'}</span>
          </div>
          ${order.service_interval ? `
            <div class="detail-row">
              <span class="detail-label">Interval:</span>
              <span class="detail-value">${order.service_interval}</span>
            </div>
          ` : ''}
          <div class="detail-row">
            <span class="detail-label">Estimated Amount:</span>
            <span class="detail-value"><strong>$${(order.estimated_amount || 0).toFixed(2)}</strong></span>
          </div>
          ${order.marina ? `
            <div class="detail-row">
              <span class="detail-label">Location:</span>
              <span class="detail-value">${order.marina.name}${order.dock ? ` - Dock ${order.dock}` : ''}${order.slip_number ? ` #${order.slip_number}` : ''}</span>
            </div>
          ` : ''}
          ${order.scheduled_date ? `
            <div class="detail-row">
              <span class="detail-label">Scheduled:</span>
              <span class="detail-value">${formatDate(order.scheduled_date)}</span>
            </div>
          ` : ''}
        </div>

        ${order.notes ? `
          <div class="order-notes">
            <strong>Notes:</strong>
            <p>${escapeHtml(order.notes)}</p>
          </div>
        ` : ''}
      </div>

      <div class="order-footer">
        <div class="order-time">
          Received ${formatOrderTime(createdDate)}
        </div>
        <div class="order-actions">
          ${order.status === 'pending' ? `
            <button class="btn btn-sm btn-success confirm-schedule-btn" data-order-id="${order.id}">
              ✓ Confirm & Schedule
            </button>
            <button class="btn btn-sm btn-secondary contact-customer-btn" data-order-id="${order.id}">
              📧 Contact Customer
            </button>
            <button class="btn btn-sm btn-danger decline-order-btn" data-order-id="${order.id}">
              ✕ Decline
            </button>
          ` : ''}
          ${order.status === 'confirmed' ? `
            <button class="btn btn-sm btn-primary reschedule-btn" data-order-id="${order.id}">
              📅 Reschedule
            </button>
            <button class="btn btn-sm btn-danger cancel-order-btn" data-order-id="${order.id}">
              ✕ Cancel
            </button>
          ` : ''}
          <button class="btn btn-sm btn-secondary view-details-btn" data-order-id="${order.id}">
            👁 Details
            </button>
        </div>
      </div>
    </div>
  `;
}

function attachOrderEventHandlers() {
  // Confirm & Schedule buttons
  document.querySelectorAll('.confirm-schedule-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const orderId = e.target.dataset.orderId;
      await openScheduleModal(orderId);
    });
  });

  // Contact Customer buttons
  document.querySelectorAll('.contact-customer-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orderId = e.target.dataset.orderId;
      openContactCustomerModal(orderId);
    });
  });

  // Decline buttons
  document.querySelectorAll('.decline-order-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const orderId = e.target.dataset.orderId;
      await openDeclineModal(orderId);
    });
  });

  // Reschedule buttons
  document.querySelectorAll('.reschedule-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const orderId = e.target.dataset.orderId;
      await openScheduleModal(orderId);
    });
  });

  // Cancel buttons
  document.querySelectorAll('.cancel-order-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const orderId = e.target.dataset.orderId;
      if (confirm('Are you sure you want to cancel this order?')) {
        await updateOrderStatus(orderId, 'cancelled');
      }
    });
  });

  // View details buttons
  document.querySelectorAll('.view-details-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const orderId = e.target.dataset.orderId;
      openDetailsModal(orderId);
    });
  });
}

async function openScheduleModal(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const { openFormModal, closeModal } = await import('../components/modal.js');
  const { showToast } = await import('../components/toast.js');

  const today = new Date().toISOString().split('T')[0];
  const suggestedDate = order.scheduled_date || today;

  const formContent = `
    <div class="form-group">
      <label for="scheduled-date">Scheduled Date *</label>
      <input type="date" id="scheduled-date" class="form-control" value="${suggestedDate}" min="${today}" required>
    </div>
    <div class="form-group">
      <label for="schedule-notes">Notes (optional)</label>
      <textarea id="schedule-notes" class="form-control" rows="3" placeholder="Any scheduling notes...">${order.notes || ''}</textarea>
    </div>
  `;

  await openFormModal(
    `Confirm & Schedule Order #${order.order_number}`,
    formContent,
    {
      submitLabel: 'Confirm & Schedule',
      onSubmit: async (form) => {
        const scheduledDate = form.querySelector('#scheduled-date').value;
        const notes = form.querySelector('#schedule-notes').value;

        if (!scheduledDate) {
          showToast('Please select a scheduled date', 'error');
          return;
        }

        try {
          const { error } = await window.app.supabase
            .from('service_orders')
            .update({
              status: 'confirmed',
              scheduled_date: scheduledDate,
              notes: notes,
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

          if (error) throw error;

          showToast('Order confirmed and scheduled!', 'success');
          await closeModal();
          await loadAllOrders();

          // TODO: Send notification to customer
          console.log(`Order ${orderId} confirmed - notification would be triggered here`);

        } catch (error) {
          console.error('Error confirming order:', error);
          showToast('Failed to confirm order', 'error');
          throw error;
        }
      }
    }
  );
}

function openContactCustomerModal(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order || !order.customer) return;

  const { openModal } = require('../components/modal.js');

  const content = `
    <div class="customer-contact-info">
      <h4>${order.customer.name}</h4>
      ${order.customer.email ? `
        <div class="contact-row">
          <strong>Email:</strong>
          <a href="mailto:${order.customer.email}">${order.customer.email}</a>
        </div>
      ` : ''}
      ${order.customer.phone ? `
        <div class="contact-row">
          <strong>Phone:</strong>
          <a href="tel:${order.customer.phone}">${order.customer.phone}</a>
        </div>
      ` : ''}
      <div class="contact-row">
        <strong>Boat:</strong> ${order.boat?.boat_name || 'Unknown'}
      </div>
      <div class="contact-row">
        <strong>Service:</strong> ${order.service_type || 'Not specified'}
      </div>
    </div>
  `;

  openModal(`Contact Customer - Order #${order.order_number}`, content);
}

async function openDeclineModal(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const { openFormModal, closeModal } = await import('../components/modal.js');
  const { showToast } = await import('../components/toast.js');

  const formContent = `
    <p>Are you sure you want to decline this order?</p>
    <div class="form-group">
      <label for="decline-reason">Reason for Decline *</label>
      <textarea id="decline-reason" class="form-control" rows="3" placeholder="Enter reason..." required></textarea>
    </div>
  `;

  await openFormModal(
    `Decline Order #${order.order_number}`,
    formContent,
    {
      submitLabel: 'Decline Order',
      onSubmit: async (form) => {
        const reason = form.querySelector('#decline-reason').value.trim();

        if (!reason) {
          showToast('Please provide a reason for declining', 'error');
          return;
        }

        try {
          const { error } = await window.app.supabase
            .from('service_orders')
            .update({
              status: 'cancelled',
              notes: `DECLINED: ${reason}`,
              updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

          if (error) throw error;

          showToast('Order declined', 'success');
          await closeModal();
          await loadAllOrders();

          // TODO: Send notification to customer
          console.log(`Order ${orderId} declined - notification would be triggered here`);

        } catch (error) {
          console.error('Error declining order:', error);
          showToast('Failed to decline order', 'error');
          throw error;
        }
      }
    }
  );
}

function openDetailsModal(orderId) {
  const order = allOrders.find(o => o.id === orderId);
  if (!order) return;

  const { openModal } = require('../components/modal.js');

  const content = `
    <div class="order-details-full">
      <div class="details-section">
        <h4>Order Information</h4>
        <table class="details-table">
          <tr><th>Order Number:</th><td>${order.order_number}</td></tr>
          <tr><th>Status:</th><td><span class="status-badge ${getStatusClass(order.status)}">${order.status}</span></td></tr>
          <tr><th>Created:</th><td>${new Date(order.created_at).toLocaleString()}</td></tr>
          ${order.scheduled_date ? `<tr><th>Scheduled:</th><td>${formatDate(order.scheduled_date)}</td></tr>` : ''}
        </table>
      </div>

      <div class="details-section">
        <h4>Customer Information</h4>
        <table class="details-table">
          <tr><th>Name:</th><td>${order.customer?.name || 'Unknown'}</td></tr>
          <tr><th>Email:</th><td>${order.customer?.email || 'N/A'}</td></tr>
          <tr><th>Phone:</th><td>${order.customer?.phone || 'N/A'}</td></tr>
        </table>
      </div>

      <div class="details-section">
        <h4>Boat Information</h4>
        <table class="details-table">
          <tr><th>Name:</th><td>${order.boat?.boat_name || 'Unknown'}</td></tr>
          <tr><th>Type:</th><td>${order.boat?.boat_type || 'N/A'}</td></tr>
          <tr><th>Length:</th><td>${order.boat?.boat_length ? `${order.boat.boat_length} ft` : 'N/A'}</td></tr>
        </table>
      </div>

      <div class="details-section">
        <h4>Service Details</h4>
        <table class="details-table">
          <tr><th>Service Type:</th><td>${order.service_type || 'Not specified'}</td></tr>
          ${order.service_interval ? `<tr><th>Interval:</th><td>${order.service_interval}</td></tr>` : ''}
          <tr><th>Estimated Amount:</th><td><strong>$${(order.estimated_amount || 0).toFixed(2)}</strong></td></tr>
          ${order.final_amount ? `<tr><th>Final Amount:</th><td>$${order.final_amount.toFixed(2)}</td></tr>` : ''}
        </table>
      </div>

      ${order.marina ? `
        <div class="details-section">
          <h4>Location</h4>
          <table class="details-table">
            <tr><th>Marina:</th><td>${order.marina.name}</td></tr>
            ${order.marina.city ? `<tr><th>City:</th><td>${order.marina.city}</td></tr>` : ''}
            ${order.dock ? `<tr><th>Dock:</th><td>${order.dock}</td></tr>` : ''}
            ${order.slip_number ? `<tr><th>Slip:</th><td>${order.slip_number}</td></tr>` : ''}
          </table>
        </div>
      ` : ''}

      ${order.notes ? `
        <div class="details-section">
          <h4>Notes</h4>
          <p>${escapeHtml(order.notes)}</p>
        </div>
      ` : ''}

      ${order.service_details ? `
        <div class="details-section">
          <h4>Additional Service Details</h4>
          <pre>${JSON.stringify(order.service_details, null, 2)}</pre>
        </div>
      ` : ''}
    </div>
  `;

  openModal(`Order Details - #${order.order_number}`, content, { size: 'large' });
}

async function updateOrderStatus(orderId, newStatus) {
  try {
    const { error } = await window.app.supabase
      .from('service_orders')
      .update({
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (error) throw error;

    await loadAllOrders();

    const { showToast } = await import('../components/toast.js');
    showToast(`Order status updated to ${newStatus}`, 'success');

  } catch (error) {
    console.error('Error updating order status:', error);
    const { showToast } = await import('../components/toast.js');
    showToast('Failed to update order status', 'error');
  }
}

function setupEventHandlers() {
  // Refresh button
  const refreshBtn = document.getElementById('refresh-orders-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadAllOrders);
  }

  // Filter change handler
  const statusFilter = document.getElementById('order-status-filter');
  if (statusFilter) {
    statusFilter.addEventListener('change', loadAllOrders);
  }
}

function startPolling() {
  // Poll for new orders every 60 seconds
  setInterval(async () => {
    if (document.getElementById('pending-orders-view')?.classList.contains('active')) {
      await loadAllOrders();
    }
  }, 60000);
}

function updateOrderBadge(count) {
  const badge = document.getElementById('nav-order-badge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  }
}

function getStatusClass(status) {
  const statusClasses = {
    pending: 'status-pending',
    confirmed: 'status-confirmed',
    in_progress: 'status-in-progress',
    completed: 'status-completed',
    cancelled: 'status-cancelled'
  };
  return statusClasses[status] || 'status-default';
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatOrderTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString();
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

**Step 2: Commit**

```bash
git add sailorskills-operations/src/views/pending-orders.js
git commit -m "feat(operations): add pending orders view with order management logic"
```

---

## Task 2: Add HTML View Section to Index

**Files:**
- Modify: `sailorskills-operations/index.html:118-132` (after service-requests view section)

**Step 1: Add pending orders view HTML**

Add this section after the `service-requests-view` section (around line 200+):

```html
<!-- Pending Orders View -->
<section id="pending-orders-view" class="view">
  <h2>Pending Orders</h2>

  <div class="view-controls">
    <div class="filters">
      <select id="order-status-filter" class="form-control">
        <option value="pending">Pending Only</option>
        <option value="confirmed">Confirmed</option>
        <option value="all">All Orders</option>
        <option value="cancelled">Cancelled</option>
      </select>
    </div>
    <div class="actions">
      <button id="refresh-orders-btn" class="btn btn-secondary">
        🔄 Refresh
      </button>
    </div>
  </div>

  <div id="pending-orders-list" class="list-container">
    <div class="loading">Loading orders...</div>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add sailorskills-operations/index.html
git commit -m "feat(operations): add pending orders view HTML section"
```

---

## Task 3: Add Navigation Link

**Files:**
- Modify: `sailorskills-operations/index.html:120-132` (sub-nav section)

**Step 1: Add pending orders nav link**

Add navigation link in the sub-nav (after schedule, before paint-alerts):

```html
<a href="#pending-orders">Pending Orders <span id="nav-order-badge" class="nav-badge" style="display: none;">0</span></a>
```

Full sub-nav section should look like:

```html
<nav class="sub-nav">
  <div class="sub-nav-container">
    <a href="#dashboard" class="active">Dashboard</a>
    <a href="#boats">Boats & History</a>
    <a href="#packing">Packing Lists</a>
    <a href="#service-logs">Service Logs</a>
    <a href="#schedule">Schedule</a>
    <a href="#pending-orders">Pending Orders <span id="nav-order-badge" class="nav-badge" style="display: none;">0</span></a>
    <a href="#paint-alerts">Paint Alerts</a>
    <a href="#messages">Messages <span id="nav-message-badge" class="nav-badge" style="display: none;">0</span></a>
    <a href="#service-requests">Service Requests <span id="nav-request-badge" class="nav-badge" style="display: none;">0</span></a>
    <a href="/settings.html">⚙️ Settings</a>
  </div>
</nav>
```

**Step 2: Commit**

```bash
git add sailorskills-operations/index.html
git commit -m "feat(operations): add pending orders navigation link with badge"
```

---

## Task 4: Initialize View in Main.js

**Files:**
- Modify: `sailorskills-operations/src/main.js` (add import and view initialization)

**Step 1: Add import at top of file**

Add this import with the other view imports:

```javascript
import { initPendingOrdersView } from './views/pending-orders.js';
```

**Step 2: Add view initialization in router logic**

Find the view initialization logic (likely in a `switchView` function or similar) and add:

```javascript
case 'pending-orders':
  await initPendingOrdersView();
  break;
```

**Step 3: Commit**

```bash
git add sailorskills-operations/src/main.js
git commit -m "feat(operations): wire up pending orders view initialization"
```

---

## Task 5: Add CSS Styles for Pending Orders

**Files:**
- Modify: `sailorskills-operations/styles/main.css` (or create dedicated styles file)

**Step 1: Add pending orders styles**

Add these styles to the main stylesheet:

```css
/* Pending Orders View */
.orders-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-top: 1.5rem;
}

.order-card {
  background: white;
  border: 2px solid var(--ss-border-subtle);
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
  border-bottom: 1px solid var(--ss-border-subtle);
}

.order-number {
  font-size: 1.1rem;
  color: var(--ss-text-dark);
}

.order-status .status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0; /* Sharp corners */
  font-size: 0.85rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.status-pending {
  background-color: #fff3cd;
  color: #856404;
}

.status-badge.status-confirmed {
  background-color: #d1ecf1;
  color: #0c5460;
}

.status-badge.status-in-progress {
  background-color: #cce5ff;
  color: #004085;
}

.status-badge.status-completed {
  background-color: #d4edda;
  color: #155724;
}

.status-badge.status-cancelled {
  background-color: #f8d7da;
  color: #721c24;
}

.order-body {
  margin-bottom: 1rem;
}

.order-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 0.25rem 0;
}

.detail-label {
  font-weight: 500;
  color: var(--ss-text-medium);
  min-width: 140px;
}

.detail-value {
  flex: 1;
  text-align: right;
  color: var(--ss-text-dark);
}

.order-notes {
  margin-top: 1rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-left: 3px solid var(--ss-info);
}

.order-notes strong {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--ss-text-dark);
}

.order-notes p {
  margin: 0;
  color: var(--ss-text-medium);
  font-size: 0.95rem;
}

.order-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--ss-border-subtle);
}

.order-time {
  font-size: 0.85rem;
  color: var(--ss-text-light);
}

.order-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.order-actions .btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}

/* Order Details Modal */
.order-details-full {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.details-section h4 {
  margin: 0 0 0.75rem 0;
  color: var(--ss-text-dark);
  font-size: 1.1rem;
  border-bottom: 2px solid var(--ss-border-subtle);
  padding-bottom: 0.5rem;
}

.details-table {
  width: 100%;
  border-collapse: collapse;
}

.details-table th {
  text-align: left;
  font-weight: 600;
  color: var(--ss-text-medium);
  padding: 0.5rem 1rem 0.5rem 0;
  width: 40%;
}

.details-table td {
  padding: 0.5rem 0;
  color: var(--ss-text-dark);
}

.details-table tr:not(:last-child) {
  border-bottom: 1px solid var(--ss-border-subtle);
}

/* Customer Contact Modal */
.customer-contact-info {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.customer-contact-info h4 {
  margin: 0 0 1rem 0;
  color: var(--ss-text-dark);
  font-size: 1.3rem;
}

.contact-row {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--ss-border-subtle);
}

.contact-row strong {
  min-width: 80px;
  color: var(--ss-text-medium);
}

.contact-row a {
  color: var(--ss-info);
  text-decoration: none;
}

.contact-row a:hover {
  text-decoration: underline;
}

/* View Controls */
.view-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background-color: #f8f9fa;
  border-radius: 0; /* Sharp corners */
}

.view-controls .filters {
  display: flex;
  gap: 1rem;
}

.view-controls .actions {
  display: flex;
  gap: 0.5rem;
}

/* Navigation Badge */
.nav-badge {
  display: inline-block;
  background-color: var(--ss-danger);
  color: white;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.4rem;
  border-radius: 10px;
  margin-left: 0.25rem;
  vertical-align: super;
}

/* Responsive */
@media (max-width: 768px) {
  .orders-grid {
    grid-template-columns: 1fr;
  }

  .order-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .order-actions {
    width: 100%;
  }

  .order-actions .btn-sm {
    flex: 1;
  }

  .view-controls {
    flex-direction: column;
    gap: 1rem;
    align-items: stretch;
  }
}
```

**Step 2: Commit**

```bash
git add sailorskills-operations/styles/main.css
git commit -m "feat(operations): add pending orders view styles"
```

---

## Task 6: Test Basic View Loading

**Files:**
- No new files

**Step 1: Start development server**

Run: `npm run dev`
Expected: Server starts on http://localhost:5173

**Step 2: Open Operations in browser and navigate to Pending Orders**

1. Open http://localhost:5173
2. Log in with admin credentials (standardhuman@gmail.com / KLRss!650)
3. Click "Pending Orders" in navigation
4. Expected: View loads, shows 7 pending orders, badge shows "7"

**Step 3: Verify data loads correctly**

- Check that orders display with correct customer, boat, service type
- Check that estimated amounts show correctly
- Check that "Received X time ago" displays correctly
- Check that status badges show "pending" in yellow

**Step 4: If tests pass, commit**

No code changes needed if tests pass. Document success in notes.

---

## Task 7: Test Confirm & Schedule Flow

**Files:**
- No new files

**Step 1: Click "Confirm & Schedule" on a pending order**

Expected: Modal opens with:
- Title: "Confirm & Schedule Order #[order_number]"
- Date picker with today as minimum
- Notes textarea (optional)
- "Confirm & Schedule" button

**Step 2: Select a future date and submit**

1. Pick a date 3 days from now
2. Add note: "Test scheduling from pending orders queue"
3. Click "Confirm & Schedule"
4. Expected:
   - Toast shows "Order confirmed and scheduled!"
   - Modal closes
   - Order disappears from pending list (or moves to "confirmed" if filter set to "all")
   - Badge count decrements to 6

**Step 3: Verify database update**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -c "SELECT order_number, status, scheduled_date FROM service_orders WHERE status='confirmed' ORDER BY updated_at DESC LIMIT 1"`

Expected: Most recent order shows `status='confirmed'` and correct `scheduled_date`

**Step 4: If tests pass, document success**

No code changes needed.

---

## Task 8: Test Decline Flow

**Files:**
- No new files

**Step 1: Click "Decline" on a pending order**

Expected: Modal opens with:
- Title: "Decline Order #[order_number]"
- Warning text
- Required textarea for decline reason
- "Decline Order" button

**Step 2: Enter decline reason and submit**

1. Enter reason: "Customer requested cancellation via phone"
2. Click "Decline Order"
3. Expected:
   - Toast shows "Order declined"
   - Modal closes
   - Order disappears from pending list
   - Badge count decrements

**Step 3: Verify database update**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -c "SELECT order_number, status, notes FROM service_orders WHERE status='cancelled' ORDER BY updated_at DESC LIMIT 1"`

Expected: Most recent order shows `status='cancelled'` and notes start with "DECLINED:"

**Step 4: If tests pass, document success**

No code changes needed.

---

## Task 9: Test Contact Customer Modal

**Files:**
- No new files

**Step 1: Click "Contact Customer" on an order**

Expected: Modal opens with:
- Customer name as heading
- Email (with mailto: link)
- Phone (with tel: link)
- Boat name
- Service type

**Step 2: Verify links work**

1. Click email link - Expected: Default email client opens
2. Click phone link - Expected: Default phone app opens (on mobile) or attempts to call

**Step 3: Close modal**

Click X or click outside modal - Expected: Modal closes cleanly

**Step 4: If tests pass, document success**

No code changes needed.

---

## Task 10: Test View Details Modal

**Files:**
- No new files

**Step 1: Click "Details" button on an order**

Expected: Large modal opens with sections:
- Order Information (number, status, dates)
- Customer Information (name, email, phone)
- Boat Information (name, type, length)
- Service Details (type, interval, amounts)
- Location (marina, dock, slip) if present
- Notes if present
- Service details JSON if present

**Step 2: Verify all data displays correctly**

Check that all fields from the order are shown correctly formatted

**Step 3: Close modal**

Expected: Modal closes cleanly

**Step 4: If tests pass, document success**

No code changes needed.

---

## Task 11: Test Filter Functionality

**Files:**
- No new files

**Step 1: Test status filter dropdown**

1. Default: "Pending Only" - Expected: Shows only pending orders (7 orders)
2. Change to "Confirmed" - Expected: Shows only confirmed orders (3 orders)
3. Change to "All Orders" - Expected: Shows all orders (10 orders)
4. Change to "Cancelled" - Expected: Shows cancelled orders (if any)

**Step 2: Verify badge updates with filter**

- Badge should always show pending count (7) regardless of filter selection

**Step 3: If tests pass, document success**

No code changes needed.

---

## Task 12: Test Refresh Button

**Files:**
- No new files

**Step 1: Click refresh button**

Expected:
- List reloads
- Badge updates if pending count changed
- No errors in console

**Step 2: Verify polling (wait 60 seconds)**

After 60 seconds on the view, data should auto-refresh

**Step 3: If tests pass, document success**

No code changes needed.

---

## Task 13: Test Responsive Design

**Files:**
- No new files

**Step 1: Resize browser to mobile width (375px)**

Expected:
- Orders stack in single column
- Action buttons stack vertically and expand to full width
- Order details remain readable
- Modals are responsive

**Step 2: Test on tablet width (768px)**

Expected:
- Orders display in 2 columns
- All content accessible

**Step 3: If tests pass, document success**

No code changes needed.

---

## Task 14: Integration Test with Existing Schedule View

**Files:**
- No new files

**Step 1: Confirm an order from Pending Orders**

1. Go to Pending Orders
2. Confirm & schedule an order for tomorrow
3. Navigate to Schedule view
4. Expected: Order appears on schedule calendar for tomorrow with correct boat name

**Step 2: Verify both views show consistent data**

Check that status, date, and details match between views

**Step 3: If tests pass, document success**

No code changes needed.

---

## Task 15: Add Dashboard Widget for Pending Orders Count

**Files:**
- Modify: `sailorskills-operations/src/views/dashboard.js`

**Step 1: Add pending orders count to dashboard**

Find the dashboard loading logic and add a query for pending orders count:

```javascript
// In dashboard.js loadDashboard() function
async function loadPendingOrdersCount() {
  const container = document.getElementById('pending-orders-count');

  try {
    const { count, error } = await window.app.supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) throw error;

    container.innerHTML = `
      <div class="dashboard-stat">
        <div class="stat-number">${count || 0}</div>
        <div class="stat-label">Pending Orders</div>
        <a href="#pending-orders" class="stat-link">View all →</a>
      </div>
    `;

  } catch (error) {
    console.error('Error loading pending orders count:', error);
    container.innerHTML = '<p class="error">Error loading count</p>';
  }
}

// Call in main dashboard load function
await loadPendingOrdersCount();
```

**Step 2: Add HTML widget to dashboard view in index.html**

Add this card to the dashboard grid:

```html
<div class="card">
  <h3>Pending Orders</h3>
  <div id="pending-orders-count" class="card-content">
    Loading...
  </div>
</div>
```

**Step 3: Commit**

```bash
git add sailorskills-operations/src/views/dashboard.js sailorskills-operations/index.html
git commit -m "feat(operations): add pending orders count widget to dashboard"
```

---

## Task 16: Final End-to-End Test

**Files:**
- No new files

**Step 1: Test complete workflow**

1. Start on Dashboard - verify pending orders count widget shows correct number
2. Click widget link or navigation to go to Pending Orders
3. Review an order by clicking "Details" - verify all data correct
4. Click "Contact Customer" - verify contact info displayed
5. Click "Confirm & Schedule" on an order - schedule it for next week
6. Verify order moves to confirmed status
7. Go back to Dashboard - verify count decremented
8. Go to Schedule view - verify order appears on calendar
9. Go back to Pending Orders - try declining an order with a reason
10. Verify order cancelled and count updated

**Step 2: Check console for errors**

Expected: No errors in browser console

**Step 3: Check network tab**

Expected: All Supabase queries succeed, no 400/500 errors

**Step 4: If all tests pass, document success**

No code changes needed.

---

## Task 17: Build and Deploy to Vercel

**Files:**
- No new files

**Step 1: Build production bundle**

Run: `npm run build`
Expected: Build succeeds, outputs to `dist/`

**Step 2: Commit all changes**

```bash
git add -A
git commit -m "feat(operations): complete pending orders queue & confirmation workflow

- Add pending orders view with full order management
- Implement confirm & schedule, decline, and contact workflows
- Add status filters and real-time polling
- Integrate with dashboard and schedule views
- Add responsive design and navigation badge
- Complete end-to-end testing

Closes ROADMAP.md Q4 2025 Operations - Pending Orders Queue task"
```

**Step 3: Push to GitHub**

Run: `git push origin main`
Expected: Push succeeds

**Step 4: Verify Vercel auto-deploy**

1. Check https://sailorskills-operations.vercel.app
2. Wait for deployment to complete (2-3 minutes)
3. Test pending orders view in production
4. Expected: All features work correctly

**Step 5: Update ROADMAP.md**

Mark the "Pending Orders Queue & Confirmation Workflow" task as complete with today's date.

```bash
cd /Users/brian/app-development/sailorskills-repos
# Edit ROADMAP.md to mark task complete
git add ROADMAP.md
git commit -m "docs: mark pending orders queue feature as complete"
git push origin main
```

---

## Task 18: Create Handoff Documentation

**Files:**
- Create: `sailorskills-operations/PENDING_ORDERS_FEATURE.md`

**Step 1: Write feature documentation**

Create comprehensive documentation:

```markdown
# Pending Orders Queue Feature

## Overview
The Pending Orders Queue provides a dedicated inbox for incoming service orders from the Estimator, allowing admin staff to review, confirm, decline, and schedule services with proper workflow management.

## User Guide

### Accessing Pending Orders
- Navigate to **Operations → Pending Orders**
- Badge shows count of pending orders requiring attention

### Order Management Actions

#### Confirm & Schedule
1. Click "✓ Confirm & Schedule" on pending order
2. Select scheduled date (must be today or future)
3. Optionally add scheduling notes
4. Click "Confirm & Schedule"
5. Order moves to "confirmed" status and appears on calendar

#### Decline Order
1. Click "✕ Decline" on pending order
2. Enter required reason for declining
3. Click "Decline Order"
4. Order moves to "cancelled" status
5. Customer notification triggered (TODO: implement)

#### Contact Customer
1. Click "📧 Contact Customer"
2. View customer contact details
3. Click email/phone links to initiate contact

#### View Details
1. Click "👁 Details" on any order
2. View comprehensive order information including:
   - Order number, status, dates
   - Customer contact info
   - Boat specifications
   - Service details and pricing
   - Location (marina, dock, slip)
   - Notes and metadata

### Filtering
- **Pending Only**: Default view, shows orders needing action
- **Confirmed**: Shows orders scheduled but not yet started
- **All Orders**: Shows all orders regardless of status
- **Cancelled**: Shows declined/cancelled orders

### Auto-Refresh
- View automatically refreshes every 60 seconds when active
- Manual refresh available via "🔄 Refresh" button

## Technical Details

### Database
- Uses existing `service_orders` table
- Status flow: `pending` → `confirmed` → `in_progress` → `completed`
- Decline sets status to `cancelled` with reason in notes

### Status Values
- `pending`: New order from Estimator, needs review
- `confirmed`: Admin confirmed and scheduled date
- `in_progress`: Service currently being performed
- `completed`: Service finished
- `cancelled`: Order declined or cancelled

### Integration Points
- **Dashboard**: Shows pending count widget
- **Schedule View**: Confirmed orders appear on calendar
- **Service Logs**: Completed services link to logs

### Notifications (TODO)
- Customer email on order confirmation with scheduled date
- Customer email on order decline with reason
- Admin notification on new pending order arrival

## Future Enhancements
- Batch confirm multiple orders
- Drag-and-drop to schedule (calendar integration)
- SMS notifications
- Customer portal showing order status
- Conflict detection (double-booking prevention)

## Testing
See `/docs/plans/2025-10-30-pending-orders-queue.md` for comprehensive test plan.
```

**Step 2: Commit**

```bash
git add sailorskills-operations/PENDING_ORDERS_FEATURE.md
git commit -m "docs: add pending orders feature documentation"
git push origin main
```

---

## Completion Checklist

- [ ] Task 1: Create pending orders view file
- [ ] Task 2: Add HTML view section
- [ ] Task 3: Add navigation link with badge
- [ ] Task 4: Initialize view in main.js
- [ ] Task 5: Add CSS styles
- [ ] Task 6: Test basic view loading
- [ ] Task 7: Test confirm & schedule flow
- [ ] Task 8: Test decline flow
- [ ] Task 9: Test contact customer modal
- [ ] Task 10: Test view details modal
- [ ] Task 11: Test filter functionality
- [ ] Task 12: Test refresh button
- [ ] Task 13: Test responsive design
- [ ] Task 14: Integration test with schedule view
- [ ] Task 15: Add dashboard widget
- [ ] Task 16: Final end-to-end test
- [ ] Task 17: Build and deploy to Vercel
- [ ] Task 18: Create handoff documentation

---

## Success Criteria

✅ **Functional Requirements:**
- Pending orders display in dedicated view
- Admins can confirm & schedule orders with date picker
- Admins can decline orders with required reason
- Admins can contact customers via email/phone
- Admins can view comprehensive order details
- Status filters work correctly
- Navigation badge shows accurate pending count
- Auto-refresh updates data every 60 seconds

✅ **Integration Requirements:**
- Dashboard shows pending orders count widget
- Confirmed orders appear on schedule calendar
- Database updates correctly on all actions
- Status workflow functions: pending → confirmed → cancelled

✅ **Quality Requirements:**
- No console errors
- Responsive design works on mobile/tablet/desktop
- Forms validate correctly
- Modals open/close cleanly
- Toast notifications appear on actions
- Production deployment successful

✅ **Documentation Requirements:**
- Feature documentation created
- Code committed with clear messages
- ROADMAP.md updated
- Testing completed successfully

---

**Estimated Total Time:** 6-8 hours
- Development: 3-4 hours
- Testing: 2-3 hours
- Documentation: 1 hour

**Dependencies:** None - all required tables and infrastructure exist

**Risk Factors:** Low - uses existing patterns and components from service-requests view
