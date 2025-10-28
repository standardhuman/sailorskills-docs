#!/usr/bin/env node
import { parseCSV, supabase, log, writeJSON, CSV_PATHS, validateEnv, processBatch } from './utils.mjs';
import fs from 'fs';

const DRY_RUN = process.env.DRY_RUN === 'true';
const INVOICE_PREFIX = process.env.INVOICE_PREFIX || 'ZB-';
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100');

async function importInvoices() {
  validateEnv();

  log('INFO', 'Starting invoice import', { dryRun: DRY_RUN, batchSize: BATCH_SIZE });

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN MODE - No data will be written\n');
  }

  // Load customer mapping
  if (!fs.existsSync('customer-mapping.json')) {
    log('ERROR', 'customer-mapping.json not found. Run step 2 first.');
    process.exit(1);
  }

  const customerMapping = JSON.parse(fs.readFileSync('customer-mapping.json'));
  const customerMap = new Map(
    customerMapping.map(m => [m.zoho_customer_id, m.sailor_customer_id])
  );

  log('INFO', 'Loaded customer mapping', { mappings: customerMap.size });

  // Parse Zoho invoices and payments
  const zohoInvoices = await parseCSV(CSV_PATHS.invoices);
  const zohoPayments = await parseCSV(CSV_PATHS.payments);

  log('INFO', 'Loaded Zoho data', {
    invoices: zohoInvoices.length,
    payments: zohoPayments.length
  });

  // Create payment lookup by invoice number
  const paymentsByInvoice = new Map();
  zohoPayments.forEach(payment => {
    const invoiceNum = payment['Invoice Number'];
    if (!paymentsByInvoice.has(invoiceNum)) {
      paymentsByInvoice.set(invoiceNum, []);
    }
    paymentsByInvoice.get(invoiceNum).push(payment);
  });

  // Fetch existing Stripe payments for linking
  log('INFO', 'Fetching existing Stripe payments...');
  const { data: existingPayments, error: paymentsError } = await supabase
    .from('payments')
    .select('id, stripe_charge_id, stripe_payment_intent_id, amount, created_at');

  if (paymentsError) {
    log('ERROR', 'Failed to fetch payments', { error: paymentsError.message });
    process.exit(1);
  }

  const paymentsByChargeId = new Map();
  const paymentsByPaymentIntent = new Map();

  existingPayments.forEach(p => {
    if (p.stripe_charge_id) {
      paymentsByChargeId.set(p.stripe_charge_id, p);
    }
    if (p.stripe_payment_intent_id) {
      paymentsByPaymentIntent.set(p.stripe_payment_intent_id, p);
    }
  });

  log('INFO', 'Stripe payments indexed', {
    totalPayments: existingPayments.length,
    withChargeId: paymentsByChargeId.size,
    withPaymentIntent: paymentsByPaymentIntent.size
  });

  // Process invoices
  const results = {
    total: zohoInvoices.length,
    processed: 0,
    stripeLinked: 0,
    stripePaymentCreated: 0,
    zohoPayment: 0,
    unpaid: 0,
    skipped: 0,
    errors: []
  };

  const invoicesToInsert = [];

  for (const zohoInvoice of zohoInvoices) {
    try {
      const invoiceNumber = zohoInvoice['Invoice Number'];
      const zohoCustomerId = zohoInvoice['Customer ID'];
      const sailorCustomerId = customerMap.get(zohoCustomerId);

      if (!sailorCustomerId) {
        results.skipped++;
        results.errors.push({
          invoice: invoiceNumber,
          error: 'Customer not mapped'
        });
        continue;
      }

      // Get invoice details
      const invoiceDate = zohoInvoice['Invoice Date'];
      const dueDate = zohoInvoice['Due Date'];
      const total = parseFloat(zohoInvoice['Total'] || 0);
      const status = zohoInvoice['Invoice Status'];
      const isStripe = zohoInvoice['Stripe'] === 'true';
      const isZoho = zohoInvoice['Zoho Payments'] === 'true';

      // Determine payment status
      let paymentMethod = null;
      let paymentReference = null;
      let paidAt = null;
      let linkedPaymentId = null;

      const invoicePayments = paymentsByInvoice.get(invoiceNumber) || [];

      if (isStripe && invoicePayments.length > 0) {
        // Try to link to existing Stripe payment
        const stripePayment = invoicePayments.find(p =>
          p['Reference Number']?.startsWith('ch_')
        );

        if (stripePayment) {
          const chargeId = stripePayment['Reference Number'];
          const existingPayment = paymentsByChargeId.get(chargeId);

          if (existingPayment) {
            // Link to existing payment
            linkedPaymentId = existingPayment.id;
            paymentMethod = 'stripe';
            paymentReference = chargeId;
            paidAt = stripePayment['Date'];
            results.stripeLinked++;
          } else {
            // Will create Stripe payment later
            paymentMethod = 'stripe';
            paymentReference = chargeId;
            paidAt = stripePayment['Date'];
            results.stripePaymentCreated++;
          }
        }
      } else if (isZoho && invoicePayments.length > 0) {
        paymentMethod = 'zoho';
        paymentReference = invoicePayments[0]['Payment Number'];
        paidAt = invoicePayments[0]['Date'];
        results.zohoPayment++;
      } else if (status === 'Closed' || status === 'Paid') {
        // Paid but no payment record found
        paymentMethod = 'unknown';
        paidAt = invoiceDate;
        results.zohoPayment++;
      } else {
        results.unpaid++;
      }

      // Build invoice record
      const invoiceRecord = {
        invoice_number: `${INVOICE_PREFIX}${invoiceNumber}`,
        customer_id: sailorCustomerId,
        boat_id: null, // Will link in service log step
        service_id: null,
        amount: total,
        status: status === 'Closed' || status === 'Paid' ? 'paid' :
                status === 'Open' ? 'pending' : 'pending',
        issued_at: invoiceDate,
        due_at: dueDate,
        paid_at: paidAt,
        payment_method: paymentMethod,
        payment_reference: paymentReference,
        payment_id: linkedPaymentId,
        customer_details: {
          zoho_customer_id: zohoCustomerId,
          migrated_from_zoho: true
        },
        service_details: {
          zoho_invoice_number: invoiceNumber,
          zoho_status: status,
          migration_date: new Date().toISOString()
        }
      };

      invoicesToInsert.push(invoiceRecord);
      results.processed++;

    } catch (err) {
      results.errors.push({
        invoice: zohoInvoice['Invoice Number'],
        error: err.message
      });
    }
  }

  // Insert invoices in batches
  if (!DRY_RUN && invoicesToInsert.length > 0) {
    log('INFO', 'Inserting invoices...', { count: invoicesToInsert.length });

    await processBatch(invoicesToInsert, BATCH_SIZE, async (batch) => {
      const { error } = await supabase
        .from('invoices')
        .insert(batch);

      if (error) {
        log('ERROR', 'Batch insert failed', { error: error.message });
        throw error;
      }

      return batch;
    });
  }

  // Write results
  writeJSON('invoice-import-results.json', {
    ...results,
    sampleInvoices: invoicesToInsert.slice(0, 5)
  });

  // Print summary
  console.log('\n📄 INVOICE IMPORT SUMMARY\n');
  console.log('Total Zoho Invoices:', results.total);
  console.log('Processed:', results.processed);
  console.log('Skipped (no customer):', results.skipped);
  console.log('\nPayment Breakdown:');
  console.log('  Linked to existing Stripe:', results.stripeLinked);
  console.log('  New Stripe payments needed:', results.stripePaymentCreated);
  console.log('  Zoho Payments:', results.zohoPayment);
  console.log('  Unpaid:', results.unpaid);

  if (results.errors.length > 0) {
    console.log('\n⚠️  Errors:', results.errors.length);
    console.log('    See invoice-import-results.json for details\n');
  }

  if (DRY_RUN) {
    console.log('\n🔍 DRY RUN - No data written. Set DRY_RUN=false to import.\n');
  } else {
    console.log('\n✅ Invoice import complete!\n');
  }
}

importInvoices().catch(err => {
  log('ERROR', 'Invoice import failed', { error: err.message, stack: err.stack });
  process.exit(1);
});
