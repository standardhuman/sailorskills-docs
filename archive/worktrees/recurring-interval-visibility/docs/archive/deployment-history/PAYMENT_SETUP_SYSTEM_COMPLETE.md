# Payment Setup System - Implementation Complete

**Created:** 2025-11-08
**Status:** ✅ Built and ready for testing
**Purpose:** Enable customers to add payment methods for Zoho → Stripe migration

---

## 🎯 System Overview

This system allows customers to self-serve adding their payment methods to Stripe, enabling the migration from Zoho Payments. The complete flow is:

1. Customer receives email with link to payment setup page
2. Customer logs into Portal (or creates account)
3. Customer navigates to payment setup page
4. Customer enters card details via Stripe Elements
5. System creates Stripe customer (if needed) and saves payment method
6. Customer is redirected to account settings

---

## 📁 Files Created

### Backend (Edge Function)

**File:** `/sailorskills-portal/shared/supabase/functions/setup-payment-method/index.ts`

**Purpose:** Creates Stripe customer and SetupIntent for saving payment methods

**How it works:**
1. Receives customer ID from authenticated request
2. Gets customer data from Supabase
3. Creates or retrieves Stripe customer
4. Creates SetupIntent (saves card without charging)
5. Updates customer record with `stripe_customer_id`
6. Returns client secret for frontend

**API Endpoint:** `https://[YOUR-PROJECT].supabase.co/functions/v1/setup-payment-method`

**Request:**
```json
{
  "customerId": "uuid-of-customer"
}
```

**Response:**
```json
{
  "clientSecret": "seti_...",
  "stripeCustomerId": "cus_..."
}
```

### Frontend (Payment Setup Page)

**File:** `/sailorskills-portal/portal-payment-setup.html`

**Purpose:** Customer-facing page for adding payment methods

**Features:**
- Stripe Elements integration for secure card input
- Real-time validation
- Success/error messaging
- Mobile responsive
- Matches Portal design system

**File:** `/sailorskills-portal/src/views/payment-setup.js`

**Purpose:** JavaScript logic for payment setup

**How it works:**
1. Checks authentication
2. Initializes Stripe with publishable key
3. Creates card element
4. Handles form submission
5. Calls edge function to get client secret
6. Confirms SetupIntent with Stripe
7. Shows success message

### Navigation Integration

**File:** `/sailorskills-portal/portal-account.html` (modified)

**Changes:**
- Added "Payment Methods" section
- Link to payment setup page
- Shows status of existing payment methods

**File:** `/sailorskills-portal/vite.config.js` (modified)

**Changes:**
- Added `portalPaymentSetup` to build inputs
- Ensures page is included in production build

### Email Template

**File:** `/sailorskills-settings/supabase/migrations/005_add_payment_method_request_template.sql`

**Purpose:** Database migration to add email template

**Template Key:** `payment_method_request`

**Variables:**
- `customerName`
- `customerEmail`
- `setupLink`
- `adminEmail`
- `boatName`

**Status:** Ready to apply to database

### Email Copy for Manual Sending

**File:** `/ZOHO_TO_STRIPE_MIGRATION_EMAIL.md`

**Purpose:** Ready-to-send email copy for customers

**Includes:**
- Plain text version
- HTML version
- Customization instructions
- Tracking query
- Follow-up reminder template

---

## 🔧 How to Deploy

### Step 1: Deploy Edge Function

```bash
# Navigate to Portal directory
cd sailorskills-portal

# Deploy the edge function to Supabase
supabase functions deploy setup-payment-method \
  --project-ref fzygakldvvzxmahkdylq

# Verify deployment
supabase functions list
```

### Step 2: Apply Email Template Migration

```bash
# Navigate to Settings directory
cd ../sailorskills-settings

# Apply migration to add email template
psql "$DATABASE_URL" -f supabase/migrations/005_add_payment_method_request_template.sql
```

### Step 3: Deploy Portal Frontend

