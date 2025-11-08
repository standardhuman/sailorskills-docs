import { supabase } from './supabase-client.js';

/**
 * Get email logs with filters and pagination
 */
export async function getEmailLogs(filters = {}, page = 1, limit = 50) {
  let query = supabase
    .from('email_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false });

  // Apply filters
  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.email_type) {
    query = query.eq('email_type', filters.email_type);
  }

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  if (filters.search) {
    query = query.or(`recipient_email.ilike.%${filters.search}%,subject.ilike.%${filters.search}%`);
  }

  // Apply pagination
  const start = (page - 1) * limit;
  const end = start + limit - 1;
  query = query.range(start, end);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    logs: data,
    totalCount: count,
    currentPage: page,
    totalPages: Math.ceil(count / limit),
    limit,
  };
}

/**
 * Get single email log by ID
 */
export async function getEmailLog(id) {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get email log statistics
 */
export async function getEmailStats(filters = {}) {
  let query = supabase
    .from('email_logs')
    .select('status, opened_at, first_click_at, bounced_at, complained_at');

  // Apply same filters as getEmailLogs
  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Calculate statistics
  const total = data.length;
  const sent = data.filter(log => log.status === 'sent' || log.opened_at).length;
  const opened = data.filter(log => log.opened_at).length;
  const clicked = data.filter(log => log.first_click_at).length;
  const bounced = data.filter(log => log.bounced_at).length;
  const complained = data.filter(log => log.complained_at).length;

  return {
    total,
    sent,
    opened,
    clicked,
    bounced,
    complained,
    openRate: sent > 0 ? ((opened / sent) * 100).toFixed(1) : 0,
    clickRate: opened > 0 ? ((clicked / opened) * 100).toFixed(1) : 0,
    bounceRate: sent > 0 ? ((bounced / sent) * 100).toFixed(1) : 0,
  };
}

/**
 * Export email logs to CSV
 */
export function exportToCSV(logs) {
  const headers = [
    'Date',
    'Recipient',
    'Subject',
    'Type',
    'Status',
    'Opened',
    'Clicked',
    'Bounced',
  ];

  const rows = logs.map(log => [
    new Date(log.created_at).toISOString(),
    log.recipient_email,
    log.subject,
    log.email_type || '',
    log.status,
    log.opened_at ? 'Yes' : 'No',
    log.first_click_at ? 'Yes' : 'No',
    log.bounced_at ? 'Yes' : 'No',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(',')),
  ].join('\n');

  return csvContent;
}

/**
 * Get engagement funnel data
 */
export async function getEngagementFunnel(filters = {}) {
  let query = supabase
    .from('email_logs')
    .select('status, opened_at, first_click_at, replied_at');

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  const sent = data.length;
  const delivered = data.filter(log => log.status === 'sent').length;
  const opened = data.filter(log => log.opened_at).length;
  const clicked = data.filter(log => log.first_click_at).length;
  const replied = data.filter(log => log.replied_at).length;

  return {
    sent,
    delivered,
    opened,
    clicked,
    replied,
  };
}

/**
 * Get performance by email type
 */
export async function getPerformanceByType(filters = {}) {
  let query = supabase
    .from('email_logs')
    .select('email_type, status, opened_at, first_click_at');

  if (filters.startDate) {
    query = query.gte('created_at', filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte('created_at', filters.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;

  // Group by email type
  const typeStats = {};

  data.forEach(log => {
    const type = log.email_type || 'unknown';
    if (!typeStats[type]) {
      typeStats[type] = {
        total: 0,
        sent: 0,
        opened: 0,
        clicked: 0,
      };
    }

    typeStats[type].total++;
    if (log.status === 'sent') typeStats[type].sent++;
    if (log.opened_at) typeStats[type].opened++;
    if (log.first_click_at) typeStats[type].clicked++;
  });

  // Calculate rates
  return Object.entries(typeStats).map(([type, stats]) => ({
    type,
    total: stats.total,
    openRate: stats.sent > 0 ? ((stats.opened / stats.sent) * 100).toFixed(1) : 0,
    clickRate: stats.opened > 0 ? ((stats.clicked / stats.opened) * 100).toFixed(1) : 0,
  }));
}
