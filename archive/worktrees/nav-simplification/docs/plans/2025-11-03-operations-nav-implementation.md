# Operations Navigation Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Simplify Operations navigation from 12+ items to 4 primary items using tab-based interfaces, reducing cognitive load while maintaining all functionality within ≤2 clicks.

**Architecture:** Convert existing single-page views into tab-based layouts. Consolidate related features (Schedule with Packing/Forecast/Orders/Queue, Boats with Service Logs/Paint Alerts, Customers with Messages/Requests). Aggregate badge counts for clearer notifications.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5, CSS3, React 18 (existing Schedule component), Vite, Supabase

**Design Reference:** `docs/plans/2025-11-03-operations-navigation-simplification.md`

---

## Task 1: Create Tab Navigation Component

**Files:**
- Create: `sailorskills-operations/src/components/tab-navigation.js`
- Create: `sailorskills-operations/src/styles/tab-navigation.css`

**Step 1: Write tab navigation component**

Create `sailorskills-operations/src/components/tab-navigation.js`:

```javascript
/**
 * Tab Navigation Component
 * Creates tab-based navigation for consolidating related views
 */

export class TabNavigation {
  constructor(containerId, tabs, options = {}) {
    this.container = document.getElementById(containerId);
    this.tabs = tabs; // Array of { id, label, content }
    this.options = {
      defaultTab: options.defaultTab || tabs[0]?.id,
      rememberLast: options.rememberLast !== false,
      storageKey: options.storageKey || `tab-${containerId}`,
      onTabChange: options.onTabChange || (() => {}),
      ...options
    };
    this.currentTab = null;

    this.render();
    this.bindEvents();
    this.loadInitialTab();
  }

  render() {
    // Create tab navigation HTML
    const tabNav = document.createElement('div');
    tabNav.className = 'tab-navigation';

    const tabList = document.createElement('div');
    tabList.className = 'tab-list';
    tabList.setAttribute('role', 'tablist');

    this.tabs.forEach(tab => {
      const tabButton = document.createElement('button');
      tabButton.className = 'tab-button';
      tabButton.setAttribute('role', 'tab');
      tabButton.setAttribute('data-tab-id', tab.id);
      tabButton.setAttribute('aria-selected', 'false');
      tabButton.textContent = tab.label;
      tabList.appendChild(tabButton);
    });

    tabNav.appendChild(tabList);

    // Create tab content container
    const tabContent = document.createElement('div');
    tabContent.className = 'tab-content';
    tabContent.setAttribute('role', 'tabpanel');

    this.container.innerHTML = '';
    this.container.appendChild(tabNav);
    this.container.appendChild(tabContent);
  }

  bindEvents() {
    const tabButtons = this.container.querySelectorAll('.tab-button');
    tabButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const tabId = e.target.getAttribute('data-tab-id');
        this.switchTab(tabId);
      });
    });
  }

  switchTab(tabId) {
    const tab = this.tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Update button states
    const buttons = this.container.querySelectorAll('.tab-button');
    buttons.forEach(btn => {
      const isActive = btn.getAttribute('data-tab-id') === tabId;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-selected', isActive);
    });

    // Update content
    const contentContainer = this.container.querySelector('.tab-content');

    // Find and show the target content element
    if (typeof tab.content === 'string') {
      // Content is a selector for existing DOM element
      const allContentElements = this.tabs
        .map(t => typeof t.content === 'string' ? document.querySelector(t.content) : null)
        .filter(Boolean);

      allContentElements.forEach(el => {
        el.style.display = 'none';
      });

      const targetElement = document.querySelector(tab.content);
      if (targetElement) {
        targetElement.style.display = 'block';
      }
    } else if (typeof tab.content === 'function') {
      // Content is a render function
      contentContainer.innerHTML = '';
      tab.content(contentContainer);
    }

    this.currentTab = tabId;

    // Save to localStorage if remember enabled
    if (this.options.rememberLast) {
      localStorage.setItem(this.options.storageKey, tabId);
    }

    // Update URL hash
    this.updateURL(tabId);

    // Call change handler
    this.options.onTabChange(tabId, tab);
  }

  updateURL(tabId) {
    const url = new URL(window.location);
    url.searchParams.set('tab', tabId);
    window.history.replaceState({}, '', url);
  }

  loadInitialTab() {
    // Priority: URL param > localStorage > default
    const urlParams = new URLSearchParams(window.location.search);
    const urlTab = urlParams.get('tab');

    let initialTab = this.options.defaultTab;

    if (urlTab && this.tabs.find(t => t.id === urlTab)) {
      initialTab = urlTab;
    } else if (this.options.rememberLast) {
      const savedTab = localStorage.getItem(this.options.storageKey);
      if (savedTab && this.tabs.find(t => t.id === savedTab)) {
        initialTab = savedTab;
      }
    }

    this.switchTab(initialTab);
  }

  getActiveTab() {
    return this.currentTab;
  }
}

export default TabNavigation;
```

**Step 2: Create tab navigation styles**

Create `sailorskills-operations/src/styles/tab-navigation.css`:

```css
/* Tab Navigation Styles */

.tab-navigation {
  margin-bottom: 2rem;
}

.tab-list {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid var(--ss-border-subtle, #e0e0e0);
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.tab-button {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  font-size: 1rem;
  font-weight: 500;
  color: var(--ss-text-medium, #666);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s ease;
  font-family: inherit;
}

.tab-button:hover {
  color: var(--ss-text-dark, #333);
  background: var(--ss-background-hover, #f5f5f5);
}

.tab-button.active {
  color: var(--ss-primary, #345475);
  border-bottom-color: var(--ss-primary, #345475);
  font-weight: 600;
}

.tab-button:focus {
  outline: 2px solid var(--ss-primary, #345475);
  outline-offset: -2px;
}

.tab-content {
  padding-top: 1.5rem;
}

/* Mobile responsiveness */
@media (max-width: 768px) {
  .tab-list {
    gap: 0.25rem;
  }

  .tab-button {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
  }
}

/* Scrollbar styling for horizontal scroll */
.tab-list::-webkit-scrollbar {
  height: 4px;
}

.tab-list::-webkit-scrollbar-track {
  background: var(--ss-background-subtle, #f5f5f5);
}

.tab-list::-webkit-scrollbar-thumb {
  background: var(--ss-border-medium, #ccc);
  border-radius: 2px;
}
```

