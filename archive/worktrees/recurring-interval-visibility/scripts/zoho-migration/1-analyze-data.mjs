#!/usr/bin/env node
import { parseCSV, log, writeJSON, CSV_PATHS, validateEnv } from './utils.mjs';

async function analyzeData() {
  validateEnv();

  log('INFO', 'Starting data analysis');

  // Parse CSV files
  log('INFO', 'Parsing CSV files...');
  const customers = await parseCSV(CSV_PATHS.customers);
  const invoices = await parseCSV(CSV_PATHS.invoices);
  const payments = await parseCSV(CSV_PATHS.payments);

  log('INFO', 'CSV files parsed', {
    customers: customers.length,
    invoices: invoices.length,
    payments: payments.length
  });

  // Analyze payment methods
  const paymentMethods = {
    stripe: 0,
    zoho: 0,
    unpaid: 0
  };

  invoices.forEach(inv => {
    const stripe = inv['Stripe'] === 'true';
    const zoho = inv['Zoho Payments'] === 'true';

    if (stripe) paymentMethods.stripe++;
    else if (zoho) paymentMethods.zoho++;
    else paymentMethods.unpaid++;
  });

  // Analyze Stripe charge IDs in payments
  const stripeCharges = payments.filter(p =>
    p['Reference Number'] && p['Reference Number'].startsWith('ch_')
  );

  // Analyze invoice statuses
  const statuses = {};
  invoices.forEach(inv => {
    const status = inv['Invoice Status'];
    statuses[status] = (statuses[status] || 0) + 1;
  });

  // Calculate totals
  const totalInvoiced = invoices.reduce((sum, inv) =>
    sum + parseFloat(inv['Total'] || 0), 0
  );

  const totalPaid = payments.reduce((sum, pmt) =>
    sum + parseFloat(pmt['Amount'] || 0), 0
  );

  // Generate report
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      totalCustomers: customers.length,
      totalInvoices: invoices.length,
      totalPayments: payments.length,
      totalInvoiced: totalInvoiced.toFixed(2),
      totalPaid: totalPaid.toFixed(2)
    },
    paymentMethods,
    paymentMethodPercentages: {
      stripe: ((paymentMethods.stripe / invoices.length) * 100).toFixed(1) + '%',
      zoho: ((paymentMethods.zoho / invoices.length) * 100).toFixed(1) + '%',
      unpaid: ((paymentMethods.unpaid / invoices.length) * 100).toFixed(1) + '%'
    },
    stripeChargeIdsFound: stripeCharges.length,
    invoiceStatuses: statuses,
    sampleData: {
      firstCustomer: customers[0],
      firstInvoice: invoices[0],
      firstPayment: payments[0],
      sampleStripeCharge: stripeCharges[0]?.['Reference Number']
    }
  };

  // Write report
  writeJSON('analysis-report.json', report);

  // Print summary
  console.log('\n📊 ZOHO DATA ANALYSIS SUMMARY\n');
  console.log('Customers:', customers.length);
  console.log('Invoices:', invoices.length);
  console.log('Payments:', payments.length);
  console.log('\nPayment Methods:');
  console.log('  Stripe:', paymentMethods.stripe, `(${report.paymentMethodPercentages.stripe})`);
  console.log('  Zoho:', paymentMethods.zoho, `(${report.paymentMethodPercentages.zoho})`);
  console.log('  Unpaid:', paymentMethods.unpaid, `(${report.paymentMethodPercentages.unpaid})`);
  console.log('\nStripe Charge IDs Found:', stripeCharges.length);
  console.log('Total Invoiced: $', totalInvoiced.toFixed(2));
  console.log('Total Paid: $', totalPaid.toFixed(2));
  console.log('\n✅ Analysis complete. Report saved to analysis-report.json\n');
}

analyzeData().catch(err => {
  log('ERROR', 'Analysis failed', { error: err.message });
  process.exit(1);
});
