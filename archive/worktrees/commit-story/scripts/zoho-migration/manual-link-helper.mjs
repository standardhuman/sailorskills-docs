#!/usr/bin/env node
/**
 * Manual Service Log Linking Helper
 * Helps investigate and manually link service logs to invoices
 */

import { supabase, log } from './utils.mjs';
import { readFileSync } from 'fs';

const args = process.argv.slice(2);

if (args.length === 0) {
  console.log(`
📋 Manual Service Log Linking Helper

Usage:
  npm run manual-link -- <service_log_id>                    # Investigate
  npm run manual-link -- <service_log_id> --link <invoice_id> # Link to invoice
  npm run manual-link -- list-recent                          # List recent unlinked
  npm run manual-link -- list-no-zoho                         # List customers with no Zoho invoices

Examples:
  npm run manual-link -- af9219ef-2173-4722-b0fb-69f2c3f6ea96
  npm run manual-link -- af9219ef-2173-4722-b0fb-69f2c3f6ea96 --link abc123
  npm run manual-link -- list-recent
`);
  process.exit(0);
}

const command = args[0];

// List recent unlinked service logs
if (command === 'list-recent') {
  const { data, error } = await supabase
    .from('service_logs')
    .select(`
      id,
      service_date,
      customer_id,
      customers!inner(name, email)
    `)
    .is('invoice_id', null)
    .gte('service_date', '2025-09-01')
    .order('service_date', { ascending: false })
    .limit(20);

  if (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }

  console.log('\n📅 Recent Unlinked Service Logs (Sept-Oct 2025)\n');
  console.log('These likely need to link to modern invoices (INV-2025-*)\n');

  data.forEach(log => {
    console.log(`ID: ${log.id}`);
    console.log(`Date: ${log.service_date}`);
    console.log(`Customer: ${log.customers.name} (${log.customers.email})`);
    console.log(`Review: npm run manual-link -- ${log.id}`);
    console.log('---');
  });

  process.exit(0);
}

// List customers with no Zoho invoices
if (command === 'list-no-zoho') {
  const { data, error } = await supabase.rpc('get_customers_no_zoho_invoices');

  // Fallback query if RPC doesn't exist
  const { data: logs } = await supabase
    .from('service_logs')
    .select(`
      customer_id,
      customers!inner(name, email)
    `)
    .is('invoice_id', null)
    .neq('customer_id', 'unknown')
    .limit(1000);

  // Group by customer
  const customerMap = new Map();
  logs.forEach(log => {
    if (!customerMap.has(log.customer_id)) {
      customerMap.set(log.customer_id, {
        name: log.customers.name,
        email: log.customers.email,
        count: 0
      });
    }
    customerMap.get(log.customer_id).count++;
  });

  console.log('\n🔍 Customers with Unlinked Service Logs\n');

  for (const [customerId, info] of customerMap) {
    // Check if customer has any Zoho invoices
    const { count } = await supabase
      .from('invoices')
      .select('*', { count: 'exact', head: true })
      .eq('customer_id', customerId)
      .like('invoice_number', 'ZB-%');

    if (count === 0) {
      console.log(`Customer: ${info.name} (${info.email})`);
      console.log(`Unlinked logs: ${info.count}`);
      console.log(`Zoho invoices: 0 (not in Zoho billing)`);
      console.log('---');
    }
  }

  process.exit(0);
}

// Investigate or link a specific service log
const serviceLogId = command;
const linkToInvoiceId = args.includes('--link') ? args[args.indexOf('--link') + 1] : null;

// Fetch service log
const { data: serviceLog, error: logError } = await supabase
  .from('service_logs')
  .select(`
    *,
    customers!inner(id, name, email)
  `)
  .eq('id', serviceLogId)
  .single();

if (logError || !serviceLog) {
  console.error('❌ Service log not found:', serviceLogId);
  process.exit(1);
}

console.log('\n📋 Service Log Details\n');
console.log(`ID: ${serviceLog.id}`);
console.log(`Date: ${serviceLog.service_date}`);
console.log(`Customer: ${serviceLog.customers.name} (${serviceLog.customers.email})`);
console.log(`Customer ID: ${serviceLog.customer_id}`);
console.log(`Boat ID: ${serviceLog.boat_id || 'None'}`);
console.log(`Order ID: ${serviceLog.order_id || 'None'}`);
console.log(`Currently Linked: ${serviceLog.invoice_id ? '✅ ' + serviceLog.invoice_id : '❌ Unlinked'}`);
console.log();

