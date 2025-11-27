import {
  getEmailLogs,
  getEmailLog,
  getEmailStats,
  exportToCSV,
  getEngagementFunnel,
  getPerformanceByType,
} from '../lib/email-logs-service.js';
import { initNavigation } from '../../shared/src/ui/navigation.js';
import { supabase } from '../lib/supabase-client.js';

let currentPage = 1;
let currentFilters = {};
let allLogs = [];

// Logout handler
async function logout() {
  try {
    await supabase.auth.signOut();
    window.location.href = 'https://login.sailorskills.com/login.html';
  } catch (error) {
    console.error('Logout error:', error);
    window.location.href = 'https://login.sailorskills.com/login.html';
  }
}

// Initialize
async function init() {
  // Initialize global navigation with Settings sub-pages
  initNavigation({
    currentPage: 'settings',
    currentSubPage: 'src/views/email-logs',
    onLogout: logout
  });

  await loadStats();
  await loadAnalytics();
  await loadLogs();
  setupEventListeners();
}

// Load analytics
async function loadAnalytics() {
  await Promise.all([
    loadEngagementFunnel(),
    loadPerformanceByType(),
    generateInsights(),
  ]);
}

// Load engagement funnel
async function loadEngagementFunnel() {
  try {
    const funnel = await getEngagementFunnel(currentFilters);

    document.getElementById('funnel-sent').textContent = funnel.sent;
    document.getElementById('funnel-delivered').textContent = funnel.delivered;
    document.getElementById('funnel-opened').textContent = funnel.opened;
    document.getElementById('funnel-clicked').textContent = funnel.clicked;
    document.getElementById('funnel-replied').textContent = funnel.replied;

    // Calculate percentages for bar widths
    if (funnel.sent > 0) {
      const deliveredPct = (funnel.delivered / funnel.sent) * 100;
      const openedPct = (funnel.opened / funnel.sent) * 100;
      const clickedPct = (funnel.clicked / funnel.sent) * 100;
      const repliedPct = (funnel.replied / funnel.sent) * 100;

      document.getElementById('funnel-delivered-bar').style.width = `${deliveredPct}%`;
      document.getElementById('funnel-opened-bar').style.width = `${openedPct}%`;
      document.getElementById('funnel-clicked-bar').style.width = `${clickedPct}%`;
      document.getElementById('funnel-replied-bar').style.width = `${repliedPct}%`;
    }
  } catch (error) {
    console.error('Failed to load engagement funnel:', error);
  }
}

// Load performance by type
async function loadPerformanceByType() {
  try {
    const performance = await getPerformanceByType(currentFilters);
    const tbody = document.getElementById('performance-table-body');

    if (performance.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #666;">No data available</td></tr>';
      return;
    }

    tbody.innerHTML = performance.map(item => {
      const openRateClass = parseFloat(item.openRate) >= 30 ? 'rate-good' : parseFloat(item.openRate) >= 15 ? 'rate-average' : 'rate-poor';
      const clickRateClass = parseFloat(item.clickRate) >= 20 ? 'rate-good' : parseFloat(item.clickRate) >= 10 ? 'rate-average' : 'rate-poor';

      return `
        <tr>
          <td>${item.type}</td>
          <td>${item.total}</td>
          <td class="${openRateClass}">${item.openRate}%</td>
          <td class="${clickRateClass}">${item.clickRate}%</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load performance by type:', error);
  }
}

// Generate insights
async function generateInsights() {
  try {
    const stats = await getEmailStats(currentFilters);
    const performance = await getPerformanceByType(currentFilters);
    const container = document.getElementById('insights-container');
    const insights = [];

    // Open rate analysis
    const openRate = parseFloat(stats.openRate);
    if (openRate < 15) {
      insights.push({
        type: 'warning',
        text: `Open rate is ${openRate}% (below industry average of 20%). Consider improving subject lines or sending at different times.`,
      });
    } else if (openRate > 30) {
      insights.push({
        type: 'success',
        text: `Excellent open rate of ${openRate}%! Your subject lines are resonating with recipients.`,
      });
    }

    // Click rate analysis
    const clickRate = parseFloat(stats.clickRate);
    if (clickRate < 10 && stats.opened > 0) {
      insights.push({
        type: 'warning',
        text: `Click rate is ${clickRate}%. Try adding clearer CTAs or more engaging content.`,
      });
    } else if (clickRate > 20) {
      insights.push({
        type: 'success',
        text: `Strong click rate of ${clickRate}%! Your email content is driving engagement.`,
      });
    }

    // Bounce rate analysis
    const bounceRate = parseFloat(stats.bounceRate);
    if (bounceRate > 5) {
      insights.push({
        type: 'warning',
        text: `Bounce rate is ${bounceRate}% (high). Clean your email list to improve deliverability.`,
      });
    }

    // Best performing email type
    if (performance.length > 0) {
      const best = performance.reduce((max, item) =>
        parseFloat(item.openRate) > parseFloat(max.openRate) ? item : max
      );
      insights.push({
        type: 'info',
        text: `Best performing email: "${best.type}" with ${best.openRate}% open rate.`,
      });
    }

    // Total volume insight
    if (stats.total < 10) {
      insights.push({
        type: 'info',
        text: `Limited data available (${stats.total} emails). Insights will improve as more emails are sent.`,
      });
    }

    // Render insights
    if (insights.length === 0) {
      container.innerHTML = '<p style="color: #666;">No insights available yet. Send more emails to see recommendations.</p>';
    } else {
      container.innerHTML = insights.map(insight => `
        <div class="insight-item ${insight.type}">
          ${insight.text}
        </div>
      `).join('');
    }
  } catch (error) {
    console.error('Failed to generate insights:', error);
  }
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
  loadAnalytics();
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
  loadAnalytics();
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
