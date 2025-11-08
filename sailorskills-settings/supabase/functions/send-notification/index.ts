import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const resendApiKey = Deno.env.get('RESEND_API_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface EmailPayload {
  emailType: string;
  recipientEmail: string;
  recipientName?: string;
  subject: string;
  htmlContent: string;
  metadata?: Record<string, any>;
  orderId?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    // Parse request body
    const payload: EmailPayload = await req.json();
    const { emailType, recipientEmail, recipientName, subject, htmlContent, metadata, orderId } = payload;

    // Validate required fields
    if (!emailType || !recipientEmail || !subject || !htmlContent) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing required fields: emailType, recipientEmail, subject, htmlContent',
        }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`📧 Sending ${emailType} email to ${recipientEmail}...`);

    // Send email via Resend API
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Sailor Skills <hello@sailorskills.com>',
        to: [recipientEmail],
        subject: subject,
        html: htmlContent,
      }),
    });

    if (!resendResponse.ok) {
      const errorData = await resendResponse.json();
      console.error('❌ Resend API error:', errorData);

      // Log failed email attempt
      const { data: emailLog } = await supabase
        .from('email_logs')
        .insert({
          email_type: emailType,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          subject: subject,
          status: 'failed',
          error_message: errorData.message || 'Resend API error',
          metadata: metadata,
          order_id: orderId,
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to send email via Resend',
          details: errorData.message,
          emailLogId: emailLog?.id,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    const resendData = await resendResponse.json();
    const resendId = resendData.id;

    console.log(`✅ Email sent via Resend: ${resendId}`);

    // Log email in database
    const { data: emailLog, error: logError } = await supabase
      .from('email_logs')
      .insert({
        email_type: emailType,
        recipient_email: recipientEmail,
        recipient_name: recipientName,
        subject: subject,
        status: 'sent',
        resend_id: resendId,
        metadata: metadata,
        order_id: orderId,
      })
      .select()
      .single();

    if (logError) {
      console.error('❌ Failed to log email:', logError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Email sent but failed to log in database',
          details: logError.message,
          emailId: resendId,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      );
    }

    console.log(`✅ Email logged in database: ${emailLog.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        emailId: resendId,
        emailLogId: emailLog.id,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (error) {
    console.error('❌ Send notification error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
});
