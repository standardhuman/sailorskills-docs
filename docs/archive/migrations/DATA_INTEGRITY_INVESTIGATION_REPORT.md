# Data Integrity Investigation Report
## Missing Boats: Tandom & Indefatigable

**Date:** 2025-10-23
**Investigator:** Claude Code
**Issue:** Boats "Tandom" and "Indefatigable" cannot be found in Billing or Operations, despite their owners (Kimber Oswald and John Hess) appearing in search results.

---

## Executive Summary

**ROOT CAUSE IDENTIFIED:** 51 customers from the Zoho→Stripe migration were never imported into the Supabase database. While these customers exist in Stripe with payment methods, their complete profiles and boat data are missing from the application database.

**IMPACT:**
- Billing can find these customers (searches Stripe) but cannot display their boats (requires Supabase data)
- Operations cannot see these customers or boats at all (queries only Supabase)
- **The boats "Tandom" and "Indefatigable" do not exist ANYWHERE in the system**

---

## Investigation Methodology

### 1. Billing Search Analysis
Examined `/sailorskills-billing/supabase/functions/search-customers-with-boats/index.ts`:
- Searches Stripe customers by email/name
- Fetches boats from Supabase via customer→boats relationship
- Requires both Stripe customer AND Supabase customer+boat records to display boats

### 2. Operations Boat Display Analysis
Examined `/sailorskills-operations/src/views/boats/utils/boatDataFetcher.js`:
- Queries boats table directly from Supabase
- Uses denormalized `customer_name` field
- Does NOT query Stripe at all

### 3. Database Queries Executed
- Searched boats table for "Tandom" and "Indefatigable" ➜ **0 results**
- Searched customers table for "Kimber Oswald" and "John Hess" ➜ **0 results**
- Searched Stripe API for these customers ➜ **FOUND**
- Searched Stripe metadata for boat names ➜ **NOT FOUND**
- Searched invoices and service logs ➜ **NOT FOUND**

---

## Key Findings

### Data Discrepancy
- **Total Stripe customers:** 117
- **Customers in Supabase:** 137 (includes some test/duplicates)
- **Customers in Stripe but NOT Supabase:** 55
- **From Zoho migration:** 51 of the missing 55

### Specific Customer Status

#### Kimber Oswald
- ✅ **Exists in Stripe:** cus_NeTBPo43rYrKO5 (kimber.oswald@gmail.com)
- ❌ **Missing from Supabase**
- 📋 **Metadata:** `{"created_from": "Zoho"}`
- ⚠️  **No boat data in Stripe metadata**

#### John Hess
- ✅ **Exists in Stripe (2 records):**
  - cus_P8gUccUBIqigHm (jhess1024@gmail.com)
  - cus_NEuI7jUaZH7ZAQ (jhess1024@gmail.com) - duplicate
- ❌ **Missing from Supabase**
- 📋 **Metadata:** `{"created_from": "Zoho"}`
- ⚠️  **No boat data in Stripe metadata**

### Boat Data Status
The boats "Tandom" and "Indefatigable" **DO NOT EXIST** in:
- ❌ Supabase boats table
- ❌ Stripe customer metadata
- ❌ Stripe invoices
- ❌ Supabase invoices
- ❌ Supabase service logs

---

## Migration History Analysis

### Zoho → Stripe Migration
- ✅ **COMPLETED:** 51+ customers migrated to Stripe
- ✅ **Customer payment info preserved**
- ❌ **Boat data NOT included in Stripe metadata** (only 1 test account has boat data)

### Stripe → Supabase Sync
- ✅ **PARTIAL:** 62 customers imported (of 117 in Stripe)
- ❌ **51 Zoho customers never imported**
- ❌ **Their boat data never imported**

### Notion → Supabase Import
- ✅ **COMPLETED:** Customer profiles and boats imported from Notion
- ⚠️  **Unknown:** Were Kimber Oswald and John Hess boats in Notion?
- 📝 **Note:** Notion import script exists at `/sailorskills-operations/scripts/notion-import.mjs`

---

## Why This Affects Search Behavior

### Billing Search Results
When searching for "Kimber Oswald" or "John Hess":
1. ✅ Stripe API finds the customer (by email/name)
2. ✅ Returns customer with email and payment method info
3. ❌ Attempts to fetch boats from Supabase → **NONE FOUND** (customer not in Supabase)
4. ℹ️  Displays customer-only result with no boat data

