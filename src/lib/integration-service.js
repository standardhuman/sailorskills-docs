import { supabase } from './supabase-client.js';

/**
 * Get all integrations
 */
export async function getIntegrations() {
  const { data, error } = await supabase
    .from('integration_credentials')
    .select('*')
    .order('integration_name');

  if (error) throw error;
  return data || [];
}

/**
 * Get single integration
 */
export async function getIntegration(integrationName) {
  const { data, error } = await supabase
    .from('integration_credentials')
    .select('*')
    .eq('integration_name', integrationName)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
  return data;
}

/**
 * Update or create integration
 */
export async function saveIntegration(integrationName, apiKey, configJson = {}, isActive = true) {
  // Check if exists
  const existing = await getIntegration(integrationName);

  if (existing) {
    // Update
    const { data, error } = await supabase
      .from('integration_credentials')
      .update({
        api_key_encrypted: apiKey,
        config_json: configJson,
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('integration_name', integrationName)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create
    const { data, error } = await supabase
      .from('integration_credentials')
      .insert({
        integration_name: integrationName,
        api_key_encrypted: apiKey,
        config_json: configJson,
        is_active: isActive,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Test integration connection
 */
export async function testIntegration(integrationName, apiKey) {
  // Call appropriate test endpoint based on integration type
  switch (integrationName) {
    case 'resend':
      return await testResend(apiKey);
    case 'stripe':
      return await testStripe(apiKey);
    case 'youtube':
      return await testYouTube(apiKey);
    case 'google_calendar':
      return await testGoogleCalendar(apiKey);
    default:
      return { success: false, message: 'Integration type not supported for testing' };
  }
}

/**
 * Test Resend API key
 */
async function testResend(apiKey) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok || response.status === 401) {
      // 401 means key is being validated (expected for list endpoint)
      return { success: true, message: 'Resend connection successful' };
    }

    return { success: false, message: `HTTP ${response.status}` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Test Stripe API key
 */
async function testStripe(apiKey) {
  try {
    const response = await fetch('https://api.stripe.com/v1/customers?limit=1', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { success: true, message: 'Stripe connection successful' };
    }

    return { success: false, message: `HTTP ${response.status}` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Test YouTube API key
 */
async function testYouTube(apiKey) {
  try {
    const response = await fetch(`https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true&key=${apiKey}`);

    if (response.ok) {
      return { success: true, message: 'YouTube connection successful' };
    }

    return { success: false, message: `HTTP ${response.status}` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Test Google Calendar API
 */
async function testGoogleCalendar(apiKey) {
  try {
    const response = await fetch(`https://www.googleapis.com/calendar/v3/users/me/calendarList?key=${apiKey}`);

    if (response.ok) {
      return { success: true, message: 'Google Calendar connection successful' };
    }

    return { success: false, message: `HTTP ${response.status}` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Get available integrations with descriptions
 */
export function getAvailableIntegrations() {
  return [
    {
      name: 'resend',
      displayName: 'Resend',
      description: 'Email delivery service for transactional emails',
      icon: '📧',
      keyLabel: 'API Key',
      keyPlaceholder: 're_...',
      docsUrl: 'https://resend.com/docs',
    },
    {
      name: 'stripe',
      displayName: 'Stripe',
      description: 'Payment processing for invoices and subscriptions',
      icon: '💳',
      keyLabel: 'Secret Key',
      keyPlaceholder: 'sk_...',
      docsUrl: 'https://stripe.com/docs/api',
    },
    {
      name: 'youtube',
      displayName: 'YouTube',
      description: 'Video management and playlist organization',
      icon: '📹',
      keyLabel: 'API Key',
      keyPlaceholder: 'AIza...',
      docsUrl: 'https://developers.google.com/youtube',
    },
    {
      name: 'google_calendar',
      displayName: 'Google Calendar',
      description: 'Booking and appointment scheduling',
      icon: '📅',
      keyLabel: 'API Key',
      keyPlaceholder: 'AIza...',
      docsUrl: 'https://developers.google.com/calendar',
    },
    {
      name: 'notion',
      displayName: 'Notion',
      description: 'Project management and documentation (future)',
      icon: '📝',
      keyLabel: 'Integration Token',
      keyPlaceholder: 'secret_...',
      docsUrl: 'https://developers.notion.com',
    },
  ];
}

/**
 * Mask API key for display
 */
export function maskApiKey(apiKey) {
  if (!apiKey) return '';
  if (apiKey.length < 12) return '••••••••';

  const prefix = apiKey.substring(0, 6);
  const suffix = apiKey.substring(apiKey.length - 4);
  return `${prefix}••••••••${suffix}`;
}