```bash
# Navigate to Portal directory
cd ../sailorskills-portal

# Test locally first
npm run dev
# Visit: http://localhost:5174/portal-payment-setup.html

# Build for production
npm run build

# Deploy to Vercel
git add .
git commit -m "feat(portal): add payment method setup system"
git push origin main
```

Vercel will automatically deploy to: https://portal.sailorskills.com

### Step 4: Verify Deployment

1. **Test Edge Function:**
```bash
curl -X POST \
  https://fzygakldvvzxmahkdylq.supabase.co/functions/v1/setup-payment-method \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"customerId":"test-customer-id"}'
```

2. **Test Frontend:**
- Visit https://portal.sailorskills.com/portal-payment-setup.html
- Should redirect to login if not authenticated
- After login, should show payment form
- Submit test card: 4242 4242 4242 4242

3. **Verify Database:**
```sql
-- Check customer has stripe_customer_id
SELECT email, name, stripe_customer_id
FROM customers
WHERE email = 'test@example.com';
```

---

## 🧪 Testing Checklist

### Manual Testing

- [ ] Edge function deploys successfully
- [ ] Frontend page builds without errors
- [ ] Page requires authentication
- [ ] Stripe Elements loads correctly
- [ ] Card validation works (invalid cards show errors)
- [ ] Form submission calls edge function
- [ ] Stripe customer is created
- [ ] SetupIntent is confirmed
- [ ] Database is updated with stripe_customer_id
- [ ] Success message is displayed
- [ ] User can navigate back to account page
- [ ] Account page shows payment method status

### Test Cards (Stripe Test Mode)

**Success:**
- `4242 4242 4242 4242` - Visa
- `5555 5555 5555 4444` - Mastercard
- `3782 822463 10005` - American Express

**Failure:**
- `4000 0000 0000 0002` - Card declined
- `4000 0000 0000 9995` - Insufficient funds

**Expiry:** Any future date
**CVC:** Any 3 digits
**ZIP:** Any 5 digits

### Database Verification Queries

```sql
-- Check customers with payment methods
SELECT
  email,
  name,
  stripe_customer_id,
  created_at
FROM customers
WHERE stripe_customer_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 10;

-- Count customers by payment method status
SELECT
  CASE
    WHEN stripe_customer_id IS NOT NULL THEN 'Has Payment Method'
    ELSE 'No Payment Method'
  END as status,
  COUNT(*) as count
FROM customers
GROUP BY status;
```

---

## 📧 Sending Migration Emails

Once system is tested and verified:

### Step 1: Identify Target Customers

```sql
-- Get customers who need to add payment methods
SELECT
  email,
  name,
  phone,
  stripe_customer_id
FROM customers
WHERE stripe_customer_id IS NULL
  AND email IS NOT NULL
ORDER BY name;
```

### Step 2: Send Emails

Option A: **Manual (Gmail/Email Client)**
1. Open `/ZOHO_TO_STRIPE_MIGRATION_EMAIL.md`
2. Copy plain text or HTML version
3. Customize with customer name
4. Send individually or use BCC for batches

Option B: **Automated (Future)**
1. Create script to send via Resend API
2. Use email template from database
3. Send to filtered customer list

### Step 3: Track Completion

```sql
-- See who has completed setup
SELECT
  email,
  name,
  CASE
    WHEN stripe_customer_id IS NOT NULL THEN '✅ Complete'
    ELSE '⏳ Pending'
  END as status,
  updated_at as last_updated
FROM customers
WHERE email IN (
  'customer1@example.com',
  'customer2@example.com'
)
ORDER BY stripe_customer_id IS NULL DESC;
```

### Step 4: Send Reminders

After 1 week, send reminder emails to customers who haven't completed setup.

---

## 🔐 Security Features

### Backend
- ✅ Supabase service role key for database access
- ✅ Stripe API keys stored in environment variables
- ✅ Customer ID validation before processing
- ✅ CORS headers to prevent unauthorized origins
- ✅ Rate limiting on edge function

### Frontend
- ✅ Authentication required (redirects to login)
- ✅ Stripe Elements (PCI-compliant card input)
- ✅ SSL/HTTPS encryption in production
- ✅ No card data stored on servers
- ✅ Client secret expires after use

