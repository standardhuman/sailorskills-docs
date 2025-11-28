# Session 8 Handoff - Email Consolidation Required

## User Feedback (Critical)

**"No, I do not need two emails for one service."**

The customer should receive ONE email per service - the **Service Completion email** - which should:
1. Contain detailed service information (anodes, propellers, conditions)
2. Conclude with detailed payment information (line items with costs)
3. Be clear about payment status:
   - **If charged:** "You were charged $X. No balance due."
   - **If invoiced:** "You have a balance of $X. Please pay invoice."

---

## Current State (Broken)

### Two Emails Being Sent:
1. **Service Completion** - From billing direct call to send-notification
2. **Payment Receipt** - From invoice trigger (notify_invoice_created)

### Issues Fixed This Session:
- Fixed `pricingSection` → `pricingBreakdownHtml` variable bug
- Restored direct email send from billing (trigger couldn't access data)
- Added `email_sent: true` flag to prevent trigger duplicates
- Updated database template with HTML placeholders

### Issues Remaining:
- Invoice trigger still sends payment_receipt email (duplicate)
- Service completion email doesn't show payment status
- Need to consolidate into single email

---

## Required Changes (Next Session)

### 1. Disable Payment Receipt from Invoice Trigger

**File:** Database trigger `notify_invoice_created()`

```sql
-- Option A: Skip all paid invoices (billing sends service completion)
IF NEW.status = 'paid' THEN
  RETURN NEW;  -- Don't send payment_receipt, billing handles it
END IF;
```

**Or Option B:** Only send for unpaid invoices (new_invoice type only)

### 2. Enhance Service Completion Email

**File:** `sailorskills-billing/src/admin/inline-scripts/enhanced-charge-flow.js`

Add payment status section to the email:

```javascript
// Build payment status section
const paymentStatusSection = `<tr>
  <td style="padding: 0 40px 30px;">
    <div style="background: #dcfce7; border: 2px solid #16a34a; border-radius: 8px; padding: 20px; text-align: center;">
      <div style="font-size: 24px; margin-bottom: 8px;">✓</div>
      <div style="font-size: 18px; font-weight: 600; color: #16a34a;">Payment Complete</div>
      <div style="font-size: 14px; color: #374151; margin-top: 8px;">
        Your card was charged <strong>$${chargeBreakdown.total.toFixed(2)}</strong>. No balance due.
      </div>
    </div>
  </td>
</tr>`;
```

For invoice flow (not charged):
```javascript
const paymentStatusSection = `<tr>
  <td style="padding: 0 40px 30px;">
    <div style="background: #fef3c7; border: 2px solid #f59e0b; border-radius: 8px; padding: 20px; text-align: center;">
      <div style="font-size: 18px; font-weight: 600; color: #92400e;">Invoice Due</div>
      <div style="font-size: 14px; color: #374151; margin-top: 8px;">
        Amount due: <strong>$${amount.toFixed(2)}</strong>
      </div>
      <a href="https://portal.sailorskills.com/portal-invoices.html"
         style="display: inline-block; margin-top: 12px; padding: 12px 24px; background: #f59e0b; color: #fff; text-decoration: none; font-weight: 600; border-radius: 6px;">
        Pay Invoice
      </a>
    </div>
  </td>
</tr>`;
```

### 3. Update Database Template

**Table:** `email_templates` (template_key = 'service_completion')

Add placeholder for payment status:
```html
{{{paymentStatusSection}}}
```

### 4. Handle Invoice Flow (Non-Charge)

The invoice flow in billing also needs to send service completion email with "invoice due" status. Currently only charge flow sends emails.

**File:** Check invoice creation flow for non-payment customers

---

## Architecture After Changes

```
CHARGE FLOW (customer has payment method):
Billing charges customer
    → Creates invoice (status: 'paid')
    → Builds service completion email with:
        - Anode inspection
        - Propeller inspection
        - Service summary with line items
        - Payment status: "Charged $X, no balance"
    → Sends via send-notification
    → Creates service_log (email_sent: true)
    → Invoice trigger fires but SKIPS (status: 'paid')
    → Customer receives ONE email

INVOICE FLOW (customer pays later):
Billing creates invoice
    → Creates invoice (status: 'pending')
    → Builds service completion email with:
        - Anode inspection
        - Propeller inspection
        - Service summary with line items
        - Payment status: "Invoice due $X, pay here"
    → Sends via send-notification
    → Creates service_log (email_sent: true)
    → Invoice trigger fires but SKIPS (email_sent checked)
    → Customer receives ONE email
```

---

## Files to Modify

| File | Change |
|------|--------|
| `enhanced-charge-flow.js` | Add paymentStatusSection to email data |
| `notify_invoice_created()` trigger | Skip paid invoices entirely |
| `email_templates.service_completion` | Add `{{{paymentStatusSection}}}` placeholder |
| Invoice flow code | Also send service completion email |

---

## Testing Checklist

- [ ] Charge flow: Customer receives ONE email with "Payment Complete" status
- [ ] Invoice flow: Customer receives ONE email with "Invoice Due" status
- [ ] No duplicate emails
- [ ] Email contains: anode table, propeller section, line items with $amounts
- [ ] Payment status is prominent and clear

---

## Commits This Session

| Hash | Description |
|------|-------------|
| `a0a0eae` | fix(email): store full line items at invoice creation |
| `c1911f9` | fix(email): restore direct email send from billing |
| `9eb6c63` | fix(email): correct pricingSection -> pricingBreakdownHtml |
| `737af60` | fix(email): update trigger to check email_sent flag (operations) |

---

## Key Insight

The root cause of all the email issues was a **data availability problem**:
- Billing has all the detailed data (chargeBreakdown with line items, anode costs, etc.)
- Database triggers fire on INSERT but don't have access to that JavaScript data
- Trying to reconstruct the data in SQL was fragile and incomplete

**Solution:** Billing sends the email directly (has all data), triggers are fallback only.

---

## Database State

- `notify_service_completion()` - Checks `email_sent` flag, skips if true
- `notify_invoice_created()` - Still sends payment_receipt for paid invoices (NEEDS FIX)
- `email_templates.service_completion` - Has HTML placeholders for sections
- `email_templates.payment_receipt` - Can be deprecated after consolidation

---

**Priority:** HIGH - Customers currently receive duplicate emails
**Estimated Effort:** 1-2 hours
**Dependencies:** None
