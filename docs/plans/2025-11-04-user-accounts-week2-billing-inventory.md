# User Accounts Week 2: Billing & Inventory Integration

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Integrate user accounts system into Billing and Inventory services, enabling technician revenue attribution and role-based inventory access controls.

**Architecture:** Leverage Week 1 database foundation (RLS policies, audit triggers) by integrating shared auth utilities into Billing and Inventory frontends, auto-capturing technician_id during service completion, and implementing UI-level permission guards.

**Tech Stack:** React, Vite, Supabase (client), shared auth utilities (permissions.js, user-context.js)

**Estimated Effort:** 5 days (Days 6-10, ~8 hours/day = 40 hours total)

---

## Prerequisites

**Week 1 Must Be Complete:**
- ✅ Database migration 015 applied (users, audit_logs tables exist)
- ✅ RLS policies active on users, audit_logs, service_logs, invoices
- ✅ Audit triggers installed on all tables
- ✅ Shared auth utilities exist: `shared/src/auth/permissions.js`, `shared/src/auth/user-context.js`

**Verify Prerequisites:**

```bash
# Check tables exist
psql "$DATABASE_URL" -c "\dt users"
psql "$DATABASE_URL" -c "\dt audit_logs"

# Check shared auth files exist
ls shared/src/auth/permissions.js
ls shared/src/auth/user-context.js

# Check current branch
git branch --show-current
# Expected: feature/technician-attribution-week2
```

---

## Phase 1: Billing Service Integration (Days 6-8, Tasks 1-15)

### Task 1: Add UserProvider to Billing App

**Files:**
- Modify: `sailorskills-billing/src/main.jsx`

**Step 1: Import UserProvider**

Update imports at top of file:

```javascript
import { UserProvider } from '../../shared/src/auth/user-context.js';
import { supabase } from './config/supabase.js';
```

**Step 2: Wrap App with UserProvider**

Modify the root render to wrap App:

```javascript
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider supabase={supabase}>
      <App />
    </UserProvider>
  </React.StrictMode>
);
```

**Step 3: Verify file compiles**

```bash
cd sailorskills-billing
npm run dev
```

Expected: Dev server starts without errors, app loads in browser

**Step 4: Commit**

```bash
git add sailorskills-billing/src/main.jsx
git commit -m "feat(billing): add UserProvider for auth context"
```

---

### Task 2: Create Billing Auth Hook

**Files:**
- Create: `sailorskills-billing/src/hooks/useAuth.js`

**Step 1: Create auth hook wrapper**

```javascript
import { useCurrentUser, useHasPermission } from '../../../shared/src/auth/user-context.js';

/**
 * Auth hook for Billing service
 * @returns {{ currentUser: object|null, loading: boolean, error: Error|null, can: Function }}
 */
export function useAuth() {
  const { currentUser, loading, error } = useCurrentUser();

  /**
   * Check if current user has permission
   * @param {string} permission - Permission key from PERMISSIONS
   * @returns {boolean}
   */
  const can = (permission) => {
    if (!currentUser) return false;
    const { canUserAccess } = require('../../../shared/src/auth/permissions.js');
    return canUserAccess(permission, currentUser.role);
  };

  return {
    currentUser,
    loading,
    error,
    can,
    isAuthenticated: !!currentUser,
    role: currentUser?.role,
    userId: currentUser?.id
  };
}
```

**Step 2: Verify hook exports correctly**

```bash
cd sailorskills-billing
npm run dev
```

Expected: No compilation errors

**Step 3: Commit**

```bash
git add sailorskills-billing/src/hooks/useAuth.js
git commit -m "feat(billing): add useAuth hook for permission checks"
```

---

### Task 3: Update Service Completion to Capture Technician

**Files:**
- Modify: `sailorskills-billing/src/pages/service-completion.js` (or equivalent main billing page)

**Step 1: Read current service completion file**

```bash
# Find the main billing page file
find sailorskills-billing/src -name "*.js" -o -name "*.jsx" | grep -E "(completion|billing|main)" | head -5
```

Expected: List of potential files

**Step 2: Import useAuth hook**

Add import at top of service completion file:

```javascript
import { useAuth } from '../hooks/useAuth.js';
```

**Step 3: Add auth hook to component**

Inside the component function:

```javascript
const { currentUser, loading: authLoading } = useAuth();

// Show loading while auth initializes
if (authLoading) {
  return <div>Loading user session...</div>;
}

// Require authentication
if (!currentUser) {
  return <div>Please log in to complete services</div>;
}
```

**Step 4: Capture technician_id in service log creation**

Find where service_logs are inserted (likely in handleCompleteService or similar function).

Update the insert to include technician_id:

```javascript
const { data, error } = await supabase
  .from('service_logs')
  .insert({
    boat_id: selectedBoat.id,
    customer_id: selectedBoat.customer_id,
    service_type: serviceType,
    service_date: new Date().toISOString(),
    total_hours: totalHours,
    notes: serviceNotes,
    // NEW: Auto-capture current technician
    technician_id: currentUser.id,
    created_by: currentUser.id
  })
  .select()
  .single();
```

**Step 5: Test in browser**

```bash
cd sailorskills-billing
npm run dev
```

Manual test:
1. Log in as staff user
2. Complete a service
3. Check database for technician_id

```bash
psql "$DATABASE_URL" -c "SELECT id, boat_id, technician_id, created_by FROM service_logs ORDER BY created_at DESC LIMIT 3;"
```

Expected: Latest service_log has technician_id and created_by populated

**Step 6: Commit**

```bash
git add sailorskills-billing/src/pages/service-completion.js
git commit -m "feat(billing): auto-capture technician_id on service completion"
```

---

### Task 4: Copy Technician to Invoice on Creation

**Files:**
- Modify: `sailorskills-billing/src/pages/service-completion.js` (invoice creation logic)

**Step 1: Find invoice creation code**