**Step 3: Commit tab navigation component**

```bash
git add sailorskills-operations/src/components/tab-navigation.js sailorskills-operations/src/styles/tab-navigation.css
git commit -m "feat: add reusable tab navigation component

- TabNavigation class for creating tab-based interfaces
- Supports URL params, localStorage persistence, callbacks
- Mobile-responsive with horizontal scroll
- Accessibility attributes (role, aria-selected)

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Update Navigation HTML Structure

**Files:**
- Modify: `sailorskills-operations/index.html:125-140` (sub-nav section)

**Step 1: Simplify navigation to 4 items**

Update the sub-nav section in `sailorskills-operations/index.html`:

```html
<!-- Local sub-navigation (third tier) -->
<nav class="sub-nav">
  <div class="sub-nav-container">
    <a href="#dashboard" class="active">Dashboard</a>
    <a href="#schedule">Schedule <span id="nav-schedule-badge" class="nav-badge" style="display: none;">0</span></a>
    <a href="#boats">Boats</a>
    <a href="#customers">Customers <span id="nav-customers-badge" class="nav-badge" style="display: none;">0</span></a>
  </div>
</nav>
```

**Step 2: Add tab navigation CSS import**

Add after line 16 in `sailorskills-operations/index.html`:

```html
<link rel="stylesheet" href="/src/styles/tab-navigation.css">
```

**Step 3: Commit navigation structure update**

```bash
git add sailorskills-operations/index.html
git commit -m "refactor: simplify navigation from 12+ items to 4

- Dashboard | Schedule | Boats | Customers
- Schedule badge aggregates Pending Orders + Needs Scheduling
- Customers badge aggregates Messages + Service Requests
- Import tab navigation styles

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Create Schedule Page Tab Container

**Files:**
- Modify: `sailorskills-operations/index.html:415-421` (Schedule view section)

**Step 1: Update Schedule view with tab container**

Replace the existing `#schedule-view` section in `sailorskills-operations/index.html`:

```html
<!-- Schedule View with Tabs -->
<section id="schedule-view" class="view">
  <h2>Service Schedule</h2>

  <!-- Tab navigation will be injected here -->
  <div id="schedule-tabs"></div>

  <!-- Tab content sections (hidden by default, shown by TabNavigation) -->
  <div id="schedule-calendar-content" style="display: none;">
    <div id="schedule-calendar">
      <!-- Calendar loaded here (existing React component) -->
    </div>
  </div>

  <div id="schedule-pending-content" style="display: none;">
    <!-- Pending Orders content (moved from pending-orders-view) -->
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
  </div>

  <div id="schedule-queue-content" style="display: none;">
    <!-- Needs Scheduling content (moved from needs-scheduling-view) -->
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
  </div>

  <div id="schedule-packing-content" style="display: none;">
    <!-- Packing Lists content (moved from packing-view) -->
    <div class="packing-tabs">
      <button class="tab-btn active" data-tab="monthly">Monthly</button>
      <button class="tab-btn" data-tab="weekly">Weekly</button>
      <button class="tab-btn" data-tab="daily">Daily</button>
      <button class="tab-btn" data-tab="per-boat">Per Boat</button>
      <button class="tab-btn" data-tab="all-boats">All Boats</button>
    </div>
    <div id="packing-content" class="packing-content">
      <!-- Dynamic content loaded here -->
    </div>
  </div>

  <div id="schedule-forecast-content" style="display: none;">
    <!-- Forecast content will be loaded here via iframe or fetch -->
    <div id="forecast-container">
      <p>Loading forecast...</p>
    </div>
  </div>
</section>
```

**Step 2: Remove old standalone view sections**

Remove these sections from `index.html`:
- `#pending-orders-view` (lines ~498-521)
- `#needs-scheduling-view` (lines ~523-570)
- `#packing-view` (lines ~392-405)

**Step 3: Commit Schedule tab container**

```bash
git add sailorskills-operations/index.html
git commit -m "refactor: create Schedule page with tab container

- Add schedule-tabs container for TabNavigation
- Move Pending Orders content into schedule-pending-content
- Move Needs Scheduling content into schedule-queue-content
- Move Packing Lists content into schedule-packing-content
- Add Forecast content placeholder
- Remove old standalone view sections

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Initialize Schedule Tabs

**Files:**
- Create: `sailorskills-operations/src/views/schedule-tabs.js`
- Modify: `sailorskills-operations/src/main.js`

**Step 1: Create Schedule tabs initialization**

Create `sailorskills-operations/src/views/schedule-tabs.js`:

```javascript
/**
 * Schedule Page Tab Navigation
 * Initializes tabs for Schedule view: Calendar, Pending Orders, Needs Scheduling, Packing Lists, Forecast
 */

import { TabNavigation } from '../components/tab-navigation.js';

export function initScheduleTabs() {
  const tabs = [
    {
      id: 'calendar',
      label: 'Calendar',
      content: '#schedule-calendar-content'
    },
    {
      id: 'pending-orders',
      label: 'Pending Orders',
      content: '#schedule-pending-content'
    },
    {
      id: 'needs-scheduling',
      label: 'Needs Scheduling',
      content: '#schedule-queue-content'
    },
    {
      id: 'packing-lists',
      label: 'Packing Lists',
      content: '#schedule-packing-content'
    },
    {
      id: 'forecast',
      label: 'Forecast',
      content: '#schedule-forecast-content'
    }
  ];

  const scheduleTabNav = new TabNavigation('schedule-tabs', tabs, {
    defaultTab: 'calendar',
    storageKey: 'schedule-active-tab',
    onTabChange: (tabId) => {
      console.log('Schedule tab changed:', tabId);

      // Load forecast content if forecast tab selected
      if (tabId === 'forecast') {
        loadForecastContent();
      }
    }
  });

  return scheduleTabNav;
}