### Database
- ✅ Row-Level Security (RLS) policies
- ✅ Only authenticated users can access
- ✅ Customers can only see their own data
- ✅ stripe_customer_id encrypted at rest

---

## 📊 Monitoring & Analytics

### Check Payment Method Adoption

```sql
-- Daily signup tracking
SELECT
  DATE(created_at) as date,
  COUNT(*) as new_signups,
  SUM(CASE WHEN stripe_customer_id IS NOT NULL THEN 1 ELSE 0 END) as with_payment
FROM customers
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

### Check Edge Function Logs

```bash
# View recent logs
supabase functions logs setup-payment-method --project-ref fzygakldvvzxmahkdylq

# Filter for errors
supabase functions logs setup-payment-method --project-ref fzygakldvvzxmahkdylq | grep ERROR
```

### Stripe Dashboard

Monitor in Stripe Dashboard:
- **Customers**: https://dashboard.stripe.com/customers
- **SetupIntents**: https://dashboard.stripe.com/setup_intents
- **Payment Methods**: https://dashboard.stripe.com/payment_methods

---

## 🐛 Troubleshooting

### Edge Function Errors

**Error:** "Customer not found"
- **Cause:** Customer doesn't exist in database
- **Fix:** Ensure customer has account in Portal

**Error:** "Failed to create Stripe customer"
- **Cause:** Invalid Stripe API key or network issue
- **Fix:** Check environment variables, verify Stripe key

**Error:** "Stripe customer ID not found in test mode"
- **Cause:** Switching between test/live mode
- **Fix:** System creates new customer automatically

### Frontend Errors

**Error:** "Stripe publishable key not found"
- **Cause:** Missing environment variable
- **Fix:** Add `VITE_STRIPE_PUBLISHABLE_KEY` to Vercel settings

**Error:** "Your card was declined"
- **Cause:** Customer entered invalid test card
- **Fix:** Use test cards listed above

**Error:** Page redirects to login
- **Cause:** User not authenticated
- **Fix:** Customer needs to log in first

### Email Issues

**Customers not receiving emails**
- Check email in spam folder
- Verify email address is correct
- Use plain text version if HTML fails

**Link not working**
- Verify Portal is deployed
- Check URL is https://portal.sailorskills.com
- Ensure payment setup page is in build

---

## 🚀 Future Enhancements

### Phase 2: Automated Email Sending
- [ ] Create script to send emails via Resend
- [ ] Batch processing for multiple customers
- [ ] Automated reminders after X days
- [ ] Track email opens and clicks

### Phase 3: Payment Method Management
- [ ] Allow customers to update payment methods
- [ ] Show last 4 digits of saved card
- [ ] Delete payment method option
- [ ] Multiple payment methods per customer

### Phase 4: Integration
- [ ] Auto-charge after service completion
- [ ] Send receipt emails automatically
- [ ] Handle failed payments gracefully
- [ ] Retry logic for declined cards

---

## 📝 Summary

### What Was Built

✅ Supabase Edge Function for payment setup
✅ Portal payment setup page with Stripe Elements
✅ Account settings integration
✅ Email template in database
✅ Email copy for manual sending
✅ Documentation and testing guides

### What's Ready

✅ System is built and ready to deploy
✅ Email templates ready to send
✅ Testing checklist prepared
✅ Monitoring queries documented

### Next Steps

1. **Test locally** - Verify everything works in development
2. **Deploy to production** - Push to Vercel and Supabase
3. **Test in production** - Use Stripe test mode first
4. **Send test emails** - Send to yourself and 1-2 friendly customers
5. **Roll out gradually** - Send to 10-50 customers in batches
6. **Monitor adoption** - Track completion rates
7. **Send reminders** - Follow up with customers who haven't completed

---

**Questions or Issues?**

Refer to this document for:
- Deployment instructions
- Testing procedures
- Troubleshooting steps
- Monitoring queries

**Created:** 2025-11-08
**Last Updated:** 2025-11-08
**Status:** ✅ Complete and ready to deploy