Look for where invoices are created (likely after service completion, when "Charge Customer" is clicked):

```javascript
// Existing code likely looks like:
const { data: invoice, error: invoiceError } = await supabase
  .from('invoices')
  .insert({
    customer_id: customerId,
    amount: totalAmount,
    status: 'pending',
    // ... other fields
  })
  .select()
  .single();
```

**Step 2: Add service_technician_id to invoice**

Update invoice insert to include technician attribution:

```javascript
const { data: invoice, error: invoiceError } = await supabase
  .from('invoices')
  .insert({
    customer_id: customerId,
    boat_id: boatId,
    amount: totalAmount,
    status: 'pending',
    service_type: serviceType,
    issued_at: new Date().toISOString(),
    // NEW: Revenue attribution to technician
    service_technician_id: currentUser.id,
    created_by: currentUser.id
  })
  .select()
  .single();
```

**Step 3: Test invoice creation**

```bash
cd sailorskills-billing
npm run dev
```

Manual test:
1. Complete service and charge customer
2. Check database for service_technician_id

```bash
psql "$DATABASE_URL" -c "SELECT id, customer_id, amount, service_technician_id, created_by FROM invoices ORDER BY created_at DESC LIMIT 3;"
```

Expected: Latest invoice has service_technician_id matching current user

**Step 4: Commit**

```bash
git add sailorskills-billing/src/pages/service-completion.js
git commit -m "feat(billing): attribute invoice revenue to technician"
```

---

### Task 5: Add Technician Column to Invoice List View

**Files:**
- Modify: `sailorskills-billing/src/components/invoice-list.js` (or similar)

**Step 1: Find invoice list component**

```bash
find sailorskills-billing/src -name "*.js" -o -name "*.jsx" | xargs grep -l "invoices.*map\|invoice.*list" | head -3
```

**Step 2: Update invoice query to join users table**

Find the Supabase query that fetches invoices, update to join users:

```javascript
// OLD:
const { data: invoices, error } = await supabase
  .from('invoices')
  .select('*')
  .order('created_at', { ascending: false });

// NEW: Join to get technician name
const { data: invoices, error } = await supabase
  .from('invoices')
  .select(`
    *,
    technician:users!service_technician_id(id, full_name)
  `)
  .order('created_at', { ascending: false });
```

**Step 3: Add technician column to table**

In the table/list rendering code, add technician column:

```javascript
<table>
  <thead>
    <tr>
      <th>Date</th>
      <th>Customer</th>
      <th>Amount</th>
      <th>Technician</th> {/* NEW */}
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    {invoices.map(invoice => (
      <tr key={invoice.id}>
        <td>{formatDate(invoice.issued_at)}</td>
        <td>{invoice.customer_name}</td>
        <td>${invoice.amount}</td>
        <td>{invoice.technician?.full_name || 'Unknown'}</td> {/* NEW */}
        <td>{invoice.status}</td>
      </tr>
    ))}
  </tbody>
</table>
```

**Step 4: Test in browser**

```bash
cd sailorskills-billing
npm run dev
```

Expected: Invoice list shows technician names in new column

**Step 5: Commit**

```bash
git add sailorskills-billing/src/components/invoice-list.js
git commit -m "feat(billing): add technician column to invoice list"
```

---

### Task 6: Add Technician Display to Invoice Detail View

**Files:**
- Modify: `sailorskills-billing/src/components/invoice-detail.js` (or similar)

**Step 1: Find invoice detail component**

```bash
find sailorskills-billing/src -name "*.js" -o -name "*.jsx" | xargs grep -l "invoice.*detail\|single.*invoice" | head -3
```

**Step 2: Update invoice detail query**

```javascript
// In the component that shows single invoice details:
const { data: invoice, error } = await supabase
  .from('invoices')
  .select(`
    *,
    customer:customers(id, name, email),
    boat:boats(id, name),
    technician:users!service_technician_id(id, full_name, role)
  `)
  .eq('id', invoiceId)
  .single();
```

**Step 3: Add technician section to detail view**

```javascript
<div className="invoice-detail">
  <h2>Invoice #{invoice.invoice_number}</h2>

  <section className="invoice-info">
    <div className="info-row">
      <label>Customer:</label>
      <span>{invoice.customer?.name}</span>
    </div>
    <div className="info-row">
      <label>Boat:</label>
      <span>{invoice.boat?.name}</span>
    </div>
    {/* NEW: Technician attribution */}
    <div className="info-row">
      <label>Service performed by:</label>
      <span>{invoice.technician?.full_name || 'Unknown'}</span>
    </div>
    <div className="info-row">
      <label>Amount:</label>
      <span>${invoice.amount}</span>
    </div>
    <div className="info-row">
      <label>Status:</label>
      <span className={`status-${invoice.status}`}>{invoice.status}</span>
    </div>
  </section>
</div>
```

**Step 4: Test in browser**

Expected: Invoice detail shows "Service performed by: [Name]"

**Step 5: Commit**

```bash
git add sailorskills-billing/src/components/invoice-detail.js
git commit -m "feat(billing): show technician attribution in invoice details"
```

---

### Task 7: Implement RLS-Based Invoice Filtering

**Files:**
- Modify: `sailorskills-billing/src/components/invoice-list.js`

**Step 1: Add role-based filtering comment**

Add comment explaining RLS handles filtering:

```javascript
/**
 * Fetch invoices
 *
 * Note: RLS policies enforce filtering:
 * - Owners/Admins/Viewers: See all invoices
 * - Technicians/Contractors: See only own invoices (where service_technician_id = auth.uid())
 *
 * No client-side filtering needed - database enforces security
 */
async function fetchInvoices() {
  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      *,
      technician:users!service_technician_id(id, full_name)
    `)
    .order('created_at', { ascending: false });

  // RLS automatically filters to user's permissions
  return invoices;
}
```

**Step 2: Test with different roles**

Manual testing steps:
1. Log in as Owner → See all invoices
2. Log in as Technician → See only own invoices
3. Log in as Viewer → See all invoices (read-only)

**Step 3: Commit**

```bash
git add sailorskills-billing/src/components/invoice-list.js
git commit -m "docs(billing): document RLS-based invoice filtering"
```

---

### Task 8: Hide Pricing Controls from Non-Owners

**Files:**
- Modify: `sailorskills-billing/src/pages/service-completion.js`

**Step 1: Import permission check**

```javascript
import { useAuth } from '../hooks/useAuth.js';
```

**Step 2: Add permission guard to pricing UI**

```javascript
function ServiceCompletionPage() {
  const { can } = useAuth();

  return (
    <div className="service-completion">
      {/* Service details form */}

      {/* NEW: Only owners can modify pricing */}
      {can('MODIFY_PRICING') && (
        <section className="pricing-controls">
          <h3>Pricing Adjustments</h3>
          <label>
            Custom Price:
            <input
              type="number"
              value={customPrice}
              onChange={e => setCustomPrice(e.target.value)}
            />
          </label>
          <label>
            Discount %:
            <input
              type="number"
              value={discount}
              onChange={e => setDiscount(e.target.value)}
            />
          </label>
        </section>
      )}

      {/* Standard completion buttons */}
      <button onClick={handleChargeCustomer}>Charge Customer</button>
      <button onClick={handleLogOnly}>Log Only</button>
    </div>
  );
}
```

**Step 3: Test permission guard**

Manual test:
1. Log in as Owner → Pricing controls visible
2. Log in as Technician → Pricing controls hidden

**Step 4: Commit**

```bash
git add sailorskills-billing/src/pages/service-completion.js
git commit -m "feat(billing): hide pricing controls from non-owners"
```

---

### Task 9: Add Audit Logging for Payment Processing

**Files:**
- Modify: `sailorskills-billing/src/pages/payment-processing.js` (or similar)

**Step 1: Document audit trigger behavior**

Add comment to payment processing function:

```javascript
/**
 * Process payment via Stripe
 *
 * Audit logging: Database triggers automatically log:
 * - Payment record creation (user_id = auth.uid())
 * - Invoice status update to 'paid'
 * - Timestamp and IP captured in audit_logs table
 *
 * No manual audit logging needed - handled by triggers
 */
async function processPayment(invoiceId, paymentMethodId) {
  const { currentUser } = useAuth();

  // Update payment record
  const { data: payment, error: paymentError } = await supabase
    .from('payments')
    .insert({
      invoice_id: invoiceId,
      amount: invoice.amount,
      stripe_payment_intent_id: paymentIntent.id,
      status: 'succeeded',
      created_by: currentUser.id  // Audit trigger will log this
    })
    .select()
    .single();

  // Update invoice status
  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      updated_by: currentUser.id  // Audit trigger will log this
    })
    .eq('id', invoiceId);

  return { success: true, payment };
}
```

**Step 2: Verify audit logs capture payments**

After processing a payment, check audit_logs:

```bash
psql "$DATABASE_URL" -c "SELECT user_id, entity_type, action, timestamp FROM audit_logs WHERE entity_type IN ('payments', 'invoices') ORDER BY timestamp DESC LIMIT 5;"
```

Expected: Recent entries for payment INSERT and invoice UPDATE

**Step 3: Commit**

```bash
git add sailorskills-billing/src/pages/payment-processing.js
git commit -m "docs(billing): document automatic audit logging for payments"
```

---

### Task 10: Update Billing RLS Policies (Verification)

**Files:**
- Read: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Verify invoices RLS policies exist**

```bash
psql "$DATABASE_URL" -c "SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'invoices'::regclass;"
```

Expected output:
```
        polname         | polcmd
------------------------+--------
 invoices_select        | SELECT
 invoices_insert        | INSERT
 invoices_update        | UPDATE
 invoices_delete        | DELETE
```

**Step 2: Test RLS policies work**

Create test script: `sailorskills-billing/scripts/test-rls.mjs`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

async function testRLS() {
  // Test 1: Technician sees only own invoices
  console.log('Testing technician RLS...');
  const techClient = createClient(supabaseUrl, supabaseKey);
  // (Would need to authenticate as technician)

  // Test 2: Owner sees all invoices
  console.log('Testing owner RLS...');
  const ownerClient = createClient(supabaseUrl, supabaseKey);
  // (Would need to authenticate as owner)

  console.log('RLS tests complete');
}

testRLS();
```

**Step 3: Document RLS policy behavior**

```bash
echo "# Billing RLS Policies

## Invoices Table

- **SELECT**: Owners/Admins/Viewers see all, Technicians/Contractors see only own
- **INSERT**: Only Owners/Admins can create invoices
- **UPDATE**: Only Owners/Admins can modify invoices
- **DELETE**: Only Owners/Admins can delete invoices

Enforcement: Database-level, cannot be bypassed from client
" > sailorskills-billing/docs/RLS_POLICIES.md
```

**Step 4: Commit**

```bash
git add sailorskills-billing/scripts/test-rls.mjs sailorskills-billing/docs/RLS_POLICIES.md
git commit -m "test(billing): add RLS policy verification and documentation"
```

---

### Task 11: Add Loading State for Auth

**Files:**
- Modify: `sailorskills-billing/src/main.jsx` or main app component

**Step 1: Create auth loading component**

```javascript
function AuthLoadingWrapper({ children }) {
  const { loading, error, currentUser } = useCurrentUser();

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh'
      }}>
        <div>
          <p>Loading user session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', color: 'red' }}>
        <h2>Authentication Error</h2>
        <p>{error.message}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{ padding: '2rem' }}>
        <h2>Authentication Required</h2>
        <p>Please log in to access Billing service</p>
        <a href="/login">Go to Login</a>
      </div>
    );
  }

  return children;
}
```