async function loadForecastContent() {
  const container = document.getElementById('forecast-container');

  try {
    // Fetch forecast.html content and inject
    const response = await fetch('/forecast.html');
    if (response.ok) {
      const html = await response.text();

      // Extract body content (strip html/head tags)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const body = doc.body;

      container.innerHTML = body.innerHTML;

      // Execute any scripts in the forecast content
      const scripts = container.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        if (script.src) {
          newScript.src = script.src;
        } else {
          newScript.textContent = script.textContent;
        }
        document.body.appendChild(newScript);
      });
    } else {
      container.innerHTML = '<p class="error">Failed to load forecast content.</p>';
    }
  } catch (error) {
    console.error('Error loading forecast:', error);
    container.innerHTML = '<p class="error">Error loading forecast. Please try again.</p>';
  }
}

export default initScheduleTabs;
```

**Step 2: Import and initialize in main.js**

Add to `sailorskills-operations/src/main.js` after existing imports:

```javascript
import { initScheduleTabs } from './views/schedule-tabs.js';
```

Add to the initialization section (after `initNavigation()`):

```javascript
// Initialize Schedule tabs when Schedule view is active
let scheduleTabsInitialized = false;

// Watch for view changes to initialize tabs when needed
const originalSwitchView = window.switchView;
window.switchView = function(viewName) {
  originalSwitchView.call(this, viewName);

  // Initialize Schedule tabs on first view
  if (viewName === 'schedule' && !scheduleTabsInitialized) {
    initScheduleTabs();
    scheduleTabsInitialized = true;
  }
};
```

**Step 3: Commit Schedule tabs initialization**

```bash
git add sailorskills-operations/src/views/schedule-tabs.js sailorskills-operations/src/main.js
git commit -m "feat: initialize Schedule page tab navigation

- Create schedule-tabs.js with 5 tabs
- Calendar, Pending Orders, Needs Scheduling, Packing Lists, Forecast
- Lazy-load forecast content when tab selected
- Initialize tabs on first Schedule view load

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Create Boats Page Tab Container

**Files:**
- Modify: `sailorskills-operations/index.html:212-390` (Boats view section)

**Step 1: Update Boats view with tab container**

Replace the existing `#boats-view` section in `sailorskills-operations/index.html`:

```html
<!-- Boats View with Tabs -->
<section id="boats-view" class="view">
  <h2>Boats & Service Management</h2>

  <!-- Tab navigation will be injected here -->
  <div id="boats-tabs"></div>

  <!-- Tab content sections -->
  <div id="boats-list-content" style="display: none;">
    <div class="boats-controls">
      <!-- Basic Filters (Always Visible) -->
      <div class="basic-filters">
        <div class="search-box">
          <input type="text" id="boats-search" placeholder="Search boats or customers..." class="form-control">
        </div>
        <div class="filter-box">
          <select id="urgency-filter" class="form-control">
            <option value="">All Paint Statuses</option>
            <option value="overdue">Overdue</option>
            <option value="time_now">Time Now</option>
            <option value="consider_soon">Consider Soon</option>
            <option value="not_yet">Not Yet</option>
          </select>
        </div>
        <div class="filter-box">
          <select id="service-flags-filter" class="form-control">
            <option value="">All Service Alerts</option>
            <option value="has_alerts">Has Alerts</option>
            <option value="urgent">Urgent Alerts</option>
            <option value="anode_service">Anode Service Needed</option>
          </select>
        </div>
        <button id="toggle-advanced-filters" class="btn btn-secondary">
          <span id="filter-toggle-text">Show Advanced Filters</span>
          <span id="active-filter-count" class="filter-count-badge" style="display: none;"></span>
        </button>
        <button id="clear-all-filters" class="btn btn-secondary" style="display: none;">
          Clear All
        </button>
      </div>

      <!-- Advanced Filters (Collapsible) -->
      <div id="advanced-filters" class="advanced-filters" style="display: none;">
        <!-- Keep existing advanced filters HTML here (lines 250-379) -->
      </div>
    </div>

    <div id="boats-list">
      Loading...
    </div>

    <!-- Boat Detail Panel (slides in from right) -->
    <div id="boat-detail-panel" class="boat-detail-panel">
      <div id="boat-detail-content"></div>
    </div>
  </div>

  <div id="boats-service-logs-content" style="display: none;">
    <div id="service-log-form">
      <!-- Service log form loaded here -->
    </div>
  </div>

  <div id="boats-paint-alerts-content" style="display: none;">
    <div id="paint-alerts-list">
      <!-- Paint alerts loaded here -->
    </div>
  </div>
</section>
```

**Step 2: Remove old paint-alerts-view section**

Remove `#paint-alerts-view` section (lines ~423-429)

**Step 3: Commit Boats tab container**

```bash
git add sailorskills-operations/index.html
git commit -m "refactor: create Boats page with tab container

- Add boats-tabs container for TabNavigation
- Move Boats List into boats-list-content
- Move Service Logs into boats-service-logs-content
- Move Paint Alerts into boats-paint-alerts-content
- Remove old paint-alerts-view section

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: Initialize Boats Tabs

**Files:**
- Create: `sailorskills-operations/src/views/boats-tabs.js`
- Modify: `sailorskills-operations/src/main.js`

**Step 1: Create Boats tabs initialization**

Create `sailorskills-operations/src/views/boats-tabs.js`:

```javascript
/**
 * Boats Page Tab Navigation
 * Initializes tabs for Boats view: Boats List, Service Logs, Paint Alerts
 */

