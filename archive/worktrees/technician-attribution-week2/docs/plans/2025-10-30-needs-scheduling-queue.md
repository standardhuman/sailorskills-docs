# "Needs Scheduling" Queue & Quick Add Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a quick-capture system for ad-hoc service requests (phone calls, emails, in-person) that allows admins to add boats to a "needs scheduling" queue without immediately committing to a date. Later, review the queue and batch-schedule multiple boats together.

**Architecture:** Create new `scheduling_queue` table to hold unscheduled service requests. Add prominent "+ Needs Scheduling" button that opens quick-add modal (boat search, service type dropdown, priority, notes). Build queue view showing all pending boats with filters, sorting, and actions. "Schedule Now" button opens date picker and creates `service_order`. This solves the workflow gap where ad-hoc requests have no capture mechanism.

**Tech Stack:** Vanilla JS, Supabase (PostgreSQL), Vite, shared components (modal, toast), typeahead search for boats

---

## Database Schema

**New table: `scheduling_queue`**

```sql
CREATE TABLE scheduling_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'low')),
  notes TEXT,
  target_date_start DATE,
  target_date_end DATE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID, -- Future: reference to staff table
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'removed')),
  scheduled_service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_scheduling_queue_status ON scheduling_queue(status);
CREATE INDEX idx_scheduling_queue_boat ON scheduling_queue(boat_id);
CREATE INDEX idx_scheduling_queue_priority ON scheduling_queue(priority);
CREATE INDEX idx_scheduling_queue_added_at ON scheduling_queue(added_at DESC);

-- RLS policies (admin only)
ALTER TABLE scheduling_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to scheduling queue"
  ON scheduling_queue
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
```

---

## Task 1: Create Database Migration

**Files:**
- Create: `sailorskills-operations/database/migrations/create_scheduling_queue.sql`

**Step 1: Write migration SQL**

Create the migration file with the schema above:

```sql
-- Migration: Create scheduling_queue table
-- Created: 2025-10-30
-- Purpose: Ad-hoc service request capture without immediate scheduling

CREATE TABLE IF NOT EXISTS scheduling_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('urgent', 'normal', 'low')),
  notes TEXT,
  target_date_start DATE,
  target_date_end DATE,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'scheduled', 'removed')),
  scheduled_service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_scheduling_queue_status ON scheduling_queue(status);
CREATE INDEX idx_scheduling_queue_boat ON scheduling_queue(boat_id);
CREATE INDEX idx_scheduling_queue_priority ON scheduling_queue(priority);
CREATE INDEX idx_scheduling_queue_added_at ON scheduling_queue(added_at DESC);

-- RLS policies (admin only)
ALTER TABLE scheduling_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to scheduling queue"
  ON scheduling_queue
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE scheduling_queue IS 'Queue for ad-hoc service requests that need scheduling';
COMMENT ON COLUMN scheduling_queue.priority IS 'urgent, normal, or low';
COMMENT ON COLUMN scheduling_queue.status IS 'pending (not scheduled), scheduled (converted to service_order), or removed (cancelled)';
COMMENT ON COLUMN scheduling_queue.target_date_start IS 'Optional: earliest acceptable date for service';
COMMENT ON COLUMN scheduling_queue.target_date_end IS 'Optional: latest acceptable date for service (e.g., "sometime in next 2 weeks")';
```

**Step 2: Run migration**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -f sailorskills-operations/database/migrations/create_scheduling_queue.sql`

Expected: Output shows "CREATE TABLE", "CREATE INDEX", "CREATE POLICY" success messages

**Step 3: Verify table created**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'scheduling_queue'"`

Expected: Shows all columns from schema

**Step 4: Commit**

```bash
git add sailorskills-operations/database/migrations/create_scheduling_queue.sql
git commit -m "feat(operations): add scheduling_queue table for ad-hoc service capture"
```

---

## Task 2: Create Needs Scheduling View File

**Files:**
- Create: `sailorskills-operations/src/views/needs-scheduling.js`

**Step 1: Write the needs scheduling view module**

Create the view file with queue management logic:

```javascript
// Needs Scheduling View - Quick capture and queue management for ad-hoc service requests

let queueItems = [];
let boats = [];
let customers = [];

export async function initNeedsSchedulingView() {
  await loadBoatsForSearch();
  await loadQueueItems();
  setupEventHandlers();
}

async function loadBoatsForSearch() {
  try {
    const { data, error } = await window.app.supabase
      .from('boats')
      .select(`
        id,
        boat_name,
        customer:customers(id, name, email, phone)
      `)
      .order('boat_name');

    if (error) throw error;

    boats = data || [];

  } catch (error) {
    console.error('Error loading boats:', error);
  }
}

async function loadQueueItems() {
  const container = document.getElementById('scheduling-queue-list');
  container.innerHTML = '<div class="loading">Loading queue...</div>';

  try {
    // Get filter values
    const priorityFilter = document.getElementById('queue-priority-filter')?.value;
    const serviceFilter = document.getElementById('queue-service-filter')?.value;
    const sortBy = document.getElementById('queue-sort')?.value || 'added_at';

    // Build query
    let query = window.app.supabase
      .from('scheduling_queue')
      .select(`
        *,
        boat:boats(id, boat_name, boat_type, boat_length),
        customer:customers(id, name, email, phone)
      `)
      .eq('status', 'pending');

    // Apply filters
    if (priorityFilter && priorityFilter !== 'all') {
      query = query.eq('priority', priorityFilter);
    }

    if (serviceFilter && serviceFilter !== 'all') {
      query = query.eq('service_type', serviceFilter);
    }

    // Apply sorting
    if (sortBy === 'priority') {
      // Custom sort: urgent > normal > low
      query = query.order('priority', { ascending: true });
    } else if (sortBy === 'boat_name') {
      // Will need to sort client-side since joining boat table
    } else {
      query = query.order('added_at', { ascending: false });
    }

    const { data: items, error } = await query;

    if (error) throw error;

    queueItems = items || [];

    // Client-side sorting if needed
    if (sortBy === 'boat_name') {
      queueItems.sort((a, b) => {
        const nameA = a.boat?.boat_name || '';
        const nameB = b.boat?.boat_name || '';
        return nameA.localeCompare(nameB);
      });
    } else if (sortBy === 'priority') {
      // Custom priority sort
      const priorityOrder = { urgent: 1, normal: 2, low: 3 };
      queueItems.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    }

    // Update badge
    updateQueueBadge(queueItems.length);

    // Render items
    if (queueItems.length === 0) {
      container.innerHTML = '<p class="no-results">No boats waiting to be scheduled</p>';
      return;
    }

    container.innerHTML = `
      <div class="queue-items-list">
        ${queueItems.map(item => renderQueueItem(item)).join('')}
      </div>
    `;

    // Attach event handlers
    attachQueueEventHandlers();

  } catch (error) {
    console.error('Error loading queue:', error);
    container.innerHTML = '<p class="error">Error loading queue</p>';
  }
}

function renderQueueItem(item) {
  const priorityClass = getPriorityClass(item.priority);
  const daysWaiting = Math.floor((new Date() - new Date(item.added_at)) / (1000 * 60 * 60 * 24));

  return `
    <div class="queue-item ${priorityClass}" data-item-id="${item.id}">
      <div class="queue-item-header">
        <div class="queue-item-boat">
          <strong>${item.boat?.boat_name || 'Unknown Boat'}</strong>
          ${item.boat?.boat_type ? `<span class="boat-type">(${item.boat.boat_type})</span>` : ''}
        </div>
        <div class="queue-item-badges">
          <span class="priority-badge priority-${item.priority}">${item.priority}</span>
          ${daysWaiting > 0 ? `<span class="waiting-badge">${daysWaiting}d waiting</span>` : ''}
        </div>
      </div>

      <div class="queue-item-body">
        <div class="queue-item-details">
          <div class="detail-item">
            <span class="detail-icon">👤</span>
            <span class="detail-text">${item.customer?.name || 'Unknown Customer'}</span>
          </div>
          <div class="detail-item">
            <span class="detail-icon">🔧</span>
            <span class="detail-text">${item.service_type}</span>
          </div>
          ${item.target_date_start || item.target_date_end ? `
            <div class="detail-item">
              <span class="detail-icon">📅</span>
              <span class="detail-text">
                ${item.target_date_start ? formatDate(item.target_date_start) : 'ASAP'}
                ${item.target_date_end ? ` - ${formatDate(item.target_date_end)}` : ''}
              </span>
            </div>
          ` : ''}
        </div>

        ${item.notes ? `
          <div class="queue-item-notes">
            <span class="notes-icon">💬</span>
            <span class="notes-text">${escapeHtml(item.notes)}</span>
          </div>
        ` : ''}
      </div>

      <div class="queue-item-footer">
        <div class="queue-item-time">
          Added ${formatQueueTime(item.added_at)}
        </div>
        <div class="queue-item-actions">
          <button class="btn btn-sm btn-primary schedule-now-btn" data-item-id="${item.id}">
            📅 Schedule Now
          </button>
          <button class="btn btn-sm btn-secondary edit-item-btn" data-item-id="${item.id}">
            ✏️ Edit
          </button>
          <button class="btn btn-sm btn-danger remove-item-btn" data-item-id="${item.id}">
            ✕ Remove
          </button>
        </div>
      </div>
    </div>
  `;
}

function attachQueueEventHandlers() {
  // Schedule Now buttons
  document.querySelectorAll('.schedule-now-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const itemId = e.target.dataset.itemId;
      await openScheduleModal(itemId);
    });
  });

  // Edit buttons
  document.querySelectorAll('.edit-item-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const itemId = e.target.dataset.itemId;
      await openEditModal(itemId);
    });
  });

  // Remove buttons
  document.querySelectorAll('.remove-item-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const itemId = e.target.dataset.itemId;
      if (confirm('Remove this boat from the scheduling queue?')) {
        await removeQueueItem(itemId);
      }
    });
  });
}

async function openQuickAddModal() {
  const { openFormModal, closeModal } = await import('../components/modal.js');
  const { showToast } = await import('../components/toast.js');

  const formContent = `
    <div class="form-group">
      <label for="quick-add-boat">Boat *</label>
      <input type="text" id="quick-add-boat" class="form-control" placeholder="Search boat name..." autocomplete="off" required>
      <div id="boat-search-results" class="search-results"></div>
      <input type="hidden" id="selected-boat-id">
      <input type="hidden" id="selected-customer-id">
    </div>

    <div class="form-group">
      <label for="quick-add-service">Service Type *</label>
      <select id="quick-add-service" class="form-control" required>
        <option value="">Select service...</option>
        <option value="Diving">Diving</option>
        <option value="Cleaning & Anodes">Cleaning & Anodes</option>
        <option value="Anodes Only">Anodes Only</option>
        <option value="Pressure Washing">Pressure Washing</option>
        <option value="Bottom Painting">Bottom Painting</option>
        <option value="Paint & Bottom">Paint & Bottom</option>
        <option value="Propeller Service">Propeller Service</option>
        <option value="Inspection">Inspection</option>
        <option value="Maintenance">Maintenance</option>
        <option value="Other">Other</option>
      </select>
    </div>

    <div class="form-group">
      <label for="quick-add-priority">Priority *</label>
      <select id="quick-add-priority" class="form-control" required>
        <option value="normal" selected>Normal</option>
        <option value="urgent">Urgent</option>
        <option value="low">Low Priority</option>
      </select>
    </div>

    <div class="form-group">
      <label for="quick-add-target-range">Target Date Range (optional)</label>
      <div class="date-range-inputs">
        <input type="date" id="quick-add-target-start" class="form-control" placeholder="Earliest">
        <span class="date-range-separator">to</span>
        <input type="date" id="quick-add-target-end" class="form-control" placeholder="Latest">
      </div>
      <small class="form-text">e.g., "sometime in next 2 weeks"</small>
    </div>

    <div class="form-group">
      <label for="quick-add-notes">Notes (optional)</label>
      <textarea id="quick-add-notes" class="form-control" rows="3" placeholder="Customer request details, special requirements..."></textarea>
    </div>
  `;

  await openFormModal(
    '+ Add to Needs Scheduling Queue',
    formContent,
    {
      submitLabel: 'Add to Queue',
      onOpen: (modal) => {
        setupBoatTypeahead(modal);
      },
      onSubmit: async (form) => {
        const boatId = form.querySelector('#selected-boat-id').value;
        const customerId = form.querySelector('#selected-customer-id').value;
        const serviceType = form.querySelector('#quick-add-service').value;
        const priority = form.querySelector('#quick-add-priority').value;
        const targetStart = form.querySelector('#quick-add-target-start').value || null;
        const targetEnd = form.querySelector('#quick-add-target-end').value || null;
        const notes = form.querySelector('#quick-add-notes').value.trim();

        if (!boatId) {
          showToast('Please select a boat', 'error');
          return;
        }

        if (!serviceType) {
          showToast('Please select a service type', 'error');
          return;
        }

        try {
          const { error } = await window.app.supabase
            .from('scheduling_queue')
            .insert({
              boat_id: boatId,
              customer_id: customerId,
              service_type: serviceType,
              priority: priority,
              target_date_start: targetStart,
              target_date_end: targetEnd,
              notes: notes || null
            });

          if (error) throw error;

          showToast('Added to scheduling queue!', 'success');
          await closeModal();
          await loadQueueItems();

        } catch (error) {
          console.error('Error adding to queue:', error);
          showToast('Failed to add to queue', 'error');
          throw error;
        }
      }
    }
  );
}

function setupBoatTypeahead(modal) {
  const input = modal.querySelector('#quick-add-boat');
  const resultsContainer = modal.querySelector('#boat-search-results');
  const boatIdInput = modal.querySelector('#selected-boat-id');
  const customerIdInput = modal.querySelector('#selected-customer-id');

  let searchTimeout;

  input.addEventListener('input', (e) => {
    const query = e.target.value.trim().toLowerCase();

    clearTimeout(searchTimeout);

    if (query.length < 2) {
      resultsContainer.innerHTML = '';
      resultsContainer.style.display = 'none';
      boatIdInput.value = '';
      customerIdInput.value = '';
      return;
    }

    searchTimeout = setTimeout(() => {
      const matches = boats.filter(boat => {
        const boatName = (boat.boat_name || '').toLowerCase();
        const customerName = (boat.customer?.name || '').toLowerCase();
        return boatName.includes(query) || customerName.includes(query);
      }).slice(0, 10);

      if (matches.length === 0) {
        resultsContainer.innerHTML = '<div class="search-result-item no-match">No boats found</div>';
        resultsContainer.style.display = 'block';
        return;
      }

      resultsContainer.innerHTML = matches.map(boat => `
        <div class="search-result-item" data-boat-id="${boat.id}" data-customer-id="${boat.customer?.id || ''}">
          <div class="search-result-boat">${boat.boat_name}</div>
          <div class="search-result-customer">${boat.customer?.name || 'Unknown Customer'}</div>
        </div>
      `).join('');

      resultsContainer.style.display = 'block';

      // Attach click handlers
      resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
        if (!item.classList.contains('no-match')) {
          item.addEventListener('click', () => {
            const selectedBoat = matches.find(b => b.id === item.dataset.boatId);
            if (selectedBoat) {
              input.value = selectedBoat.boat_name;
              boatIdInput.value = selectedBoat.id;
              customerIdInput.value = selectedBoat.customer?.id || '';
              resultsContainer.innerHTML = '';
              resultsContainer.style.display = 'none';
            }
          });
        }
      });
    }, 300);
  });

  // Close results when clicking outside
  document.addEventListener('click', (e) => {
    if (!input.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.innerHTML = '';
      resultsContainer.style.display = 'none';
    }
  });
}

async function openScheduleModal(itemId) {
  const item = queueItems.find(i => i.id === itemId);
  if (!item) return;

  const { openFormModal, closeModal } = await import('../components/modal.js');
  const { showToast } = await import('../components/toast.js');

  const today = new Date().toISOString().split('T')[0];
  const suggestedDate = item.target_date_start || today;

  const formContent = `
    <div class="schedule-info">
      <p><strong>Boat:</strong> ${item.boat?.boat_name}</p>
      <p><strong>Customer:</strong> ${item.customer?.name}</p>
      <p><strong>Service:</strong> ${item.service_type}</p>
    </div>

    <div class="form-group">
      <label for="schedule-date">Scheduled Date *</label>
      <input type="date" id="schedule-date" class="form-control" value="${suggestedDate}" min="${today}" required>
    </div>

    <div class="form-group">
      <label for="schedule-notes">Additional Notes (optional)</label>
      <textarea id="schedule-notes" class="form-control" rows="3">${item.notes || ''}</textarea>
    </div>
  `;

  await openFormModal(
    `Schedule: ${item.boat?.boat_name}`,
    formContent,
    {
      submitLabel: 'Schedule Service',
      onSubmit: async (form) => {
        const scheduledDate = form.querySelector('#schedule-date').value;
        const notes = form.querySelector('#schedule-notes').value.trim();

        if (!scheduledDate) {
          showToast('Please select a date', 'error');
          return;
        }

        try {
          // Create service_order
          const { data: serviceOrder, error: orderError } = await window.app.supabase
            .from('service_orders')
            .insert({
              customer_id: item.customer_id,
              boat_id: item.boat_id,
              service_type: item.service_type,
              scheduled_date: scheduledDate,
              status: 'confirmed',
              notes: notes || item.notes,
              order_number: `ORD-${Date.now()}`
            })
            .select()
            .single();

          if (orderError) throw orderError;

          // Update queue item status
          const { error: updateError } = await window.app.supabase
            .from('scheduling_queue')
            .update({
              status: 'scheduled',
              scheduled_service_order_id: serviceOrder.id,
              updated_at: new Date().toISOString()
            })
            .eq('id', itemId);

          if (updateError) throw updateError;

          showToast('Service scheduled!', 'success');
          await closeModal();
          await loadQueueItems();

        } catch (error) {
          console.error('Error scheduling service:', error);
          showToast('Failed to schedule service', 'error');
          throw error;
        }
      }
    }
  );
}

async function openEditModal(itemId) {
  const item = queueItems.find(i => i.id === itemId);
  if (!item) return;

  const { openFormModal, closeModal } = await import('../components/modal.js');
  const { showToast } = await import('../components/toast.js');

  const formContent = `
    <div class="form-group">
      <label>Boat</label>
      <input type="text" class="form-control" value="${item.boat?.boat_name}" disabled>
    </div>

    <div class="form-group">
      <label for="edit-service">Service Type *</label>
      <select id="edit-service" class="form-control" required>
        <option value="Diving" ${item.service_type === 'Diving' ? 'selected' : ''}>Diving</option>
        <option value="Cleaning & Anodes" ${item.service_type === 'Cleaning & Anodes' ? 'selected' : ''}>Cleaning & Anodes</option>
        <option value="Anodes Only" ${item.service_type === 'Anodes Only' ? 'selected' : ''}>Anodes Only</option>
        <option value="Pressure Washing" ${item.service_type === 'Pressure Washing' ? 'selected' : ''}>Pressure Washing</option>
        <option value="Bottom Painting" ${item.service_type === 'Bottom Painting' ? 'selected' : ''}>Bottom Painting</option>
        <option value="Paint & Bottom" ${item.service_type === 'Paint & Bottom' ? 'selected' : ''}>Paint & Bottom</option>
        <option value="Propeller Service" ${item.service_type === 'Propeller Service' ? 'selected' : ''}>Propeller Service</option>
        <option value="Inspection" ${item.service_type === 'Inspection' ? 'selected' : ''}>Inspection</option>
        <option value="Maintenance" ${item.service_type === 'Maintenance' ? 'selected' : ''}>Maintenance</option>
        <option value="Other" ${item.service_type === 'Other' ? 'selected' : ''}>Other</option>
      </select>
    </div>

    <div class="form-group">
      <label for="edit-priority">Priority *</label>
      <select id="edit-priority" class="form-control" required>
        <option value="normal" ${item.priority === 'normal' ? 'selected' : ''}>Normal</option>
        <option value="urgent" ${item.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
        <option value="low" ${item.priority === 'low' ? 'selected' : ''}>Low Priority</option>
      </select>
    </div>

    <div class="form-group">
      <label for="edit-target-range">Target Date Range (optional)</label>
      <div class="date-range-inputs">
        <input type="date" id="edit-target-start" class="form-control" value="${item.target_date_start || ''}">
        <span class="date-range-separator">to</span>
        <input type="date" id="edit-target-end" class="form-control" value="${item.target_date_end || ''}">
      </div>
    </div>

    <div class="form-group">
      <label for="edit-notes">Notes (optional)</label>
      <textarea id="edit-notes" class="form-control" rows="3">${item.notes || ''}</textarea>
    </div>
  `;

  await openFormModal(
    `Edit: ${item.boat?.boat_name}`,
    formContent,
    {
      submitLabel: 'Update',
      onSubmit: async (form) => {
        const serviceType = form.querySelector('#edit-service').value;
        const priority = form.querySelector('#edit-priority').value;
        const targetStart = form.querySelector('#edit-target-start').value || null;
        const targetEnd = form.querySelector('#edit-target-end').value || null;
        const notes = form.querySelector('#edit-notes').value.trim();

        try {
          const { error } = await window.app.supabase
            .from('scheduling_queue')
            .update({
              service_type: serviceType,
              priority: priority,
              target_date_start: targetStart,
              target_date_end: targetEnd,
              notes: notes || null,
              updated_at: new Date().toISOString()
            })
            .eq('id', itemId);

          if (error) throw error;

          showToast('Queue item updated!', 'success');
          await closeModal();
          await loadQueueItems();

        } catch (error) {
          console.error('Error updating queue item:', error);
          showToast('Failed to update queue item', 'error');
          throw error;
        }
      }
    }
  );
}

async function removeQueueItem(itemId) {
  try {
    const { error } = await window.app.supabase
      .from('scheduling_queue')
      .update({
        status: 'removed',
        updated_at: new Date().toISOString()
      })
      .eq('id', itemId);

    if (error) throw error;

    const { showToast } = await import('../components/toast.js');
    showToast('Removed from queue', 'success');
    await loadQueueItems();

  } catch (error) {
    console.error('Error removing queue item:', error);
    const { showToast } = await import('../components/toast.js');
    showToast('Failed to remove item', 'error');
  }
}

function setupEventHandlers() {
  // Quick Add button
  const quickAddBtn = document.getElementById('quick-add-btn');
  if (quickAddBtn) {
    quickAddBtn.addEventListener('click', openQuickAddModal);
  }

  // Refresh button
  const refreshBtn = document.getElementById('refresh-queue-btn');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', loadQueueItems);
  }

  // Filter and sort handlers
  const priorityFilter = document.getElementById('queue-priority-filter');
  const serviceFilter = document.getElementById('queue-service-filter');
  const sortSelect = document.getElementById('queue-sort');

  if (priorityFilter) {
    priorityFilter.addEventListener('change', loadQueueItems);
  }

  if (serviceFilter) {
    serviceFilter.addEventListener('change', loadQueueItems);
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', loadQueueItems);
  }
}

function updateQueueBadge(count) {
  const badge = document.getElementById('nav-scheduling-badge');
  if (badge) {
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline';
    } else {
      badge.style.display = 'none';
    }
  }
}

function getPriorityClass(priority) {
  return `priority-${priority}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatQueueTime(timestamp) {
  const date = new Date(timestamp);
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
git add sailorskills-operations/src/views/needs-scheduling.js
git commit -m "feat(operations): add needs scheduling view with queue management"
```

---

## Task 3: Add HTML View Section

**Files:**
- Modify: `sailorskills-operations/index.html` (add after pending-orders-view section)

**Step 1: Add needs scheduling view HTML**

```html
<!-- Needs Scheduling View -->
<section id="needs-scheduling-view" class="view">
  <h2>Needs Scheduling Queue</h2>

  <div class="view-controls">
    <div class="filters">
      <select id="queue-priority-filter" class="form-control">
        <option value="all">All Priorities</option>
        <option value="urgent">Urgent</option>
        <option value="normal">Normal</option>
        <option value="low">Low Priority</option>
      </select>

      <select id="queue-service-filter" class="form-control">
        <option value="all">All Services</option>
        <option value="Diving">Diving</option>
        <option value="Cleaning & Anodes">Cleaning & Anodes</option>
        <option value="Anodes Only">Anodes Only</option>
        <option value="Pressure Washing">Pressure Washing</option>
        <option value="Bottom Painting">Bottom Painting</option>
        <option value="Paint & Bottom">Paint & Bottom</option>
        <option value="Propeller Service">Propeller Service</option>
        <option value="Inspection">Inspection</option>
        <option value="Maintenance">Maintenance</option>
        <option value="Other">Other</option>
      </select>

      <select id="queue-sort" class="form-control">
        <option value="added_at">Most Recent</option>
        <option value="priority">Priority</option>
        <option value="boat_name">Boat Name</option>
      </select>
    </div>

    <div class="actions">
      <button id="quick-add-btn" class="btn btn-success">
        + Add to Queue
      </button>
      <button id="refresh-queue-btn" class="btn btn-secondary">
        🔄 Refresh
      </button>
    </div>
  </div>

  <div id="scheduling-queue-list" class="list-container">
    <div class="loading">Loading queue...</div>
  </div>
</section>
```

**Step 2: Commit**

```bash
git add sailorskills-operations/index.html
git commit -m "feat(operations): add needs scheduling view HTML section"
```

---

## Task 4: Add Navigation Link

**Files:**
- Modify: `sailorskills-operations/index.html:120-132` (sub-nav section)

**Step 1: Add needs scheduling nav link**

Add after schedule link:

```html
<a href="#needs-scheduling">Needs Scheduling <span id="nav-scheduling-badge" class="nav-badge" style="display: none;">0</span></a>
```

**Step 2: Commit**

```bash
git add sailorskills-operations/index.html
git commit -m "feat(operations): add needs scheduling navigation link with badge"
```

---

## Task 5: Initialize View in Main.js

**Files:**
- Modify: `sailorskills-operations/src/main.js`

**Step 1: Add import**

```javascript
import { initNeedsSchedulingView } from './views/needs-scheduling.js';
```

**Step 2: Add view initialization**

```javascript
case 'needs-scheduling':
  await initNeedsSchedulingView();
  break;
```

**Step 3: Commit**

```bash
git add sailorskills-operations/src/main.js
git commit -m "feat(operations): wire up needs scheduling view initialization"
```

---

## Task 6: Add CSS Styles

**Files:**
- Modify: `sailorskills-operations/styles/main.css`

**Step 1: Add styles**

```css
/* Needs Scheduling Queue View */
.queue-items-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 1.5rem;
}

.queue-item {
  background: white;
  border: 2px solid var(--ss-border-subtle);
  border-left-width: 4px;
  border-radius: 0;
  padding: 1.25rem;
  transition: all 0.2s ease;
}

.queue-item:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

/* Priority border colors */
.queue-item.priority-urgent {
  border-left-color: var(--ss-danger);
}

.queue-item.priority-normal {
  border-left-color: var(--ss-info);
}

.queue-item.priority-low {
  border-left-color: var(--ss-text-light);
}

.queue-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--ss-border-subtle);
}

