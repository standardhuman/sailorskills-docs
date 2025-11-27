#!/usr/bin/env node
import { supabase, log, validateEnv } from './utils.mjs';
import readline from 'readline';

const INVOICE_PREFIX = process.env.INVOICE_PREFIX || 'ZB-';

async function confirm(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function rollback() {
  validateEnv();

  log('INFO', 'Starting rollback analysis');

  // Count what will be deleted
  const { count: invoiceCount, error: invError } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .like('invoice_number', `${INVOICE_PREFIX}%`);

  // Count service logs that will be unlinked
  const { data: linkedServiceLogs, error: linkedError } = await supabase
    .from('invoices')
    .select('id')
    .like('invoice_number', `${INVOICE_PREFIX}%`);

  const invoiceIds = linkedServiceLogs?.map(inv => inv.id) || [];

  let linkedLogsCount = 0;
  if (invoiceIds.length > 0) {
    const { count, error: logsError } = await supabase
      .from('service_logs')
      .select('*', { count: 'exact', head: true })
      .in('invoice_id', invoiceIds);
    linkedLogsCount = count || 0;
  }

  console.log('\n⚠️  ROLLBACK ANALYSIS\n');
  console.log('This will DELETE:');
  console.log(`  - ${invoiceCount} invoices (${INVOICE_PREFIX}* prefix)`);
  console.log(`  - ${linkedLogsCount} service_logs.invoice_id links\n`);

  const confirmed = await confirm('Type "yes" to proceed with rollback: ');

  if (!confirmed) {
    console.log('\n❌ Rollback cancelled\n');
    process.exit(0);
  }

  log('INFO', 'Starting rollback...');

  // Step 1: Clear service_logs.invoice_id for migrated invoices
  if (invoiceIds.length > 0) {
    log('INFO', 'Clearing service_logs.invoice_id...');

    const { error: clearError } = await supabase
      .from('service_logs')
      .update({ invoice_id: null })
      .in('invoice_id', invoiceIds);

    if (clearError) {
      log('ERROR', 'Failed to clear service_logs', { error: clearError.message });
    } else {
      log('INFO', 'service_logs cleared');
    }
  }

  // Step 2: Delete migrated invoices
  log('INFO', 'Deleting migrated invoices...');

  const { error: invoiceDeleteError } = await supabase
    .from('invoices')
    .delete()
    .like('invoice_number', `${INVOICE_PREFIX}%`);

  if (invoiceDeleteError) {
    log('ERROR', 'Failed to delete invoices', { error: invoiceDeleteError.message });
  } else {
    log('INFO', 'Migrated invoices deleted');
  }

  // Verify deletion
  const { count: remainingInvoices } = await supabase
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .like('invoice_number', `${INVOICE_PREFIX}%`);

  console.log('\n✅ ROLLBACK COMPLETE\n');
  console.log('Remaining:');
  console.log('  Invoices:', remainingInvoices);
  console.log('\nDatabase restored to pre-migration state.\n');
}

rollback().catch(err => {
  log('ERROR', 'Rollback failed', { error: err.message });
  process.exit(1);
});