import { TabNavigation } from '../components/tab-navigation.js';

export function initBoatsTabs() {
  const tabs = [
    {
      id: 'boats-list',
      label: 'Boats List',
      content: '#boats-list-content'
    },
    {
      id: 'service-logs',
      label: 'Service Logs',
      content: '#boats-service-logs-content'
    },
    {
      id: 'paint-alerts',
      label: 'Paint Alerts',
      content: '#boats-paint-alerts-content'
    }
  ];

  const boatsTabNav = new TabNavigation('boats-tabs', tabs, {
    defaultTab: 'boats-list',
    storageKey: 'boats-active-tab',
    onTabChange: (tabId) => {
      console.log('Boats tab changed:', tabId);

      // Load paint alerts if that tab is selected
      if (tabId === 'paint-alerts') {
        loadPaintAlerts();
      }
    }
  });

  return boatsTabNav;
}

async function loadPaintAlerts() {
  const container = document.getElementById('paint-alerts-list');

  // Check if already loaded
  if (container.dataset.loaded === 'true') {
    return;
  }

  container.innerHTML = '<div class="loading">Loading paint alerts...</div>';

  try {
    const { data: boats, error } = await window.app.supabase
      .from('boats')
      .select(`
        id,
        name,
        customer_id,
        customers (
          first_name,
          last_name
        ),
        paint_repaint_schedule (
          urgency_level,
          avg_paint_condition,
          trend,
          last_calculated
        )
      `)
      .order('paint_repaint_schedule.urgency_level', { ascending: false });

    if (error) throw error;

    // Render paint alerts grouped by urgency
    const urgencyGroups = {
      overdue: [],
      time_now: [],
      consider_soon: [],
      not_yet: []
    };

    boats.forEach(boat => {
      const urgency = boat.paint_repaint_schedule?.[0]?.urgency_level || 'not_yet';
      urgencyGroups[urgency].push(boat);
    });

    let html = '<div class="paint-alerts-container">';

    const urgencyLabels = {
      overdue: { label: 'Overdue', color: '#e74c3c' },
      time_now: { label: 'Time Now', color: '#f39c12' },
      consider_soon: { label: 'Consider Soon', color: '#f1c40f' },
      not_yet: { label: 'Not Yet', color: '#95a5a6' }
    };

    Object.entries(urgencyGroups).forEach(([urgency, boatsList]) => {
      if (boatsList.length === 0) return;

      const { label, color } = urgencyLabels[urgency];

      html += `
        <div class="urgency-group">
          <h3 style="color: ${color}; border-left: 4px solid ${color}; padding-left: 1rem;">
            ${label} (${boatsList.length})
          </h3>
          <div class="boats-grid">
      `;

      boatsList.forEach(boat => {
        const customerName = boat.customers
          ? `${boat.customers.first_name} ${boat.customers.last_name}`
          : 'Unknown Customer';
        const condition = boat.paint_repaint_schedule?.[0]?.avg_paint_condition || 'N/A';

        html += `
          <div class="boat-card" data-boat-id="${boat.id}">
            <h4>${boat.name}</h4>
            <p><strong>Owner:</strong> ${customerName}</p>
            <p><strong>Condition:</strong> ${condition}/10</p>
            <button class="btn btn-sm btn-primary view-boat-btn" data-boat-id="${boat.id}">
              View Details
            </button>
          </div>
        `;
      });

      html += '</div></div>';
    });

    html += '</div>';

    container.innerHTML = html;
    container.dataset.loaded = 'true';

    // Bind view boat buttons
    container.querySelectorAll('.view-boat-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const boatId = e.target.dataset.boatId;
        // Switch to boats-list tab and open boat detail
        const boatsTabNav = window.boatsTabNav;
        if (boatsTabNav) {
          boatsTabNav.switchTab('boats-list');
        }
        // Trigger boat detail panel (existing functionality)
        if (window.showBoatDetail) {
          window.showBoatDetail(boatId);
        }
      });
    });

  } catch (error) {
    console.error('Error loading paint alerts:', error);
    container.innerHTML = '<p class="error">Failed to load paint alerts. Please try again.</p>';
  }
}

export default initBoatsTabs;
```

**Step 2: Import and initialize in main.js**

Add to `sailorskills-operations/src/main.js`:

```javascript
import { initBoatsTabs } from './views/boats-tabs.js';
```

Add to the view switching logic:

```javascript
// Initialize Boats tabs when Boats view is active
let boatsTabsInitialized = false;

// Update the switchView wrapper
window.switchView = function(viewName) {
  originalSwitchView.call(this, viewName);

  // Initialize Schedule tabs
  if (viewName === 'schedule' && !scheduleTabsInitialized) {
    initScheduleTabs();
    scheduleTabsInitialized = true;
  }

  // Initialize Boats tabs
  if (viewName === 'boats' && !boatsTabsInitialized) {
    window.boatsTabNav = initBoatsTabs();
    boatsTabsInitialized = true;
  }
};
```

**Step 3: Commit Boats tabs initialization**

```bash
git add sailorskills-operations/src/views/boats-tabs.js sailorskills-operations/src/main.js
git commit -m "feat: initialize Boats page tab navigation

- Create boats-tabs.js with 3 tabs
- Boats List, Service Logs, Paint Alerts
- Load paint alerts data grouped by urgency
- Initialize tabs on first Boats view load

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Create Customers Page

**Files:**
- Modify: `sailorskills-operations/index.html` (add new customers-view section)
- Create: `sailorskills-operations/src/views/customers-tabs.js`

**Step 1: Create Customers view section**

Add new section to `sailorskills-operations/index.html` after the boats-view section:

