#!/usr/bin/env node
import { parseCSV, supabase, log, writeJSON, writeCSV, CSV_PATHS, validateEnv } from './utils.mjs';

async function mapCustomers() {
  validateEnv();

  log('INFO', 'Starting customer mapping');

  // Parse Zoho customers
  const zohoCustomers = await parseCSV(CSV_PATHS.customers);
  log('INFO', 'Loaded Zoho customers', { count: zohoCustomers.length });

  // Fetch all Sailor Skills customers
  const { data: sailorCustomers, error } = await supabase
    .from('customers')
    .select('id, email, name');

  if (error) {
    log('ERROR', 'Failed to fetch Sailor Skills customers', { error: error.message });
    process.exit(1);
  }

  log('INFO', 'Loaded Sailor Skills customers', { count: sailorCustomers.length });

  // Create email lookup map
  const emailMap = new Map();
  sailorCustomers.forEach(c => {
    if (c.email) {
      emailMap.set(c.email.toLowerCase().trim(), c);
    }
  });

  // Map customers
  const mapping = [];
  const unmatched = [];

  zohoCustomers.forEach(zohoCustomer => {
    const zohoEmail = zohoCustomer['EmailID']?.toLowerCase().trim();

    const zohoId = zohoCustomer['Customer ID'];
    const zohoName = zohoCustomer['Company Name'] || zohoCustomer['Customer Name'];

    if (!zohoEmail) {
      unmatched.push({
        zoho_id: zohoId,
        zoho_name: zohoName,
        reason: 'No email found in Zoho export'
      });
      return;
    }

    const sailorCustomer = emailMap.get(zohoEmail);

    if (sailorCustomer) {
      mapping.push({
        zoho_customer_id: zohoId,
        zoho_name: zohoName,
        zoho_email: zohoEmail,
        sailor_customer_id: sailorCustomer.id,
        sailor_name: sailorCustomer.name,
        sailor_email: sailorCustomer.email
      });
    } else {
      unmatched.push({
        zoho_id: zohoId,
        zoho_name: zohoName,
        zoho_email: zohoEmail,
        reason: 'No matching Sailor Skills customer found'
      });
    }
  });

  // Generate statistics
  const stats = {
    timestamp: new Date().toISOString(),
    total_zoho_customers: zohoCustomers.length,
    matched: mapping.length,
    unmatched: unmatched.length,
    match_rate: ((mapping.length / zohoCustomers.length) * 100).toFixed(1) + '%'
  };

  // Write outputs
  writeJSON('customer-mapping.json', mapping);

  if (unmatched.length > 0) {
    writeCSV('unmatched-customers.csv', unmatched, ['zoho_id', 'zoho_name', 'zoho_email', 'reason']);
  }

  writeJSON('customer-mapping-stats.json', stats);

  // Print summary
  console.log('\n👥 CUSTOMER MAPPING SUMMARY\n');
  console.log('Total Zoho Customers:', zohoCustomers.length);
  console.log('Matched:', mapping.length, `(${stats.match_rate})`);
  console.log('Unmatched:', unmatched.length);

  if (unmatched.length > 0) {
    console.log('\n⚠️  Unmatched customers written to unmatched-customers.csv');
    console.log('    Review and manually create these customers if needed.\n');
  }

  console.log('✅ Mapping complete. Saved to customer-mapping.json\n');
}

mapCustomers().catch(err => {
  log('ERROR', 'Customer mapping failed', { error: err.message });
  process.exit(1);
});
