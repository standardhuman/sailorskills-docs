import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  try {
    const { service_name, bcc_address } = await req.json();

    if (!service_name || !bcc_address) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing service_name or bcc_address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send test email
    const { data, error } = await resend.emails.send({
      from: 'settings@sailorskills.com',
      to: 'noreply@sailorskills.com', // Dummy recipient
      bcc: bcc_address,
      subject: `[TEST] BCC Configuration Test - ${service_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">BCC Test Email</h2>
          <p>This is a test email to verify BCC configuration for the <strong>${service_name}</strong> service.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Service:</strong> ${service_name}</p>
            <p style="margin: 5px 0;"><strong>BCC Address:</strong> ${bcc_address}</p>
            <p style="margin: 5px 0;"><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          </div>
          <p style="color: #16a34a; font-weight: bold;">✅ If you received this as a BCC, your configuration is working correctly!</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated test email from Sailorskills Settings.<br />
            To: noreply@sailorskills.com (dummy recipient)<br />
            BCC: ${bcc_address}
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
