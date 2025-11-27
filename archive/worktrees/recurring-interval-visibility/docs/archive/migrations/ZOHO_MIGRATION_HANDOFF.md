# Zoho Billing Migration - Session Handoff Document
**Date**: 2025-10-28
**Status**: Plan mode - Ready for implementation approval

---

## Session Summary

### What We Accomplished Today

1. ✅ **Fixed Portal Invoices Display**
   - Resolved 3 critical issues preventing invoices from showing:
     - Missing `customer_boat_access` records (ran migration to populate)
     - Schema mismatch in portal code (fixed column names: amount_total→amount, invoice_date→issued_at, etc.)
     - Broken RLS policy (updated to use auth.uid() via customer_boat_access)
   - Portal now displays invoices correctly
   - Created 2 test invoices to verify functionality

2. ✅ **Analyzed Zoho Export Data**
   - Received 3 CSV files from Zoho Billing
   - 1,804 invoices total (not 1,598 as initially stated - header row counted)
   - 1,552 payment records
   - 174 customers

3. ✅ **Discovered Critical Integration Point**
   - Zoho Payments CSV contains Stripe charge IDs in `Reference Number` field
   - Format: `ch_3MLG9CEbT3YrW03C1fHoQJiV`
   - This enables direct linking to existing Stripe payments in Sailor Skills database!

---

## Key Findings from Data Analysis

### Invoice Distribution
| Payment Method | Count | Percentage |
|----------------|-------|------------|
| **Stripe** | 1,274 | 79% |
| **Zoho Payments** | 220 | 14% |
| **Unpaid/Other** | ~310 | 19% |

### Zoho Export Files Located At
```
/Users/brian/Downloads/Customers.csv    (175 rows)
/Users/brian/Downloads/Invoice.csv      (1,805 rows including header)
/Users/brian/Downloads/Payments.csv     (1,553 rows including header)
```

### Critical CSV Columns Identified

