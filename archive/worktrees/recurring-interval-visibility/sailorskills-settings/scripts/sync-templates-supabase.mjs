/**
 * Sync Production Email Templates to Settings Database
 * Uses Supabase JavaScript client
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read environment from .env.local
const envFile = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseAnonKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Template definitions
const templates = [
  {
    key: 'order_confirmation',
    name: 'Order Confirmation',
    subject: 'Service Scheduled - {{boatName}} - Sailor Skills',
    htmlPath: '../../sailorskills-shared/src/email/templates/order-confirmation.html',
    variables: ['scheduledDate', 'customerName', 'boatName', 'boatLength', 'serviceType', 'marinaName', 'estimatedAmount', 'currentYear'],
    service: 'shared',
  },
  {
    key: 'service_completion',
    name: 'Service Completion',
    subject: 'Service Completed - {{BOAT_NAME}} - SailorSkills',
    htmlPath: '../../sailorskills-operations/src/email/templates/service-completion.html',
    variables: ['CUSTOMER_NAME', 'BOAT_NAME', 'SERVICE_NAME', 'SERVICE_DATE', 'TOTAL_HOURS', 'PORTAL_LINK'],
    service: 'operations',
  },
  {
    key: 'new_invoice',
    name: 'New Invoice',
    subject: 'New Invoice Available - {{INVOICE_NUMBER}} - SailorSkills',
    htmlPath: '../../sailorskills-operations/src/email/templates/new-invoice.html',
    variables: ['CUSTOMER_NAME', 'BOAT_NAME', 'INVOICE_NUMBER', 'INVOICE_TOTAL', 'INVOICE_STATUS', 'SERVICE_DATE', 'INVOICE_DATE', 'DUE_DATE', 'INVOICE_LINK', 'PAYMENT_LINK'],
    service: 'operations',
  },
  {
    key: 'order_declined',
    name: 'Order Declined',
    subject: 'Service Request Update - {{boatName}} - Sailor Skills',
    htmlPath: '../../sailorskills-shared/src/email/templates/order-declined.html',
    variables: ['boatName', 'serviceType', 'declineReason', 'alternativeSuggestion', 'customerName', 'currentYear'],
    service: 'shared',
  },
  {
    key: 'status_update',
    name: 'Status Update',
    subject: 'Service Status: {{newStatus}} - {{boatName}} - Sailor Skills',
    htmlPath: '../../sailorskills-shared/src/email/templates/status-update.html',
    variables: ['boatName', 'newStatus', 'statusColor', 'statusDetails', 'nextSteps', 'customerName', 'confirmedColor', 'confirmedIcon', 'inProgressColor', 'inProgressIcon', 'completedColor', 'completedIcon', 'currentYear'],
    service: 'shared',
  },
  {
    key: 'upcoming_service',
    name: 'Upcoming Service Reminder',
    subject: 'Service Reminder - {{SERVICE_DATE}} - SailorSkills',
    htmlPath: '../../sailorskills-operations/src/email/templates/upcoming-service.html',
    variables: ['CUSTOMER_NAME', 'BOAT_NAME', 'SERVICE_NAME', 'SERVICE_DATE', 'ESTIMATED_HOURS', 'PORTAL_LINK'],
    service: 'operations',
  },
  {
    key: 'new_message',
    name: 'New Message',
    subject: 'New Message from SailorSkills',
    htmlPath: '../../sailorskills-operations/src/email/templates/new-message.html',
    variables: ['CUSTOMER_NAME', 'BOAT_NAME', 'MESSAGE_DATE', 'MESSAGE_PREVIEW', 'MESSAGES_LINK'],
    service: 'operations',
  },
  {
    key: 'payment_receipt',
    name: 'Payment Receipt',
    subject: 'Payment Receipt - {{serviceName}} - Sailor Skills',
    htmlPath: null,
    variables: ['customerName', 'amount', 'serviceName', 'boatName', 'boatLength', 'serviceDate', 'formattedDate'],
    service: 'billing',
    note: 'Complex template with conditional logic - extracted from send-receipt edge function',
  },
];

async function syncTemplates() {
  try {
    console.log('✅ Connected to Supabase\n');

    let updated = 0;
    let inserted = 0;
    let skipped = 0;

    for (const template of templates) {
      console.log(`📧 Processing: ${template.name}`);

      // Skip receipt template for now (inline in edge function)
      if (!template.htmlPath) {
        console.log(`   ⏭️  Skipped (inline template)\n`);
        skipped++;
        continue;
      }

      // Read HTML file
      const htmlPath = path.join(__dirname, template.htmlPath);
      let htmlContent;

      try {
        htmlContent = fs.readFileSync(htmlPath, 'utf8');
      } catch (error) {
        console.error(`   ❌ Failed to read file: ${htmlPath}`);
        console.error(`      ${error.message}\n`);
        skipped++;
        continue;
      }

      // Generate plain text fallback
      const plainText = generatePlainText(template);

      // Check if template exists
      const { data: existing } = await supabase
        .from('email_templates')
        .select('template_key')
        .eq('template_key', template.key)
        .single();

      const templateData = {
        template_name: template.name,
        subject_line: template.subject,
        email_body: plainText,
        html_template_file: htmlContent,
        available_variables: template.variables,
        service: template.service,
        updated_at: new Date().toISOString(),
      };

      if (existing) {
        // Update existing template
        const { error } = await supabase
          .from('email_templates')
          .update(templateData)
          .eq('template_key', template.key);

        if (error) {
          console.error(`   ❌ Update failed: ${error.message}\n`);
          skipped++;
          continue;
        }

        console.log(`   ✅ Updated existing template\n`);
        updated++;
      } else {
        // Insert new template
        const { error } = await supabase
          .from('email_templates')
          .insert({
            template_key: template.key,
            ...templateData,
            is_active: true,
          });

        if (error) {
          console.error(`   ❌ Insert failed: ${error.message}\n`);
          skipped++;
          continue;
        }

        console.log(`   ✅ Inserted new template\n`);
        inserted++;
      }
    }

    console.log('━'.repeat(50));
    console.log('Summary:');
    console.log(`  Updated: ${updated}`);
    console.log(`  Inserted: ${inserted}`);
    console.log(`  Skipped: ${skipped}`);
    console.log(`  Total: ${templates.length}`);
    console.log('━'.repeat(50));
    console.log('\n✅ Email templates synced successfully!');

  } catch (error) {
    console.error('\n❌ Error syncing templates:', error.message);
    console.error(error);
    process.exit(1);
  }
}

function generatePlainText(template) {
  const vars = template.variables.map(v => `{{${v}}}`).join(', ');
  return `${template.name} email notification.

Variables: ${vars}

This is an HTML email. If you're seeing this, your email client doesn't support HTML emails.`;
}

// Run the sync
syncTemplates();
