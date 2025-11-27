# Transaction & Invoice Viewing Interface Design

**Date:** 2025-10-27
**Status:** Design Approved
**Author:** Claude Code with Brian

## Overview

This design document outlines the implementation of transaction and invoice viewing interfaces across the Sailorskills suite. The system will provide dedicated pages for three distinct audiences: billing admins, operations staff, and customers.

## Design Goals

1. **Multi-audience support:** Tailored interfaces for admin staff, operations team, and customers
2. **Service linkage:** Bi-directional references between invoices and service logs for complete audit trail
3. **Comprehensive display:** Invoice summaries, line item breakdowns, and service history context
4. **Separation of concerns:** Dedicated pages per service rather than shared components
5. **Security:** Row-level security ensuring customers only see their own data

## Architecture: Service-Specific Dedicated Pages

### Rationale
We chose service-specific dedicated pages over shared components or enhanced existing pages because:
- Clean separation of concerns for each audience
- Easy navigation and discoverability
- Ability to optimize UI/UX per audience without compromises
- Simpler permission model (page-level auth)

### Pages to Create

| Service | Page | Audience | Purpose |
|---------|------|----------|---------|
| `sailorskills-billing` | `/transactions.html` | Admin | Full transaction management and reporting |
| `sailorskills-operations` | `/invoices.html` | Operations Staff | Service-linked invoice view with context |
| `sailorskills-portal` | `/billing.html` | Customers | Customer-facing billing and payment history |

## Database Schema

### Current State
- `invoices` table: Contains customer_id, boat_id, service_id (optional), amount, status, JSONB details
- `payments` table: Contains invoice_id, stripe details, payment status
- `invoice_line_items` table: Itemized breakdown with labor/material/tax types
- `service_logs` table: Service history (missing invoice_id link)

### Schema Updates Required

```sql
-- 1. Add bi-directional reference to service_logs
ALTER TABLE service_logs
ADD COLUMN invoice_id uuid REFERENCES invoices(id);

CREATE INDEX idx_service_logs_invoice_id ON service_logs(invoice_id);

-- 2. Add RLS policy for customer payment access
CREATE POLICY "Customers can view own payments"
  ON payments FOR SELECT TO authenticated
  USING (customer_id IN (
    SELECT id FROM customers
    WHERE id = current_setting('app.current_customer_id', true)::uuid
  ));

-- 3. Create view for optimized transaction queries
CREATE OR REPLACE VIEW transaction_details AS
SELECT
  i.id as invoice_id,
  i.invoice_number,
  i.customer_id,
  i.boat_id,
  i.service_id,
  i.amount,
  i.status as invoice_status,
  i.issued_at,
  i.due_at,
  i.paid_at,
  i.payment_method,
  i.customer_details,
  i.boat_details,
  i.service_details,
  p.id as payment_id,
  p.stripe_charge_id,
  p.stripe_payment_intent_id,
  p.status as payment_status,
  sl.id as service_log_id,
  sl.service_date,
  sl.service_type,
  sl.conditions
FROM invoices i
LEFT JOIN payments p ON p.invoice_id = i.id
LEFT JOIN service_logs sl ON sl.invoice_id = i.id;
```

### Data Flow

1. **Invoice Creation** (Billing service)
   - Create invoice with customer_id, boat_id, service_id (if known)
   - Create invoice_line_items for breakdown
   - Invoice number auto-generated

2. **Service Log Linkage** (Operations or Billing)
   - When service completed, set service_logs.invoice_id
   - When invoice created for existing service, set invoices.service_id
   - Bi-directional reference maintained

3. **Payment Processing** (Billing service)
   - Create payment record with invoice_id
   - Update invoice status to 'paid' and set paid_at
   - Record stripe details if credit card payment

4. **Query Pattern** (All services)
   - Use `transaction_details` view for list pages
   - Direct table queries for detail modals
   - JSONB customer_details/boat_details cached in view

## UI Components and Features

### 1. Billing Admin View (`sailorskills-billing/transactions.html`)

**Purpose:** Comprehensive transaction management for billing team

**Components:**

- **Summary Cards Row**
  - Total Revenue (sum of paid invoices)
  - Outstanding Amount (sum of pending)
  - Overdue Count
  - This Month Revenue

- **Filters Panel**
  - Date range picker (issued_at, paid_at)
  - Customer search/autocomplete
  - Status multi-select (paid, pending, overdue, cancelled)
  - Payment method filter
  - Amount range (min/max)
  - "Has service link" toggle

