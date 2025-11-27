/**
 * Test script to verify send-notification edge function
 * Run with: node test-email-send.mjs
 */

const SUPABASE_URL = 'https://fzygakldvvzxmahkdylq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eWdha2xkdnZ6eG1haGtkeWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODM4OTgsImV4cCI6MjA2OTY1OTg5OH0.8BNDF5zmpk2HFdprTjsdOWTDh_XkAPdTnGo7omtiVIk';

async function testSendEmail() {
  try {
    console.log('📧 Testing send-notification edge function...\n');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
            h1 { color: #2563eb; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Email System Test</h1>
            <p>This is a test email from the Sailor Skills Settings email system.</p>
            <p>If you're reading this, the email system is working correctly!</p>
            <div class="footer">
              <p>Sent from Sailor Skills Settings Service</p>
              <p>Test timestamp: ${new Date().toISOString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const payload = {
      emailType: 'test_email',
      recipientEmail: 'standardhuman@gmail.com',
      recipientName: 'Brian',
      subject: 'Test Email - Sailor Skills Settings',
      htmlContent: htmlContent,
      metadata: {
        test: true,
        timestamp: new Date().toISOString(),
        source: 'test-email-send.mjs'
      }
    };

    console.log('Sending test email to:', payload.recipientEmail);
    console.log('Subject:', payload.subject);
    console.log('');

    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Email sent successfully!');
      console.log('');
      console.log('Response:', JSON.stringify(result, null, 2));
      console.log('');
      console.log('Email ID:', result.emailId);
      console.log('Email Log ID:', result.emailLogId);
      console.log('');
      console.log('📬 Check your inbox at standardhuman@gmail.com');
    } else {
      console.error('❌ Failed to send email');
      console.error('');
      console.error('Status:', response.status);
      console.error('Response:', JSON.stringify(result, null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testSendEmail();
