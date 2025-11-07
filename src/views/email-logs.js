import {
  getEmailLogs,
  getEmailLog,
  getEmailStats,
  exportToCSV,
} from '../lib/email-logs-service.js';

let currentPage = 1;
let currentFilters = {};
let allLogs = [];

// Initialize
async function init() {
  await loadStats();
  await loadLogs();
  setupEventListeners();
}

// Load statistics
async function loadStats() {
  try {
    const stats = await getEmailStats(currentFilters);

    document.getElementById('stat-total').textContent = stats.sent;
    document.getElementById('stat-open-rate').textContent = `${stats.openRate}%`;
    document.getElementById('stat-click-rate').textContent = `${stats.clickRate}%`;
    document.getElementById('stat-bounce-rate').textContent = `${stats.bounceRate}%`;
  } catch (error) {
    console.error('Failed to load stats:', error);
  }
}

// Load logs
async function loadLogs() {
  try {
    const result = await getEmailLogs(currentFilters, currentPage, 50);
    allLogs = result.logs;

    renderLogsTable(result.logs);
    renderPagination(result);
  } catch (error) {
    console.error('Failed to load logs:', error);
    document.getElementById('logs-table-body').innerHTML = `
      <tr>
        <td colspan="7" class="loading-row" style="color: #f44336;">
          Failed to load email logs. Please try again.
        </td>
      </tr>
    `;
  }
}

// Render logs table
function renderLogsTable(logs) {
  const tbody = document.getElementById('logs-table-body');

  if (logs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="loading-row">No email logs found.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = logs.map(log => `
    <tr data-log-id="${log.id}">
      <td>${formatDate(log.created_at)}</td>
      <td>${log.recipient_email || '-'}</td>
      <td>${log.subject || '-'}</td>
      <td>${log.email_type || '-'}</td>
      <td>
        <span class="status-badge status-${log.status}">
          ${log.status}
        </span>
      </td>
      <td>
        <div class="engagement-icons">
          <span class="${log.opened_at ? 'active' : 'inactive'}" title="Opened">👁️</span>
          <span class="${log.first_click_at ? 'active' : 'inactive'}" title="Clicked">🖱️</span>
          <span class="${log.replied_at ? 'active' : 'inactive'}" title="Replied">💬</span>
          <span class="${log.bounced_at ? 'active' : 'inactive'}" title="Bounced">⚠️</span>
        </div>
      </td>
      <td>
        <button class="btn btn-secondary btn-small view-detail-btn" data-log-id="${log.id}">
          View
        </button>
      </td>
    </tr>
  `).join('');

  // Add click handlers
  tbody.querySelectorAll('tr[data-log-id]').forEach(row => {
    row.addEventListener('click', (e) => {
      if (!e.target.classList.contains('btn')) {
        showDetailModal(row.dataset.logId);
      }
    });
  });

  tbody.querySelectorAll('.view-detail-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      showDetailModal(btn.dataset.logId);
    });
  });
}

// Render pagination
function renderPagination(result) {
  document.getElementById('page-info').textContent =
    `Page ${result.currentPage} of ${result.totalPages}`;

  document.getElementById('prev-page').disabled = result.currentPage <= 1;
  document.getElementById('next-page').disabled = result.currentPage >= result.totalPages;
}

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Apply filters
function applyFilters() {
  currentFilters = {
    status: document.getElementById('filter-status').value,
    email_type: document.getElementById('filter-type').value,
    startDate: document.getElementById('filter-start-date').value,
    endDate: document.getElementById('filter-end-date').value,
    search: document.getElementById('filter-search').value,
  };

  // Remove empty filters
  Object.keys(currentFilters).forEach(key => {
    if (!currentFilters[key]) {
      delete currentFilters[key];
    }
  });

  currentPage = 1;
  loadStats();
  loadLogs();
}

// Clear filters
function clearFilters() {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-type').value = '';
  document.getElementById('filter-start-date').value = '';
  document.getElementById('filter-end-date').value = '';
  document.getElementById('filter-search').value = '';

  currentFilters = {};
  currentPage = 1;
  loadStats();
  loadLogs();
}

// Show detail modal
async function showDetailModal(logId) {
  try {
    const log = await getEmailLog(logId);
    const modal = document.getElementById('detail-modal');
    const body = document.getElementById('detail-body');

    body.innerHTML = `
      <div class="detail-row">
        <strong>Recipient</strong>
        <div class="value">${log.recipient_email}</div>
      </div>
      <div class="detail-row">
        <strong>Subject</strong>
        <div class="value">${log.subject || '-'}</div>
      </div>
      <div class="detail-row">
        <strong>Email Type</strong>
        <div class="value">${log.email_type || '-'}</div>
      </div>
      <div class="detail-row">
        <strong>Status</strong>
        <div class="value">
          <span class="status-badge status-${log.status}">${log.status}</span>
        </div>
      </div>
      <div class="detail-row">
        <strong>Sent At</strong>
        <div class="value">${formatDate(log.created_at)}</div>
      </div>
      ${log.opened_at ? `
        <div class="detail-row">
          <strong>Opened At</strong>
          <div class="value">${formatDate(log.opened_at)}</div>
        </div>
      ` : ''}
      ${log.first_click_at ? `
        <div class="detail-row">
          <strong>First Click At</strong>
          <div class="value">${formatDate(log.first_click_at)}</div>
        </div>
      ` : ''}
      ${log.click_count ? `
        <div class="detail-row">
          <strong>Total Clicks</strong>
          <div class="value">${log.click_count}</div>
        </div>
      ` : ''}
      ${log.bounced_at ? `
        <div class="detail-row">
          <strong>Bounced At</strong>
          <div class="value">${formatDate(log.bounced_at)}</div>
        </div>
      ` : ''}
      ${log.error_message ? `
        <div class="detail-row">
          <strong>Error Message</strong>
          <div class="value" style="color: #f44336;">${log.error_message}</div>
        </div>
      ` : ''}
      ${log.resend_id ? `
        <div class="detail-row">
          <strong>Resend ID</strong>
          <div class="value" style="font-family: monospace; font-size: 12px;">${log.resend_id}</div>
        </div>
      ` : ''}
    `;

    modal.style.display = 'flex';
  } catch (error) {
    console.error('Failed to load email details:', error);
    alert('Failed to load email details.');
  }
}

// Export to CSV
function handleExportCSV() {
  if (allLogs.length === 0) {
    alert('No logs to export.');
    return;
  }

  const csv = exportToCSV(allLogs);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `email-logs-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Setup event listeners
function setupEventListeners() {
  // Filters
  document.getElementById('apply-filters-btn').addEventListener('click', applyFilters);
  document.getElementById('clear-filters-btn').addEventListener('click', clearFilters);

  // Pagination
  document.getElementById('prev-page').addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      loadLogs();
    }
  });

  document.getElementById('next-page').addEventListener('click', () => {
    currentPage++;
    loadLogs();
  });

  // Export
  document.getElementById('export-csv-btn').addEventListener('click', handleExportCSV);

  // Modal close
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('detail-modal').style.display = 'none';
    });
  });
}

// Initialize on page load
init();