- **Transaction Table**
  - Columns: Invoice #, Customer Name, Boat Name, Service Type, Amount, Status Badge, Payment Method Icon, Issued Date, Paid Date, Actions
  - Sortable columns
  - Pagination (50 per page)
  - Row click → opens detail modal

- **Actions Dropdown (per row)**
  - View Details
  - Email Invoice
  - Edit (pending only)
  - Void Invoice
  - Link to Service (if missing)

- **Export Button**
  - CSV export of filtered results
  - Date range reports for accounting

- **Detail Modal**
  - Full invoice details
  - Line item breakdown table
  - Payment history
  - Link to service log (if exists)
  - Email history
  - Notes section

### 2. Operations Invoice View (`sailorskills-operations/invoices.html`)

**Purpose:** Service-centric invoice view for operations team

**Components:**

- **Context-Aware Header**
  - If accessed from boat detail: Shows boat name and filters to that boat
  - If accessed from nav: Shows search and all invoices

- **Search/Filter Bar**
  - Customer/boat search
  - Date range
  - Status filter
  - "Unlinked only" toggle

- **Invoice Cards (Visual, not table)**
  - Card header: Invoice # and status badge
  - Customer & Boat info
  - Service details section (if linked)
    - Service date
    - Service type
    - Link to service log detail
  - Line item summary (expandable)
  - Amount and payment status
  - Quick actions: Email, Link Service, View Full Details

- **Service Linkage Modal**
  - Triggered by "Link to Service" button
  - Shows service_logs for that customer/boat
  - Select service → creates bi-directional link
  - Confirms linkage with visual feedback

- **Integration with Boat Detail Page**
  - Add "Invoices" tab or section to boat detail view
  - Shows invoices filtered to that boat
  - Each service log entry shows invoice badge if linked

### 3. Customer Portal View (`sailorskills-portal/billing.html`)

**Purpose:** Simple billing overview for boat owners

**Components:**

- **Summary Panel**
  - Current balance due (sum of pending invoices)
  - Last payment date and amount
  - Next scheduled payment (if recurring service)

- **Invoice List**
  - Simple card-based layout
  - Invoice # and Issue Date
  - Service description (from service_details JSONB)
  - Amount
  - Status badge
  - Buttons: Download PDF, View Details

- **Invoice Detail Expansion (inline)**
  - Expands within card
  - Shows line item breakdown
  - Payment information
  - Service notes (if any)

- **Payment History Section**
  - Separate table below invoices
  - Columns: Payment Date, Method, Amount, Invoice #, Receipt
  - Download receipt button (if available)

- **RLS Enforcement**
  - Customer sees only invoices where customer_id matches their account
  - No data leakage between customers
  - Silent filtering (no error messages)

## Navigation Integration

### Shared Navigation Updates

Add new links to navigation component in `sailorskills-shared`:

```javascript
// For Billing service
{ label: 'Transactions', url: '/transactions.html', icon: '💳' }

// For Operations service
{ label: 'Invoices', url: '/invoices.html', icon: '📄' }

// For Portal service
{ label: 'My Billing', url: '/billing.html', icon: '💰' }
```

### Breadcrumbs

- Billing: Home → Admin → Billing → Transactions
- Operations: Home → Admin → Operations → Invoices
- Portal: Home → My Account → Billing

### Deep Linking

Support URL parameters for filtered views:
- `/invoices.html?customer_id=123` - Filter to customer
- `/invoices.html?boat_id=456` - Filter to boat
- `/transactions.html?status=pending` - Filter by status
- `/billing.html?invoice_id=789` - Open specific invoice expanded

## Security & Permissions

### Authentication Requirements

| Page | Auth Type | Role |
|------|-----------|------|
| `/transactions.html` | admin_users | Billing Admin |
| `/invoices.html` | admin_users | Operations Staff |
| `/billing.html` | customer_accounts | Authenticated Customer |

### Row-Level Security (RLS) Policies

**Existing:**
```sql
-- Invoices: Customers see only their own
POLICY "Allow authenticated users to read own invoices"
  ON invoices FOR SELECT TO authenticated
  USING (customer_id = current_setting('app.current_customer_id', true));

-- Admin full access via service_role
POLICY "Allow service role full access"
  ON invoices TO service_role
  USING (true) WITH CHECK (true);
```

