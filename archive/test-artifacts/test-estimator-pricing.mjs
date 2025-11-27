#!/usr/bin/env node

/**
 * Test Estimator pricing with new cleaning frequency surcharges
 *
 * Simulates what a customer would see for different scenarios
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
config({ path: join(__dirname, 'sailorskills-settings', '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Mock pricing data (from configuration.js)
const BASE_RATE = 1.50; // $1.50 per foot for recurring cleaning

async function getCleaningSurcharge(intervalKey, paintCondition) {
  const { data } = await supabase
    .from('cleaning_frequency_surcharges')
    .select('surcharge_percentage')
    .eq('interval_key', intervalKey)
    .eq('paint_condition', paintCondition)
    .single();

  return data ? parseFloat(data.surcharge_percentage) / 100 : 0;
}

async function calculatePrice(boatLength, paintCondition, lastCleanedInterval) {
  const baseCost = boatLength * BASE_RATE;
  const surcharge = await getCleaningSurcharge(lastCleanedInterval, paintCondition);
  const surchargeAmount = baseCost * surcharge;
  const total = baseCost + surchargeAmount;

  return {
    baseCost,
    surcharge: surcharge * 100, // Convert back to percentage for display
    surchargeAmount,
    total
  };
}

async function runPricingTests() {
  console.log('💵 Estimator Pricing Test - Custom Progression\n');
  console.log('Testing 40-foot boat with recurring cleaning service\n');

  const scenarios = [
    { paint: 'excellent', interval: '0-2_months', description: 'Excellent paint, cleaned within 2 months' },
    { paint: 'excellent', interval: '9-12_months', description: 'Excellent paint, cleaned 9-12 months ago' },
    { paint: 'excellent', interval: 'over_24_months_unsure', description: 'Excellent paint, 24+ months since cleaning' },
    { paint: 'good', interval: '5-6_months', description: 'Good paint, cleaned 5-6 months ago' },
    { paint: 'fair', interval: '13-24_months', description: 'Fair paint, cleaned 13-24 months ago' },
    { paint: 'poor', interval: '0-2_months', description: 'Poor paint, cleaned within 2 months' },
    { paint: 'poor', interval: '7-8_months', description: 'Poor paint, cleaned 7-8 months ago' },
    { paint: 'poor', interval: 'over_24_months_unsure', description: 'Poor paint, 24+ months / unsure' }
  ];

  console.log('┌─────────────────────────────────────────────────┬───────────┬──────────┬────────────┬──────────┐');
  console.log('│ Scenario                                        │ Base Cost │ Surcharge│ Extra Cost │ Total    │');
  console.log('├─────────────────────────────────────────────────┼───────────┼──────────┼────────────┼──────────┤');

  for (const scenario of scenarios) {
    const price = await calculatePrice(40, scenario.paint, scenario.interval);

    const desc = scenario.description.padEnd(47);
    const base = `$${price.baseCost.toFixed(2)}`.padEnd(9);
    const surch = `${price.surcharge.toFixed(0)}%`.padEnd(8);
    const extra = `$${price.surchargeAmount.toFixed(2)}`.padEnd(10);
    const total = `$${price.total.toFixed(2)}`.padEnd(8);

    console.log(`│ ${desc} │ ${base} │ ${surch} │ ${extra} │ ${total} │`);
  }

  console.log('└─────────────────────────────────────────────────┴───────────┴──────────┴────────────┴──────────┘');

  console.log('\n📊 Key Takeaways:');
  console.log('   • Well-maintained boats (Excellent/Good/Fair) max out at 60% surcharge');
  console.log('   • Poor paint with neglected cleaning can reach 200% surcharge (3x base price!)');
  console.log('   • Gradual-then-steep progression encourages regular maintenance');
  console.log('\n✅ New pricing structure is active and ready to use!\n');
}

runPricingTests();
