#!/usr/bin/env node

/**
 * Populate paint_repaint_schedule for all boats with service history
 *
 * This script should be run after importing service_logs to calculate
 * paint schedules based on historical paint condition data.
 *
 * Logic copied from api/service-complete.js:updatePaintRepaintSchedule()
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updatePaintRepaintSchedule(boatId, boatName) {
  try {
    // Get all paint conditions for this boat (last 5)
    const { data: conditions } = await supabase
      .from('service_logs')
      .select('paint_condition_overall, service_date')
      .eq('boat_id', boatId)
      .not('paint_condition_overall', 'is', null)
      .order('service_date', { ascending: false })
      .limit(5);

    if (!conditions || conditions.length === 0) {
      console.log(`  ⊘ ${boatName}: No paint conditions in service history`);
      return { status: 'skipped', reason: 'no_data' };
    }

    // Calculate average paint condition (excellent=4, good=3, fair=2, poor=1)
    const conditionValues = { excellent: 4, good: 3, fair: 2, poor: 1 };
    const avgCondition = conditions.reduce((sum, c) =>
      sum + (conditionValues[c.paint_condition_overall] || 0), 0) / conditions.length;

    // Determine trend (comparing most recent to second most recent)
    let trend = 'stable';
    if (conditions.length >= 2) {
      const recentValue = conditionValues[conditions[0].paint_condition_overall];
      const olderValue = conditionValues[conditions[1].paint_condition_overall];
      if (recentValue > olderValue) trend = 'improving';
      if (recentValue < olderValue) trend = 'declining';
    }

    // Determine urgency based on average condition
    let urgencyLevel = 'not_yet';
    if (avgCondition <= 1.5) urgencyLevel = 'overdue';
    else if (avgCondition <= 2) urgencyLevel = 'time_now';
    else if (avgCondition <= 2.5) urgencyLevel = 'consider_soon';

    // Upsert paint repaint schedule
    const { error } = await supabase
      .from('paint_repaint_schedule')
      .upsert({
        boat_id: boatId,
        avg_paint_condition: parseFloat(avgCondition.toFixed(2)),
        trend: trend,
        urgency_level: urgencyLevel,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'boat_id'
      });

    if (error) {
      console.error(`  ✗ ${boatName}: Error - ${error.message}`);
      return { status: 'error', error: error.message };
    } else {
      console.log(`  ✓ ${boatName}: ${urgencyLevel} (avg: ${avgCondition.toFixed(2)}, trend: ${trend})`);
      return { status: 'success', urgency: urgencyLevel, avg: avgCondition, trend };
    }
  } catch (error) {
    console.error(`  ✗ ${boatName}: Exception - ${error.message}`);
    return { status: 'error', error: error.message };
  }
}

async function populateAllPaintSchedules() {
  console.log('🎨 Populating paint_repaint_schedule from service_logs\n');
  console.log('=' .repeat(70));

  // Get all boats
  const { data: boats, error: boatsError } = await supabase
    .from('boats')
    .select('id, name')
    .order('name');

  if (boatsError) {
    console.error('Error fetching boats:', boatsError);
    return;
  }

  console.log(`\nFound ${boats.length} boats\n`);

  let stats = {
    success: 0,
    skipped: 0,
    error: 0
  };

  for (const boat of boats) {
    const result = await updatePaintRepaintSchedule(boat.id, boat.name);
    stats[result.status]++;
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Summary:');
  console.log(`  ✓ Success: ${stats.success}`);
  console.log(`  ⊘ Skipped (no data): ${stats.skipped}`);
  console.log(`  ✗ Errors: ${stats.error}`);

  // Verify final count
  const { count } = await supabase
    .from('paint_repaint_schedule')
    .select('*', { count: 'exact', head: true });

  console.log(`\n✅ paint_repaint_schedule now has ${count} records\n`);
}

populateAllPaintSchedules().catch(console.error);