.queue-item-boat {
  font-size: 1.2rem;
  color: var(--ss-text-dark);
}

.boat-type {
  font-size: 0.9rem;
  color: var(--ss-text-medium);
  font-weight: normal;
  margin-left: 0.5rem;
}

.queue-item-badges {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.priority-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.priority-badge.priority-urgent {
  background-color: var(--ss-danger);
  color: white;
}

.priority-badge.priority-normal {
  background-color: var(--ss-info);
  color: white;
}

.priority-badge.priority-low {
  background-color: #e9ecef;
  color: var(--ss-text-medium);
}

.waiting-badge {
  padding: 0.25rem 0.5rem;
  background-color: #fff3cd;
  color: #856404;
  border-radius: 0;
  font-size: 0.75rem;
  font-weight: 600;
}

.queue-item-body {
  margin-bottom: 1rem;
}

.queue-item-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.detail-icon {
  font-size: 1.1rem;
  width: 24px;
  text-align: center;
}

.detail-text {
  color: var(--ss-text-dark);
  font-size: 0.95rem;
}

.queue-item-notes {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-left: 3px solid var(--ss-info);
  display: flex;
  gap: 0.5rem;
}

.notes-icon {
  font-size: 1.1rem;
}

.notes-text {
  flex: 1;
  color: var(--ss-text-medium);
  font-size: 0.9rem;
  line-height: 1.5;
}

.queue-item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid var(--ss-border-subtle);
}

