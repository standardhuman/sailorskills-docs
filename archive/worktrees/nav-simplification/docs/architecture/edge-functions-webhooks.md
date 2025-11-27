# Sailorskills Suite - Edge Functions & Webhook Map

**Created:** 2025-10-28
**Last Updated:** 2025-10-28
**Purpose:** Document all Supabase edge functions, webhooks, and external API integrations

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Supabase Edge Functions](#supabase-edge-functions)
3. [Webhook Endpoints](#webhook-endpoints)
4. [External API Calls](#external-api-calls)
5. [Request/Response Flows](#requestresponse-flows)
6. [Security & Authentication](#security--authentication)

---

## Architecture Overview

```mermaid
graph LR
    subgraph "External Services"
        STRIPE[Stripe API]
        YOUTUBE[YouTube API]
        GCAL[Google Calendar]
        RESEND[Resend API]
        GEMINI[Gemini AI]
        BOATZINCS[boatzincs.com]
    end

    subgraph "Supabase Edge Functions"
        EDGE_STRIPE[stripe-webhook]
        EDGE_PAYMENT[create-payment-intent]
        EDGE_CHARGE[charge-customer]
        EDGE_EMAIL[send-email]
        EDGE_RECEIPT[send-receipt]
        EDGE_CONFIG[get-stripe-config]
    end

    subgraph "Service-Specific Functions"
        BILL_FUNCS[Billing Functions<br/>15 functions]
        OPS_FUNCS[Operations Functions<br/>2 functions]
    end

    subgraph "Sailorskills Services"
        EST[Estimator]
        BILL[Billing]
        OPS[Operations]
        INV[Inventory]
        PORT[Portal]
        BOOK[Booking]
        VID[Video]
    end

    subgraph "Database"
        DB[(Supabase PostgreSQL)]
    end

    %% Webhooks (External → Edge Functions)
    STRIPE -->|"Webhook:<br/>payment events"| EDGE_STRIPE
    STRIPE -->|"Webhook:<br/>setup_intent events"| EDGE_STRIPE

    %% Edge Functions → Database
    EDGE_STRIPE -->|"Write payments"| DB
    EDGE_PAYMENT -->|"Create payment records"| DB
    EDGE_CHARGE -->|"Update invoices"| DB

    %% Services → Edge Functions
    EST -->|"Create payment"| EDGE_PAYMENT
    BILL -->|"Charge customer"| EDGE_CHARGE
    BILL -->|"Send receipt"| EDGE_RECEIPT
    PORT -->|"Send magic link"| EDGE_EMAIL

    %% Services → External APIs
    BILL -->|"Process payments"| STRIPE
    INV -->|"Scrape catalog"| BOATZINCS
    INV -->|"AI recommendations"| GEMINI
    BOOK -->|"Sync events"| GCAL
    VID -->|"Upload videos"| YOUTUBE
    BILL_FUNCS -->|"Send emails"| RESEND
    OPS_FUNCS -->|"Send notifications"| RESEND

    %% Service Functions → Database
    BILL_FUNCS -->|"Read/Write"| DB
    OPS_FUNCS -->|"Read/Write"| DB

    classDef external fill:#cbd5e0,stroke:#a0aec0,stroke-width:2px
    classDef edge fill:#ed8936,stroke:#dd6b20,stroke-width:2px
    classDef service fill:#48bb78,stroke:#38a169,stroke-width:2px
    classDef database fill:#667eea,stroke:#5a67d8,stroke-width:3px

    class STRIPE,YOUTUBE,GCAL,RESEND,GEMINI,BOATZINCS external
    class EDGE_STRIPE,EDGE_PAYMENT,EDGE_CHARGE,EDGE_EMAIL,EDGE_RECEIPT,EDGE_CONFIG edge
    class EST,BILL,OPS,INV,PORT,BOOK,VID,BILL_FUNCS,OPS_FUNCS service
    class DB database
```

---

## Supabase Edge Functions

### Shared Edge Functions (sailorskills-shared)

These edge functions are used across multiple services.

| Function | URL | Purpose | Used By | Method |
|----------|-----|---------|---------|--------|
| `stripe-webhook` | `/functions/v1/stripe-webhook` | Handle Stripe webhooks (payment_intent.succeeded, setup_intent.succeeded) | Billing, Estimator | POST |
| `create-payment-intent` | `/functions/v1/create-payment-intent` | Create Stripe PaymentIntent for one-time payments | Estimator, Billing | POST |
| `charge-for-service` | `/functions/v1/charge-for-service` | Charge saved payment method for service completion | Billing, Estimator | POST |
| `get-stripe-config` | `/functions/v1/get-stripe-config` | Return Stripe publishable key | Estimator, Billing | GET |
| `send-receipt` | `/functions/v1/send-receipt` | Send payment receipt email via Resend | Billing, Dashboard | POST |

### Billing Edge Functions (sailorskills-billing)

Service-specific functions for Billing/Completion service.

| Function | Path | Purpose | Triggers |
|----------|------|---------|----------|
| `customer-details` | `/functions/v1/customer-details` | Fetch customer and boat details | UI: Customer profile page |
| `boats` | `/functions/v1/boats` | Fetch boat list | UI: Boat selector |
| `boat-anodes` | `/functions/v1/boat-anodes` | Get anode configurations for boat | UI: Anode tracking |
| `customer-services` | `/functions/v1/customer-services` | Get customer service subscriptions | UI: Service management |
| `service-logs` | `/functions/v1/service-logs` | Fetch/create service logs | UI: Service documentation |
| `save-service-log` | `/functions/v1/save-service-log` | Save service log with conditions | UI: Save button |
| `save-conditions` | `/functions/v1/save-conditions` | Save boat conditions (legacy) | UI: Condition form |
| `invoices` | `/functions/v1/invoices` | Fetch/create invoices | UI: Invoice management |
| `charge-customer` | `/functions/v1/charge-customer` | Process payment for service | UI: Charge button |
| `stripe-customers` | `/functions/v1/stripe-customers` | Manage Stripe customer records | UI: Customer sync |
| `search-customers-with-boats` | `/functions/v1/search-customers-with-boats` | Search customers and boats | UI: Search bar |
| `send-email` | `/functions/v1/send-email` | Send custom email via Resend | UI: Email button |
| `send-receipt` | `/functions/v1/send-receipt` | Send payment receipt email | UI: After payment |
| `anode-inventory-status` | `/functions/v1/anode-inventory-status` | Check anode stock levels | UI: Inventory widget |
| `finalize-service-inventory` | `/functions/v1/finalize-service-inventory` | Update inventory after service | UI: Service completion |

### Operations Edge Functions (sailorskills-operations)

| Function | Path | Purpose | Triggers |
|----------|------|---------|----------|
| `get-playlist-videos` | `/functions/v1/get-playlist-videos` | Fetch YouTube playlist videos | UI: Video widget |
| `send-notification` | `/functions/v1/send-notification` | Send notification via Resend | UI: Notification trigger |

### Dashboard Edge Functions (sailorskills-dashboard)

| Function | Path | Purpose | Triggers |
|----------|------|---------|----------|
| `send-receipt` | `/functions/v1/send-receipt` | Send payment receipt (duplicate of shared) | UI: Receipt resend |

---

## Webhook Endpoints

### Stripe Webhooks → Supabase

```mermaid
sequenceDiagram
    participant Stripe
    participant EdgeFunc as Supabase Edge Function<br/>stripe-webhook
    participant DB as Supabase Database
    participant Service as Billing/Estimator

    Stripe->>EdgeFunc: POST /functions/v1/stripe-webhook
    Note right of Stripe: Headers:<br/>stripe-signature
    EdgeFunc->>EdgeFunc: Verify webhook signature
    EdgeFunc->>EdgeFunc: Parse event type

    alt payment_intent.succeeded
        EdgeFunc->>DB: UPDATE invoices SET status='paid'
        EdgeFunc->>DB: INSERT INTO payments
        EdgeFunc->>Service: Trigger receipt email
    else setup_intent.succeeded
        EdgeFunc->>DB: UPDATE customers SET default_payment_method
        EdgeFunc->>Service: Enable recurring billing
    end

    EdgeFunc-->>Stripe: 200 OK
```

**Webhook Configuration:**

| Webhook | URL | Events | Signing Secret |
|---------|-----|--------|----------------|
| Stripe → Supabase | `https://fzygakldvvzxmahkdylq.supabase.co/functions/v1/stripe-webhook` | `payment_intent.succeeded`<br/>`setup_intent.succeeded` | `STRIPE_WEBHOOK_SECRET` (Supabase secret) |

**Event Handlers:**

1. **`payment_intent.succeeded`** - One-time payment completed
   - Updates `invoices.status` = 'paid'
   - Creates `payments` record
   - Triggers receipt email via Resend

2. **`setup_intent.succeeded`** - Payment method saved for recurring billing
   - Attaches payment method to Stripe customer
   - Sets payment method as default
   - Enables recurring service billing

### Internal Webhooks (Service → Service)

```mermaid
sequenceDiagram
    participant Billing as Billing Service
    participant Webhook as Operations Webhook<br/>/api/webhooks/invoice-created
    participant Operations as Operations Service

    Billing->>Webhook: POST /api/webhooks/invoice-created
    Note right of Billing: Body:<br/>{invoice_id, customer_id, boat_id}
    Webhook->>Webhook: Verify webhook signature
    Webhook->>Operations: Trigger UI refresh
    Webhook-->>Billing: 200 OK
```

**Internal Webhook:**

| Source | Destination | URL | Purpose | Status |
|--------|-------------|-----|---------|--------|
| Billing | Operations | `/api/webhooks/invoice-created` | Notify Operations when invoice created | ⚠️ TODO: Implement signature verification |

---

## External API Calls

### Stripe API (Payment Processing)

**Used By:** Estimator, Billing

```mermaid
flowchart LR
    SERVICE[Service Frontend] -->|1. Create PaymentIntent| EDGE[Edge Function]
    EDGE -->|2. stripe.paymentIntents.create| STRIPE[Stripe API]
    STRIPE -->|3. Return client_secret| EDGE
    EDGE -->|4. Return client_secret| SERVICE
    SERVICE -->|5. stripe.confirmCardPayment| STRIPE
    STRIPE -->|6. Webhook: payment_intent.succeeded| WEBHOOK[stripe-webhook Edge Function]
    WEBHOOK -->|7. Update database| DB[(Database)]
```

**Key Operations:**

| Operation | Edge Function | Stripe API Method | Purpose |
|-----------|---------------|-------------------|---------|
| Create PaymentIntent | `create-payment-intent` | `stripe.paymentIntents.create()` | One-time payment |
| Create SetupIntent | `charge-for-service` | `stripe.setupIntents.create()` | Save payment method |
| Charge Saved Method | `charge-customer` | `stripe.paymentIntents.create({payment_method, confirm: true})` | Recurring billing |
| Get Customer | `stripe-customers` | `stripe.customers.retrieve()` | Fetch customer details |
| List Payment Methods | `stripe-customers` | `stripe.paymentMethods.list()` | Show saved cards |

**Rate Limits:**
- Test mode: 100 requests/second
- Live mode: 1,000 requests/second

### Resend API (Email Service)

**Used By:** Billing, Portal, Operations, Booking

```mermaid
flowchart LR
    SERVICE[Service] -->|send-email edge function| EDGE[Supabase Edge Function]
    EDGE -->|POST /emails| RESEND[Resend API]
    RESEND -->|Email ID| EDGE
    EDGE -->|Success| SERVICE
```

**Email Types:**

| Type | Template | Used By | Trigger |
|------|----------|---------|---------|
| Payment Receipt | `payment-receipt.html` | Billing | After `payment_intent.succeeded` |
| Invoice | `invoice.html` | Billing | Invoice created |
| Magic Link | Built-in | Portal | Customer login |
| Service Notification | `service-complete.html` | Operations | Service completed |
| Booking Confirmation | `booking-confirm.html` | Booking | Booking created |

**Rate Limits:**
- Free tier: 100 emails/day
- Pro tier: 50,000 emails/month

**API Endpoint:**
```
POST https://api.resend.com/emails
Authorization: Bearer re_...
```

### YouTube API (Video Management)

**Used By:** Video, Operations

```mermaid
flowchart LR
    VIDEO[Video Service] -->|Upload video| YT_API[YouTube Data API v3]
    VIDEO -->|Create playlist| YT_API
    VIDEO -->|Add video to playlist| YT_API
    YT_API -->|Playlist ID| VIDEO
    VIDEO -->|Save playlist_id| DB[(Database)]
    OPS[Operations] -->|Read playlist_id| DB
    OPS -->|get-playlist-videos| EDGE[Edge Function]
    EDGE -->|Fetch videos| YT_API
    YT_API -->|Video metadata| EDGE
    EDGE -->|Video list| OPS
```

**Key Operations:**

| Operation | API Endpoint | Purpose | Quota Cost |
|-----------|--------------|---------|------------|
| Upload video | `videos.insert` | Upload service video | 1600 units |
| Create playlist | `playlists.insert` | Create boat playlist | 50 units |
| Add to playlist | `playlistItems.insert` | Link video to playlist | 50 units |
| List playlist videos | `playlistItems.list` | Display videos in Operations | 1 unit |

**Quota:** 10,000 units/day (sufficient for current volume)

### Google Calendar API (Booking)

**Used By:** Booking

```mermaid
flowchart LR
    BOOKING[Booking Service] -->|Create event| GCAL[Google Calendar API]
    GCAL -->|Event ID| BOOKING
    BOOKING -->|Save event_id| DB[(Database)]
    BOOKING -->|Update event| GCAL
    BOOKING -->|Delete event| GCAL
```

**Key Operations:**

| Operation | API Endpoint | Purpose | Rate Limit |
|-----------|--------------|---------|------------|
| Create event | `events.insert` | Create training booking | 1,000/day/user |
| Update event | `events.update` | Reschedule booking | 1,000/day/user |
| Delete event | `events.delete` | Cancel booking | 1,000/day/user |
| List events | `events.list` | Sync calendar | 1,000/day/user |

### Gemini AI API (Inventory Intelligence)

**Used By:** Inventory

**Status:** 🟡 Planned (not yet implemented)

```mermaid
flowchart LR
    INV[Inventory Service] -->|Send usage patterns| GEMINI[Gemini AI API]
    GEMINI -->|Reorder recommendations| INV
    INV -->|Update reorder_point| DB[(Database)]
```

**Planned Use Cases:**
- Optimize reorder points based on usage patterns
- Predict seasonal demand
- Suggest bulk purchase opportunities

### boatzincs.com (Anode Catalog Scraping)

**Used By:** Inventory

```mermaid
flowchart LR
    INV[Inventory Service] -->|Web scraper| BOATZINCS[boatzincs.com]
    BOATZINCS -->|HTML pages| INV
    INV -->|Parse products| INV
    INV -->|Update anodes_catalog| DB[(Database)]
    INV -->|Log sync| DB
```

**Scraper Details:**
- **Frequency:** Daily (or on-demand)
- **Method:** HTTP GET (respectful 1 req/sec rate limit)
- **Parsing:** Cheerio/Puppeteer for product extraction
- **Tables Updated:** `anodes_catalog`, `anode_price_history`, `anode_sync_logs`

---

## Request/Response Flows

### Payment Flow (Estimator → Stripe → Billing)

```mermaid
sequenceDiagram
    participant Customer
    participant Estimator as Estimator Frontend
    participant Edge as create-payment-intent<br/>Edge Function
    participant Stripe
    participant Webhook as stripe-webhook<br/>Edge Function
    participant DB as Database
    participant Billing

    Customer->>Estimator: Submit order
    Estimator->>Edge: POST {amount, customer_id}
    Edge->>Stripe: stripe.paymentIntents.create()
    Stripe-->>Edge: {id, client_secret}
    Edge-->>Estimator: {client_secret}

    Estimator->>Stripe: stripe.confirmCardPayment(client_secret)
    Stripe-->>Estimator: Payment confirmed

    Stripe->>Webhook: Webhook: payment_intent.succeeded
    Webhook->>DB: INSERT INTO payments
    Webhook->>DB: UPDATE invoices SET status='paid'
    Webhook->>Billing: Trigger receipt email

    Webhook-->>Stripe: 200 OK
```

### Service Completion Flow (Operations → Billing → Customer)

```mermaid
sequenceDiagram
    participant Tech as Technician
    participant Operations
    participant SaveLog as save-service-log<br/>Edge Function
    participant DB as Database
    participant Billing
    participant Charge as charge-customer<br/>Edge Function
    participant Stripe
    participant Receipt as send-receipt<br/>Edge Function
    participant Resend
    participant Customer

    Tech->>Operations: Complete service form
    Operations->>SaveLog: POST {boat_id, conditions, photos}
    SaveLog->>DB: INSERT INTO service_logs
    SaveLog->>DB: UPDATE boat_anodes (conditions)
    SaveLog->>DB: UPDATE paint_repaint_schedule
    SaveLog-->>Operations: {service_log_id}

    Operations->>Billing: Navigate to billing
    Billing->>Charge: POST {service_log_id, amount}
    Charge->>Stripe: stripe.paymentIntents.create()
    Stripe-->>Charge: Payment successful
    Charge->>DB: INSERT INTO invoices
    Charge->>DB: UPDATE service_logs SET invoice_id
    Charge->>DB: INSERT INTO payments

    Charge->>Receipt: Trigger receipt
    Receipt->>Resend: POST /emails {to, template}
    Resend->>Customer: Email: Payment receipt

    Charge-->>Billing: Success
```

---

## Security & Authentication

### Edge Function Authentication

**Supabase Auth:**
- All edge functions use Supabase Auth headers
- `Authorization: Bearer <supabase_anon_key>` for client calls
- `Authorization: Bearer <user_jwt_token>` for authenticated calls
- RLS policies enforce row-level security

**API Keys:**
```env
# Supabase (client-side)
VITE_SUPABASE_URL=https://fzygakldvvzxmahkdylq.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ... (public, safe to expose)

# Stripe (server-side only, stored in Supabase secrets)
STRIPE_SECRET_KEY=sk_test_... / sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (server-side only)
RESEND_API_KEY=re_...

# YouTube (server-side only)
YOUTUBE_API_KEY=AIza...

# Google Calendar (server-side only)
GOOGLE_CALENDAR_CREDENTIALS={...}
```

### Webhook Security

**Stripe Webhook Verification:**
```javascript
// Verify signature before processing
const sig = request.headers.get('stripe-signature');
const event = stripe.webhooks.constructEvent(
  requestBody,
  sig,
  process.env.STRIPE_WEBHOOK_SECRET
);
```

**Internal Webhook Security:**
```javascript
// TODO: Implement signature verification for internal webhooks
const secret = request.headers.get('x-webhook-secret');
// Verify secret matches expected value
```

### Rate Limiting

**Edge Functions:**
- Supabase: 500 requests/second per project
- Custom rate limiting: Not implemented (relies on Supabase defaults)

**External APIs:**
- **Stripe:** 100-1,000 req/sec (no concerns at current volume)
- **Resend:** 100 emails/day free tier (may need upgrade)
- **YouTube:** 10,000 quota units/day (sufficient)
- **Google Calendar:** 1,000 req/day/user (sufficient)

---

## Monitoring & Logging

### Edge Function Logs

**Access Logs:**
```bash
# View Supabase edge function logs
supabase functions logs stripe-webhook --project-ref fzygakldvvzxmahkdylq

# Real-time logs
supabase functions logs --follow
```

**Log Locations:**
- Supabase Dashboard → Edge Functions → Logs
- Vercel → Deployments → Function Logs (for service API routes)

### Webhook Monitoring

**Stripe Webhook Logs:**
- Stripe Dashboard → Developers → Webhooks → Event logs
- Shows delivery status, response codes, retry attempts

**Recommended Monitoring:**
- ✅ Stripe webhooks: Monitor in Stripe Dashboard
- ⚠️ Internal webhooks: Add logging/monitoring (TODO)
- ⚠️ External API calls: Add error tracking (TODO)

---

## Related Documentation

- [INTEGRATIONS.md](../../INTEGRATIONS.md) - Detailed API credentials and setup
- [service-relationship-diagram.md](./service-relationship-diagram.md) - Service data flow
- [database-schema-erd.md](./database-schema-erd.md) - Database schema

---

**Document Version:** 1.0
**Created:** 2025-10-28
**Last Updated:** 2025-10-28
**Next Review:** After adding new edge functions or webhooks
