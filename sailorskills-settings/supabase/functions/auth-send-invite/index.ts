/**
 * Supabase Edge Function: Custom Auth User Invitation Email
 * Replaces Supabase's built-in user invitation email to add BCC support
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const FROM_EMAIL = Deno.env.get('EMAIL_FROM_ADDRESS') || 'Sailor Skills <noreply@sailorskills.com>';
const BCC_EMAIL = Deno.env.get('EMAIL_BCC_ADDRESS');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function sendEmail(to: string, subject: string, html: string) {
  const emailPayload: any = { from: FROM_EMAIL, to: [to], subject, html };
  if (BCC_EMAIL) emailPayload.bcc = [BCC_EMAIL];

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
    const subject = 'You\'ve Been Invited to Sailor Skills';
    const html = `<!DOCTYPE html><html><body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;"><h1 style="color: #1e3a8a;">Welcome to the Team!</h1><p>You've been invited to join Sailor Skills. Click the button below to accept your invitation and set up your account:</p><a href="${confirmation_url}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 20px 0;">Accept Invitation</a><p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p><p style="color: #666; font-size: 12px;">© ${currentYear} Sailor Skills Marine Services. All rights reserved.</p></body></html>`;

    const result = await sendEmail(email, subject, html);

    await supabase.from('email_logs').insert({
      email_type: 'invite_user',
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