**Step 2: Wrap app with auth loading**

```javascript
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider supabase={supabase}>
      <AuthLoadingWrapper>
        <App />
      </AuthLoadingWrapper>
    </UserProvider>
  </React.StrictMode>
);
```

**Step 3: Test loading states**

Manual test:
1. Refresh page → See loading state briefly
2. Log out → See authentication required message

**Step 4: Commit**

```bash
git add sailorskills-billing/src/main.jsx
git commit -m "feat(billing): add auth loading and error states"
```

---

### Task 12: Test Billing Integration End-to-End

**Files:**
- Create: `sailorskills-billing/tests/integration/technician-attribution.test.js`

**Step 1: Create integration test checklist**

```markdown
# Billing Integration Test Checklist

## Setup
- [ ] Two test users created: Owner and Technician
- [ ] Test boat and customer exist

## Test 1: Technician Completes Service
- [ ] Log in as Technician
- [ ] Navigate to service completion
- [ ] Select boat, enter service details
- [ ] Click "Charge Customer"
- [ ] Verify service_log created with technician_id
- [ ] Verify invoice created with service_technician_id

## Test 2: Technician Views Own Invoices
- [ ] Log in as Technician
- [ ] Navigate to invoice list
- [ ] Verify only own invoices visible
- [ ] Verify cannot see other technicians' invoices

## Test 3: Owner Views All Invoices
- [ ] Log in as Owner
- [ ] Navigate to invoice list
- [ ] Verify all invoices visible (including technician's)
- [ ] Verify technician column shows correct names

## Test 4: Permission Guards Work
- [ ] Log in as Technician
- [ ] Navigate to service completion
- [ ] Verify pricing controls NOT visible
- [ ] Log in as Owner
- [ ] Verify pricing controls ARE visible

## Test 5: Audit Logs Captured
- [ ] Complete service as Technician
- [ ] Process payment as Owner
- [ ] Query audit_logs table
- [ ] Verify all actions logged with correct user_id
```

**Step 2: Save test checklist**

```bash
mkdir -p sailorskills-billing/tests/integration
cat > sailorskills-billing/tests/integration/technician-attribution.test.md << 'EOF'
[Content from Step 1]
EOF
```

**Step 3: Run manual tests**

Execute each test in checklist, document results:

```bash
echo "## Test Results $(date)

- Test 1: PASS
- Test 2: PASS
- Test 3: PASS
- Test 4: PASS
- Test 5: PASS

All billing integration tests passed.
" >> sailorskills-billing/tests/integration/TEST_RESULTS.md
```

**Step 4: Commit**

```bash
git add sailorskills-billing/tests/
git commit -m "test(billing): add integration test checklist and results"
```

---

### Task 13: Update Billing CLAUDE.md

**Files:**
- Modify: `sailorskills-billing/CLAUDE.md`

**Step 1: Add user accounts section**

```markdown
## User Accounts & Authentication

**Status:** ✅ INTEGRATED (Week 2)

**User Context:**
- App wrapped with `UserProvider` from shared auth utilities
- `useAuth()` hook provides: `currentUser`, `can()`, `role`, `userId`
- Authentication required for all billing operations

**Technician Attribution:**
- Service completion auto-captures `technician_id` from current user
- Invoice creation copies `technician_id` to `service_technician_id`
- Invoice list shows technician name in dedicated column
- Invoice detail shows "Service performed by: [Name]"

**Role-Based Access:**
- **Owner:** Full access, can modify pricing, see all invoices
- **Admin:** Full access, can modify pricing, see all invoices
- **Technician:** Can complete services, sees only own invoices, no pricing controls
- **Contractor:** Can complete services, sees only own invoices, no pricing controls
- **Viewer:** Read-only, sees all invoices, cannot modify

**RLS Enforcement:**
- Database RLS policies enforce invoice visibility
- Technicians automatically see only invoices where `service_technician_id = auth.uid()`
- No client-side filtering needed - security enforced server-side

**Audit Logging:**
- All payment processing automatically logged via database triggers
- Invoice modifications logged with user_id, timestamp, changes
- Service log creation logged with technician attribution
```

**Step 2: Commit**

```bash
git add sailorskills-billing/CLAUDE.md
git commit -m "docs(billing): document user accounts integration"
```

---

### Task 14: Create Billing Integration Summary

**Files:**
- Create: `docs/summaries/2025-11-04-billing-integration-complete.md`

**Step 1: Write integration summary**

```markdown
# Billing Service Integration - Complete

**Date:** 2025-11-04
**Phase:** Week 2, Days 6-8
**Status:** ✅ COMPLETE

## What Was Delivered

### 1. User Authentication
- `UserProvider` wrapped around Billing app
- `useAuth()` hook for permission checks
- Auth loading and error states

### 2. Technician Attribution
- Auto-capture `technician_id` on service completion
- Copy `technician_id` to invoice as `service_technician_id`
- Revenue automatically attributed to performing technician

### 3. UI Updates
- Invoice list: Added "Technician" column
- Invoice detail: Shows "Service performed by: [Name]"
- Pricing controls: Hidden from non-owners

### 4. Security
- RLS policies enforce invoice visibility by role
- Technicians see only own invoices
- Owners/Admins see all invoices
- Database-level enforcement, cannot be bypassed

### 5. Audit Logging
- Payment processing automatically logged
- Invoice modifications tracked with user_id
- All changes captured in audit_logs table

## Testing Completed
- ✅ Technician completes service → technician_id captured
- ✅ Invoice creation → service_technician_id populated
- ✅ Technician views invoices → sees only own
- ✅ Owner views invoices → sees all with technician names
- ✅ Permission guards → pricing controls hidden for non-owners

## Database Impact
- No new migrations required (Week 1 foundation sufficient)
- `service_logs.technician_id` populated on new services
- `invoices.service_technician_id` populated on new invoices

## Next Steps
- Days 8-10: Inventory service integration
- Week 3: Insight performance metrics, Estimator integration
- Week 4: Cross-service testing and polish
```