**Invoice.csv**:
- Column 2: `Invoice Number` (INV-000002 format)
- Column 7: `Invoice Status` (Closed, Open, etc.)
- Column 59: `Stripe` (true/false)
- Column 68: `Zoho Payments` (true/false)
- Column 4: `Invoice Date`
- Column 5: `Due Date`
- Column 38: `Total` (invoice amount)
- Column 12: `Customer ID` (Zoho's customer ID)

**Payments.csv**:
- Column 14: `Reference Number` - **CONTAINS STRIPE CHARGE IDs!** (ch_xxx)
- Column 16: `Invoice Number` (links to invoice)
- Column 8: `Mode` (Stripe, Zoho Payments, etc.)
- Column 11: `Amount`
- Column 5: `Date`

**Customers.csv**:
- Customer email (primary matching key to Sailor Skills customers)
- Zoho Customer ID (for mapping)

---

## Current Database State

### Sailor Skills Database
- **1,456 service_logs** - all uninvoiced (service_logs.invoice_id = NULL)
- **17 service_logs** with Stripe payments (order_id contains pi_xxx payment intents)
- **0 real invoices** (only 2 test invoices created today)
- **Customers table** - already populated with customers
- **Payments table** - likely already has Stripe payment records

### Schema Confirmed
```sql
-- invoices table uses these columns:
invoice_number, customer_id, boat_id, service_id, amount,
status, issued_at, due_at, paid_at, payment_method,
payment_reference, customer_details, service_details

-- service_logs has:
id, customer_id, boat_id, order_id (Stripe payment_intent),
invoice_id (currently NULL), anodes_installed (JSONB with pricing)
```

---

## Migration Strategy (Approved by User)

### User Decisions Confirmed

1. **Invoice Numbering**: Prefix with "ZB-" (e.g., ZB-INV-001407)
   - Distinguishes historical from future invoices
   - Future Sailor Skills invoices start fresh at INV-000001

2. **Service Logs**: The 1,456 uninvoiced service logs correspond to Zoho invoices
   - Need to link them during migration
   - Match by Stripe payment_intent OR customer+date+amount

3. **Timeline**: Next month (relaxed pace, thorough testing)

4. **Missing Customers**: Auto-create during migration
   - User confirmed "shouldn't be many if any"

5. **Zoho Payments**: Import all 220 Zoho Payments records as well
   - Create payment records with payment_method='zoho'

### Three-Phase Migration Approach

#### Phase 1: Customer Mapping (NOT Creation)
- Match Zoho customers to Sailor Skills customers by email
- Generate mapping file: `zoho_customer_id → sailor_skills_customer_id`
- Flag unmatched for manual review (expected to be minimal)

#### Phase 2: Invoice Import with Smart Stripe Linking

**For Stripe-Paid Invoices (1,274 - the majority):**
1. Extract Stripe charge ID from Payments.csv `Reference Number`
2. Check if payment exists in Sailor Skills `payments` table
3. If exists: Link invoice to existing payment (no duplication!)
4. If missing: Create payment record with Stripe data
5. Try to match to service_log via `order_id` (payment_intent)

**For Zoho Payments Invoices (220):**
1. Create invoice record
2. Create payment record with `payment_method='zoho'`
3. No Stripe linkage
4. Try to match service_log by customer + date

**For Unpaid Invoices (~310):**
1. Create invoice with `status='pending'`
2. No payment record
3. Try to match service_log by customer + date

#### Phase 3: Service Log Linkage (Three-Tier Strategy)

**High Confidence** - Match via Stripe payment_intent:
```
service_logs.order_id (pi_xxx) → Stripe payment → invoice
```

**Medium Confidence** - Match by heuristics:
```
Same customer + service_date within ±7 days + amounts match
```

**Manual Review** - Export unlinked for user review:
```
Generate CSV of unmatched service_logs for manual linking
```

---

## Migration Scripts Structure

```
scripts/zoho-migration/
├── 1-analyze-data.mjs          # Parse CSVs, generate statistics report
├── 2-map-customers.mjs         # Email matching → customer-mapping.json
├── 3-import-invoices.mjs       # Import invoices with smart Stripe linking
├── 4-import-payments.mjs       # Create Zoho Payments records only
├── 5-link-service-logs.mjs     # Three-tier matching to link service logs
├── 6-validate.mjs              # Run validation SQL queries
├── rollback.mjs                # Emergency rollback script
└── README.md                   # Full documentation

Generated Files:
├── customer-mapping.json       # Zoho ID → Sailor Skills ID map
├── unmatched-customers.csv     # Manual review needed
├── migration-report.json       # Statistics and results
└── unlinked-service-logs.csv   # Manual linking needed
```

---

## Key Technical Discoveries

### 1. Stripe Charge IDs Are Available! (HUGE WIN)
The Payments.csv `Reference Number` field contains Stripe charge IDs:
```csv
Reference Number
ch_3MLG9CEbT3YrW03C1fHoQJiV
ch_3MLWs5EbT3YrW03C0b4hYvwe
```

This means we can:
- Link 1,274 invoices to **existing** Stripe payments in Sailor Skills
- Avoid duplicating payment records
- Achieve proper service_log → payment → invoice linkage

### 2. Service Logs Have Stripe Payment Intents
The `service_logs.order_id` field contains Stripe payment_intent IDs (pi_xxx format).
This enables high-confidence matching:
```
service_log.order_id (pi_xxx)
  → Sailor Skills payments table (search by stripe_payment_intent)
  → invoice (link via payment.invoice_id)
```

### 3. No "transactions" Page Exists
User was asking about "transactions and invoices" in the navbar.
- There is NO transactions link in portal navigation
- Only "Invoices" link exists
- User was referring to the invoices page all along

---

## Data Flow After Migration

```
Zoho Invoice (ZB-INV-XXXXXX)
  ↓
[Migration Script]
  ↓
Sailor Skills invoices table
  ↓
  ├─→ Link to existing Stripe payment (if Stripe invoice)
  ├─→ Create new Zoho payment record (if Zoho Payments)
  └─→ No payment (if unpaid)
  ↓
Link to service_log (via payment_intent or heuristics)
  ↓
Customer views in Portal
```

---

## Effort Estimate

| Phase | Hours | Timeline |
|-------|-------|----------|
| Script Development | 12-16 | Week 1 |
| Data Analysis & Mapping | 2-3 | Week 1 |
| Dev Testing | 4-6 | Week 1 |
| Production Import | 4-6 | Week 2-3 |
| Validation | 2-3 | Week 2-3 |
| Cutover & Training | 4-6 | Week 4 |
| **TOTAL** | **28-39 hours** | **1 month** |

---

## Success Criteria

### Data Completeness
- [ ] All 1,804 invoices imported with ZB- prefix
- [ ] Revenue totals match Zoho (within ±$10 for rounding)
- [ ] 1,274 Stripe invoices linked to existing payment records
- [ ] 220 Zoho Payments created as new records
- [ ] ≥90% of 1,456 service logs successfully linked to invoices

### System Validation
- [ ] Customers can view historical invoices in Portal
- [ ] Invoice amounts, dates, status display correctly
- [ ] Payment history shows correctly (Stripe vs Zoho vs Unpaid)
- [ ] Service logs show linked invoice_id
- [ ] New invoices can be created in Sailor Skills Billing
- [ ] Stripe payments continue working for new invoices

### Business Validation
- [ ] Team trained on Sailor Skills billing workflow
- [ ] Final Zoho invoices processed
- [ ] Cutover complete (using only Sailor Skills)
- [ ] Zoho subscription downgraded/cancelled
- [ ] Historical Zoho data archived for reference

---

## What's NOT Migrating

### Intentionally Excluded
- **Zoho Subscriptions** - Not relevant to new billing model
- **Zoho Invoice PDFs** - Could optionally upload to Supabase Storage later
- **Zoho Customer Notes** - Not in export, may need manual transfer if critical
- **Invoice Line Items** - Zoho doesn't break down line items well; use service_details JSONB instead

### Why It's OK
- Invoices contain total amounts (sufficient for accounting)
- Service logs have detailed breakdowns (anodes_installed JSONB)
- Historical data preserved in Zoho for 1 year as reference
- PDFs can be generated from Sailor Skills going forward

---

## Remaining Questions / Decisions

### Not Yet Addressed
1. **Anode labor pricing/margins** - User mentioned this needs to be in settings
   - Where should this be stored? (pricing_settings table?)
   - How is it calculated currently?
   - Deferred to separate task

2. **Tax handling** - Do invoices need sales tax?
   - Not discussed yet
   - May need to add to invoice schema

3. **Invoice PDF generation** - Should Sailor Skills generate PDFs?
   - Not in scope for migration
   - Can be added later

4. **Email notifications** - Auto-send invoices to customers?
   - Not discussed for migration
   - Resend integration exists, can be enabled later

---

## Files Modified Today

### Portal Code Fixed (Committed & Deployed)
```
sailorskills-portal/src/api/invoices.js
  - Fixed column names (amount_total → amount, etc.)
  - Removed line_items query (references wrong table)
  - Updated status mappings (sent → pending)

sailorskills-portal/src/views/invoices.js
  - Updated to use correct schema fields
  - Display service_details instead of line_items

sailorskills-portal/portal-invoices.html
  - Fixed status filter options
```

### Database Migrations Run
```sql
-- Populated customer_accounts (1 record)
-- Populated customer_boat_access (1 record)
-- Updated invoices RLS policy to use auth.uid()
-- Created 2 test invoices (to be deleted after migration)
```

---

## Next Session Action Items

### Immediate Next Steps
1. **Get user approval** on migration plan
2. **Build migration scripts** (28-39 hours)
3. **Test on dev database** with actual CSV files
4. **Generate customer mapping report** for user review
5. **Execute production migration** after validation

### Before Starting Implementation
- [ ] Confirm access to production database for backup
- [ ] Verify Zoho CSV files are latest export
- [ ] Decide on anode labor pricing implementation (separate task?)
- [ ] Set up monitoring for migration progress

---

## Important Context for Next Session

### Portal Is Now Working
- The invoices page displays correctly at https://sailorskills-portal.vercel.app/portal-invoices.html
- Test user (standardhuman@gmail.com) can log in and see 2 test invoices
- Schema is now aligned, RLS policies fixed
- Ready to receive migrated data

### Migration is "Clean Break" (Not Ongoing Sync)
- User confirmed we're **migrating away** from Zoho, not integrating
- One-time data import, then Zoho subscription cancelled
- No ongoing sync or dual entry needed
- Simpler than initially proposed integration approach

### Stripe Integration is Already Done
- Payments already flowing through Stripe
- service_logs already capture order_id (payment intents)
- Just need to link historical Zoho invoices to this existing infrastructure

---

## Commands to Resume

### View Zoho Export Data
```bash
cd /Users/brian/Downloads
head -20 Customers.csv
head -20 Invoice.csv
head -20 Payments.csv
```

### Check Current Database State
```bash
DATABASE_URL="postgresql://postgres.fzygakldvvzxmahkdylq:hy9hiH%3FhB-6VaQP@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM invoices"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM service_logs WHERE invoice_id IS NULL"
```

### Test Portal
```bash
python3 /tmp/test_portal_with_invoices.py
```

---

## Key Decisions Made

| Decision Point | Choice | Rationale |
|----------------|--------|-----------|
| Migration vs Sync | **Migration** | Already built replacement system, cleaner architecture |
| Invoice Numbering | **ZB-INV-XXXXXX** | Distinguish historical from new |
| Customer Handling | **Auto-create missing** | Minimal manual work, shouldn't be many |
| Stripe Payments | **Link to existing** | Avoid duplication, better data integrity |
| Zoho Payments | **Create new records** | No Stripe equivalent, must import |
| Service Log Linking | **Three-tier strategy** | High confidence → Medium → Manual review |
| Timeline | **Next month** | Relaxed pace, thorough testing |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Customer email mismatches | Low | Medium | Generate report for manual review |
| Stripe payment matching fails | Low | Medium | Fallback to Stripe API query by charge ID |
| Service log linkage < 90% | Medium | Low | Manual review CSV for edge cases |
| Data import errors | Low | High | Rollback script + dev testing first |
| Team adoption issues | Low | Medium | Training + keep Zoho read-only 30 days |

---

## End of Session Handoff

**Status**: ✅ Research complete, plan developed, ready for approval

**Blocked on**: User approval to begin implementation

**Next session should**:
1. Get explicit approval on the migration plan
2. Begin script development (Week 1)
3. Process customer mapping first
4. Test on dev database before production

**Files to reference**:
- This document: `/Users/brian/app-development/sailorskills-repos/ZOHO_MIGRATION_HANDOFF.md`
- Zoho exports: `/Users/brian/Downloads/*.csv`
- Portal test: `/tmp/test_portal_with_invoices.py`

---

**Session completed**: 2025-10-28
**Plan mode active**: Do not execute without user approval

---

## UPDATE: 2025-10-28 End of Session - READY FOR PRODUCTION MIGRATION

### ✅ Implementation Complete

**All migration scripts implemented and tested:**
1. ✅ Data analysis script
2. ✅ Customer mapping script  
3. ✅ Invoice import script
4. ✅ Zoho Payments import script
5. ✅ Service log linkage script
6. ✅ Validation script
7. ✅ Rollback script
8. ✅ Execution guide (EXECUTION.md)

### ✅ Pre-Flight Improvements Complete

**Customer mapping improved from 87.9% → 98.9%:**
- Fixed 5 email mismatch mappings (95 invoices)
- Created 14 missing customers in database (122 invoices)
- Final coverage: 172/174 customers mapped
- Invoice coverage: 1,632/1,633 (99.94%)

**Critical bug fixed:**
- Supabase pagination limit (1000 rows) - now handles all 1,456 service logs

### 📊 Final Migration Readiness

| Metric | Value | Status |
|--------|-------|--------|
| Customer Match Rate | 98.9% (172/174) | ✅ Excellent |
| Invoice Coverage | 99.94% (1,632/1,633) | ✅ Excellent |
| Scripts Tested | All in dry-run | ✅ Complete |
| Rollback Available | Yes | ✅ Ready |
| Code Committed | All on main | ✅ Pushed |

### 🚀 Next Session: Execute Production Migration

**See:** `scripts/zoho-migration/SESSION_HANDOFF.md` for complete execution instructions.

**Quick start:**
```bash
cd scripts/zoho-migration

# 1. Confirm database backup (Supabase Dashboard or PITR)
# 2. Edit .env: Set DRY_RUN=false
# 3. Execute phases:

DRY_RUN=false npm run import-invoices    # 1,632 invoices
DRY_RUN=false npm run import-payments     # ~283 payments
DRY_RUN=false npm run link-service-logs   # 1,456 service logs
npm run validate                          # Verify all
```

**Estimated time:** 1-2 hours
**Rollback available:** `npm run rollback`

**All documentation, scripts, and handoff materials committed to main branch.**
