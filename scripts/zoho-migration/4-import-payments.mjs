#!/usr/bin/env node
import { parseCSV, supabase, log, writeJSON, CSV_PATHS, validateEnv, processBatch } from './utils.mjs';
import fs from 'fs';

const DRY_RUN = process.env.DRY_RUN === 'true';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100');
const INVOICE_PREFIX = process.env.INVOICE_PREFIX || 'ZB-';

async function importPayments() {
  validateEnv();

  log('INFO', 'Starting Zoho Payments import', { dryRun: DRY_RUN });

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No data will be written\n');
  }

  // Parse Zoho payments
  const zohoPayments = await parseCSV(CSV_PATHS.payments);
  log('INFO', 'Loaded Zoho payments', { count: zohoPayments.length });

  // Filter for Zoho Payments only (not Stripe)
  const zohoOnlyPayments = zohoPayments.filter(p =>
    p['Mode'] === 'Zoho Payments' ||
    (p['Mode'] !== 'Stripe' && !p['Reference Number']?.startsWith('ch_'))
  );

  log('INFO', 'Filtered Zoho Payments', { count: zohoOnlyPayments.length });

  // Fetch migrated invoices to link payments
  const { data: migratedInvoices, error } = await supabase
    .from('invoices')
    .select('id, invoice_number, customer_id, amount')
    .like('invoice_number', `${INVOICE_PREFIX}%`);

  if (error) {
    log('ERROR', 'Failed to fetch invoices', { error: error.message });
    process.exit(1);
  }

  const invoiceMap = new Map();
  migratedInvoices.forEach(inv => {
    // Extract Zoho invoice number from ZB- prefix
    const zohoNumber = inv.invoice_number.replace(INVOICE_PREFIX, '');
    invoiceMap.set(zohoNumber, inv);
  });

  log('INFO', 'Loaded migrated invoices', { count: invoiceMap.size });

  // Process payments
  const results = {
    total: zohoOnlyPayments.length,
    processed: 0,
    linked: 0,
    unlinked: 0,
    errors: []
  };

  const paymentsToInsert = [];
  const invoiceUpdates = [];

  for (const payment of zohoOnlyPayments) {
    try {
      const invoiceNumber = payment['Invoice Number'];
      const invoice = invoiceMap.get(invoiceNumber);

      if (!invoice) {
        results.unlinked++;
        results.errors.push({
          payment: payment['Payment Number'],
          invoice: invoiceNumber,
          error: 'Invoice not found'
        });
        continue;
      }

      const paymentRecord = {
        customer_id: invoice.customer_id,
        invoice_id: invoice.id,
        amount: parseFloat(payment['Amount'] || 0),
        payment_method: 'zoho',
        payment_reference: payment['Payment Number'],
        status: 'completed',
        created_at: payment['Date'],
        metadata: {
          zoho_payment_id: payment['Payment ID'],
          zoho_mode: payment['Mode'],
          migrated_from_zoho: true,
          migration_date: new Date().toISOString()
        }
      };

      paymentsToInsert.push(paymentRecord);

      // Prepare invoice update to link payment
      invoiceUpdates.push({
        id: invoice.id,
        payment_method: 'zoho',
        payment_reference: payment['Payment Number']
      });

      results.processed++;
      results.linked++;

    } catch (err) {
      results.errors.push({
        payment: payment['Payment Number'],
        error: err.message
      });
    }
  }

  // Insert payments in batches
  if (!DRY_RUN && paymentsToInsert.length > 0) {
    log('INFO', 'Inserting Zoho payments...', { count: paymentsToInsert.length });

    const insertedPayments = await processBatch(paymentsToInsert, BATCH_SIZE, async (batch) => {
      const { data, error } = await supabase
        .from('payments')
        .insert(batch)
        .select('id, invoice_id');

      if (error) {
        log('ERROR', 'Batch insert failed', { error: error.message });
        throw error;
      }

      return data;
    });

    // Update invoices with payment_id
    log('INFO', 'Updating invoices with payment_id...');

    for (const payment of insertedPayments) {
      const { error: updateError } = await supabase
        .from('invoices')
        .update({ payment_id: payment.id })
        .eq('id', payment.invoice_id);

      if (updateError) {
        log('ERROR', 'Failed to update invoice', {
          invoiceId: payment.invoice_id,
          error: updateError.message
        });
      }
    }
  }

  // Write results
  writeJSON('zoho-payments-import-results.json', {
    ...results,
    samplePayments: paymentsToInsert.slice(0, 5)
  });

  // Print summary
  console.log('\n💳 ZOHO PAYMENTS IMPORT SUMMARY\n');
  console.log('Total Zoho Payments:', results.total);
  console.log('Processed:', results.processed);
  console.log('Linked to invoices:', results.linked);
  console.log('Unlinked:', results.unlinked);

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors:', results.errors.length);
    console.log('    See zoho-payments-import-results.json for details\n');
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - No data written. Set DRY_RUN=false to import.\n');
  } else {
    console.log('\n✅ Zoho Payments import complete!\n');
  }
}

importPayments().catch(err => {
  log('ERROR', 'Zoho Payments import failed', { error: err.message });
  process.exit(1);
});
