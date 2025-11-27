/**
 * Standardize all email templates to use consistent styling
 * Applies the modern table-based styling from Order Confirmation to all templates
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env.production', 'utf-8');
const envVars = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    envVars[key.trim()] = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
  }
});

const supabase = createClient(
  envVars.VITE_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
);

// Base template structure matching Order Confirmation
const createStyledTemplate = (config) => {
  const {
    title,
    heading,
    subheading,
    mainContent,
    infoBox,
    buttonText = 'View Details',
    buttonLink = 'https://portal.sailorskills.com',
    footerText = 'Questions? Contact us at info@sailorskills.com'
  } = config;

  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - Sailor Skills</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">${title}</h1>
                            <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px;">Sailor Skills Marine Services</p>
                        </td>
                    </tr>

                    <!-- Success/Info Icon -->
                    <tr>
                        <td style="padding: 30px 40px 20px; text-align: center;">
                            <div style="width: 80px; height: 80px; margin: 0 auto; background-color: #dcfce7; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                                <span style="font-size: 40px; color: #16a34a;">✓</span>
                            </div>
                            <h2 style="margin: 20px 0 10px; color: #16a34a; font-size: 24px;">${heading}</h2>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">${subheading}</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            ${mainContent}
                        </td>
                    </tr>

                    ${infoBox ? `
                    <!-- Info Box -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px;">
                                ${infoBox}
                            </div>
                        </td>
                    </tr>
                    ` : ''}

                    ${buttonText ? `
                    <!-- Action Button -->
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <a href="${buttonLink}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 14px;">${buttonText}</a>
                        </td>
                    </tr>
                    ` : ''}

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">${footerText}</p>
                            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">Email us at <a href="mailto:info@sailorskills.com" style="color: #3b82f6; text-decoration: none;">info@sailorskills.com</a></p>
                            <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px;">© {{currentYear}} Sailor Skills Marine Services. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
};

// Template configurations
const templateConfigs = {
  service_completion: {
    title: 'Service Completed',
    heading: 'Service Complete!',
    subheading: 'Your vessel has been serviced',
    mainContent: `
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{CUSTOMER_NAME}},</p>
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">We've completed the <strong>{{SERVICE_NAME}}</strong> service for your vessel <strong>{{BOAT_NAME}}</strong>.</p>
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Vessel</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{BOAT_NAME}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Service</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{SERVICE_NAME}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Completed</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{SERVICE_DATE}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Hours</p>
          </td>
          <td style="padding: 12px 0; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{TOTAL_HOURS}}</p>
          </td>
        </tr>
      </table>
    `,
    infoBox: null,
    buttonText: 'View Service Report',
    buttonLink: '{{PORTAL_LINK}}',
    footerText: 'Thank you for trusting Sailor Skills with your vessel!'
  },

  new_invoice: {
    title: 'New Invoice',
    heading: 'Invoice Ready',
    subheading: 'Your service invoice is now available',
    mainContent: `
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{CUSTOMER_NAME}},</p>
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Your invoice for <strong>{{BOAT_NAME}}</strong> is now available.</p>
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Invoice Number</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{INVOICE_NUMBER}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Vessel</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{BOAT_NAME}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Service Date</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{SERVICE_DATE}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Total Amount</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 18px; font-weight: 700; color: #1e3a8a;">\${{INVOICE_TOTAL}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Due Date</p>
          </td>
          <td style="padding: 12px 0; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{DUE_DATE}}</p>
          </td>
        </tr>
      </table>
    `,
    infoBox: `<p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">Click below to view your invoice details and make a payment.</p>`,
    buttonText: 'View Invoice & Pay',
    buttonLink: '{{PAYMENT_LINK}}',
    footerText: 'Questions about your invoice?'
  },

  upcoming_service: {
    title: 'Service Reminder',
    heading: 'Upcoming Service',
    subheading: 'Your scheduled service is coming up',
    mainContent: `
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{CUSTOMER_NAME}},</p>
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">This is a reminder that your <strong>{{SERVICE_NAME}}</strong> service for <strong>{{BOAT_NAME}}</strong> is scheduled soon.</p>
      <table width="100%" cellpadding="8" cellspacing="0">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Vessel</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{BOAT_NAME}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Service</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{SERVICE_NAME}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Date</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{SERVICE_DATE}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Estimated Duration</p>
          </td>
          <td style="padding: 12px 0; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{ESTIMATED_HOURS}} hours</p>
          </td>
        </tr>
      </table>
    `,
    infoBox: `<p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">Need to reschedule? Contact us at least 24 hours in advance.</p>`,
    buttonText: 'View Service Details',
    buttonLink: '{{PORTAL_LINK}}',
    footerText: 'Questions about your upcoming service?'
  },

  new_message: {
    title: 'New Message',
    heading: 'New Message from Sailor Skills',
    subheading: 'We\'ve sent you a message',
    mainContent: `
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{CUSTOMER_NAME}},</p>
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">You have a new message regarding <strong>{{BOAT_NAME}}</strong>.</p>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 20px; margin: 20px 0;">
        <p style="margin: 0 0 10px; color: #6b7280; font-size: 12px;">{{MESSAGE_DATE}}</p>
        <p style="margin: 0; color: #374151; font-size: 14px; font-style: italic;">"{{MESSAGE_PREVIEW}}"</p>
      </div>
    `,
    infoBox: null,
    buttonText: 'Read Full Message',
    buttonLink: '{{MESSAGES_LINK}}',
    footerText: 'Reply directly through your portal'
  },

  order_declined: {
    title: 'Order Update',
    heading: 'Service Request Update',
    subheading: 'Regarding your recent service request',
    mainContent: `
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{customerName}},</p>
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Thank you for your interest in our <strong>{{serviceType}}</strong> service for <strong>{{boatName}}</strong>.</p>
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Unfortunately, we are unable to proceed with this service request at this time.</p>
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
        <p style="margin: 0 0 5px; color: #92400e; font-size: 14px; font-weight: 600;">Reason:</p>
        <p style="margin: 0; color: #92400e; font-size: 14px;">{{declineReason}}</p>
      </div>
    `,
    infoBox: `<p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">We appreciate your understanding. If you have any questions, please don't hesitate to reach out.</p>`,
    buttonText: 'Contact Us',
    buttonLink: 'https://www.sailorskills.com/contact',
    footerText: 'We appreciate your interest in our services'
  },

  status_update: {
    title: 'Status Update',
    heading: 'Service Status Update',
    subheading: 'Your service status has changed',
    mainContent: `
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{customerName}},</p>
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">The status for <strong>{{boatName}}</strong> has been updated to:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; background-color: {{statusColor}}; color: #ffffff; padding: 12px 24px; border-radius: 6px; font-size: 18px; font-weight: 600;">
          {{newStatus}}
        </div>
      </div>
      <p style="margin: 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">{{statusDetails}}</p>
    `,
    infoBox: `<h3 style="margin: 0 0 10px; color: #1e3a8a; font-size: 16px;">Next Steps</h3><p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">{{nextSteps}}</p>`,
    buttonText: 'View Details',
    buttonLink: 'https://portal.sailorskills.com',
    footerText: 'Questions about your service status?'
  },

  request_accepted: {
    title: 'Request Accepted',
    heading: 'Service Request Accepted!',
    subheading: 'We\'re ready to get started',
    mainContent: `
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{customerName}},</p>
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Great news! We've accepted your service request for <strong>{{serviceType}}</strong> on <strong>{{boatName}}</strong>.</p>
      <table width="100%" cellpadding="8" cellspacing="0" style="margin: 20px 0;">
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Order Number</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{orderNumber}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Vessel</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{boatName}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Service</p>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">{{serviceType}}</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 12px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 14px;">Estimated Amount</p>
          </td>
          <td style="padding: 12px 0; text-align: right;">
            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">\${{estimatedAmount}}</p>
          </td>
        </tr>
      </table>
    `,
    infoBox: `<p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">We'll be in touch soon to coordinate scheduling. You'll receive updates as we make progress.</p>`,
    buttonText: 'View Request Details',
    buttonLink: 'https://portal.sailorskills.com',
    footerText: 'Thank you for choosing Sailor Skills!'
  },

  payment_method_request: {
    title: 'Payment Setup',
    heading: 'Payment Method Setup Needed',
    subheading: 'Please set up your payment method',
    mainContent: `
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi {{customerName}},</p>
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">To complete your service request for <strong>{{boatName}}</strong>, we need you to set up a payment method.</p>
      <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">This is a quick and secure process that takes just a minute.</p>
    `,
    infoBox: `<p style="margin: 0; color: #1e3a8a; font-size: 14px; line-height: 1.5;">Your payment information is securely stored by Stripe. We'll only charge you after service is completed.</p>`,
    buttonText: 'Set Up Payment Method',
    buttonLink: '{{setupLink}}',
    footerText: 'Questions about payment?'
  }
};

async function updateTemplates() {
  console.log('🎨 Standardizing email template styling...\n');

  let updated = 0;
  let skipped = 0;

  for (const [templateKey, config] of Object.entries(templateConfigs)) {
    console.log(`📧 Updating: ${templateKey}`);

    const html = createStyledTemplate(config);

    const { error } = await supabase
      .from('email_templates')
      .update({
        html_template_file: html,
        updated_at: new Date().toISOString()
      })
      .eq('template_key', templateKey);

    if (error) {
      console.error(`   ❌ Failed: ${error.message}`);
      skipped++;
    } else {
      console.log(`   ✅ Updated`);
      updated++;
    }
  }

  console.log('\n' + '━'.repeat(50));
  console.log('Summary:');
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log('━'.repeat(50));
  console.log('\n✅ Email template styling standardized!');
}

updateTemplates();