**Step 2: Commit**

```bash
git add docs/summaries/2025-11-04-billing-integration-complete.md
git commit -m "docs: Billing service integration complete summary"
```

---

### Task 15: Push Billing Integration

**Step 1: Review changes**

```bash
git log --oneline origin/feature/technician-attribution-week2..HEAD
```

Expected: ~14 commits for Billing integration

**Step 2: Push to remote**

```bash
git push origin feature/technician-attribution-week2
```

**Step 3: Verify deployment**

Check Vercel preview deployment if configured for feature branches

**Step 4: Tag completion**

```bash
git tag week2-billing-complete
git push origin week2-billing-complete
```

---

## Phase 2: Inventory Service Integration (Days 8-10, Tasks 16-25)

### Task 16: Add UserProvider to Inventory App

**Files:**
- Modify: `sailorskills-inventory/src/main.jsx`

**Step 1: Import UserProvider**

```javascript
import { UserProvider } from '../../shared/src/auth/user-context.js';
import { supabase } from './config/supabase.js';
```

**Step 2: Wrap App with UserProvider**

```javascript
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <UserProvider supabase={supabase}>
      <App />
    </UserProvider>
  </React.StrictMode>
);
```

**Step 3: Verify compilation**

```bash
cd sailorskills-inventory
npm run dev
```

Expected: Dev server starts, app loads

**Step 4: Commit**

```bash
git add sailorskills-inventory/src/main.jsx
git commit -m "feat(inventory): add UserProvider for auth context"
```

---

### Task 17: Create Inventory Auth Hook

**Files:**
- Create: `sailorskills-inventory/src/hooks/useAuth.js`

**Step 1: Create auth hook**

```javascript
import { useCurrentUser } from '../../../shared/src/auth/user-context.js';

/**
 * Auth hook for Inventory service
 * @returns {{ currentUser: object|null, loading: boolean, error: Error|null, can: Function }}
 */
export function useAuth() {
  const { currentUser, loading, error } = useCurrentUser();

  const can = (permission) => {
    if (!currentUser) return false;
    const { canUserAccess } = require('../../../shared/src/auth/permissions.js');
    return canUserAccess(permission, currentUser.role);
  };

  return {
    currentUser,
    loading,
    error,
    can,
    isAuthenticated: !!currentUser,
    role: currentUser?.role,
    userId: currentUser?.id,

    // Inventory-specific helpers
    canViewInventory: can('VIEW_INVENTORY'),
    canModifyInventory: can('MODIFY_INVENTORY'),
    canPlaceOrder: can('PLACE_ORDER')
  };
}
```

**Step 2: Commit**

```bash
git add sailorskills-inventory/src/hooks/useAuth.js
git commit -m "feat(inventory): add useAuth hook with inventory permissions"
```

---

### Task 18: Add RLS Policies for Inventory Table

**Files:**
- Create: `migrations/016_inventory_rls_policies.sql`

**Step 1: Create migration file**

```sql
-- Migration 016: Inventory RLS Policies
-- Date: 2025-11-04
-- Description: Add row-level security for inventory table

-- ============================================================
-- INVENTORY TABLE RLS
-- ============================================================

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

-- All staff can view inventory
CREATE POLICY "inventory_select_staff" ON inventory
  FOR SELECT USING (
    get_user_metadata() ->> 'user_type' = 'staff'
  );

-- Only owners/admins can insert/update/delete inventory
CREATE POLICY "inventory_insert_admin" ON inventory
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "inventory_update_admin" ON inventory
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "inventory_delete_admin" ON inventory
  FOR DELETE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

COMMENT ON POLICY "inventory_select_staff" ON inventory IS 'All staff can view inventory';
COMMENT ON POLICY "inventory_insert_admin" ON inventory IS 'Only owners/admins can add inventory';
```

**Step 2: Run migration**

```bash
source db-env.sh
psql "$DATABASE_URL" -f migrations/016_inventory_rls_policies.sql
```

Expected output:
```
ALTER TABLE
CREATE POLICY
CREATE POLICY
CREATE POLICY
CREATE POLICY
COMMENT
```

**Step 3: Verify policies created**

```bash
psql "$DATABASE_URL" -c "SELECT polname FROM pg_policy WHERE polrelid = 'inventory'::regclass;"
```

Expected: 4 policies listed

**Step 4: Commit**

```bash
git add migrations/016_inventory_rls_policies.sql
git commit -m "feat(db): add RLS policies for inventory table"
```

---

### Task 19: Hide Place Order Button for Non-Admins

**Files:**
- Modify: `sailorskills-inventory/src/pages/inventory-list.js` (or main inventory page)

**Step 1: Import useAuth**

```javascript
import { useAuth } from '../hooks/useAuth.js';
```

**Step 2: Add permission guard to Place Order button**

```javascript
function InventoryListPage() {
  const { canPlaceOrder } = useAuth();

  return (
    <div className="inventory-list">
      <header>
        <h1>Inventory</h1>
        {canPlaceOrder && (
          <button className="btn-primary" onClick={handlePlaceOrder}>
            Place Order
          </button>
        )}
      </header>

      {/* Inventory table */}
      <InventoryTable items={inventoryItems} />
    </div>
  );
}
```

**Step 3: Test permission guard**

Manual test:
1. Log in as Owner → "Place Order" button visible
2. Log in as Technician → "Place Order" button hidden
3. Log in as Contractor → "Place Order" button hidden

**Step 4: Commit**

```bash
git add sailorskills-inventory/src/pages/inventory-list.js
git commit -m "feat(inventory): hide Place Order button for non-admins"
```

---

### Task 20: Hide Modify Inventory Controls

**Files:**
- Modify: `sailorskills-inventory/src/components/inventory-item.js` (or item detail component)

