/**
 * Supabase Edge Function: Custom Auth Email Change Confirmation
 * Replaces Supabase's built-in email change confirmation to add BCC support
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getBccAddress } from '../../../sailorskills-shared/src/lib/bcc-lookup.js';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('EMAIL_FROM_ADDRESS') || 'Sailor Skills <noreply@sailorskills.com>';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  const emailPayload: any = { from: FROM_EMAIL, to: [to], subject, html };
  const bcc = await getBccAddress('settings');
  if (bcc) emailPayload.bcc = [bcc];

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(emailPayload)
  });

  if (!response.ok) throw new Error(`Resend API error: ${(await response.json()).message || response.statusText}`);
  return await response.json();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' } });
  }

  try {
    const { email, confirmation_url } = await req.json();
    if (!email || !confirmation_url) return new Response(JSON.stringify({ error: 'Missing required fields' }), { status: 400, headers: { 'Content-Type': 'application/json' } });

    const currentYear = new Date().getFullYear();
    const subject = 'Confirm Email Change - Sailor Skills';
    const html = `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h1 style="color: #1e3a8a;">Confirm Your New Email Address</h1><p>You requested to change your email address. Click the button below to confirm:</p><a href="${confirmation_url}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Confirm Email Change</a><p style="color: #666; font-size: 14px;">If you didn't request this change, please contact us immediately.</p><p style="color: #666; font-size: 12px;">© ${currentYear} Sailor Skills Marine Services. All rights reserved.</p></body></html>`;

    const result = await sendEmail(email, subject, html);

    await supabase.from('email_logs').insert({
      email_type: 'email_change',
      recipient_email: email,
      subject,
      status: 'sent',
      resend_id: result.id
    }).catch(console.warn);

    return new Response(JSON.stringify({ success: true, id: result.id }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