```html
<!-- Customers View with Tabs -->
<section id="customers-view" class="view">
  <h2>Customer Communication</h2>

  <!-- Tab navigation will be injected here -->
  <div id="customers-tabs"></div>

  <!-- Tab content sections -->
  <div id="customers-messages-content" style="display: none;">
    <div class="messages-controls">
      <div class="messages-filters">
        <select id="message-boat-filter" class="form-control">
          <option value="">All Boats</option>
        </select>
        <select id="message-status-filter" class="form-control">
          <option value="">All Messages</option>
          <option value="unread">Unread Only</option>
          <option value="read">Read Only</option>
        </select>
        <button id="refresh-messages-btn" class="btn btn-secondary">🔄 Refresh</button>
      </div>
    </div>

    <div class="messages-container">
      <div class="conversations-list">
        <h3>Conversations</h3>
        <div id="admin-conversations-list">
          Loading conversations...
        </div>
      </div>

      <div class="message-thread-panel">
        <div id="admin-message-thread">
          <div class="no-selection">
            Select a conversation to view messages
          </div>
        </div>
        <div id="admin-quick-reply" style="display: none;">
          <textarea id="admin-reply-text" placeholder="Type your reply..." rows="4"></textarea>
          <div class="reply-actions">
            <button id="send-admin-reply-btn" class="btn btn-primary">Send Reply</button>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div id="customers-requests-content" style="display: none;">
    <div class="requests-controls">
      <div class="requests-filters">
        <select id="request-status-filter" class="form-control">
          <option value="">All Requests</option>
          <option value="pending">Pending</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select id="request-boat-filter" class="form-control">
          <option value="">All Boats</option>
        </select>
        <button id="refresh-requests-btn" class="btn btn-secondary">🔄 Refresh</button>
      </div>
    </div>

    <div id="service-requests-list">
      Loading service requests...
    </div>
  </div>
</section>
```

**Step 2: Remove old messages-view and service-requests-view sections**

Remove these sections from `index.html`:
- `#messages-view` (lines ~431-471)
- `#service-requests-view` (lines ~473-496)

**Step 3: Create Customers tabs initialization**

Create `sailorskills-operations/src/views/customers-tabs.js`:

```javascript
/**
 * Customers Page Tab Navigation
 * Initializes tabs for Customers view: Messages, Service Requests
 */

import { TabNavigation } from '../components/tab-navigation.js';

export function initCustomersTabs() {
  const tabs = [
    {
      id: 'messages',
      label: 'Messages',
      content: '#customers-messages-content'
    },
    {
      id: 'service-requests',
      label: 'Service Requests',
      content: '#customers-requests-content'
    }
  ];

  const customersTabNav = new TabNavigation('customers-tabs', tabs, {
    defaultTab: 'messages',
    storageKey: 'customers-active-tab',
    onTabChange: (tabId) => {
      console.log('Customers tab changed:', tabId);
    }
  });

  return customersTabNav;
}

export default initCustomersTabs;
```

**Step 4: Import and initialize in main.js**

Add to `sailorskills-operations/src/main.js`:

```javascript
import { initCustomersTabs } from './views/customers-tabs.js';
```

Add to the view switching logic:

```javascript
// Initialize Customers tabs when Customers view is active
let customersTabsInitialized = false;

// Update the switchView wrapper
window.switchView = function(viewName) {
  originalSwitchView.call(this, viewName);

  // Initialize Schedule tabs
  if (viewName === 'schedule' && !scheduleTabsInitialized) {
    initScheduleTabs();
    scheduleTabsInitialized = true;
  }

  // Initialize Boats tabs
  if (viewName === 'boats' && !boatsTabsInitialized) {
    window.boatsTabNav = initBoatsTabs();
    boatsTabsInitialized = true;
  }

  // Initialize Customers tabs
  if (viewName === 'customers' && !customersTabsInitialized) {
    initCustomersTabs();
    customersTabsInitialized = true;
  }
};
```

**Step 5: Commit Customers page and tabs**

```bash
git add sailorskills-operations/index.html sailorskills-operations/src/views/customers-tabs.js sailorskills-operations/src/main.js
git commit -m "feat: create Customers page with tab navigation

- Add customers-view section with Messages and Service Requests tabs
- Move messages content into customers-messages-content
- Move service requests content into customers-requests-content
- Initialize tabs on first Customers view load
- Remove old messages-view and service-requests-view sections

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: Update Badge Count Aggregation

**Files:**
- Modify: `sailorskills-operations/src/main.js` (badge update logic)

**Step 1: Create badge aggregation function**

Add to `sailorskills-operations/src/main.js`:

```javascript
/**
 * Update navigation badge counts with aggregation
 */
async function updateNavigationBadges() {
  try {
    // Fetch counts from database
    const counts = await Promise.all([
      getPendingOrdersCount(),
      getNeedsSchedulingCount(),
      getUnreadMessagesCount(),
      getPendingServiceRequestsCount()
    ]);

    const [pendingOrders, needsScheduling, unreadMessages, pendingRequests] = counts;

    // Schedule badge = pending orders + needs scheduling
    const scheduleBadgeCount = pendingOrders + needsScheduling;
    updateBadge('nav-schedule-badge', scheduleBadgeCount);

    // Customers badge = unread messages + pending requests
    const customersBadgeCount = unreadMessages + pendingRequests;
    updateBadge('nav-customers-badge', customersBadgeCount);

  } catch (error) {
    console.error('Error updating navigation badges:', error);
  }
}

function updateBadge(badgeId, count) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;

  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'inline-block';
  } else {
    badge.style.display = 'none';
  }
}

async function getPendingOrdersCount() {
  const { count, error } = await window.app.supabase
    .from('bookings')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching pending orders count:', error);
    return 0;
  }

  return count || 0;
}

async function getNeedsSchedulingCount() {
  const { count, error } = await window.app.supabase
    .from('scheduling_queue')
    .select('*', { count: 'exact', head: true })
    .is('scheduled_date', null);

  if (error) {
    console.error('Error fetching needs scheduling count:', error);
    return 0;
  }

  return count || 0;
}

