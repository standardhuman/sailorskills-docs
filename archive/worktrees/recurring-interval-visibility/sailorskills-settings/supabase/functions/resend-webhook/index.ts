import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const event = await req.json();

    console.log('Received Resend webhook:', event);

    // Extract event data
    const { type, data } = event;
    const emailId = data.email_id;

    if (!emailId) {
      throw new Error('Missing email_id in webhook data');
    }

    // Find email_logs record by resend_id
    const { data: emailLog, error: findError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('resend_id', emailId)
      .single();

    if (findError || !emailLog) {
      console.warn(`Email log not found for resend_id: ${emailId}`);
      return new Response(JSON.stringify({ success: false, error: 'Email log not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update email_logs based on event type
    const updates: any = {};

    switch (type) {
      case 'email.opened':
        if (!emailLog.opened_at) {
          updates.opened_at = data.opened_at || new Date().toISOString();
        }
        break;

      case 'email.clicked':
        if (!emailLog.first_click_at) {
          updates.first_click_at = data.clicked_at || new Date().toISOString();
        }
        updates.click_count = (emailLog.click_count || 0) + 1;
        break;

      case 'email.bounced':
        updates.bounced_at = data.bounced_at || new Date().toISOString();
        updates.status = 'failed';
        updates.error_message = data.reason || 'Email bounced';
        break;

      case 'email.complained':
        updates.complained_at = data.complained_at || new Date().toISOString();
        break;

      case 'email.delivered':
        if (emailLog.status === 'pending') {
          updates.status = 'sent';
        }
        break;

      default:
        console.log(`Unhandled event type: ${type}`);
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('email_logs')
        .update(updates)
        .eq('id', emailLog.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`Updated email log ${emailLog.id} for event ${type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
