# Sailorskills Suite - External API Integrations

**Last Updated:** 2025-10-27
**Status:** Production Active
**Purpose:** Central documentation of all external API integrations, webhooks, secrets, and rate limits

This document tracks all third-party services integrated with the Sailorskills suite, as required by CLAUDE.md governance.

---

## Table of Contents

1. [Integration Overview](#integration-overview)
2. [Stripe (Payment Processing)](#stripe-payment-processing)
3. [Resend (Email Service)](#resend-email-service)
4. [YouTube API (Video Management)](#youtube-api-video-management)
5. [Google Calendar API (Booking)](#google-calendar-api-booking)
6. [Gemini AI (Inventory Intelligence)](#gemini-ai-inventory-intelligence)
7. [Supabase (Backend Infrastructure)](#supabase-backend-infrastructure)
8. [Secret Management](#secret-management)
9. [Rate Limits & Quotas](#rate-limits--quotas)
10. [Webhook Security](#webhook-security)
11. [Error Handling](#error-handling)
12. [Monitoring & Alerts](#monitoring--alerts)

---

## Integration Overview

| Service | Used By | Purpose | Status | Cost |
|---------|---------|---------|--------|------|
| Stripe | Estimator, Billing | Payment processing | ✅ Active | Pay-per-transaction |
| Resend | Estimator, Billing, Portal | Email notifications | ✅ Active | Free tier (100/day) |
| YouTube API | Video, Operations | Video hosting & playlists | ✅ Active | Free (quota limits) |
| Google Calendar | Booking | Training scheduling | ✅ Active | Free (quota limits) |
| Gemini AI | Inventory | Product recommendations | 🟡 Planned | Pay-per-request |
| Supabase | All services | Database, Auth, Storage | ✅ Active | Free tier / Pro |

---

## Stripe (Payment Processing)

### Purpose
Payment processing for service orders, invoices, and subscriptions.

### Services Using Stripe
- **Estimator** - Accept deposits, process one-time payments, create SetupIntents for recurring services
- **Billing** - Charge saved payment methods, create invoices, process payments
- **Site** - Marketing payment links

### API Keys & Secrets

#### Environment Variables Required:
```env
# Public keys (client-side)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (test) / pk_live_... (production)

# Secret keys (server-side only)
STRIPE_SECRET_KEY=sk_test_... (test) / sk_live_... (production)

# Webhook signing secrets
STRIPE_WEBHOOK_SECRET=whsec_... (per webhook endpoint)
```

#### Where Keys Are Used:
- **Estimator:** `VITE_STRIPE_PUBLISHABLE_KEY` in frontend, edge function uses `STRIPE_SECRET_KEY`
- **Billing:** Frontend uses publishable key, API functions use secret key
- **Supabase Edge Functions:** `STRIPE_WEBHOOK_SECRET` for webhook verification

### Webhooks

#### Webhook Endpoints:
1. **Stripe → Supabase Edge Function**
   - URL: `https://fzygakldvvzxmahkdylq.supabase.co/functions/v1/stripe-webhook`
   - Events: `setup_intent.succeeded`, `payment_intent.succeeded`
   - Signing Secret: Store in Supabase secrets as `STRIPE_WEBHOOK_SECRET`

#### Setup Instructions:
```bash
# Configure webhook in Stripe Dashboard
# 1. Go to: https://dashboard.stripe.com/test/webhooks (test) or /webhooks (live)
# 2. Add endpoint: https://fzygakldvvzxmahkdylq.supabase.co/functions/v1/stripe-webhook
# 3. Select events:
#    - setup_intent.succeeded (required for recurring services)
#    - payment_intent.succeeded (optional for one-time services)
# 4. Copy signing secret and add to Supabase:
supabase secrets set STRIPE_WEBHOOK_SECRET='whsec_...' --project-ref fzygakldvvzxmahkdylq
```

### Webhook Event Handling

#### `setup_intent.succeeded`
**Trigger:** Customer saves payment method for recurring services
**Handler:** Supabase edge function `stripe-webhook`
**Actions:**
1. Attach payment method to customer
2. Set payment method as default
3. Update customer record in database
4. Enable recurring billing

**Flow:**
```
Customer submits order (Estimator)
  → Edge function creates SetupIntent
  → Frontend confirms SetupIntent with card
  → Stripe sends webhook: setup_intent.succeeded
  → Edge function attaches payment method
  → Recurring billing enabled
```

#### `payment_intent.succeeded`
**Trigger:** One-time payment successfully processed
**Handler:** Supabase edge function `stripe-webhook`
**Actions:**
1. Update order status to "paid"
2. Create payment record
3. Trigger confirmation email

### API Usage

#### Creating Payment Intents (Estimator):
```javascript
// Edge function: create-payment-intent
const paymentIntent = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: 'usd',
  customer: stripeCustomerId,
  metadata: {
    order_id: orderId,
    service_type: serviceType
  }
});
```

#### Charging Saved Payment Methods (Billing):
```javascript
// Edge function: charge-customer
const charge = await stripe.paymentIntents.create({
  amount: amountInCents,
  currency: 'usd',
  customer: stripeCustomerId,
  payment_method: savedPaymentMethodId,
  confirm: true
});
```

### Rate Limits
- **API Requests:** 100 requests/second (test mode), 1000 requests/second (live mode)
- **Webhooks:** No specific limit, but consider async processing for high volume

### Error Handling
```javascript
try {
  const charge = await stripe.paymentIntents.create({...});
} catch (error) {
  if (error.type === 'StripeCardError') {
    // Card declined, insufficient funds, etc.
    return { error: 'Card declined', code: error.code };
  } else if (error.type === 'StripeRateLimitError') {
    // Too many requests - implement retry with backoff
    return { error: 'Rate limit exceeded', retry: true };
  }
  // Handle other error types...
}
```

### Documentation
- **Official Docs:** https://stripe.com/docs
- **Webhook Guide:** https://stripe.com/docs/webhooks
- **Local Implementation:** See `sailorskills-estimator/CLAUDE.md` (Stripe Webhooks section)

---

## Resend (Email Service)

### Purpose
Transactional email notifications (receipts, invoices, confirmations, alerts).

### Services Using Resend
- **Estimator** - Order confirmation emails
- **Billing** - Invoice emails, payment receipts
- **Portal** - Password reset, magic link authentication
- **Operations** - Service completion notifications (planned)

### API Keys & Secrets

#### Environment Variables Required:
```env
# API key (server-side only)
RESEND_API_KEY=re_... (production key)

# Sender email address
EMAIL_FROM_ADDRESS="Sailor Skills <orders@sailorskills.com>" (production)
# OR for testing:
EMAIL_FROM_ADDRESS="onboarding@resend.dev" (Resend's verified test address)
```

#### Where Keys Are Used:
- **Supabase Edge Functions:** All email-sending functions
  - `create-payment-intent` (Estimator confirmations)
  - `send-email` (Billing invoices/receipts)

### Domain Configuration

#### Production Setup:
1. **Add Domain in Resend Dashboard:**
   - Go to https://resend.com/domains
   - Add domain: `sailorskills.com`

2. **Add DNS Records** (Squarespace or DNS provider):
   ```
   Type: TXT
   Name: _resend
   Value: [provided by Resend]

   Type: CNAME
   Name: resend._domainkey
   Value: [provided by Resend]
   ```

3. **Wait for Verification:** Usually 24-48 hours

4. **Update Supabase Secret:**
   ```bash
   supabase secrets set EMAIL_FROM_ADDRESS='Sailor Skills <orders@sailorskills.com>' --project-ref fzygakldvvzxmahkdylq
   ```

#### Testing Setup:
Use Resend's verified test address (no domain setup required):
```bash
supabase secrets set EMAIL_FROM_ADDRESS='onboarding@resend.dev' --project-ref fzygakldvvzxmahkdylq
```

### API Usage

#### Sending Emails:
```javascript
// Edge function using Resend
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const { data, error } = await resend.emails.send({
  from: process.env.EMAIL_FROM_ADDRESS,
  to: customerEmail,
  subject: 'Order Confirmation',
  html: emailBodyHTML
});
```

### Rate Limits
- **Free Tier:** 100 emails/day, 3,000/month
- **Paid Tier:** 50,000+ emails/month (pricing scales)
- **API Rate Limit:** 10 requests/second

### Error Handling
```javascript
try {
  const { data, error } = await resend.emails.send({...});

  if (error) {
    console.error('Email send failed:', error);
    // Common errors:
    // - Domain not verified
    // - Invalid email address
    // - Rate limit exceeded
    return { success: false, error: error.message };
  }

  return { success: true, messageId: data.id };
} catch (error) {
  console.error('Resend API error:', error);
  return { success: false, error: 'Email service unavailable' };
}
```

### Email Error Logging
Edge functions log detailed email errors to help diagnose issues:
```javascript
// Check Supabase Dashboard → Functions → [function] → Logs
// Look for: "Failed to send confirmation email - DETAILED ERROR"
```

### Common Issues
1. **Domain not verified:** Use `onboarding@resend.dev` for testing
2. **Invalid API key:** Check Supabase secrets
3. **Rate limits:** Upgrade Resend plan or implement queueing

### Documentation
- **Official Docs:** https://resend.com/docs
- **Local Implementation:** See `sailorskills-estimator/CLAUDE.md` (Email Configuration section)

---

## YouTube API (Video Management)

### Purpose
Host service videos, organize into customer playlists, embed in Portal.

### Services Using YouTube
- **Video** - Upload service videos, create playlists
- **Operations** - Link playlists to boats
- **Portal** - Embed customer playlists

### API Keys & Secrets

#### Environment Variables Required:
```env
# YouTube Data API v3 key
YOUTUBE_API_KEY=AIzaSy... (Google Cloud Console)

# OAuth 2.0 credentials (for uploads)
YOUTUBE_CLIENT_ID=...
YOUTUBE_CLIENT_SECRET=...
YOUTUBE_REFRESH_TOKEN=...
```

#### Where Keys Are Used:
- **Video Service:** Upload automation, playlist management
- **Operations:** Store playlist URLs in `youtube_playlists` table
- **Portal:** Embed playlists (uses public API key for read-only)

### API Usage

#### Creating Playlists:
```javascript
// YouTube Data API v3
const response = await fetch('https://www.googleapis.com/youtube/v3/playlists', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    snippet: {
      title: `${boatName} - Service Videos`,
      description: `Service video history for ${boatName}`
    },
    status: { privacyStatus: 'unlisted' }
  })
});
```

#### Linking Playlist to Boat:
```sql
-- Store in database (Operations)
INSERT INTO youtube_playlists (boat_id, playlist_url, playlist_id)
VALUES ($1, $2, $3);
```

#### Embedding in Portal:
```html
<!-- Portal customer view -->
<iframe
  src="https://www.youtube.com/embed/videoseries?list=PLAYLIST_ID"
  frameborder="0"
  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture">
</iframe>
```

### Rate Limits
- **Quota:** 10,000 units/day (default)
- **Upload:** 50 units per video
- **Playlist creation:** 50 units
- **Read operations:** 1 unit each

**Note:** Uploads consume quota quickly. Monitor daily usage in Google Cloud Console.

### Quota Management Strategies
1. **Batch uploads** during low-traffic hours
2. **Request quota increase** if needed (Google form)
3. **Cache playlist data** to reduce reads
4. **Use unlisted videos** to avoid moderation delays

### Error Handling
```javascript
try {
  const response = await uploadToYouTube(videoFile);
} catch (error) {
  if (error.code === 403 && error.message.includes('quotaExceeded')) {
    // Quota exceeded - queue upload for tomorrow
    await queueForLater(videoFile);
  } else if (error.code === 401) {
    // Token expired - refresh OAuth token
    await refreshAccessToken();
  }
}
```

### Documentation
- **Official Docs:** https://developers.google.com/youtube/v3
- **Quota Calculator:** https://developers.google.com/youtube/v3/determine_quota_cost

---

## Google Calendar API (Booking)

### Purpose
Training session scheduling, availability management, automated reminders.

### Services Using Google Calendar
- **Booking** - Create/update training appointments
- **Operations** - View upcoming training schedule (read-only)

### API Keys & Secrets

#### Environment Variables Required:
```env
# Google Calendar API credentials
GOOGLE_CALENDAR_API_KEY=AIzaSy...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REFRESH_TOKEN=...

# Calendar ID to use
GOOGLE_CALENDAR_ID=primary  # or specific calendar ID
```

### API Usage

#### Creating Appointments:
```javascript
// Google Calendar API v3
const event = {
  summary: `Training: ${courseName}`,
  description: `Booking for ${customerName}`,
  start: {
    dateTime: bookingDateTime,
    timeZone: 'America/Los_Angeles'
  },
  end: {
    dateTime: endDateTime,
    timeZone: 'America/Los_Angeles'
  },
  attendees: [
    { email: customerEmail }
  ],
  reminders: {
    useDefault: false,
    overrides: [
      { method: 'email', minutes: 24 * 60 },  // 1 day before
      { method: 'popup', minutes: 60 }        // 1 hour before
    ]
  }
};

const response = await calendar.events.insert({
  calendarId: 'primary',
  resource: event,
  sendUpdates: 'all'  // Send email invites
});
```

### Rate Limits
- **Quota:** 1,000,000 requests/day (generous)
- **Write operations:** 60 requests/minute per calendar
- **Read operations:** 100 requests/minute per calendar

### Webhook Integration (Calendar Push Notifications)
```javascript
// Set up watch on calendar
await calendar.events.watch({
  calendarId: 'primary',
  resource: {
    id: uniqueChannelId,
    type: 'web_hook',
    address: 'https://your-edge-function.supabase.co/calendar-webhook'
  }
});
```

### Documentation
- **Official Docs:** https://developers.google.com/calendar/api
- **Node.js Client:** https://github.com/googleapis/google-api-nodejs-client

---

## Gemini AI (Inventory Intelligence)

### Purpose
AI-powered product recommendations, automated reordering suggestions, inventory optimization.

### Services Using Gemini
- **Inventory** - Product recommendations, smart reordering

### Status
🟡 **Planned** - Not yet implemented

### API Keys & Secrets

#### Environment Variables Required:
```env
# Google AI Platform
GEMINI_API_KEY=AIzaSy...

# Model configuration
GEMINI_MODEL=gemini-pro  # or gemini-pro-vision for images
```

### Planned API Usage

#### Product Recommendations:
```javascript
// Planned implementation
const prompt = `Based on this anode usage history:
${anodeUsageData}

Recommend optimal reorder quantities and timing.`;

const response = await gemini.generateContent(prompt);
```

### Rate Limits (When Implemented)
- **Free Tier:** 60 requests/minute
- **Paid Tier:** Higher limits based on plan
- **Input Tokens:** 32,000 max per request

### Documentation
- **Official Docs:** https://ai.google.dev/docs
- **Gemini API:** https://ai.google.dev/tutorials/get_started_node

---

## Supabase (Backend Infrastructure)

### Purpose
Database (PostgreSQL), authentication, storage, edge functions, real-time subscriptions.

### Services Using Supabase
- **All services** - Database access
- **Portal, Operations** - Authentication
- **Billing, Operations** - File storage (service photos)
- **All services** - Edge functions for serverless API endpoints

### API Keys & Secrets

#### Environment Variables Required:
```env
# Public keys (client-side)
VITE_SUPABASE_URL=https://fzygakldvvzxmahkdylq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG... (public, RLS-protected)

# Service role key (server-side only, bypasses RLS)
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (NEVER expose to client)
```

#### Where Keys Are Used:
- **All Services:** Client-side uses `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`
- **Edge Functions:** Use `SUPABASE_SERVICE_ROLE_KEY` when RLS bypass needed
- **Database Migrations:** Use `DATABASE_URL` (includes password)

### Database Connection

#### Direct PostgreSQL Connection:
```env
DATABASE_URL=postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres
```

**Stored in:** `/Users/brian/app-development/sailorskills-repos/.env` (gitignored)

### Edge Functions

**Current Edge Functions:**
- `create-payment-intent` - Stripe payment processing
- `stripe-webhook` - Stripe event handling
- `charge-customer` - Billing charges
- `send-email` - Email notifications
- `invoices` - Invoice management
- Various CRUD operations

**Deploying Edge Functions:**
```bash
supabase functions deploy function-name --project-ref fzygakldvvzxmahkdylq
```

### Rate Limits
- **Free Tier:** 500MB database, 2GB bandwidth, 50,000 monthly active users
- **Pro Tier:** 8GB database, 50GB bandwidth, 100,000 MAU
- **Edge Functions:** 500,000 invocations/month (free), 2,000,000 (pro)

### Monitoring
- **Dashboard:** https://supabase.com/dashboard/project/fzygakldvvzxmahkdylq
- **Database:** Query performance, table sizes
- **Edge Functions:** Invocations, errors, logs
- **Auth:** Active users, sign-ins
- **Storage:** File uploads, bandwidth

### Documentation
- **Official Docs:** https://supabase.com/docs
- **Edge Functions:** https://supabase.com/docs/guides/functions

---

## Secret Management

### Secret Storage Locations

#### Vercel Environment Variables (per service):
- Access: Vercel Dashboard → Project → Settings → Environment Variables
- Used by: Frontend build (VITE_ prefixed vars), API routes
- **Never commit `.env` files to git**

#### Supabase Secrets (edge functions):
```bash
# Set secret
supabase secrets set SECRET_NAME='secret_value' --project-ref fzygakldvvzxmahkdylq

# List secrets
supabase secrets list --project-ref fzygakldvvzxmahkdylq

# Unset secret
supabase secrets unset SECRET_NAME --project-ref fzygakldvvzxmahkdylq
```

#### Local Development:
- **Location:** `.env` files in each service root (gitignored)
- **Template:** `.env.example` (committed, no secrets)
- **Loading:** Vite auto-loads `.env` in development

### Secret Rotation Schedule

| Secret Type | Rotation Frequency | Process |
|-------------|-------------------|---------|
| Stripe API Keys | Annually or on breach | Generate new key in Stripe Dashboard, update all services, test, revoke old key |
| Supabase Keys | On breach only | Regenerate in Supabase Dashboard, update all services |
| Webhook Secrets | Annually or on breach | Generate new secret in Stripe/service, update edge functions |
| Email API Keys | Annually | Generate new key in Resend, update edge functions |
| OAuth Tokens | Auto-refresh | Refresh tokens automatically renewed by OAuth flow |

### Secrets Checklist by Service

#### Estimator:
- [ ] VITE_SUPABASE_URL
- [ ] VITE_SUPABASE_ANON_KEY
- [ ] VITE_STRIPE_PUBLISHABLE_KEY
- [ ] STRIPE_SECRET_KEY (edge function)
- [ ] STRIPE_WEBHOOK_SECRET (edge function)
- [ ] RESEND_API_KEY (edge function)
- [ ] EMAIL_FROM_ADDRESS (edge function)

#### Billing:
- [ ] VITE_SUPABASE_URL
- [ ] VITE_SUPABASE_ANON_KEY
- [ ] VITE_STRIPE_PUBLISHABLE_KEY
- [ ] STRIPE_SECRET_KEY (API route)
- [ ] RESEND_API_KEY (API route)

#### Portal:
- [ ] VITE_SUPABASE_URL
- [ ] VITE_SUPABASE_ANON_KEY
- [ ] DATABASE_URL (testing only, not in Vercel)

#### Operations:
- [ ] VITE_SUPABASE_URL
- [ ] VITE_SUPABASE_ANON_KEY

#### Inventory:
- [ ] VITE_SUPABASE_URL
- [ ] VITE_SUPABASE_ANON_KEY
- [ ] GEMINI_API_KEY (when implemented)

#### Dashboard:
- [ ] VITE_SUPABASE_URL
- [ ] VITE_SUPABASE_ANON_KEY

---

## Rate Limits & Quotas

### Summary Table

| Service | Free Tier Limit | Paid Tier | Monitoring |
|---------|----------------|-----------|------------|
| Stripe | No API limit | No API limit | Stripe Dashboard |
| Resend | 100 emails/day | 50,000+/month | Resend Dashboard |
| YouTube | 10,000 quota/day | Request increase | Google Cloud Console |
| Google Calendar | 1M requests/day | Same | Google Cloud Console |
| Gemini | 60 req/min | Higher | Google AI Console |
| Supabase | 500K edge invocations/month | 2M/month | Supabase Dashboard |

### Rate Limit Best Practices

1. **Implement Exponential Backoff:**
   ```javascript
   async function retryWithBackoff(fn, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await fn();
       } catch (error) {
         if (error.status === 429 && i < maxRetries - 1) {
           await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
         } else {
           throw error;
         }
       }
     }
   }
   ```

2. **Cache API Responses:**
   - YouTube playlist data (1 hour cache)
   - Google Calendar availability (15 minute cache)

3. **Batch Operations:**
   - YouTube uploads during off-peak hours
   - Email notifications queued and sent in batches

4. **Monitor Usage:**
   - Set up alerts in service dashboards
   - Track approaching quota limits
   - Plan upgrades before hitting limits

---

## Webhook Security

### Webhook Verification

#### Stripe Webhooks:
```javascript
// Verify webhook signature
const signature = request.headers['stripe-signature'];
let event;

try {
  event = stripe.webhooks.constructEvent(
    request.body,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
} catch (err) {
  console.error('Webhook signature verification failed:', err.message);
  return { statusCode: 400, body: 'Invalid signature' };
}

// Process verified event
switch (event.type) {
  case 'payment_intent.succeeded':
    // Handle payment success
    break;
  // ...
}
```

### Webhook Endpoint Security

1. **Use HTTPS Only:** All webhook endpoints must use HTTPS
2. **Verify Signatures:** Always verify webhook signatures before processing
3. **Idempotency:** Handle duplicate webhook deliveries gracefully
4. **Async Processing:** Process webhooks asynchronously to avoid timeouts
5. **Error Handling:** Return 2xx immediately, retry failures internally

### Webhook Testing

#### Stripe CLI for Local Testing:
```bash
# Forward webhooks to local development
stripe listen --forward-to localhost:54321/functions/v1/stripe-webhook

# Test specific events
stripe trigger payment_intent.succeeded
```

---

## Error Handling

### Standard Error Response Format

```javascript
{
  success: false,
  error: {
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'API rate limit exceeded',
    service: 'resend',
    retryAfter: 60  // seconds
  }
}
```

### Service-Specific Error Codes

#### Stripe:
- `card_declined` - Card payment failed
- `insufficient_funds` - Not enough balance
- `rate_limit_error` - Too many requests

#### Resend:
- `domain_not_verified` - Email domain not set up
- `invalid_email` - Malformed email address
- `rate_limit` - Exceeded email quota

#### YouTube:
- `quotaExceeded` - Daily quota used up
- `forbidden` - Invalid OAuth token
- `videoNotFound` - Video ID doesn't exist

### Retry Logic

```javascript
const RETRY_CONFIG = {
  stripe: { maxRetries: 3, backoff: 'exponential' },
  resend: { maxRetries: 2, backoff: 'linear' },
  youtube: { maxRetries: 1, backoff: 'none' }
};
```

---

## Monitoring & Alerts

### Dashboard Access

- **Stripe:** https://dashboard.stripe.com
- **Resend:** https://resend.com/dashboard
- **YouTube:** https://console.cloud.google.com (YouTube Data API v3)
- **Google Calendar:** https://console.cloud.google.com (Calendar API)
- **Supabase:** https://supabase.com/dashboard/project/fzygakldvvzxmahkdylq

### Key Metrics to Monitor

1. **Payment Processing:**
   - Stripe success rate (target: >95%)
   - Failed payment reasons
   - Webhook delivery status

2. **Email Delivery:**
   - Resend delivery rate (target: >98%)
   - Bounce rate
   - Daily quota usage

3. **API Quotas:**
   - YouTube daily quota usage
   - Google Calendar requests/minute
   - Supabase edge function invocations

4. **Error Rates:**
   - API error responses by service
   - Webhook failures
   - Timeout errors

### Recommended Alerts

1. **Critical:**
   - Stripe webhook failures (> 5/hour)
   - Payment processing down
   - Supabase database connection failures

2. **Warning:**
   - Resend approaching daily limit (>80 emails)
   - YouTube quota >80% used
   - API error rate >5%

3. **Info:**
   - Weekly API usage summary
   - Secret rotation reminders
   - Quota limit increases needed

---

## Contact & Support

### Service Support

- **Stripe:** support@stripe.com, https://support.stripe.com
- **Resend:** support@resend.com, https://resend.com/support
- **YouTube API:** https://support.google.com/youtube
- **Google Calendar API:** https://support.google.com/calendar
- **Supabase:** support@supabase.io, https://supabase.com/support

### Internal Escalation

**Integration Issues:**
1. Check service dashboard for outages
2. Review recent code changes (git log)
3. Check Supabase edge function logs
4. Verify environment variables are set
5. Test with service-specific CLI tools (Stripe CLI, etc.)

**Emergency Contacts:**
- Database/Backend: Supabase support
- Payments: Stripe support
- Deployment: Vercel support

---

## Change Log

| Date | Service | Change | Impact |
|------|---------|--------|--------|
| 2025-10-27 | Documentation | Created INTEGRATIONS.md | Governance compliance |
| 2025-10-26 | Database | Added migration tracking | Better schema management |
| 2025-10-24 | Security | Security audit completed | Fixed Operations auth |

---

**Document Version:** 1.0
**Last Updated:** 2025-10-27
**Next Review:** Quarterly or after adding new integrations