async function getUnreadMessagesCount() {
  const { count, error } = await window.app.supabase
    .from('customer_messages')
    .select('*', { count: 'exact', head: true })
    .eq('read', false)
    .eq('sender_type', 'customer');

  if (error) {
    console.error('Error fetching unread messages count:', error);
    return 0;
  }

  return count || 0;
}

async function getPendingServiceRequestsCount() {
  const { count, error } = await window.app.supabase
    .from('service_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending');

  if (error) {
    console.error('Error fetching pending requests count:', error);
    return 0;
  }

  return count || 0;
}

// Initialize badge updates
updateNavigationBadges();

// Update badges every 30 seconds
setInterval(updateNavigationBadges, 30000);
```

**Step 2: Commit badge aggregation logic**

```bash
git add sailorskills-operations/src/main.js
git commit -m "feat: implement aggregated badge counts for navigation

- Schedule badge = Pending Orders + Needs Scheduling
- Customers badge = Unread Messages + Pending Service Requests
- Auto-update badges every 30 seconds
- Hide badges when count is 0

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Update Dashboard with Consolidated Cards

**Files:**
- Modify: `sailorskills-operations/index.html:143-210` (dashboard cards)
- Modify: `sailorskills-operations/src/main.js` (dashboard initialization)

**Step 1: Update dashboard HTML with consolidated cards**

Replace the dashboard cards section in `sailorskills-operations/index.html`:

```html
<section id="dashboard-view" class="view active">
  <h2>Admin Dashboard</h2>
  <div class="dashboard-grid">
    <!-- Today's Services -->
    <div class="card">
      <h3>Today's Services</h3>
      <div id="today-services" class="card-content">
        Loading...
      </div>
    </div>

    <!-- Customer Hub (new consolidated card) -->
    <div class="card clickable-card" data-navigate="customers">
      <h3>Customer Hub</h3>
      <div id="customer-hub" class="card-content">
        Loading...
      </div>
    </div>

    <!-- Scheduling Pipeline (new consolidated card) -->
    <div class="card clickable-card" data-navigate="schedule">
      <h3>Scheduling Pipeline</h3>
      <div id="scheduling-pipeline" class="card-content">
        Loading...
      </div>
    </div>

    <!-- Actions Required -->
    <div class="card">
      <h3>Actions Required</h3>
      <div id="actions-required" class="card-content">
        Loading...
      </div>
    </div>

    <!-- Upcoming Services -->
    <div class="card">
      <h3>Upcoming Services</h3>
      <div id="upcoming-services" class="card-content">
        Loading...
      </div>
    </div>

    <!-- Recently Completed -->
    <div class="card">
      <h3>Recently Completed</h3>
      <div id="recently-completed" class="card-content">
        Loading...
      </div>
    </div>

    <!-- Due This Month -->
    <div class="card">
      <h3>Due This Month</h3>
      <div id="due-this-month" class="card-content">
        Loading...
      </div>
    </div>

    <!-- Paint Alerts -->
    <div class="card clickable-card" data-navigate="boats" data-tab="paint-alerts">
      <h3>Paint Alerts (Top 5)</h3>
      <div id="paint-alerts" class="card-content">
        Loading...
      </div>
    </div>

    <!-- Inventory Alerts -->
    <div class="card">
      <h3>Inventory Alerts</h3>
      <div id="inventory-alerts" class="card-content">
        Loading...
      </div>
    </div>
  </div>
</section>
```

**Step 2: Add CSS for clickable cards**

Add to `sailorskills-operations/styles/main.css`:

```css
/* Clickable dashboard cards */
.clickable-card {
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.clickable-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.clickable-card h3::after {
  content: ' →';
  color: var(--ss-primary, #345475);
  font-size: 0.9em;
}
```

**Step 3: Create dashboard card population functions**

Add to `sailorskills-operations/src/main.js`:

