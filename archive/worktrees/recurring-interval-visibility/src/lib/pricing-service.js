import { supabase } from './supabase-client.js';

/**
 * Get all pricing configuration
 */
export async function getPricingConfig() {
  const { data, error } = await supabase
    .from('business_pricing_config')
    .select('*')
    .order('config_type, display_name');

  if (error) throw error;

  // Convert to object for easy access
  return data.reduce((acc, row) => {
    acc[row.config_key] = {
      value: parseFloat(row.config_value),
      display_name: row.display_name,
      description: row.description,
      unit: row.unit,
      type: row.config_type,
    };
    return acc;
  }, {});
}

/**
 * Update pricing configuration
 */
export async function updatePricingConfig(configKey, newValue, userId, reason = '') {
  // Get current value for audit log
  const { data: current } = await supabase
    .from('business_pricing_config')
    .select('config_value')
    .eq('config_key', configKey)
    .single();

  const oldValue = current?.config_value;

  // Update config
  const { data, error } = await supabase
    .from('business_pricing_config')
    .update({
      config_value: newValue,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('config_key', configKey)
    .select()
    .single();

  if (error) throw error;

  // Log to audit trail
  await supabase
    .from('pricing_audit_log')
    .insert({
      config_key: configKey,
      old_value: oldValue,
      new_value: newValue,
      changed_by: userId,
      reason,
    });

  return data;
}

/**
 * Calculate pricing impact based on recent services
 */
export async function calculatePricingImpact(changes) {
  // Fetch recent service logs (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: services } = await supabase
    .from('service_logs')
    .select('id, boat_length, service_type, growth_level, hull_type, total_amount')
    .gte('completed_at', thirtyDaysAgo.toISOString());

  if (!services || services.length === 0) {
    return {
      servicesAnalyzed: 0,
      averageIncrease: 0,
      projectedMonthlyImpact: 0,
      samples: [],
    };
  }

  // Calculate impact for each service
  let totalIncrease = 0;
  const samples = services.slice(0, 5).map(service => {
    const currentPrice = parseFloat(service.total_amount) || 0;
    const newPrice = calculateServicePrice(service, changes);
    const increase = newPrice - currentPrice;
    totalIncrease += increase;

    return {
      description: `${service.boat_length}ft ${service.hull_type || 'sailboat'}, ${service.growth_level || 'clean'}`,
      currentPrice: currentPrice.toFixed(2),
      newPrice: newPrice.toFixed(2),
      change: increase.toFixed(2),
    };
  });

  const averageIncrease = totalIncrease / services.length;
  const projectedMonthlyImpact = averageIncrease * services.length;

  return {
    servicesAnalyzed: services.length,
    averageIncrease: averageIncrease.toFixed(2),
    projectedMonthlyImpact: projectedMonthlyImpact.toFixed(2),
    samples,
  };
}

/**
 * Calculate service price with new pricing
 * (Simplified version - real implementation should match Estimator logic)
 */
function calculateServicePrice(service, newPricing) {
  const length = parseFloat(service.boat_length) || 0;
  const serviceType = service.service_type || 'recurring_cleaning';

  // Get base rate
  const rateKey = serviceType === 'one_time' ? 'onetime_cleaning_rate' : 'recurring_cleaning_rate';
  const baseRate = newPricing[rateKey] || 4.50;

  let price = length * baseRate;

  // Apply surcharges
  if (service.growth_level === 'heavy') {
    price *= (1 + (newPricing.surcharge_heavy_growth || 0.50));
  }
  if (service.hull_type === 'catamaran') {
    price *= (1 + (newPricing.surcharge_catamaran || 0.25));
  }

  return Math.max(price, newPricing.minimum_service_charge || 150);
}

/**
 * Get pricing change history
 */
export async function getPricingHistory(limit = 10) {
  const { data, error } = await supabase
    .from('pricing_audit_log')
    .select(`
      *,
      changed_by_user:auth.users!pricing_audit_log_changed_by_fkey(email)
    `)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
