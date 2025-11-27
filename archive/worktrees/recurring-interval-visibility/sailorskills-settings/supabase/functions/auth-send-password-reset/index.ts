/**
 * Supabase Edge Function: Custom Auth Password Reset Email
 * Replaces Supabase's built-in password reset email to add BCC support
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('EMAIL_FROM_ADDRESS') || 'Sailor Skills <noreply@sailorskills.com>';
const BCC_EMAIL = Deno.env.get('EMAIL_BCC_ADDRESS');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface EmailTemplate {
  subject: string;
  html: string;
}

async function loadTemplate(confirmationUrl: string): Promise<EmailTemplate> {
  try {
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('subject_line, html_template_file')
      .eq('template_key', 'password_reset')
      .eq('is_active', true)
      .single();

    if (template && !error) {
      const currentYear = new Date().getFullYear().toString();
      let subject = template.subject_line;
      let html = template.html_template_file;

      html = html.replace(/\{\{\s*\.ConfirmationURL\s*\}\}/g, confirmationUrl);
      html = html.replace(/\{\{\s*\.CurrentYear\s*\}\}/g, currentYear);

      return { subject, html };
    }
  } catch (err) {
    console.warn('Failed to load template from database:', err);
  }

  return getFallbackTemplate(confirmationUrl);
}

function getFallbackTemplate(confirmationUrl: string): EmailTemplate {
  const currentYear = new Date().getFullYear().toString();

  return {
    subject: 'Reset Your Password - Sailor Skills',
    html: `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <tr>
                        <td style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 40px 40px 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Reset Your Password</h1>
                            <p style="margin: 10px 0 0; color: #e0e7ff; font-size: 14px;">Sailor Skills Marine Services</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px 20px; text-align: center;">
                            <div style="width: 80px; height: 80px; margin: 0 auto; background-color: #dbeafe; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;">
                                <span style="font-size: 40px; color: #3b82f6;">🔑</span>
                            </div>
                            <h2 style="margin: 20px 0 10px; color: #1e3a8a; font-size: 24px;">Create New Password</h2>
                            <p style="margin: 0; color: #6b7280; font-size: 14px;">Click the button below to reset your password</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">Hi there,</p>
                            <p style="margin: 0 0 20px; color: #374151; font-size: 16px; line-height: 1.6;">You requested to reset your password. Click the button below to create a new password for your Sailor Skills account.</p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 40px; text-align: center;">
                            <a href="${confirmationUrl}" style="display: inline-block; background-color: #3b82f6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-weight: 600; font-size: 14px;">Reset Password</a>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 0 40px 30px;">
                            <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin-bottom: 20px;">
                                <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                                    <strong>Security Note:</strong> This link will expire in 1 hour. If you didn't request a password reset, please contact us immediately or ignore this email.
                                </p>
                            </div>
                            <p style="margin: 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                                If the button above doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style="margin: 10px 0 0; color: #3b82f6; font-size: 12px; word-break: break-all;">
                                ${confirmationUrl}
                            </p>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; text-align: center;">
                            <p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">Need help? Contact us anytime</p>
                            <p style="margin: 0; color: #111827; font-size: 14px; font-weight: 600;">Email us at <a href="mailto:info@sailorskills.com" style="color: #3b82f6; text-decoration: none;">info@sailorskills.com</a></p>
                            <p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px;">© ${currentYear} Sailor Skills Marine Services. All rights reserved.</p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
  };
}

async function sendEmail(to: string, subject: string, html: string): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const emailPayload: any = {
      from: FROM_EMAIL,
      to: [to],
      subject,
      html
    };

    if (BCC_EMAIL) {
      emailPayload.bcc = [BCC_EMAIL];
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Resend API error: ${error.message || response.statusText}`);
    }

    const result = await response.json();
    return { success: true, id: result.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    const { email, confirmation_url } = await req.json();

    if (!email || !confirmation_url) {
      return new Response(
        JSON.stringify({ error: 'Missing email or confirmation_url' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const template = await loadTemplate(confirmation_url);
    const result = await sendEmail(email, template.subject, template.html);

    if (!result.success) {
      return new Response(
        JSON.stringify({ error: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    try {
      await supabase.from('email_logs').insert({
        email_type: 'password_reset',
        recipient_email: email,
        subject: template.subject,
        status: 'sent',
        resend_id: result.id
      });
    } catch (logError) {
      console.warn('Failed to log email:', logError);
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing password reset email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