```javascript
/**
 * Load and populate dashboard cards
 */
async function loadDashboard() {
  await Promise.all([
    loadTodaysServices(),
    loadCustomerHub(),
    loadSchedulingPipeline(),
    loadActionsRequired(),
    loadUpcomingServices(),
    loadRecentlyCompleted(),
    loadDueThisMonth(),
    loadTopPaintAlerts(),
    loadInventoryAlerts()
  ]);
}

async function loadCustomerHub() {
  const container = document.getElementById('customer-hub');

  try {
    const [messagesCount, requestsCount] = await Promise.all([
      getUnreadMessagesCount(),
      getPendingServiceRequestsCount()
    ]);

    container.innerHTML = `
      <div class="hub-stats">
        <div class="stat-item">
          <span class="stat-number">${messagesCount}</span>
          <span class="stat-label">Unread Messages</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${requestsCount}</span>
          <span class="stat-label">Pending Requests</span>
        </div>
      </div>
      <p class="card-action">Click to view all customer communications →</p>
    `;
  } catch (error) {
    console.error('Error loading customer hub:', error);
    container.innerHTML = '<p class="error">Failed to load customer hub</p>';
  }
}

async function loadSchedulingPipeline() {
  const container = document.getElementById('scheduling-pipeline');

  try {
    const [ordersCount, queueCount] = await Promise.all([
      getPendingOrdersCount(),
      getNeedsSchedulingCount()
    ]);

    container.innerHTML = `
      <div class="hub-stats">
        <div class="stat-item">
          <span class="stat-number">${ordersCount}</span>
          <span class="stat-label">Pending Orders</span>
        </div>
        <div class="stat-item">
          <span class="stat-number">${queueCount}</span>
          <span class="stat-label">Needs Scheduling</span>
        </div>
      </div>
      <p class="card-action">Click to manage scheduling workflow →</p>
    `;
  } catch (error) {
    console.error('Error loading scheduling pipeline:', error);
    container.innerHTML = '<p class="error">Failed to load scheduling pipeline</p>';
  }
}

async function loadTopPaintAlerts() {
  const container = document.getElementById('paint-alerts');

  try {
    const { data: boats, error } = await window.app.supabase
      .from('boats')
      .select(`
        id,
        name,
        paint_repaint_schedule!inner (
          urgency_level
        )
      `)
      .in('paint_repaint_schedule.urgency_level', ['overdue', 'time_now'])
      .order('paint_repaint_schedule.urgency_level', { ascending: false })
      .limit(5);

    if (error) throw error;

    if (boats.length === 0) {
      container.innerHTML = '<p>No urgent paint alerts</p>';
      return;
    }

    let html = '<ul class="alert-list">';
    boats.forEach(boat => {
      const urgency = boat.paint_repaint_schedule[0].urgency_level;
      const urgencyColor = urgency === 'overdue' ? '#e74c3c' : '#f39c12';
      html += `
        <li>
          <span style="color: ${urgencyColor}; font-weight: 600;">●</span>
          ${boat.name} - ${urgency.replace('_', ' ')}
        </li>
      `;
    });
    html += '</ul>';
    html += '<p class="card-action">Click to view all paint alerts →</p>';

    container.innerHTML = html;
  } catch (error) {
    console.error('Error loading paint alerts:', error);
    container.innerHTML = '<p class="error">Failed to load paint alerts</p>';
  }
}

// Bind clickable card navigation
document.querySelectorAll('.clickable-card').forEach(card => {
  card.addEventListener('click', () => {
    const targetView = card.dataset.navigate;
    const targetTab = card.dataset.tab;

    if (targetView) {
      window.switchView(targetView);

      // If specific tab requested, switch to it
      if (targetTab) {
        setTimeout(() => {
          const tabNav = window[`${targetView}TabNav`];
          if (tabNav && tabNav.switchTab) {
            tabNav.switchTab(targetTab);
          }
        }, 100);
      }
    }
  });
});

// Load dashboard on init
if (window.app.currentView === 'dashboard') {
  loadDashboard();
}
```

**Step 4: Add dashboard card styles**

Add to `sailorskills-operations/styles/main.css`:

```css
/* Dashboard hub stats */
.hub-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 1rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 2rem;
  font-weight: 700;
  color: var(--ss-primary, #345475);
}

.stat-label {
  font-size: 0.9rem;
  color: var(--ss-text-medium, #666);
}

.card-action {
  margin-top: 1rem;
  font-size: 0.9rem;
  color: var(--ss-primary, #345475);
  font-weight: 500;
}

.alert-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.alert-list li {
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--ss-border-subtle, #f0f0f0);
}

.alert-list li:last-child {
  border-bottom: none;
}
```

**Step 5: Commit dashboard consolidation**

```bash
git add sailorskills-operations/index.html sailorskills-operations/src/main.js sailorskills-operations/styles/main.css
git commit -m "feat: consolidate dashboard with Customer Hub and Scheduling Pipeline cards

- Add Customer Hub card showing Messages + Service Requests counts
- Add Scheduling Pipeline card showing Pending Orders + Needs Scheduling
- Make cards clickable to navigate to detail views
- Add Top 5 Paint Alerts preview with navigation
- Style clickable cards with hover effects

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Test Navigation and Fix Issues

**Files:**
- Test manually in browser
- Fix any bugs discovered

**Step 1: Start dev server and test**

Run: `cd sailorskills-operations && npm run dev`

**Manual Test Checklist:**
- [ ] Navigate to all 4 main nav items (Dashboard, Schedule, Boats, Customers)
- [ ] Test Schedule tabs (Calendar, Pending Orders, Needs Scheduling, Packing Lists, Forecast)
- [ ] Test Boats tabs (Boats List, Service Logs, Paint Alerts)
- [ ] Test Customers tabs (Messages, Service Requests)
- [ ] Verify badge counts display correctly
- [ ] Test dashboard clickable cards navigation
- [ ] Test tab persistence (refresh page, tab should be remembered)
- [ ] Test URL params (e.g., `?tab=paint-alerts`)
- [ ] Test mobile responsiveness (resize browser)

**Step 2: Fix any issues discovered**

Document and fix bugs found during testing.

**Step 3: Commit fixes**

```bash
git add .
git commit -m "fix: address navigation issues found during testing

[List specific fixes made]

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: Update Playwright Tests

**Files:**
- Modify: `sailorskills-operations/tests/*.spec.js` (all test files referencing old nav)

**Step 1: Update test selectors for new navigation**

Find and replace navigation selectors in test files:

Old selectors to find:
- `a[href="#packing"]`
- `a[href="#service-logs"]`
- `a[href="#needs-scheduling"]`
- `a[href="#pending-orders"]`
- `a[href="#paint-alerts"]`
- `a[href="#messages"]`
- `a[href="#service-requests"]`

New patterns:
- Navigate to Schedule → `.sub-nav a[href="#schedule"]`
- Then click tab → `.tab-button[data-tab-id="packing-lists"]`

**Step 2: Create test helper for tab navigation**

Create `sailorskills-operations/tests/helpers/navigation.js`:

```javascript
/**
 * Test helpers for tab navigation
 */

export async function navigateToScheduleTab(page, tabId) {
  // Click Schedule nav item
  await page.click('.sub-nav a[href="#schedule"]');

  // Wait for tabs to initialize
  await page.waitForSelector('.tab-button', { timeout: 5000 });

  // Click specific tab
  await page.click(`.tab-button[data-tab-id="${tabId}"]`);

  // Wait for content to load
  await page.waitForSelector(`#schedule-${tabId}-content`, { state: 'visible' });
}

export async function navigateToBoatsTab(page, tabId) {
  await page.click('.sub-nav a[href="#boats"]');
  await page.waitForSelector('.tab-button', { timeout: 5000 });
  await page.click(`.tab-button[data-tab-id="${tabId}"]`);
  await page.waitForSelector(`#boats-${tabId}-content`, { state: 'visible' });
}