// If linking, do it now
if (linkToInvoiceId) {
  const { error: updateError } = await supabase
    .from('service_logs')
    .update({ invoice_id: linkToInvoiceId })
    .eq('id', serviceLogId);

  if (updateError) {
    console.error('❌ Failed to link:', updateError.message);
    process.exit(1);
  }

  console.log(`✅ Linked service log to invoice: ${linkToInvoiceId}\n`);
  process.exit(0);
}

// Show customer's Zoho invoices
const { data: zohoInvoices, error: zohoError } = await supabase
  .from('invoices')
  .select('id, invoice_number, issued_at, amount, status')
  .eq('customer_id', serviceLog.customer_id)
  .like('invoice_number', 'ZB-%')
  .order('issued_at', { ascending: false });

if (zohoError) {
  console.error('❌ Error fetching invoices:', zohoError.message);
  process.exit(1);
}

console.log(`💰 Customer's Zoho Invoices (${zohoInvoices.length} total)\n`);

if (zohoInvoices.length === 0) {
  console.log('❌ No Zoho invoices found for this customer');
  console.log('   This customer may have been billed via:');
  console.log('   - Direct Stripe (bypass Zoho)');
  console.log('   - Manual invoicing');
  console.log('   - Other billing system\n');

  // Check for modern invoices
  const { data: modernInvoices } = await supabase
    .from('invoices')
    .select('id, invoice_number, issued_at, amount, status')
    .eq('customer_id', serviceLog.customer_id)
    .not('invoice_number', 'like', 'ZB-%')
    .order('issued_at', { ascending: false })
    .limit(10);

  if (modernInvoices && modernInvoices.length > 0) {
    console.log(`✅ Found ${modernInvoices.length} modern invoices (INV-2025-*)\n`);
    modernInvoices.forEach(inv => {
      const daysDiff = Math.abs(
        (new Date(inv.issued_at) - new Date(serviceLog.service_date)) / (1000 * 60 * 60 * 24)
      );
      console.log(`${inv.invoice_number} - ${inv.issued_at.split('T')[0]} - $${inv.amount} - ${inv.status}`);
      console.log(`  Days from service: ${daysDiff.toFixed(0)}`);
      if (daysDiff <= 30) {
        console.log(`  ✅ CANDIDATE - Link with: npm run manual-link -- ${serviceLogId} --link ${inv.id}`);
      }
      console.log();
    });
  }
} else {
  // Find closest invoices by date
  const serviceDate = new Date(serviceLog.service_date);
  const invoicesWithDiff = zohoInvoices.map(inv => ({
    ...inv,
    daysDiff: Math.abs((new Date(inv.issued_at) - serviceDate) / (1000 * 60 * 60 * 24))
  })).sort((a, b) => a.daysDiff - b.daysDiff);

  console.log('Closest invoices by date:\n');
  invoicesWithDiff.slice(0, 5).forEach(inv => {
    console.log(`${inv.invoice_number} - ${inv.issued_at.split('T')[0]} - $${inv.amount} - ${inv.status}`);
    console.log(`  Days from service: ${inv.daysDiff.toFixed(0)}`);
    if (inv.daysDiff <= 30) {
      console.log(`  ✅ Within 30 days - Link with: npm run manual-link -- ${serviceLogId} --link ${inv.id}`);
    } else {
      console.log(`  ⚠️  ${inv.daysDiff.toFixed(0)} days apart - review before linking`);
    }
    console.log();
  });

  // Show reason for no automatic match
  const closestInv = invoicesWithDiff[0];
  if (closestInv.daysDiff > 30) {
    console.log('❌ Why not auto-linked:');
    console.log(`   Closest invoice is ${closestInv.daysDiff.toFixed(0)} days away (threshold: 30 days)`);
    console.log(`   This suggests:`);
    if (new Date(serviceLog.service_date) < new Date(closestInv.issued_at)) {
      console.log(`   - Service performed before first Zoho invoice`);
    } else {
      console.log(`   - Service during billing gap (subscription pause, one-time service, etc.)`);
    }
    console.log();
  }
}

console.log('💡 Actions:');
console.log(`   Link to invoice: npm run manual-link -- ${serviceLogId} --link <invoice_id>`);
console.log(`   Leave unlinked: (no action needed)`);
console.log();
