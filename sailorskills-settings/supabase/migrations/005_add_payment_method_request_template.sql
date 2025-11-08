-- Add payment_method_request email template
-- This template is used for Zoho → Stripe migration
-- Asks customers to add their payment method to the new system

INSERT INTO email_templates (
  template_key,
  template_name,
  subject_line,
  email_body,
  html_template_file,
  available_variables,
  service
) VALUES (
  'payment_method_request',
  'Payment Method Setup Request',
  'Action Required: Add Payment Method - {{customerName}}',

  -- Plain text version
  'Hi {{customerName}},

We''re excited to share that we''re upgrading our payment system to provide you with a better billing experience!

As part of this transition from Zoho Payments to Stripe, we need you to add your payment method to our new system.

WHY THIS CHANGE?
- Faster billing: Get invoiced within minutes of service completion
- Better transparency: Clearer invoices and payment history
- Enhanced security: Industry-leading payment security from Stripe
- Improved experience: Easier access to billing information

WHAT YOU NEED TO DO:
Please visit the link below to securely add your payment method:

{{setupLink}}

This will only take a minute, and your payment information will be encrypted and stored securely by Stripe. We never store your card details on our servers.

YOUR PAYMENT METHOD WILL ONLY BE CHARGED AFTER SERVICE IS COMPLETE
Just like before, you''ll only be billed after we complete service on your boat. The difference is that billing will now happen automatically and instantly rather than days or weeks later.

NEED HELP?
If you have any questions or need assistance, please don''t hesitate to reply to this email or contact us at {{adminEmail}}.

Thank you for your patience as we make these improvements!

Best regards,
The Sailor Skills Team',

  -- HTML version
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Method Setup Required</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 0; text-align: center; background-color: #345475;">
        <h1 style="color: #ffffff; margin: 0; font-size: 28px;">⚓ Sailor Skills</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 40px 30px; background-color: #ffffff;">
        <p style="font-size: 18px; margin: 0 0 20px 0;">Hi {{customerName}},</p>

        <p style="font-size: 16px; margin: 0 0 20px 0;">
          We''re excited to share that we''re <strong>upgrading our payment system</strong> to provide you with a better billing experience!
        </p>

        <p style="font-size: 16px; margin: 0 0 20px 0;">
          As part of this transition from Zoho Payments to Stripe, we need you to add your payment method to our new system.
        </p>

        <div style="margin: 30px 0; padding: 20px; background-color: #e8f4f8; border-left: 4px solid #345475;">
          <h2 style="color: #345475; margin: 0 0 15px 0; font-size: 20px;">Why This Change?</h2>
          <ul style="margin: 0; padding-left: 20px; line-height: 1.8; color: #333;">
            <li><strong>Faster billing:</strong> Get invoiced within minutes of service completion</li>
            <li><strong>Better transparency:</strong> Clearer invoices and payment history</li>
            <li><strong>Enhanced security:</strong> Industry-leading payment security from Stripe</li>
            <li><strong>Improved experience:</strong> Easier access to billing information</li>
          </ul>
        </div>

        <div style="margin: 30px 0; text-align: center;">
          <h2 style="color: #345475; margin: 0 0 20px 0; font-size: 22px;">What You Need To Do</h2>
          <p style="font-size: 16px; margin: 0 0 20px 0;">
            Click the button below to securely add your payment method:
          </p>
          <a href="{{setupLink}}" style="display: inline-block; padding: 15px 30px; background-color: #345475; color: #ffffff; text-decoration: none; font-size: 18px; font-weight: bold; border-radius: 0;">
            Add Payment Method
          </a>
          <p style="font-size: 14px; color: #666; margin: 20px 0 0 0;">
            Or copy and paste this link into your browser:<br>
            <a href="{{setupLink}}" style="color: #345475; word-break: break-all;">{{setupLink}}</a>
          </p>
        </div>

        <div style="margin: 30px 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107;">
          <p style="margin: 0; color: #856404; font-size: 15px; line-height: 1.6;">
            <strong>🔒 Secure & Safe:</strong> Your payment information will be encrypted and stored securely by Stripe. We never store your card details on our servers.
          </p>
        </div>

        <div style="margin: 30px 0; padding: 20px; background-color: #d4edda; border-left: 4px solid #28a745;">
          <h3 style="color: #155724; margin: 0 0 10px 0; font-size: 18px;">Your Payment Method Will Only Be Charged AFTER Service Is Complete</h3>
          <p style="margin: 0; color: #155724; font-size: 15px; line-height: 1.6;">
            Just like before, you''ll only be billed after we complete service on your boat. The difference is that billing will now happen automatically and instantly rather than days or weeks later.
          </p>
        </div>

        <div style="margin: 30px 0; padding: 20px; border-top: 1px solid #ddd; border-bottom: 1px solid #ddd;">
          <h3 style="color: #345475; margin: 0 0 10px 0; font-size: 18px;">Need Help?</h3>
          <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #333;">
            If you have any questions or need assistance, please don''t hesitate to reply to this email or contact us at
            <a href="mailto:{{adminEmail}}" style="color: #345475;">{{adminEmail}}</a>.
          </p>
        </div>

        <p style="margin: 30px 0 0 0; font-size: 16px; color: #333;">
          Thank you for your patience as we make these improvements!
        </p>

        <p style="margin: 20px 0 0 0; font-size: 16px; color: #333;">
          Best regards,<br>
          <strong>The Sailor Skills Team</strong>
        </p>

        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

        <p style="font-size: 12px; color: #999; margin: 0;">
          This email was sent to {{customerEmail}}. If you believe this was sent in error, please contact us immediately.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding: 20px; text-align: center; background-color: #345475; color: #ffffff;">
        <p style="margin: 0; font-size: 14px;">© 2025 Sailor Skills. All rights reserved.</p>
      </td>
    </tr>
  </table>
</body>
</html>',

  -- Available variables
  '["customerName", "customerEmail", "setupLink", "adminEmail", "boatName"]'::jsonb,

  -- Service
  'portal'
)
ON CONFLICT (template_key) DO UPDATE SET
  template_name = EXCLUDED.template_name,
  subject_line = EXCLUDED.subject_line,
  email_body = EXCLUDED.email_body,
  html_template_file = EXCLUDED.html_template_file,
  available_variables = EXCLUDED.available_variables,
  updated_at = NOW();
