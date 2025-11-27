/**
 * Sync ACTUAL Production Email Templates (inline from edge functions)
 *
 * This replaces the file-based templates with the REAL templates
 * that are currently being sent to customers.
 */

import pg from 'pg';

const { Client } = pg;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable not set');
  process.exit(1);
}

const PORTAL_URL = 'https://ops.sailorskills.com';

// These are the ACTUAL templates being sent in production
// Extracted from: /sailorskills-operations/supabase/functions/send-notification/index.ts
const productionTemplates = {
  service_completion: {
    name: 'Service Completion',
    subject: 'Service Completed: {{serviceName}} - {{boatName}}',
    variables: ['customerName', 'boatName', 'serviceName', 'serviceDate', 'totalHours'],
    service: 'operations',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #1a237e; color: #fff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 24px; }
    .info-box { background: #f8f9fa; border-left: 4px solid #1a237e; padding: 20px; margin: 24px 0; }
    .button { display: inline-block; padding: 16px 32px; background: #1a237e; color: #fff; text-decoration: none; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Service Completed ✓</h1>
    </div>
    <div class="content">
      <h2>Hello {{customerName}},</h2>
      <p>We've completed the {{serviceName}} service for your vessel <strong>{{boatName}}</strong>.</p>
      <div class="info-box">
        <strong>Vessel:</strong> {{boatName}}<br>
        <strong>Service:</strong> {{serviceName}}<br>
        <strong>Completed:</strong> {{serviceDate}}<br>
        <strong>Hours:</strong> {{totalHours}}
      </div>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${PORTAL_URL}/portal.html" class="button">View Service Details</a>
      </p>
      <p>Thank you for trusting SailorSkills with your vessel maintenance!</p>
    </div>
    <div class="footer">
      <p><strong>SailorSkills Marine Services</strong></p>
      <p><a href="${PORTAL_URL}/portal-account.html">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>`
  },

  new_invoice: {
    name: 'New Invoice',
    subject: 'New Invoice {{invoiceNumber}} - {{boatName}}',
    variables: ['customerName', 'boatName', 'invoiceNumber', 'invoiceTotal', 'invoiceStatus', 'paymentLink', 'dueDate'],
    service: 'operations',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #1a237e; color: #fff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 24px; }
    .invoice-box { background: #f8f9fa; border: 2px solid #1a237e; padding: 24px; text-align: center; margin: 24px 0; }
    .invoice-total { font-size: 36px; font-weight: 700; color: #1a237e; }
    .button { display: inline-block; padding: 16px 32px; background: #1a237e; color: #fff; text-decoration: none; font-weight: 600; margin: 8px; }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Invoice Available</h1>
    </div>
    <div class="content">
      <h2>Hello {{customerName}},</h2>
      <p>A new invoice is ready for <strong>{{boatName}}</strong>.</p>
      <div class="invoice-box">
        <div style="font-size: 14px; color: #666;">Invoice Number</div>
        <div style="font-size: 20px; font-weight: 600; margin: 8px 0;">{{invoiceNumber}}</div>
        <div class="invoice-total">{{invoiceTotal}}</div>
        <div style="margin-top: 16px; color: #ff9800; font-weight: 600;">{{invoiceStatus}}</div>
      </div>
      <p style="text-align: center;">
        <a href="${PORTAL_URL}/portal-invoices.html" class="button">View Invoice</a>
        <a href="{{paymentLink}}" class="button">Pay Now</a>
      </p>
      <p>Due Date: <strong>{{dueDate}}</strong></p>
    </div>
    <div class="footer">
      <p><strong>SailorSkills Marine Services</strong></p>
      <p><a href="${PORTAL_URL}/portal-account.html">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>`
  },

  upcoming_service: {
    name: 'Upcoming Service Reminder',
    subject: 'Service Reminder: {{serviceName}} - {{boatName}}',
    variables: ['customerName', 'boatName', 'serviceName', 'serviceDate'],
    service: 'operations',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #1a237e; color: #fff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 24px; }
    .reminder-box { background: linear-gradient(135deg, #1a237e 0%, #0d47a1 100%); color: #fff; padding: 32px 24px; text-align: center; margin: 24px 0; }
    .reminder-date { font-size: 32px; font-weight: 700; margin: 16px 0; }
    .button { display: inline-block; padding: 16px 32px; background: #1a237e; color: #fff; text-decoration: none; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Upcoming Service Reminder</h1>
    </div>
    <div class="content">
      <h2>Hello {{customerName}},</h2>
      <p>Your scheduled service for <strong>{{boatName}}</strong> is coming up soon.</p>
      <div class="reminder-box">
        <div style="font-size: 48px;">📅</div>
        <div style="font-size: 14px; margin: 8px 0;">Scheduled For</div>
        <div class="reminder-date">{{serviceDate}}</div>
        <div style="font-size: 20px; font-weight: 600;">{{serviceName}}</div>
      </div>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${PORTAL_URL}/portal.html" class="button">View Schedule</a>
      </p>
      <p>Need to reschedule? Just reply to this email or contact us through your portal.</p>
    </div>
    <div class="footer">
      <p><strong>SailorSkills Marine Services</strong></p>
      <p><a href="${PORTAL_URL}/portal-account.html">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>`
  },

  new_message: {
    name: 'New Message',
    subject: 'New Message from SailorSkills',
    variables: ['customerName', 'boatName', 'messageDate', 'messagePreview'],
    service: 'operations',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #1a237e; color: #fff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 24px; }
    .message-box { background: #f8f9fa; border-left: 4px solid #1a237e; padding: 20px; margin: 24px 0; }
    .message-preview { font-style: italic; color: #666; border-top: 1px solid #e0e0e0; padding-top: 16px; margin-top: 16px; }
    .button { display: inline-block; padding: 16px 32px; background: #1a237e; color: #fff; text-decoration: none; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Message 💬</h1>
    </div>
    <div class="content">
      <h2>Hello {{customerName}},</h2>
      <p>You have a new message from the SailorSkills team about <strong>{{boatName}}</strong>.</p>
      <div class="message-box">
        <strong>From:</strong> SailorSkills Team<br>
        <strong>Date:</strong> {{messageDate}}
        <div class="message-preview">"{{messagePreview}}"</div>
      </div>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${PORTAL_URL}/portal-messages.html" class="button">View Message</a>
      </p>
      <p><strong>Note:</strong> Please use your customer portal to reply for fastest response.</p>
    </div>
    <div class="footer">
      <p><strong>SailorSkills Marine Services</strong></p>
      <p><a href="${PORTAL_URL}/portal-account.html">Manage notification preferences</a></p>
    </div>
  </div>
</body>
</html>`
  },

  order_declined: {
    name: 'Order Declined',
    subject: 'Update on Your Service Request #{{orderNumber}}',
    variables: ['customerName', 'boatName', 'serviceType', 'estimatedAmount', 'orderNumber', 'declineReason'],
    service: 'operations',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #1a237e; color: #fff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 24px; }
    .order-box { background: #f8f9fa; border-left: 4px solid #1a237e; padding: 20px; margin: 24px 0; }
    .reason-box { background: #fff3cd; border-left: 4px solid #ff9800; padding: 20px; margin: 24px 0; }
    .contact-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 24px 0; }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0; }
    .footer a { color: #1a237e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Service Request Update</h1>
    </div>
    <div class="content">
      <h2>Hello {{customerName}},</h2>
      <p>Thank you for your interest in Sailor Skills marine services.</p>
      <p>Unfortunately, we are unable to schedule your requested service at this time.</p>
      <div class="order-box">
        <strong>Your Request:</strong><br>
        <strong>Boat:</strong> {{boatName}}<br>
        <strong>Service:</strong> {{serviceType}}<br>
        <strong>Estimated Amount:</strong> \${{estimatedAmount}}
      </div>
      <div class="reason-box">
        <strong>Reason:</strong><br>
        {{declineReason}}
      </div>
      <div class="contact-box">
        <strong>Next Steps</strong><br>
        We'd love to help if circumstances change. Please feel free to:
        <ul style="margin: 12px 0; padding-left: 20px;">
          <li>Call us at (555) 123-4567 to discuss alternatives</li>
          <li>Email us at support@sailorskills.com with questions</li>
          <li>Submit a new request at sailorskills.com when ready</li>
        </ul>
      </div>
      <p>We appreciate your understanding and hope to work with you in the future.</p>
      <p>Best regards,<br><strong>The Sailor Skills Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Sailor Skills Marine Services</strong></p>
      <p><a href="${PORTAL_URL}/portal.html">Visit Customer Portal</a></p>
      <p style="font-size: 12px; color: #666; margin-top: 16px;">
        This is an automated notification. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`
  },

  request_accepted: {
    name: 'Request Accepted',
    subject: 'Service Request Accepted - {{boatName}}',
    variables: ['customerName', 'boatName', 'serviceType', 'estimatedAmount', 'orderNumber'],
    service: 'operations',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; }
    .header { background: #1a237e; color: #fff; padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { padding: 40px 24px; }
    .order-box { background: #f8f9fa; border-left: 4px solid #16a34a; padding: 20px; margin: 24px 0; }
    .info-box { background: #e3f2fd; border-left: 4px solid #2196f3; padding: 20px; margin: 24px 0; }
    .button { display: inline-block; padding: 16px 32px; background: #1a237e; color: #fff; text-decoration: none; font-weight: 600; }
    .footer { background: #f8f9fa; padding: 24px; text-align: center; border-top: 1px solid #e0e0e0; }
    .footer a { color: #1a237e; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Request Accepted ✓</h1>
    </div>
    <div class="content">
      <h2>Hello {{customerName}},</h2>
      <p>Great news! We've reviewed and accepted your service request for <strong>{{boatName}}</strong>.</p>
      <div class="order-box">
        <strong>Your Service Request:</strong><br>
        <strong>Order #:</strong> {{orderNumber}}<br>
        <strong>Boat:</strong> {{boatName}}<br>
        <strong>Service:</strong> {{serviceType}}<br>
        <strong>Estimated Amount:</strong> \${{estimatedAmount}}
      </div>
      <div class="info-box">
        <strong>What's Next?</strong><br>
        We'll be in touch shortly with any questions or updates! You can also reach out to us anytime if you have questions or need to discuss your service.
      </div>
      <p style="text-align: center; margin: 32px 0;">
        <a href="${PORTAL_URL}/portal.html" class="button">View Your Services</a>
      </p>
      <p>Thank you for choosing Sailor Skills for your marine service needs!</p>
      <p>Best regards,<br><strong>The Sailor Skills Team</strong></p>
    </div>
    <div class="footer">
      <p><strong>Sailor Skills Marine Services</strong></p>
      <p><a href="${PORTAL_URL}/portal-account.html">Manage Preferences</a> | <a href="mailto:support@sailorskills.com">Contact Us</a></p>
      <p style="font-size: 12px; color: #666; margin-top: 16px;">
        This is an automated notification. To reply, please use your customer portal or email support@sailorskills.com.
      </p>
    </div>
  </div>
</body>
</html>`
  }
};

async function syncProductionTemplates() {
  const client = new Client({ connectionString: DATABASE_URL });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    console.log('🚀 Syncing PRODUCTION email templates (inline from edge functions)...\n');

    let updated = 0;
    let errors = 0;

    for (const [key, template] of Object.entries(productionTemplates)) {
      console.log(`📧 Processing: ${template.name}`);

      try {
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

        const result = await client.query(updateQuery, [
          template.name,
          template.subject,
          `${template.name} - Production HTML template`,
          template.html,
          JSON.stringify(template.variables),
          template.service,
          key,
        ]);

        if (result.rowCount > 0) {
          console.log(`   ✅ Updated with PRODUCTION template\n`);
          updated++;
        } else {
          console.log(`   ⚠️  Template key '${key}' not found in database\n`);
        }
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}\n`);
        errors++;
      }
    }

    console.log('━'.repeat(50));
    console.log('Summary:');
    console.log(`  Updated: ${updated}`);
    console.log(`  Errors: ${errors}`);
    console.log(`  Total: ${Object.keys(productionTemplates).length}`);
    console.log('━'.repeat(50));
    console.log('\n✅ Production templates synced successfully!');
    console.log('\n⚠️  NOTE: Payment receipt template has complex logic and must stay');
    console.log('    in the Billing send-receipt edge function inline.');

  } catch (error) {
    console.error('\n❌ Error syncing templates:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

syncProductionTemplates();
