# Manual Service Log Review Guide

## Overview

337 service logs (23.1%) remain unlinked after automated matching. This guide helps you manually review and link them.

## Files

- **Input:** `unlinked-service-logs-remaining.csv` - All unlinked service logs
- **Tool:** `manual-link-helper.mjs` - Helper script for manual linking
- **Database:** Direct queries for investigation

---

## Breakdown of Unlinked Logs

| Category | Count | % | Action |
|----------|-------|---|--------|
| Services before first Zoho invoice | 163 | 48.4% | Skip - no invoice exists |
| Customer has no Zoho invoices | 82 | 24.3% | Skip - not in Zoho |
| Recent services (post-Zoho) | 37 | 11.0% | Link to modern invoices |
| Gap >30 days from invoice | 24 | 7.1% | Review for manual linking |
| Service after last invoice | 19 | 5.6% | Review - customer left? |
| Unknown customer | 12 | 3.6% | Skip - cannot identify |

---

## Manual Review Process

### Step 1: Investigate a Service Log

Use the helper script to see details:

```bash
npm run manual-link -- <service_log_id>
```

This shows:
- Service log details
- Customer's Zoho invoices (if any)
- Closest invoices by date
- Recommended action

### Step 2: Review Options

For each unlinked log, you can:

**A. Link to existing invoice:**
```bash
npm run manual-link -- <service_log_id> --link <invoice_id>
```

**B. Mark as reviewed (no action needed):**
```bash
npm run manual-link -- <service_log_id> --skip "Reason: service before Zoho enrollment"
```

**C. Flag for later:**
```bash
npm run manual-link -- <service_log_id> --flag "Need to check with customer"
```

### Step 3: Batch Review by Category

**Review recent services (should link to modern invoices):**
```sql
-- Find recent service logs that might link to modern invoices
SELECT
  sl.id as service_log_id,
  sl.service_date,
  c.name as customer_name,
  c.email,
  i.invoice_number as closest_modern_invoice,
  i.issued_at as invoice_date
FROM service_logs sl
JOIN customers c ON c.id = sl.customer_id
LEFT JOIN LATERAL (
  SELECT * FROM invoices
  WHERE customer_id = sl.customer_id
    AND invoice_number NOT LIKE 'ZB-%'
  ORDER BY ABS(EXTRACT(EPOCH FROM (issued_at - sl.service_date)))
  LIMIT 1
) i ON true
WHERE sl.invoice_id IS NULL
  AND sl.service_date >= '2025-09-01'
ORDER BY sl.service_date DESC;
```

**Review customers with no Zoho invoices:**
```sql
-- List service logs for customers with no Zoho invoices
SELECT
  sl.id as service_log_id,
  c.name as customer_name,
  c.email,
  sl.service_date,
  COUNT(i.id) as modern_invoice_count
FROM service_logs sl
JOIN customers c ON c.id = sl.customer_id
LEFT JOIN invoices i ON i.customer_id = sl.customer_id
  AND i.invoice_number NOT LIKE 'ZB-%'
WHERE sl.invoice_id IS NULL
  AND sl.customer_id != 'unknown'
  AND NOT EXISTS (
    SELECT 1 FROM invoices
    WHERE customer_id = sl.customer_id
    AND invoice_number LIKE 'ZB-%'
  )
GROUP BY sl.id, c.name, c.email, sl.service_date
ORDER BY c.name, sl.service_date;
```

---

## Common Scenarios

### Scenario 1: Recent Service (Post-Zoho Migration)

**Symptom:** Service date Sept-Oct 2025
**Cause:** Migration happened, now using modern invoicing
**Action:** Link to modern invoice (INV-2025-*)

**Example:**
```sql
-- Find the service log
SELECT * FROM service_logs WHERE id = 'af9219ef-2173-4722-b0fb-69f2c3f6ea96';

-- Find nearby modern invoices
SELECT invoice_number, issued_at, amount
FROM invoices
WHERE customer_id = 'cus_T0qqGn9xCudHEO'
  AND invoice_number NOT LIKE 'ZB-%'
  AND issued_at BETWEEN '2025-10-01' AND '2025-10-15'
ORDER BY issued_at;

-- Link manually
UPDATE service_logs
SET invoice_id = '<invoice_id>'
WHERE id = 'af9219ef-2173-4722-b0fb-69f2c3f6ea96';
```

### Scenario 2: Service Before First Zoho Invoice

**Symptom:** Service in Jan-Mar 2023, first Zoho invoice Apr 2023
**Cause:** Customer enrolled in subscription billing after services performed
**Action:** Skip - no invoice to link to

### Scenario 3: Customer Never Used Zoho

**Symptom:** Customer has service logs but zero Zoho invoices
**Cause:** Billed via direct Stripe, manual invoices, or other system
**Action:** Skip - check if modern invoices exist, otherwise leave unlinked

### Scenario 4: Wide Gap (>30 days)

**Symptom:** Service on 2024-05-14, closest invoice 2024-04-04 (40 days apart)
**Cause:** Irregular billing, one-time service, subscription pause
**Action:** Review - if amount/timing makes sense, link manually

---

## Quick SQL Queries

**Check customer's invoice history:**
```sql
SELECT
  invoice_number,
  issued_at::date,
  amount,
  status,
  payment_method
FROM invoices
WHERE customer_id = '<customer_id>'
ORDER BY issued_at;
```

**Check customer's service history:**
```sql
SELECT
  service_date::date,
  invoice_id,
  CASE WHEN invoice_id IS NULL THEN '❌ Unlinked' ELSE '✅ Linked' END as link_status
FROM service_logs
WHERE customer_id = '<customer_id>'
ORDER BY service_date;
```

**Link service log to invoice:**
```sql
UPDATE service_logs
SET invoice_id = '<invoice_id>'
WHERE id = '<service_log_id>';
```

---

## Tracking Progress

**Count remaining unlinked:**
```sql
SELECT COUNT(*) as remaining_unlinked
FROM service_logs
WHERE invoice_id IS NULL;
```

**View linkage rate:**
```sql
SELECT
  COUNT(*) as total,
  COUNT(invoice_id) as linked,
  ROUND(100.0 * COUNT(invoice_id) / COUNT(*), 1) as linkage_percentage
FROM service_logs;
```

---

## Priority Order

1. **High Priority:** Recent services (37 logs) - likely link to modern invoices
2. **Medium Priority:** Wide gaps (24 logs) - might be legitimate linkages
3. **Low Priority:** Pre-Zoho services (163 logs) - unlikely to have invoices
4. **Skip:** Unknown customers (12 logs) - cannot identify
5. **Skip:** No Zoho invoices (82 logs) - nothing to link to

---

## Tips

- Start with recent services (Sept-Oct 2025) - highest ROI
- Use customer email to verify identity
- Check service amounts against invoice amounts
- When in doubt, leave unlinked rather than incorrect linkage
- Document decisions in notes or spreadsheet

---

## Expected Outcomes

- **Best case:** Link ~60-80 additional logs (recent services + wide gaps)
- **Realistic:** Link ~40-50 logs (mostly recent services)
- **Final linkage rate:** 79-80% (up from current 76.9%)

The remaining ~250-280 unlinked logs are structural limitations (pre-Zoho services, customers not in Zoho) and should remain unlinked.
