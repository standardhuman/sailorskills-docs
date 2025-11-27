-- Insert magic link email template
INSERT INTO email_templates (
  template_key,
  template_name,
  subject_line,
  email_body,
  html_template_file,
  available_variables,
  service,
  is_active
) VALUES (
  'magic_link',
  'Magic Link Sign In',
  'Sign in to Sailor Skills',
  'Click the link below to sign in to your Sailor Skills account. This link will expire in 1 hour.',
  '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign In to Sailor Skills</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, ''Helvetica Neue'', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Sign In to Your Account</h1>
                            <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px;">Sailor Skills Marine Services</p>
                        </td>
                    </tr>

                    <!-- Lock Icon -->
                    <tr>
                        <td style="padding: 30px 40px 20px; text-align: center;">
                            <div style="width: 80px; height: 80px; margin: 0 auto; background-color: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                                <span style="font-size: 40px; color: #3b82f6;">🔐</span>
                            </div>
                            <h2 style="margin: 20px 0 10px; color: #1e3a8a; font-size: 24px;">One-Click Sign In</h2>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">Click the button below to access your account</p>
                        </td>
                    </tr>

                    <!-- Main Content -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi there,</p>
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">You requested a magic link to sign in to your Sailor Skills account. Click the button below to securely access your account.</p>
                        </td>
                    </tr>

                    <!-- Action Button -->
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <a href="{{ .ConfirmationURL }}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 14px;">Sign In to Sailor Skills</a>
                        </td>
                    </tr>

                    <!-- Security Notice -->
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 20px;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                                    <strong>Security Note:</strong> This link will expire in 1 hour and can only be used once. If you didn''t request this email, you can safely ignore it.
                                </p>
                            </div>
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                If the button above doesn''t work, copy and paste this link into your browser:
                            </p>
                            <p style="margin: 10px 0 0; color: #3b82f6; font-size: 12px; word-break: break-all;">
                                {{ .ConfirmationURL }}
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">Need help? Contact us anytime</p>
                            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">Email us at <a href="mailto:info@sailorskills.com" style="color: #3b82f6; text-decoration: none;">info@sailorskills.com</a></p>
                            <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px;">© {{ .CurrentYear }} Sailor Skills Marine Services. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>',
  '["ConfirmationURL", "CurrentYear"]'::jsonb,
  'shared',
  true
)
ON CONFLICT (template_key) DO UPDATE SET
  html_template_file = EXCLUDED.html_template_file,
  subject_line = EXCLUDED.subject_line,
  email_body = EXCLUDED.email_body,
  available_variables = EXCLUDED.available_variables,
  service = EXCLUDED.service,
  updated_at = NOW();

-- Verify insertion
SELECT template_key, template_name, subject_line, service, is_active
FROM email_templates
WHERE template_key = 'magic_link';
