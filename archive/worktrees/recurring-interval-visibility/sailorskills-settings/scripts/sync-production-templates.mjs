/**
 * Sync Production Email Templates to Settings Database
 * Reads HTML template files and updates the email_templates table
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Database connection from environment
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  console.error('Run: source ../db-env.sh');
  process.exit(1);
}

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
    htmlPath: null, // This one is inline in the edge function
    variables: ['customerName', 'amount', 'serviceName', 'boatName', 'boatLength', 'serviceDate', 'formattedDate'],
    service: 'billing',
    note: 'Complex template with conditional logic - extracted from send-receipt edge function',
  },
];

async function syncTemplates() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');

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
      const checkQuery = 'SELECT template_key FROM email_templates WHERE template_key = $1';
      const checkResult = await client.query(checkQuery, [template.key]);
      const exists = checkResult.rows.length > 0;

      if (exists) {
        // Update existing template
        const updateQuery = `
          UPDATE email_templates
          SET
            template_name = $1,
            subject_line = $2,
            email_body = $3,
            html_template_file = $4,
            available_variables = $5,
            service = $6,
            updated_at = NOW()
          WHERE template_key = $7
        `;

        await client.query(updateQuery, [
          template.name,
          template.subject,
          plainText,
          htmlContent,
          JSON.stringify(template.variables),
          template.service,
          template.key,
        ]);

        console.log(`   ✅ Updated existing template\n`);
        updated++;
      } else {
        // Insert new template
        const insertQuery = `
          INSERT INTO email_templates (
            template_key,
            template_name,
            subject_line,
            email_body,
            html_template_file,
            available_variables,
            service,
            is_active
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        `;

        await client.query(insertQuery, [
          template.key,
          template.name,
          template.subject,
          plainText,
          htmlContent,
          JSON.stringify(template.variables),
          template.service,
        ]);

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
  } finally {
    await client.end();
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
