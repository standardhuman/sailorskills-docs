# URGENT: Payment Methods Not Displaying - Quick Fix

**Date:** 2025-10-23
**Severity:** High - Affects ALL customers in Billing app
**Status:** Root cause identified, fix ready to deploy

---

## Issue

Payment methods are not displaying for ANY customer in the Billing app search results, even though they exist in Stripe.

---

## Root Cause

**File:** `/supabase/functions/search-customers-with-boats/index.ts`
**Line:** 87

The search function fetches payment methods from Stripe (line 76-86) but **doesn't return them** in the response.

### Current Code (BROKEN):
```typescript
const pmResponse = await fetch(
  `https://api.stripe.com/v1/payment_methods?customer=${customer.id}&type=card&limit=1`,
  {
    method: "GET",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Stripe-Version": "2024-06-20",
    },
  }
);
const pmData = pmResponse.ok ? await pmResponse.json() : { data: [] };
customer._hasPaymentMethods = pmData.data && pmData.data.length > 0;  // ❌ Only sets flag
return customer;  // ❌ Doesn't include payment methods
```

### What the UI Expects:
The UI code in `src/admin/inline-scripts/universal-search.js` (lines 360-403) expects:
```javascript
customer.payment_methods  // Array of payment method objects
customer.payment_methods[0].card.brand  // "visa", "mastercard", etc.
customer.payment_methods[0].card.last4  // "8690", etc.
customer.payment_methods[0].id  // "pm_xxxxx"
```

---

## The Fix

**Add this line after line 87:**
```typescript
customer.payment_methods = pmData.data;  // ✅ Add this line
customer._hasPaymentMethods = pmData.data && pmData.data.length > 0;
return customer;
```

---

## How to Deploy

1. Edit the file:
   ```bash
   cd /Users/brian/app-development/sailorskills-repos/sailorskills-billing
   code supabase/functions/search-customers-with-boats/index.ts
   ```

2. Add line 87a:
   ```typescript
   const pmData = pmResponse.ok ? await pmResponse.json() : { data: [] };
   customer.payment_methods = pmData.data;  // ADD THIS LINE
   customer._hasPaymentMethods = pmData.data && pmData.data.length > 0;
   ```

3. Deploy the edge function:
   ```bash
   supabase functions deploy search-customers-with-boats
   ```

4. Test immediately:
   - Go to https://sailorskills-billing.vercel.app
   - Search for any customer (e.g., "Maris", "Beth Hockey")
   - Payment methods should now display with card type and last 4 digits

---

## Expected Result After Fix

Search results will show:
```
✓ Card on file: Visa ••8690
```

Charge dropdown will show:
```
💳 Visa •••• 8690 (exp 09/24)
```

---

## Why This Happened

This appears to be an incomplete implementation. The edge function was updated to fetch payment methods but the response wasn't updated to include them. The `_hasPaymentMethods` flag suggests someone intended to add the payment methods but only added the boolean flag.

---

## Verification

After deploying, verify with these test customers:
- Kimber Oswald (kimber.oswald@gmail.com) - Visa ****8690 (exp 9/2024) ⚠️ EXPIRED
- John Hess (jhess1024@gmail.com) - Visa ****6740 (exp 7/2027)
- Any existing customer that worked before (e.g., Brian, Beth Hockey)

---

## Related Files

- `/supabase/functions/search-customers-with-boats/index.ts` - The bug (line 87)
- `/src/admin/inline-scripts/universal-search.js` - Where payment methods are displayed (lines 360-403)
- `/src/admin/inline-scripts/wizard-payment.js` - Payment method selection logic

---

**PRIORITY:** Fix this before running full Notion import, as it affects ALL customers.

**TIME TO FIX:** 2 minutes to edit + 30 seconds to deploy = **~3 minutes total**