**New Policy Required:**
```sql
-- Payments: Customers see only payments for their invoices
CREATE POLICY "Customers can view own payments"
  ON payments FOR SELECT TO authenticated
  USING (customer_id IN (
    SELECT id FROM customers
    WHERE id = current_setting('app.current_customer_id', true)::uuid
  ));
```

### Data Validation Rules

- Invoice amounts must be positive (existing CHECK constraint)
- Payment status transitions must be valid (pending → succeeded/failed/refunded)
- paid_at must be NULL when status != 'paid' (existing constraint)
- Line items must reference valid invoice_id
- service_logs.invoice_id must reference existing invoice

## Error Handling

### Common Errors and Responses

| Error | User Message | Action |
|-------|--------------|--------|
| Invoice not found | "Invoice not available" | Show empty state |
| Payment failed | Display Stripe error message | Offer retry button |
| RLS violation | Silent filter (no data shown) | No error displayed |
| Network timeout | "Connection error. Retrying..." | Exponential backoff retry |
| Missing service link | Warning icon + "Link Service" | Open linkage modal |
| Invalid amount | "Amount must be positive" | Prevent submission |

### Offline Behavior

- Show cached invoice list if available
- Disable actions requiring server communication
- Display offline indicator banner
- Queue email requests for when connection restored

## Technical Implementation

### Shared Code Reuse

Create utilities in `sailorskills-shared/src/utils/`:
- `invoice-formatters.js` - Currency, date, status formatting
- `invoice-queries.js` - Supabase query builders for common patterns

Create components in `sailorskills-shared/src/ui/components/`:
- `status-badge.js` - Reusable status indicator (paid/pending/overdue)
- `invoice-actions.js` - Common action buttons with handlers

### Query Optimization

- Use `transaction_details` view for list pages (pre-joined)
- Implement cursor-based pagination (50 records per page)
- Add indexes on frequently filtered columns (status, issued_at, customer_id)
- Cache JSONB data in view to avoid repeated lookups

### Email Integration

- Reuse existing `send-email` Supabase Edge Function
- Invoice email template includes:
  - PDF attachment generated from invoice data
  - Payment link (for pending invoices)
  - Customer and boat details
  - Itemized breakdown
- Triggered from Billing or Operations UI
- Log email history in `notification_log` table

### Testing Strategy

**Playwright Tests (via MCP):**
- Test each page loads with correct auth
- Test filtering and search functionality
- Test invoice detail expansion
- Test service linkage flow
- Test pagination
- Test email sending (mock)

**Database Tests:**
- Verify RLS policies block unauthorized access
- Test bi-directional service linking
- Test payment status cascades correctly
- Performance test transaction_details view with large dataset

**Integration Tests:**
- End-to-end: Create invoice → Link to service → Process payment
- Test cross-service navigation (Operations → Billing)
- Test customer portal RLS with multiple customer accounts

## Deployment Plan

### Pre-Deployment

1. Run schema migration on production database
2. Update `sailorskills-shared` package with new utilities/components
3. Test migration rollback procedure
4. Backup production database

### Deployment Order

1. **Deploy shared package updates**
   - New utilities and components
   - Navigation link additions
   - Test in staging

2. **Deploy Billing service**
   - `/transactions.html` page
   - Test admin access
   - Verify data loads correctly

3. **Deploy Operations service**
   - `/invoices.html` page
   - Test service linkage modal
   - Verify boat detail integration

4. **Deploy Portal service**
   - `/billing.html` page
   - Test with real customer account
   - Verify RLS policies working

### Post-Deployment Verification

- [ ] All three pages accessible with correct auth
- [ ] RLS policies prevent data leakage
- [ ] Email sending works correctly
- [ ] Service linking creates bi-directional references
- [ ] Performance acceptable with production data volume
- [ ] No console errors on any page
- [ ] Mobile responsive on all three pages

## Success Metrics

- Billing admins can view and filter all transactions efficiently
- Operations staff can link invoices to service logs in < 30 seconds
- Customers can view their billing history without admin assistance
- Email invoice delivery success rate > 95%
- Page load time < 2 seconds for 50 invoice list
- Zero customer data leakage incidents (RLS working)

## Future Enhancements (Out of Scope)

- PDF invoice generation on-demand
- Bulk invoice operations (bulk email, bulk void)
- Advanced reporting (revenue by service type, customer lifetime value)
- Recurring invoice automation
- Payment plan setup for customers
- Integration with accounting software (QuickBooks, Xero)
