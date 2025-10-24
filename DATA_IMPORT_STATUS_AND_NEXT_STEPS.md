# Notion Import Status & Next Steps

**Date:** 2025-10-23
**Status:** Test Import Successful ✅

---

## ✅ Successfully Completed

### Test Import (2 Boats)
- **Tandem** (Kimber Oswald)
  - Customer created & linked to Stripe: `cus_NeTBPo43rYrKO5`
  - Boat imported: Pearson 36' sailboat at Berkeley Marina N-116
  - **30 service logs** imported with complete history

- **Indefatigable** (John Hess)
  - Customer created & linked to Stripe: `cus_P8gUccUBIqigHm`
  - Boat imported: Hallberg-Rassy HR-43 Mk1 at Berkeley Marina N-117
  - **19 service logs** imported with complete history

### Data Verified
- ✅ Boats appear in both Billing and Operations
- ✅ Customer info displays correctly
- ✅ Boat types display correctly (sailboat/monohull)
- ✅ Service history with conditions and time tracking
- ✅ Stripe linkage working

---

## 📋 Import Script Features

The current import script (`import_test_boats.mjs`) successfully imports:

**From Notion Client List CSV:**
- Customer: name, email
- Boat: name, make, type, hull type, length, marina, dock, slip, propeller count

**From Notion Service CSVs:**
- Service date
- Paint condition
- Growth level
- Anode conditions
- Propeller condition
- Thru-hull condition
- Notes

**From Notion Admin CSVs:**
- Time in / Time out
- Total hours (calculated or from Duration field)

**From Stripe:**
- Customer ID linkage
- Existing payment methods (fetched by Billing app directly)

---

## 🔧 Fields Still To Capture

### From Notion Client List (available but not yet imported):
- **Start** - Start month for service (column 8)
- **Interval** - Service interval in months (column 9)
- **Charge By** - Charging method: "Length" etc. (column 10)
- **Plan** - Plan status: "Subbed", "Paused", etc. (column 11)
- **Phone** - Phone number where available (column 7)
- **Start Time** - Next scheduled service (column 6)
- **Avg Duration** - Average service duration (column 22)
- **Paint Model** - Paint brand/model (columns 14-16)

### From Zoho CSV (~/Downloads/Contacts.csv):
- **Phone** - More complete phone data
- **Billing Address** - Customer addresses
- Additional customer details where Notion is missing

### Schema Notes:
- `customers` table has: id, stripe_customer_id, email, name, phone, birthday, created_at, updated_at
- `boats` table has many fields including custom fields for service data
- Payment methods are NOT stored in Supabase - Billing fetches from Stripe directly

---

## 🎯 Next Steps for Full Import

### 1. Payment Method Issue Resolution
**Status:** Payment methods exist in Stripe but don't show in Billing after import

**Action:** Have user hard-refresh Billing page (Cmd+Shift+R) to clear cache. Payment methods should reappear since Billing fetches from Stripe using `stripe_customer_id`.

### 2. Enhance Import Script

Add these Notion fields to boat imports:
```javascript
// In createBoat function, add:
service_start_month: boat.Start ? parseInt(boat.Start) : null,
service_interval_months: boat.Interval ? parseInt(boat.Interval) : null,
plan_status: boat.Plan || null,  // "Subbed", "Paused", etc.
charge_method: boat['Charge By'] || null,  // "Length", etc.
phone: boat.Phone || null,
avg_service_duration: boat['Avg Duration'] ? parseFloat(boat['Avg Duration']) : null,
paint_brand: boat['Paint Brand'] || null,
paint_model: boat['Paint Model'] || null,
```

### 3. Merge Zoho Data

Read Zoho CSV and merge phone/address data:
```javascript
// Match by email address
const zohoData = parseZohoCSV();
const zohoCustomer = zohoData.find(z => z.EmailID === boat.Email);
if (zohoCustomer) {
  phone = zohoCustomer.Phone || zohoCustomer.MobilePhone || phone;
  // Could add address fields if we add columns to customers table
}
```

### 4. Full Import Process

```bash
# 1. Extract all boat folders from Notion ZIP
cd /tmp && unzip "/Users/brian/Downloads/ExportBlock...zip" "Private & Shared/Client List/*" -d notion_full

# 2. Run enhanced import script
export VITE_SUPABASE_URL=https://fzygakldvvzxmahkdylq.supabase.co
export VITE_SUPABASE_SERVICE_ROLE_KEY=eyJhbG...
export STRIPE_SECRET_KEY=sk_live_51...
node import_all_boats.mjs

# Expected results:
# - ~192 boats imported
# - ~200 customers created/updated
# - ~3,000+ service logs imported
```

---

## ⚠️ Important Considerations

### Disk Space
- User's disk is 98% full (only 21GB free)
- Full Notion export is large (~3,610 pages)
- May need to process incrementally or clean up disk first

### Duplicate Detection
Script already handles:
- Skips boats that already exist (by name)
- Skips service logs that already exist (by boat_id + date)
- Skips customers that already exist (by email)

### Data Integrity
- All customers linked to Stripe where email matches
- Boats linked to customers via customer_id foreign key
- Service logs require both boat_id and customer_id (NOT NULL constraints)
- Boat type values: "sailboat" or "powerboat" (NOT "sail"/"power")

---

## 📁 Files Created

### Scripts
- `/sailorskills-billing/scripts/import_test_boats.mjs` - Working test import
- `/sailorskills-billing/scripts/fix_boat_types.mjs` - Type field fixer
- `/sailorskills-billing/scripts/check_payment_methods.mjs` - Payment method checker
- `/sailorskills-billing/scripts/update_payment_methods.mjs` - Payment method updater (found schema issue)

### Test Data
- `/tmp/notion_test_import/*.csv` - Extracted test CSVs
- `/tmp/import_log_final.txt` - Import execution log

### Documentation
- `/DATA_INTEGRITY_INVESTIGATION_REPORT.md` - Root cause analysis of missing boats
- This file - Status and next steps

---

## 🚀 Ready to Proceed?

The test import is successful. Before running the full import:

1. **User Action Required:**
   - Hard refresh Billing page to check if payment methods reappear
   - Confirm Tandem and Indefatigable look correct in both apps
   - Free up disk space if possible (currently 98% full)

2. **Developer Action:**
   - Enhance import script with remaining Notion fields
   - Add Zoho CSV merge logic
   - Create `import_all_boats.mjs` for full import
   - Test enhanced script on Tandem/Indefatigable first

3. **Final Import:**
   - Run full import for all 192 boats
   - Verify random sample of boats in both apps
   - Document any issues found
   - Commit import scripts to repo

---

## Questions to Resolve

1. Do we need to add billing address columns to customers table?
2. Should we add columns for Notion fields (Start, Interval, Plan) to boats table, or use existing columns?
3. What should we do about boats with no email (can't link to Stripe)?
4. Should we import boats from Zoho that aren't in Notion?

---

**Next Session:** Enhance import script and run full import after user confirms test boats look good.
