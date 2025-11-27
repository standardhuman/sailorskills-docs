#!/usr/bin/env node
import { supabase, log, writeJSON, writeCSV, validateEnv } from './utils.mjs';

const DRY_RUN = process.env.DRY_RUN === 'true';
const INVOICE_PREFIX = process.env.INVOICE_PREFIX || 'ZB-';

async function linkServiceLogs() {
  validateEnv();

  log('INFO', 'Starting service log linkage', { dryRun: DRY_RUN });

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No data will be written\n');
  }

  // Fetch count of uninvoiced service logs
  const { count: totalCount, error: countError } = await supabase
    .from('service_logs')
    .select('*', { count: 'exact', head: true })
    .is('invoice_id', null);

  if (countError) {
    log('ERROR', 'Failed to count service logs', { error: countError.message });
    process.exit(1);
  }

  log('INFO', 'Total uninvoiced service logs', { count: totalCount });

  // Fetch all uninvoiced service logs (handling pagination)
  const serviceLogs = [];
  const pageSize = 1000;

  for (let offset = 0; offset < totalCount; offset += pageSize) {
    log('INFO', `Fetching service logs ${offset}-${Math.min(offset + pageSize, totalCount)}...`);

    const { data, error: logsError } = await supabase
      .from('service_logs')
      .select('id, customer_id, boat_id, order_id, service_date')
      .is('invoice_id', null)
      .range(offset, offset + pageSize - 1);

    if (logsError) {
      log('ERROR', 'Failed to fetch service logs', { error: logsError.message });
      process.exit(1);
    }

    serviceLogs.push(...data);
  }

  log('INFO', 'Loaded uninvoiced service logs', { count: serviceLogs.length });

  // Fetch count of migrated invoices
  const { count: invoiceCount, error: invCountError } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .like('invoice_number', `${INVOICE_PREFIX}%`);

  if (invCountError) {
    log('ERROR', 'Failed to count invoices', { error: invCountError.message });
    process.exit(1);
  }

  log('INFO', 'Total migrated invoices', { count: invoiceCount });

  // Fetch all migrated invoices (handling pagination)
  const invoices = [];

  for (let offset = 0; offset < invoiceCount; offset += pageSize) {
    log('INFO', `Fetching invoices ${offset}-${Math.min(offset + pageSize, invoiceCount)}...`);

    const { data, error: invoicesError } = await supabase
      .from('invoices')
      .select('id, invoice_number, customer_id, boat_id, amount, issued_at, payment_method, payment_reference')
      .like('invoice_number', `${INVOICE_PREFIX}%`)
      .range(offset, offset + pageSize - 1);

    if (invoicesError) {
      log('ERROR', 'Failed to fetch invoices', { error: invoicesError.message });
      process.exit(1);
    }

    invoices.push(...data);
  }

  log('INFO', 'Loaded migrated invoices', { count: invoices.length });

  // Fetch all payments for payment_intent matching
  const { data: payments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, invoice_id, stripe_payment_intent_id, stripe_charge_id');

  if (paymentsError) {
    log('ERROR', 'Failed to fetch payments', { error: paymentsError.message });
    process.exit(1);
  }

  // Build lookup maps
  const paymentIntentMap = new Map();
  const chargeIdMap = new Map();

  payments.forEach(p => {
    if (p.stripe_payment_intent_id && p.invoice_id) {
      paymentIntentMap.set(p.stripe_payment_intent_id, p.invoice_id);
    }
    if (p.stripe_charge_id && p.invoice_id) {
      chargeIdMap.set(p.stripe_charge_id, p.invoice_id);
    }
  });

  log('INFO', 'Payment lookups built', {
    byPaymentIntent: paymentIntentMap.size,
    byChargeId: chargeIdMap.size
  });

  // Index invoices by customer for heuristic matching
  const invoicesByCustomer = new Map();
  invoices.forEach(inv => {
    if (!invoicesByCustomer.has(inv.customer_id)) {
      invoicesByCustomer.set(inv.customer_id, []);
    }
    invoicesByCustomer.get(inv.customer_id).push(inv);
  });

  // Process service logs
  const results = {
    total: serviceLogs.length,
    highConfidence: 0,
    mediumConfidence: 0,
    unlinked: 0,
    errors: []
  };

  const updates = [];
  const unlinkedLogs = [];

  for (const log of serviceLogs) {
    try {
      let invoiceId = null;
      let matchType = null;

      // Strategy 1: Match via payment_intent (HIGH CONFIDENCE)
      if (log.order_id?.startsWith('pi_')) {
        invoiceId = paymentIntentMap.get(log.order_id);
        if (invoiceId) {
          matchType = 'payment_intent';
          results.highConfidence++;
        }
      }

      // Strategy 2: Heuristic matching (MEDIUM CONFIDENCE)
      if (!invoiceId) {
        const customerInvoices = invoicesByCustomer.get(log.customer_id) || [];

        for (const inv of customerInvoices) {
          // Match by date within 7 days
          const logDate = new Date(log.service_date);
          const invDate = new Date(inv.issued_at);
          const daysDiff = Math.abs((logDate - invDate) / (1000 * 60 * 60 * 24));

          if (daysDiff <= 7) {
            invoiceId = inv.id;
            matchType = 'heuristic';
            results.mediumConfidence++;
            break;
          }
        }
      }

      // No match found
      if (!invoiceId) {
        results.unlinked++;
        unlinkedLogs.push({
          service_log_id: log.id,
          customer_id: log.customer_id,
          boat_id: log.boat_id,
          service_date: log.service_date,
          order_id: log.order_id
        });
        continue;
      }

      // Record update
      updates.push({
        id: log.id,
        invoice_id: invoiceId,
        match_type: matchType
      });

    } catch (err) {
      results.errors.push({
        service_log_id: log.id,
        error: err.message
      });
    }
  }

  // Apply updates in batches
  if (!DRY_RUN && updates.length > 0) {
    log('INFO', 'Updating service logs...', { count: updates.length });

    for (const update of updates) {
      const { error } = await supabase
        .from('service_logs')
        .update({ invoice_id: update.invoice_id })
        .eq('id', update.id);

      if (error) {
        log('ERROR', 'Failed to update service log', {
          id: update.id,
          error: error.message
        });
      }
    }
  }

  // Write outputs
  writeJSON('service-log-linkage-results.json', {
    ...results,
    sampleUpdates: updates.slice(0, 10)
  });

  if (unlinkedLogs.length > 0) {
    writeCSV('unlinked-service-logs.csv', unlinkedLogs,
      ['service_log_id', 'customer_id', 'boat_id', 'service_date', 'order_id']);
  }

  // Print summary
  console.log('\n🔗 SERVICE LOG LINKAGE SUMMARY\n');
  console.log('Total Uninvoiced Service Logs:', results.total);
  console.log('High Confidence (payment_intent):', results.highConfidence);
  console.log('Medium Confidence (heuristic):', results.mediumConfidence);
  console.log('Unlinked:', results.unlinked);
  console.log('\nLinkage Rate:', ((results.highConfidence + results.mediumConfidence) / results.total * 100).toFixed(1) + '%');

  if (unlinkedLogs.length > 0) {
    console.log('\n⚠️  Unlinked service logs written to unlinked-service-logs.csv');
    console.log('    Review for manual linking\n');
  }

  if (results.errors.length > 0) {
    console.log('⚠️  Errors:', results.errors.length);
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - No data written. Set DRY_RUN=false to link.\n');
  } else {
    console.log('\n✅ Service log linkage complete!\n');
  }
}

linkServiceLogs().catch(err => {
  log('ERROR', 'Service log linkage failed', { error: err.message });
  process.exit(1);
});