.queue-item-time {
  font-size: 0.85rem;
  color: var(--ss-text-light);
}

.queue-item-actions {
  display: flex;
  gap: 0.5rem;
}

.queue-item-actions .btn-sm {
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}

/* Boat Search Typeahead */
.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: white;
  border: 2px solid var(--ss-border-subtle);
  border-top: none;
  max-height: 300px;
  overflow-y: auto;
  z-index: 1000;
  display: none;
}

.search-result-item {
  padding: 0.75rem;
  cursor: pointer;
  border-bottom: 1px solid var(--ss-border-subtle);
  transition: background-color 0.15s ease;
}

.search-result-item:hover {
  background-color: #f8f9fa;
}

.search-result-item.no-match {
  cursor: default;
  color: var(--ss-text-light);
  text-align: center;
}

.search-result-item.no-match:hover {
  background-color: white;
}

.search-result-boat {
  font-weight: 600;
  color: var(--ss-text-dark);
  margin-bottom: 0.25rem;
}

.search-result-customer {
  font-size: 0.9rem;
  color: var(--ss-text-medium);
}

/* Date Range Inputs */
.date-range-inputs {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.date-range-inputs input {
  flex: 1;
}

.date-range-separator {
  color: var(--ss-text-medium);
  font-size: 0.9rem;
}

/* Schedule Info in Modal */
.schedule-info {
  padding: 1rem;
  background-color: #f8f9fa;
  border-left: 3px solid var(--ss-info);
  margin-bottom: 1.5rem;
}

.schedule-info p {
  margin: 0.5rem 0;
  color: var(--ss-text-dark);
}

.schedule-info p:first-child {
  margin-top: 0;
}

.schedule-info p:last-child {
  margin-bottom: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .queue-item-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .queue-item-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .queue-item-actions {
    width: 100%;
    flex-direction: column;
  }

  .queue-item-actions .btn-sm {
    width: 100%;
  }

  .date-range-inputs {
    flex-direction: column;
  }

  .date-range-separator {
    display: none;
  }
}
```

**Step 2: Commit**

```bash
git add sailorskills-operations/styles/main.css
git commit -m "feat(operations): add needs scheduling queue styles with priority colors"
```

---

## Task 7: Test Database Migration

**Files:**
- No new files

**Step 1: Verify table exists**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -c "\d scheduling_queue"`

Expected: Shows table structure with all columns

**Step 2: Test insert**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM scheduling_queue"`

Expected: Returns 0 (empty table)

**Step 3: Document success**

---

## Task 8: Test Quick Add Flow

**Files:**
- No new files

**Step 1: Start dev server and navigate to Needs Scheduling**

Run: `npm run dev`
Navigate to http://localhost:5173, log in, click "Needs Scheduling"

**Step 2: Click "+ Add to Queue" button**

Expected: Modal opens with form fields:
- Boat search (typeahead)
- Service type dropdown
- Priority dropdown (default: Normal)
- Target date range (optional)
- Notes textarea (optional)

**Step 3: Test boat typeahead**

1. Type "sea" in boat search
2. Expected: Dropdown shows boats matching "sea"
3. Click a boat
4. Expected: Boat name fills input, dropdown closes

**Step 4: Fill form and submit**

1. Select service type: "Pressure Washing"
2. Select priority: "Normal"
3. Add note: "Customer called requesting service"
4. Click "Add to Queue"
5. Expected:
   - Toast: "Added to scheduling queue!"
   - Modal closes
   - Item appears in queue list
   - Badge shows "1"

**Step 5: Verify database**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -c "SELECT boat_id, service_type, priority, status FROM scheduling_queue WHERE status='pending'"`

Expected: Shows newly added item

---

## Task 9: Test Schedule Now Flow

**Files:**
- No new files

**Step 1: Click "Schedule Now" on queue item**

Expected: Modal opens with:
- Boat, customer, service info displayed
- Date picker (min: today)
- Notes textarea

**Step 2: Select date and submit**

1. Pick tomorrow's date
2. Click "Schedule Service"
3. Expected:
   - Toast: "Service scheduled!"
   - Modal closes
   - Item disappears from queue
   - Badge decrements to "0"

**Step 3: Verify service_order created**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -c "SELECT order_number, status, scheduled_date FROM service_orders ORDER BY created_at DESC LIMIT 1"`

Expected: Shows new order with status='confirmed'

**Step 4: Verify queue item updated**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -c "SELECT status, scheduled_service_order_id FROM scheduling_queue ORDER BY updated_at DESC LIMIT 1"`

Expected: Shows status='scheduled' and service_order_id populated

---

## Task 10: Test Edit Flow

**Files:**
- No new files

**Step 1: Add another item to queue**

Use Quick Add to add a test boat

**Step 2: Click "Edit" button**

Expected: Modal opens with pre-filled form (boat disabled, other fields editable)

**Step 3: Change priority and notes**

1. Change priority to "Urgent"
2. Add note: "Customer requested ASAP"
3. Click "Update"
4. Expected:
   - Toast: "Queue item updated!"
   - Item updates in list with red border (urgent)
   - Priority badge shows "URGENT" in red

**Step 4: Verify database update**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -c "SELECT priority, notes FROM scheduling_queue WHERE status='pending' ORDER BY updated_at DESC LIMIT 1"`

Expected: Shows updated priority and notes

---

## Task 11: Test Remove Flow

**Files:**
- No new files

**Step 1: Click "Remove" on a queue item**

Expected: Confirmation dialog appears

**Step 2: Confirm removal**

1. Click "OK" in confirmation
2. Expected:
   - Toast: "Removed from queue"
   - Item disappears from list
   - Badge decrements

**Step 3: Verify database update**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -c "SELECT status FROM scheduling_queue WHERE status='removed'"`

Expected: Shows removed item(s)

---

## Task 12: Test Filters and Sorting

**Files:**
- No new files

**Step 1: Add multiple test items with different priorities**

Add 3 items: 1 urgent, 1 normal, 1 low

**Step 2: Test priority filter**

1. Select "Urgent" - Expected: Shows only urgent items
2. Select "All Priorities" - Expected: Shows all 3 items

**Step 3: Test service type filter**

1. Add items with different service types
2. Select "Pressure Washing" - Expected: Shows only pressure washing items

**Step 4: Test sorting**

1. Select "Priority" - Expected: Urgent → Normal → Low order
2. Select "Boat Name" - Expected: Alphabetical by boat name
3. Select "Most Recent" - Expected: Newest first

---

## Task 13: Test "Days Waiting" Badge

**Files:**
- No new files

**Step 1: Create test item with backdated timestamp**

Run: `source /Users/brian/app-development/sailorskills-repos/db-env.sh && psql "$DATABASE_URL" -c "UPDATE scheduling_queue SET added_at = NOW() - INTERVAL '3 days' WHERE id = (SELECT id FROM scheduling_queue WHERE status='pending' LIMIT 1)"`

**Step 2: Refresh view**

Expected: Item shows "3d waiting" badge in yellow

---

## Task 14: Test Responsive Design

**Files:**
- No new files

**Step 1: Test mobile (375px)**

Expected:
- Queue items stack in single column
- Action buttons stack vertically
- Date range inputs stack
- Typeahead works correctly

**Step 2: Test tablet (768px)**

Expected: All content accessible and readable

---

## Task 15: Integration Test with Schedule View

**Files:**
- No new files

**Step 1: Schedule item from queue**

1. Add item to queue
2. Schedule it for next week
3. Navigate to Schedule view
4. Expected: Order appears on calendar

**Step 2: Verify integration**

Check that both views show consistent data

---

## Task 16: Add Dashboard Widget

**Files:**
- Modify: `sailorskills-operations/src/views/dashboard.js`
- Modify: `sailorskills-operations/index.html` (dashboard section)

**Step 1: Add function to dashboard.js**

```javascript
async function loadSchedulingQueueCount() {
  const container = document.getElementById('scheduling-queue-count');

  try {
    const { count, error } = await window.app.supabase
      .from('scheduling_queue')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (error) throw error;

    container.innerHTML = `
      <div class="dashboard-stat">
        <div class="stat-number">${count || 0}</div>
        <div class="stat-label">Needs Scheduling</div>
        <a href="#needs-scheduling" class="stat-link">View queue →</a>
      </div>
    `;

  } catch (error) {
    console.error('Error loading scheduling queue count:', error);
    container.innerHTML = '<p class="error">Error loading count</p>';
  }
}

// Call in main dashboard load
await loadSchedulingQueueCount();
```

**Step 2: Add HTML widget**

```html
<div class="card">
  <h3>Needs Scheduling</h3>
  <div id="scheduling-queue-count" class="card-content">
    Loading...
  </div>
</div>
```

**Step 3: Commit**

```bash
git add sailorskills-operations/src/views/dashboard.js sailorskills-operations/index.html
git commit -m "feat(operations): add scheduling queue count widget to dashboard"
```

---

## Task 17: Final End-to-End Test

**Files:**
- No new files

**Step 1: Complete workflow test**

1. Dashboard shows queue count
2. Click to open Needs Scheduling view
3. Click "+ Add to Queue"
4. Search and add a boat with pressure washing
5. Verify item appears with correct priority border
6. Edit item to change priority to urgent
7. Verify border changes to red
8. Click "Schedule Now"
9. Pick date and schedule
10. Verify item removed from queue
11. Go to Schedule view - verify order appears
12. Go back to Dashboard - verify count decremented

**Step 2: Check console for errors**

Expected: No errors

---

## Task 18: Build and Deploy

**Files:**
- No new files

**Step 1: Build**

Run: `npm run build`

**Step 2: Commit and push**

```bash
git add -A
git commit -m "feat(operations): complete needs scheduling queue & quick add

- Add scheduling_queue table for ad-hoc service requests
- Implement quick add modal with boat typeahead search
- Build queue view with priority colors and filters
- Add schedule now, edit, and remove actions
- Integrate with dashboard and schedule views
- Add days waiting indicator
- Complete responsive design

Closes ROADMAP.md Q4 2025 Operations - Needs Scheduling Queue task"
git push origin main
```

**Step 3: Verify deployment**

Check https://sailorskills-operations.vercel.app

---

## Task 19: Create Documentation

**Files:**
- Create: `sailorskills-operations/NEEDS_SCHEDULING_FEATURE.md`

**Step 1: Write documentation**

```markdown
# Needs Scheduling Queue Feature

## Overview
Quick-capture system for ad-hoc service requests (phone calls, emails, in-person) that allows immediate recording without scheduling pressure. Review and batch-schedule multiple boats together later.

## User Guide

### Quick Add
1. Click **"+ Add to Queue"** button (prominent in nav)
2. Search for boat (typeahead)
3. Select service type
4. Set priority (urgent/normal/low)
5. Optionally add target date range
6. Add notes
7. Click "Add to Queue"

Result: Boat added to queue, badge updates

### Queue Management

#### Schedule Now
- Click **"📅 Schedule Now"**
- Pick date from calendar
- Creates service_order automatically
- Removes from queue

#### Edit
- Click **"✏️ Edit"**
- Update service type, priority, dates, notes
- Cannot change boat (create new entry instead)

#### Remove
- Click **"✕ Remove"**
- Confirm removal
- Marks as removed (audit trail preserved)

### Filters
- **Priority**: All / Urgent / Normal / Low
- **Service Type**: All services or specific type
- **Sort By**: Most Recent / Priority / Boat Name

### Visual Indicators
- **Priority border colors**:
  - Red left border = Urgent
  - Blue left border = Normal
  - Gray left border = Low
- **Days waiting badge**: Shows how long boat has been in queue
- **Priority badges**: Color-coded (red/blue/gray)

## Use Cases

### Example 1: Phone Call
Customer calls: "Can you pressure wash my boat next week?"

Action:
1. Click "+ Add to Queue"
2. Search boat name
3. Service: "Pressure Washing"
4. Priority: "Normal"
5. Notes: "Customer called, flexible on date"
6. Target range: Set to next week
7. Save

Later: Review queue, pick date, schedule

### Example 2: Urgent Request
Customer emails: "Need diving service ASAP - prop fouled"

Action:
1. Quick add to queue
2. Priority: "Urgent"
3. Notes: "Prop fouled, cannot use boat"
4. Schedule immediately or flag for next available slot

### Example 3: Batch Scheduling
Monday morning: 5 boats in queue from weekend inquiries

Action:
1. Open queue view
2. Review all pending boats
3. Open personal calendar alongside
4. Schedule each boat optimally
5. Queue empties as boats scheduled

## Technical Details

### Database
- Table: `scheduling_queue`
- Status flow: `pending` → `scheduled` (or `removed`)
- Links to `service_orders` when scheduled

### Integration Points
- **Dashboard**: Shows pending count
- **Schedule View**: Scheduled items appear on calendar
- **Service Orders**: Creates order on schedule

## Future Enhancements
- Batch schedule multiple boats at once
- Drag-and-drop to calendar
- Automatic scheduling suggestions
- Customer notifications
- SMS reminders for old queue items

## Testing
See `/docs/plans/2025-10-30-needs-scheduling-queue.md` for comprehensive test plan.
```

**Step 2: Commit**

```bash
git add sailorskills-operations/NEEDS_SCHEDULING_FEATURE.md
git commit -m "docs: add needs scheduling queue feature documentation"
git push origin main
```

---

## Completion Checklist

- [ ] Task 1: Create database migration
- [ ] Task 2: Create needs scheduling view file
- [ ] Task 3: Add HTML view section
- [ ] Task 4: Add navigation link with badge
- [ ] Task 5: Initialize view in main.js
- [ ] Task 6: Add CSS styles
- [ ] Task 7: Test database migration
- [ ] Task 8: Test quick add flow with typeahead
- [ ] Task 9: Test schedule now flow
- [ ] Task 10: Test edit flow
- [ ] Task 11: Test remove flow
- [ ] Task 12: Test filters and sorting
- [ ] Task 13: Test days waiting badge
- [ ] Task 14: Test responsive design
- [ ] Task 15: Integration test with schedule view
- [ ] Task 16: Add dashboard widget
- [ ] Task 17: Final end-to-end test
- [ ] Task 18: Build and deploy
- [ ] Task 19: Create documentation

---

## Success Criteria

✅ **Functional Requirements:**
- Quick add button opens modal with boat typeahead
- Service type dropdown with all relevant services
- Priority selection with visual indicators
- Optional target date range
- Queue displays pending boats with priority colors
- Schedule now creates service_order and removes from queue
- Edit updates queue item
- Remove marks item as removed
- Filters work correctly (priority, service, sort)
- Days waiting badge displays correctly
- Navigation badge shows accurate count

✅ **Integration Requirements:**
- Dashboard shows queue count widget
- Scheduled items appear on calendar
- Database migration successful
- RLS policies enforced

✅ **Quality Requirements:**
- No console errors
- Responsive design works
- Typeahead search performs well
- Modals open/close cleanly
- Toast notifications appear
- Production deployment successful

✅ **Documentation Requirements:**
- Feature documentation created
- Code committed with clear messages
- ROADMAP.md updated
- Testing completed

---

**Estimated Total Time:** 6-8 hours
- Development: 3-4 hours
- Testing: 2-3 hours
- Documentation: 1 hour

**Dependencies:**
- Database migration (new table)
- Existing service_orders table

**Risk Factors:** Low - similar patterns to pending orders view