**User sees:** Customer name, email, payment info but no boat

### Operations Boats View
When loading boats table:
1. ❌ Queries only Supabase boats table
2. ❌ No record exists for customers not imported from Stripe
3. ❌ Boats don't appear at all

**User sees:** Nothing (boats completely missing)

---

## Similar Affected Boats

Based on the audit, **50 other Zoho customers** are potentially affected, though most don't have boat data in Stripe metadata either. This suggests:

**Hypothesis:** The Zoho export did not include boat details, OR the Stripe import script intentionally excluded boat data, OR boats were maintained only in Notion.

---

## Root Cause Summary

```
┌─────────────┐
│    ZOHO     │  ← Original system (boats existed here?)
└──────┬──────┘
       │
       │ Migration (customers only, no boats?)
       ▼
┌─────────────┐
│   STRIPE    │  ← Payment processing (51 customers imported)
└──────┬──────┘     Metadata: {"created_from": "Zoho"} ← NO BOAT DATA
       │
       │ Sync (INCOMPLETE - 51 customers never synced)
       ▼
┌─────────────┐
│  SUPABASE   │  ← Application database (69 of 117 Stripe customers)
└─────────────┘     Missing: Kimber Oswald, John Hess, + 49 others

┌─────────────┐
│   NOTION    │  ← Operational system (boats imported separately)
└──────┬──────┘
       │
       │ Import (customers + boats)
       ▼
┌─────────────┐
│  SUPABASE   │  ← boats table populated from Notion
└─────────────┘
```

**CRITICAL GAP:** Customers who were ONLY in Zoho→Stripe (not in Notion) never made it to Supabase.

---

## Recommended Solution

### Phase 1: Import Missing Stripe Customers (Immediate)
Create migration script to:
1. Fetch all 55 missing Stripe customers
2. Create customer records in Supabase `customers` table
3. Link Stripe IDs for payment processing

**Script location:** `/sailorskills-billing/scripts/import_missing_stripe_customers.mjs`

### Phase 2: Recover Boat Data (Research Required)
Investigate where "Tandom" and "Indefatigable" boat data might exist:
1. ✅ Check Zoho export files/backups
2. ✅ Check Notion database for these boat names
3. ✅ Check email history with customers
4. ✅ Contact customers directly to verify boat details

**Once found**, manually create boat records or extend import script.

### Phase 3: Prevent Future Issues
1. Create Stripe → Supabase sync webhook to auto-import new customers
2. Add data validation tests to catch missing customer-boat links
3. Document all data sources and migration paths

---

## Immediate Action Items

### For User
1. ❓ **Do you have access to Zoho export data or backups?**
2. ❓ **Can you check Notion for "Tandom" and "Indefatigable" boat records?**
3. ❓ **Have these customers been serviced? (Check paper records, calendar history, emails)**

### For Developer
1. ✅ Create customer import script for 55 missing Stripe customers
2. ⏳ Wait for user to locate boat data before creating boat records
3. ⏳ Test in Billing and Operations after import

---

## Files Created During Investigation

1. `/sailorskills-billing/scripts/check_boats.mjs` - Initial boat search
2. `/sailorskills-billing/scripts/search_customers.mjs` - Stripe customer search
3. `/sailorskills-billing/scripts/find_orphaned_data.mjs` - Orphaned boat detection
4. `/sailorskills-billing/scripts/search_boat_names_stripe.mjs` - Boat name search in Stripe
5. `/sailorskills-billing/scripts/comprehensive_data_audit.mjs` - Full audit report
6. `/tmp/data_audit_report.txt` - Audit output

---

## Conclusion

**The boats "Tandom" and "Indefatigable" were never imported into the application database.** Their owners (Kimber Oswald and John Hess) exist in Stripe for payment processing but lack complete customer profiles and boat data in Supabase.

This is part of a larger data integrity issue affecting 51 customers from the Zoho migration. The immediate fix is to import these customers into Supabase. The boat data will need to be recovered from original sources (Zoho, Notion, or customer records).

---

**Next Step:** Review this report and let me know:
1. Do you want to import the 55 missing customers now?
2. Where should I look for the boat data for Kimber Oswald and John Hess?
