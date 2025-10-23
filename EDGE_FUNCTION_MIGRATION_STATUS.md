# Edge Function Migration Status

## Completed Migrations ✅

1. **boats** - Boat CRUD operations
2. **customer-details** - Fetch customer, boats, and addresses
3. **boat-anodes** - Anode assignments and conditions
4. **customer-services** - Active recurring services
5. **service-logs** - Service condition logs
6. **save-conditions** - Comprehensive service conditions
7. **save-service-log** - Simple service charge logging
8. **charge-customer** - Stripe payment processing
9. **stripe-customers** - Stripe customer search

## Remaining to Create (4 functions)

### 1. finalize-service-inventory
- **Purpose**: Process inventory actions when service is finalized
- **Dependencies**: Database RPC calls (consume_inventory, reserve_anode_for_retrieval, add_to_replenishment)
- **Methods**: POST

### 2. invoices
- **Purpose**: Create, fetch, and update invoices for customers without payment methods
- **Dependencies**: Supabase database
- **Methods**: GET, POST, PATCH

### 3. search-customers-with-boats
- **Purpose**: Search Stripe customers and expand with boat data from database
- **Dependencies**: Stripe API + Supabase database
- **Methods**: GET

### 4. send-email
- **Purpose**: Send invoice or receipt emails using Resend
- **Dependencies**: Resend API + Supabase database
- **Methods**: POST

## Environment Variables Required

All edge functions need these environment variables set in Supabase:

```bash
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
STRIPE_SECRET_KEY
RESEND_API_KEY
EMAIL_FROM_ADDRESS
```

## Deployment Commands

```bash
# Link to Supabase project (if not already linked)
supabase link --project-ref your-project-ref

# Deploy all functions at once
supabase functions deploy

# Or deploy individually
supabase functions deploy boats
supabase functions deploy customer-details
# ... etc

# Set environment variables
supabase secrets set STRIPE_SECRET_KEY=sk_...
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set EMAIL_FROM_ADDRESS="Sailor Skills <noreply@sailorskills.com>"
```

## Frontend Updates Needed

Replace all `/api/*` calls with Supabase function URLs:

**Old format:**
```javascript
fetch('/api/boats', { ... })
```

**New format:**
```javascript
const supabaseUrl = process.env.VITE_SUPABASE_URL
fetch(`${supabaseUrl}/functions/v1/boats`, {
  headers: {
    'apikey': process.env.VITE_SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${process.env.VITE_SUPABASE_ANON_KEY}`
  },
  ...
})
```

## Next Steps

1. Create remaining 4 functions
2. Deploy all functions to Supabase
3. Update frontend API calls
4. Test in production
5. Remove api/ directory from Vercel
6. Push to git