export async function navigateToCustomersTab(page, tabId) {
  await page.click('.sub-nav a[href="#customers"]');
  await page.waitForSelector('.tab-button', { timeout: 5000 });
  await page.click(`.tab-button[data-tab-id="${tabId}"]`);
  await page.waitForSelector(`#customers-${tabId}-content`, { state: 'visible' });
}
```

**Step 3: Update example test file**

Example update for a test:

```javascript
import { test, expect } from '@playwright/test';
import { navigateToScheduleTab } from './helpers/navigation.js';

test('should display packing lists', async ({ page }) => {
  await page.goto('https://ops.sailorskills.com');

  // Login
  await page.fill('#email', 'standardhuman@gmail.com');
  await page.fill('#password', 'KLRss!650');
  await page.click('button[type="submit"]');

  // Wait for dashboard
  await page.waitForSelector('#dashboard-view.active');

  // Navigate to Packing Lists tab in Schedule
  await navigateToScheduleTab(page, 'packing-lists');

  // Verify packing content visible
  await expect(page.locator('#packing-content')).toBeVisible();
});
```

**Step 4: Run tests**

Run: `npm test`

Expected: Tests should pass with new selectors

**Step 5: Commit test updates**

```bash
git add tests/
git commit -m "test: update Playwright tests for new tab navigation

- Add navigation helpers for tab-based views
- Update selectors from direct nav links to tab buttons
- Test Schedule, Boats, Customers tabs
- All tests passing with new structure

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 12: Update Documentation

**Files:**
- Modify: `sailorskills-operations/CLAUDE.md`
- Modify: `sailorskills-operations/README.md` (if exists)

**Step 1: Update CLAUDE.md with new navigation structure**

Update the "Key Features" or "Project Structure" section in `sailorskills-operations/CLAUDE.md`:

```markdown
## Navigation Structure

**Primary Navigation (4 items):**
- **Dashboard**: Command center with consolidated status cards
- **Schedule**: Complete scheduling workflow (Calendar, Pending Orders, Needs Scheduling, Packing Lists, Forecast)
- **Boats**: Boat management hub (Boats List, Service Logs, Paint Alerts)
- **Customers**: Customer communication (Messages, Service Requests)

**Tab-Based Architecture:**
- Each primary nav item uses tabs to organize related features
- URL parameters support deep linking (e.g., `?tab=packing-lists`)
- Tab state persists in localStorage
- All features accessible within ≤2 clicks
```

**Step 2: Document badge aggregation**

Add to CLAUDE.md:

```markdown
## Badge Notifications

**Schedule Badge:** Pending Orders count + Needs Scheduling count
**Customers Badge:** Unread Messages count + Pending Service Requests count

Badges update automatically every 30 seconds.
```

**Step 3: Commit documentation updates**

```bash
git add sailorskills-operations/CLAUDE.md
git commit -m "docs: update CLAUDE.md with new navigation structure

- Document 4-item primary navigation
- Explain tab-based architecture
- Document badge aggregation logic
- Update feature access patterns

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 13: Final Testing and Verification

**Files:**
- Manual testing in production-like environment

**Step 1: Build production bundle**

Run: `npm run build`

Expected: Build completes without errors

**Step 2: Preview production build**

Run: `npm run preview`

Expected: Server starts, navigate to preview URL

**Step 3: Complete test checklist**

Test in preview build:
- [ ] All 4 nav items accessible
- [ ] All tabs functional in each section
- [ ] Badge counts accurate
- [ ] Dashboard cards clickable
- [ ] Tab persistence works
- [ ] URL params work
- [ ] Mobile responsive
- [ ] No console errors
- [ ] All existing features still work

**Step 4: Run Playwright tests against preview**

Run: `TEST_URL=http://localhost:4173 npm test`

Expected: All tests pass

**Step 5: Document any remaining issues**

If issues found, create GitHub issues or fix immediately.

**Step 6: Final commit**

```bash
git add .
git commit -m "chore: final verification and testing complete

- Production build tested
- All navigation flows verified
- Playwright tests passing
- Ready for deployment

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Success Criteria

✅ Navigation reduced from 12+ items to 4 items
✅ All features accessible within ≤2 clicks
✅ Tab navigation works on desktop and mobile
✅ Badge counts accurately aggregate multiple sources
✅ Dashboard cards provide quick navigation shortcuts
✅ URL deep linking works for all tabs
✅ Tab state persists across sessions
✅ All Playwright tests pass
✅ Production build works correctly
✅ No functionality lost in consolidation

---

## Migration Tasks (Separate Implementation)

These are NOT part of this plan - track separately:

**Move Invoices to Billing Service:**
- Copy `invoices.html` and `/src/invoices/*` to Billing
- Add Invoices to Billing navigation
- Remove from Operations
- Update cross-service links

**Move Settings to Billing Service:**
- Copy `settings.html`, `/src/views/settings.js`, `/src/lib/pricing.js` to Billing
- Add Settings to Billing navigation
- Remove from Operations
- Update cross-service references

---

## Estimated Effort

**Total: 17-24 hours**

- Task 1-2: Tab component & nav structure (2-3 hours)
- Task 3-4: Schedule page tabs (4-6 hours)
- Task 5-6: Boats page tabs (3-4 hours)
- Task 7: Customers page (2-3 hours)
- Task 8: Badge aggregation (1-2 hours)
- Task 9: Dashboard consolidation (2-3 hours)
- Task 10: Testing & fixes (1-2 hours)
- Task 11: Playwright tests (1-2 hours)
- Task 12-13: Documentation & verification (1-2 hours)

---

**Plan Status:** Complete - Ready for Execution
**Next Step:** Choose execution approach (Subagent-Driven or Parallel Session)
