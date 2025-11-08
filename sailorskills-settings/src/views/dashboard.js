import { supabase } from '../lib/supabase-client.js';
import { initNavigation } from '../../shared/src/ui/navigation.js';

async function logout() {
  try {
    await supabase.auth.signOut();
    // Redirect to login page
    window.location.href = 'https://login.sailorskills.com/login.html';
  } catch (error) {
    console.error('Logout error:', error);
    // Still redirect even if logout fails
    window.location.href = 'https://login.sailorskills.com/login.html';
  }
}

async function init() {
  // Initialize global navigation with Settings sub-pages
  initNavigation({
    currentPage: 'settings',
    currentSubPage: 'src/views/dashboard',
    onLogout: logout
  });

  await loadQuickStats();
  await loadRecentActivity();
}

async function loadQuickStats() {
  try {
    // Count email templates
    const { count: templatesCount } = await supabase
      .from('email_templates')
      .select('*', { count: 'exact', head: true });
    document.getElementById('stat-templates').textContent = templatesCount || 0;

    // Count users
    const { data: { users } } = await supabase.auth.admin.listUsers();
    document.getElementById('stat-users').textContent = users?.length || 0;

    // Count active integrations
    const { data: integrations } = await supabase
      .from('integration_credentials')
      .select('*')
      .eq('is_active', true);
    document.getElementById('stat-integrations').textContent = integrations?.length || 0;

    // Count emails sent in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: emailsCount } = await supabase
      .from('email_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());
    document.getElementById('stat-emails').textContent = emailsCount || 0;
  } catch (error) {
    console.error('Failed to load quick stats:', error);
  }
}

async function loadRecentActivity() {
  try {
    const activities = [];

    // Get recent pricing changes
    const { data: pricingChanges } = await supabase
      .from('pricing_audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(3);

    if (pricingChanges) {
      pricingChanges.forEach(change => {
        activities.push({
          timestamp: change.changed_at,
          action: `Pricing updated: ${change.config_key} changed from $${change.old_value} to $${change.new_value}`,
        });
      });
    }

    // Get recent email template updates
    const { data: templateUpdates } = await supabase
      .from('email_templates')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(2);

    if (templateUpdates) {
      templateUpdates.forEach(template => {
        activities.push({
          timestamp: template.updated_at,
          action: `Email template updated: ${template.template_name}`,
        });
      });
    }

    // Sort by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Render
    const activityList = document.getElementById('activity-list');

    if (activities.length === 0) {
      activityList.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">No recent activity</div>';
      return;
    }

    activityList.innerHTML = activities.slice(0, 5).map(activity => `
      <div class="activity-item">
        <div class="timestamp">${formatDate(activity.timestamp)}</div>
        <div class="action">${activity.action}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Failed to load recent activity:', error);
  }
}

function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

init();