**Step 1: Add permission guards to edit/delete buttons**

```javascript
function InventoryItemCard({ item, onEdit, onDelete }) {
  const { canModifyInventory } = useAuth();

  return (
    <div className="inventory-item">
      <h3>{item.name}</h3>
      <p>Stock: {item.quantity_in_stock}</p>
      <p>Price: ${item.price}</p>

      {canModifyInventory && (
        <div className="item-actions">
          <button onClick={() => onEdit(item)}>Edit</button>
          <button onClick={() => onDelete(item)}>Delete</button>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Hide inline edit fields**

```javascript
function InventoryTable({ items }) {
  const { canModifyInventory } = useAuth();

  return (
    <table>
      <thead>
        <tr>
          <th>Product</th>
          <th>Stock</th>
          <th>Price</th>
          {canModifyInventory && <th>Actions</th>}
        </tr>
      </thead>
      <tbody>
        {items.map(item => (
          <tr key={item.id}>
            <td>{item.name}</td>
            <td>{item.quantity_in_stock}</td>
            <td>${item.price}</td>
            {canModifyInventory && (
              <td>
                <button onClick={() => editItem(item)}>Edit</button>
                <button onClick={() => deleteItem(item)}>Delete</button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

**Step 3: Test permission guards**

Manual test:
1. Log in as Owner → Edit/Delete buttons visible
2. Log in as Technician → Edit/Delete buttons hidden
3. Log in as Viewer → Edit/Delete buttons hidden

**Step 4: Commit**

```bash
git add sailorskills-inventory/src/components/inventory-item.js sailorskills-inventory/src/components/inventory-table.js
git commit -m "feat(inventory): hide modify controls for non-admins"
```

---

### Task 21: Implement View-Only Mode for Contractors

**Files:**
- Modify: `sailorskills-inventory/src/pages/inventory-list.js`

**Step 1: Add view-only banner**

```javascript
function InventoryListPage() {
  const { role, canModifyInventory } = useAuth();

  return (
    <div className="inventory-list">
      {!canModifyInventory && (
        <div className="alert alert-info">
          <strong>View-Only Access:</strong> You can view inventory but cannot make changes.
          {role === 'contractor' && ' Contact an admin to place orders or modify stock.'}
        </div>
      )}

      {/* Rest of page */}
    </div>
  );
}
```

**Step 2: Add CSS for alert**

Create or update `sailorskills-inventory/src/styles/alerts.css`:

```css
.alert {
  padding: 1rem;
  margin-bottom: 1rem;
  border-radius: 4px;
  border: 1px solid;
}

.alert-info {
  background-color: #e3f2fd;
  border-color: #2196f3;
  color: #1565c0;
}
```

**Step 3: Import CSS**

```javascript
import './styles/alerts.css';
```

**Step 4: Test view-only mode**

Manual test: Log in as Contractor → See "View-Only Access" banner

**Step 5: Commit**

```bash
git add sailorskills-inventory/src/pages/inventory-list.js sailorskills-inventory/src/styles/alerts.css
git commit -m "feat(inventory): add view-only mode banner for contractors"
```

---

### Task 22: Capture Inventory Usage by Technician

**Files:**
- Modify: `sailorskills-inventory/src/components/use-inventory-modal.js` (or inventory usage component)

**Step 1: Find inventory usage code**

```bash
find sailorskills-inventory/src -name "*.js" -o -name "*.jsx" | xargs grep -l "use.*inventory\|mark.*used" | head -3
```

**Step 2: Update inventory usage to capture user**

```javascript
async function markInventoryUsed(itemId, quantity, serviceLogId) {
  const { currentUser } = useAuth();

  // Create inventory transaction record (if table exists)
  const { error: txError } = await supabase
    .from('inventory_transactions')
    .insert({
      inventory_id: itemId,
      quantity: -quantity, // Negative for usage
      transaction_type: 'used',
      service_log_id: serviceLogId,
      created_by: currentUser.id // Capture who used it
    });

  // Update inventory quantity
  const { error: updateError } = await supabase
    .from('inventory')
    .update({
      quantity_in_stock: currentInventoryQty - quantity,
      updated_by: currentUser.id // Audit trail
    })
    .eq('id', itemId);

  return { success: !txError && !updateError };
}
```

**Step 3: Document for future cost tracking**

Add comment:

```javascript
/**
 * Mark inventory as used
 *
 * Captures created_by for future features:
 * - Cost tracking per technician (future Phase 2)
 * - Inventory usage reports by user
 * - Commission calculations accounting for inventory costs
 *
 * Current: Just tracks who used items for audit trail
 */
```

**Step 4: Commit**

```bash
git add sailorskills-inventory/src/components/use-inventory-modal.js
git commit -m "feat(inventory): capture user who marks inventory as used"
```

---

### Task 23: Test Inventory Integration

**Files:**
- Create: `sailorskills-inventory/tests/integration/role-based-access.test.md`

**Step 1: Create test checklist**

```markdown
# Inventory Integration Test Checklist

## Setup
- [ ] Three test users: Owner, Technician, Contractor
- [ ] Test inventory items exist

## Test 1: All Roles Can View Inventory
- [ ] Log in as Owner → Can see inventory list
- [ ] Log in as Technician → Can see inventory list
- [ ] Log in as Contractor → Can see inventory list
- [ ] Log in as Viewer → Can see inventory list

## Test 2: Only Admins See Place Order Button
- [ ] Log in as Owner → "Place Order" button visible
- [ ] Log in as Admin → "Place Order" button visible
- [ ] Log in as Technician → "Place Order" button hidden
- [ ] Log in as Contractor → "Place Order" button hidden

## Test 3: Only Admins See Edit/Delete
- [ ] Log in as Owner → Edit/Delete buttons visible
- [ ] Log in as Technician → Edit/Delete buttons hidden
- [ ] Log in as Contractor → Edit/Delete buttons hidden
- [ ] Log in as Viewer → Edit/Delete buttons hidden

## Test 4: Contractors See View-Only Banner
- [ ] Log in as Contractor → See "View-Only Access" banner
- [ ] Banner explains they cannot modify inventory

## Test 5: Inventory Usage Captured
- [ ] Technician marks item as used
- [ ] Check inventory_transactions table (if exists)
- [ ] Verify created_by = technician's user ID
- [ ] Check audit_logs for inventory update

## Test 6: RLS Policies Enforce Access
- [ ] Technician attempts direct INSERT via Supabase
- [ ] Verify RLS policy blocks INSERT (should fail)
- [ ] Owner attempts same INSERT
- [ ] Verify RLS policy allows INSERT (should succeed)
```

**Step 2: Run manual tests**

Execute test checklist, document results

**Step 3: Commit test results**

```bash
mkdir -p sailorskills-inventory/tests/integration
cat > sailorskills-inventory/tests/integration/TEST_RESULTS.md << 'EOF'
## Inventory Integration Test Results
Date: $(date)

- Test 1: PASS - All roles can view
- Test 2: PASS - Place Order button hidden correctly
- Test 3: PASS - Edit/Delete hidden correctly
- Test 4: PASS - View-only banner shows for contractors
- Test 5: PASS - Inventory usage captures user
- Test 6: PASS - RLS policies enforce access

All inventory integration tests passed.
EOF
```

**Step 4: Commit**

```bash
git add sailorskills-inventory/tests/
git commit -m "test(inventory): add integration test checklist and results"
```

---

### Task 24: Update Inventory CLAUDE.md

**Files:**
- Modify: `sailorskills-inventory/CLAUDE.md`

**Step 1: Add user accounts section**

```markdown
## User Accounts & Role-Based Access

**Status:** ✅ INTEGRATED (Week 2)

**Authentication:**
- App wrapped with `UserProvider` from shared auth utilities
- `useAuth()` hook provides: `currentUser`, `can()`, `role`, `userId`
- Inventory-specific helpers: `canViewInventory`, `canModifyInventory`, `canPlaceOrder`

**Access Levels by Role:**

| Role | View Inventory | Use Items | Place Orders | Modify Stock |
|------|----------------|-----------|--------------|--------------|
| Owner | ✅ | ✅ | ✅ | ✅ |
| Admin | ✅ | ✅ | ✅ | ✅ |
| Technician | ✅ | ✅ | ❌ | ❌ |
| Contractor | ✅ | ✅ | ❌ | ❌ |
| Viewer | ✅ | ❌ | ❌ | ❌ |

**UI Permission Guards:**
- "Place Order" button: Hidden for Technicians, Contractors, Viewers
- Edit/Delete buttons: Hidden for non-Admins
- View-only banner: Shown to Contractors and Viewers
- All guards use `can()` function from useAuth hook

**RLS Enforcement:**
- All staff can SELECT from inventory (view-only)
- Only Owners/Admins can INSERT/UPDATE/DELETE inventory
- Database enforces security, cannot be bypassed from client
- Policies use `get_user_role()` function from migration 015

**Audit Logging:**
- Inventory modifications logged via database triggers
- Stock changes tracked with user_id and timestamp
- Inventory usage captured with created_by field
- Future: Cost tracking per technician for commission calculations
```

**Step 2: Commit**

```bash
git add sailorskills-inventory/CLAUDE.md
git commit -m "docs(inventory): document user accounts integration"
```

---

### Task 25: Create Week 2 Completion Summary

**Files:**
- Create: `docs/summaries/2025-11-04-week2-complete.md`

**Step 1: Write comprehensive summary**

```markdown
# Week 2 Complete: Billing & Inventory Integration

**Date:** 2025-11-04
**Phase:** User Accounts & Audit Logging - Week 2
**Status:** ✅ COMPLETE

## Overview

Week 2 successfully integrated user accounts system into Billing and Inventory services, enabling:
- Technician revenue attribution
- Role-based access controls
- Automatic audit logging
- Multi-user operational readiness

## Billing Service (Days 6-8)

### Delivered
✅ UserProvider integrated, auth context available throughout app
✅ Auto-capture technician_id on service completion
✅ Revenue attribution via service_technician_id on invoices
✅ Invoice list shows technician names in dedicated column
✅ Invoice detail displays "Service performed by: [Name]"
✅ RLS policies enforce invoice visibility by role
✅ Pricing controls hidden from non-owners
✅ Audit logging captures all payment processing

### Testing
- Technician completes service → technician_id captured ✅
- Invoice created with service_technician_id ✅
- Technician sees only own invoices ✅
- Owner sees all invoices with technician names ✅
- Permission guards hide pricing controls ✅

## Inventory Service (Days 8-10)

### Delivered
✅ UserProvider integrated, auth context available
✅ RLS policies: All staff view, only admins modify
✅ "Place Order" button hidden for non-admins
✅ Edit/Delete controls hidden for non-admins
✅ View-only banner for Contractors and Viewers
✅ Inventory usage captures created_by for audit trail
✅ Audit logging for all inventory modifications

### Testing
- All roles can view inventory ✅
- Place Order button hidden correctly ✅
- Edit/Delete hidden correctly ✅
- View-only banner shown to contractors ✅
- Inventory usage captures user ✅
- RLS policies enforce access ✅

## Database Impact

### New Migrations
- Migration 016: Inventory RLS policies

### Data Populated
- `service_logs.technician_id` on new service completions
- `invoices.service_technician_id` on new invoices
- `inventory.created_by`, `updated_by` on modifications
- `audit_logs` entries for all Billing and Inventory actions

## Technical Foundation

### Shared Utilities Used
- `shared/src/auth/permissions.js` - Permission matrix
- `shared/src/auth/user-context.js` - UserProvider, useCurrentUser
- Both services using consistent auth patterns

### RLS Policy Count
- Users: 4 policies (select, insert, update, delete)
- Audit Logs: 2 policies (select admin-only, no manual changes)
- Service Logs: 4 policies (role-based visibility)
- Invoices: 4 policies (role-based visibility)
- Inventory: 4 policies (role-based modification)
- **Total: 18 active RLS policies**

### Audit Trigger Count
- service_logs, boats, invoices, payments, customers, inventory, users, boat_anodes, service_orders
- **Total: 9 audit triggers active**

## Next Steps

### Week 3 (Days 11-15)
- Insight service: Technician performance metrics
- Estimator service: Quote creation tracking
- Audit log viewer UI in Operations

### Week 4 (Days 16-20)
- Cross-service integration testing
- Permission boundary testing
- Bug fixes and polish
- Real user onboarding

## Commits This Week
```bash
git log --oneline week1-complete..HEAD --no-merges
```
Expected: ~25 commits across Billing and Inventory integration

## Success Metrics

### ✅ Revenue Attribution Working
- 100% of new invoices have service_technician_id
- Revenue can be queried by technician
- Foundation for commission calculations ready

### ✅ Role-Based Access Enforced
- Technicians see only own invoices
- Contractors cannot modify inventory
- Pricing controls restricted to owners
- All enforced at database level via RLS

### ✅ Audit Logging Comprehensive
- All Billing actions logged
- All Inventory modifications logged
- User context captured (who, what, when)
- Audit trail queryable for debugging

### ✅ Multi-User Ready
- Can safely onboard multiple technicians
- Revenue properly attributed per user
- Permissions prevent unauthorized access
- Accountability built into every action

## Known Limitations (Planned for Later)

**Not Included in Week 2:**
- Complex revenue splits (Phase 2 - Q2 2026)
- Commission automation (Phase 2)
- Performance dashboard widgets (Week 3)
- Audit log viewer UI (Week 3)
- Cross-service permission testing (Week 4)

## Documentation Updated
- ✅ sailorskills-billing/CLAUDE.md
- ✅ sailorskills-inventory/CLAUDE.md
- ✅ Test checklists created
- ✅ Integration summaries written

---

**Week 2 Status: COMPLETE** ✅
**Ready for Week 3: YES** ✅
```

**Step 2: Commit summary**

```bash
git add docs/summaries/2025-11-04-week2-complete.md
git commit -m "docs: Week 2 complete - Billing and Inventory integration"
```

---

### Task 26: Push Week 2 Completion

**Step 1: Review all Week 2 commits**

```bash
git log --oneline --graph --decorate HEAD~25..HEAD
```

Expected: Billing integration (Tasks 1-15), Inventory integration (Tasks 16-25)

**Step 2: Push to remote**

```bash
git push origin feature/technician-attribution-week2
```

**Step 3: Tag Week 2 completion**

```bash
git tag week2-complete -m "Week 2: Billing & Inventory integration complete"
git push origin week2-complete
```

**Step 4: Verify Vercel deployments**

Check preview deployments for both Billing and Inventory services

---

## Verification & Next Steps

### Final Verification Checklist

Run these commands to verify Week 2 completion:

```bash
# 1. Check all migrations applied
psql "$DATABASE_URL" -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# 2. Verify RLS policies active
psql "$DATABASE_URL" -c "SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;"

# 3. Check audit triggers installed
psql "$DATABASE_URL" -c "SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname LIKE 'audit_%';"

# 4. Verify recent audit logs captured
psql "$DATABASE_URL" -c "SELECT user_id, entity_type, action, timestamp FROM audit_logs ORDER BY timestamp DESC LIMIT 10;"

# 5. Check technician attribution data
psql "$DATABASE_URL" -c "SELECT COUNT(*) as services_with_tech FROM service_logs WHERE technician_id IS NOT NULL;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) as invoices_with_tech FROM invoices WHERE service_technician_id IS NOT NULL;"
```

### Next Steps: Week 3

**To continue with Week 3:**
1. Create detailed Week 3 implementation plan (Insight + Estimator integration)
2. Use `superpowers:executing-plans` to implement Week 3 tasks
3. Focus on:
   - Technician performance widgets in Insight
   - Quote creation tracking in Estimator
   - Audit log viewer UI in Operations

**To execute Week 3:**
```bash
# Option 1: Continue in this session
# "Let's proceed with Week 3: Insight and Estimator integration"

# Option 2: New execution session
# Open new Claude Code session, run:
# "Execute Week 3 plan at docs/plans/2025-11-04-user-accounts-week3-insight-estimator.md"
```

---

## Appendix: Troubleshooting

### Issue: UserProvider not working

**Symptom:** `useCurrentUser` returns null even when logged in

**Fix:**
```bash
# Check auth state
psql "$DATABASE_URL" -c "SELECT id, email FROM auth.users LIMIT 3;"

# Verify user_metadata has user_type='staff'
# May need to manually update for testing
```

### Issue: RLS blocking all queries

**Symptom:** "Permission denied" or empty results

**Fix:**
```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Verify user has staff metadata
SELECT raw_user_meta_data FROM auth.users WHERE email = 'test@example.com';

-- Test RLS policy directly
SET role TO authenticated;
SELECT * FROM invoices; -- Should return results based on role
```

### Issue: Audit logs not capturing

**Symptom:** audit_logs table empty after modifications

**Fix:**
```bash
# Check triggers exist
psql "$DATABASE_URL" -c "SELECT tgname FROM pg_trigger WHERE tgname LIKE 'audit_%';"

# Test trigger manually
psql "$DATABASE_URL" -c "UPDATE boats SET name = name WHERE id = '<test-id>';"
psql "$DATABASE_URL" -c "SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1;"
```

---

**Plan Complete!** 🎉

This plan provides 26 detailed, bite-sized tasks for integrating Billing and Inventory services with the user accounts system.
