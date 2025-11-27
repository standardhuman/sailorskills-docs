# Magic Link Access Testing Plan

**Date:** 2025-11-10
**Purpose:** Verify all boat owners can access their portal using magic links
**Status:** Ready for Testing

---

## Test Overview

### What We're Testing

1. ✅ Magic link can be requested for any customer email
2. ✅ Magic link creates auth account on first use (if needed)
3. ✅ Customer sees ONLY their boat(s)
4. ✅ Service logs load correctly
5. ✅ No redirect loops or errors
6. ✅ Logout works properly

### Current Database State

**Total Customers:** ~250 (including test accounts)
**Real Customers with Boats:** ~150
**Customers with Auth Accounts:** 2
- `standardhuman@gmail.com` (3 boats)
- `validemailforsure@gmail.com` (1 boat: Maris)

**Customers WITHOUT Auth Accounts:** ~148
- These will have auth accounts created automatically on first magic link use

---

## Testing Strategy

### Tier 1: Automated Verification (Recommended)

Use database queries to verify data integrity BEFORE sending magic links to real customers.

**Run this query to check:**
```sql
SELECT
  ca.email,
  ca.magic_link_enabled,
  COUNT(DISTINCT cba.boat_id) as boat_count,
  STRING_AGG(DISTINCT b.name, ', ') as boat_names
FROM customer_accounts ca
LEFT JOIN customer_boat_access cba ON ca.id = cba.customer_account_id
LEFT JOIN boats b ON cba.boat_id = b.id
WHERE ca.email = 'customer@example.com'  -- Replace with actual email
GROUP BY ca.id, ca.email, ca.magic_link_enabled;
```

**What to verify:**
- ✅ `magic_link_enabled = true`
- ✅ `boat_count > 0`
- ✅ Boat names are correct

### Tier 2: Manual Testing with Test Accounts

Create new test customers to verify the flow without bothering real customers.

**Test Accounts to Create:**

1. **Single Boat Owner**
   - Email: `test-single-boat@sailorskills.com`
   - Boat: Pick any test boat

2. **Multiple Boat Owner**
   - Email: `test-multi-boat@sailorskills.com`
   - Boats: Assign 2-3 test boats

3. **New Customer (No Auth Account)**
   - Email: Use a + alias: `standardhuman+newcustomer@gmail.com`
   - Boat: Assign a test boat
   - **This tests auth account creation**

### Tier 3: Real Customer Testing (Sample)

Test with a small sample of real customers who you can contact if issues arise.

**Recommended Sample:**
1. Customer with 1 boat
2. Customer with 2+ boats
3. Customer you know personally (easier to coordinate)

---

## Testing Procedure

### For Each Test Account:

#### Step 1: Verify Data Integrity
```bash
source db-env.sh
psql "$DATABASE_URL" -c "
SELECT
  ca.id as customer_id,
  ca.email,
  ca.magic_link_enabled,
  au.id IS NOT NULL as has_auth,
  COUNT(DISTINCT cba.boat_id) as boat_count,
  STRING_AGG(DISTINCT b.name, ', ') as boats
FROM customer_accounts ca
LEFT JOIN auth.users au ON ca.id = au.id
LEFT JOIN customer_boat_access cba ON ca.id = cba.customer_account_id
LEFT JOIN boats b ON cba.boat_id = b.id
WHERE ca.email = 'CUSTOMER_EMAIL_HERE'
GROUP BY ca.id, ca.email, ca.magic_link_enabled, au.id;
"
```

**Expected Output:**
- customer_id: UUID
- email: Customer email
- magic_link_enabled: `t`
- has_auth: `t` or `f`
- boat_count: >= 1
- boats: Comma-separated boat names

#### Step 2: Request Magic Link
1. Go to https://login.sailorskills.com
2. Click "Magic Link" tab
3. Enter customer email
4. Click "Send Magic Link"
5. **Expected:** "Magic link sent! Check your email to sign in."

#### Step 3: Click Magic Link
1. Check email inbox for customer
2. Click the link in the email
3. **Expected:** Redirect to portal (no loops)

#### Step 4: Verify Portal Access
**Check these items:**

- [ ] Portal loads without errors
- [ ] Welcome message shows: "Welcome to Your Portal"
- [ ] Boat card(s) appear
- [ ] Correct boat name(s) displayed
- [ ] Service date shows (if services exist)
- [ ] Anode condition shows (if anodes tracked)
- [ ] "View Service History" button works
- [ ] "Request Service" button works
- [ ] No error messages in console
- [ ] No 403/406 errors in Network tab

#### Step 5: Verify Service History (If Available)
1. Click "View Service History" for a boat
2. **Expected:**
   - Service logs load
   - Dates are correct
   - Anode data shows (if available)
   - Photos load (if available)
   - Videos load (if available)

#### Step 6: Test Logout
1. Click logout button (usually in header/nav)
2. **Expected:**
   - Redirects to login.sailorskills.com
   - Shows login form
   - NO redirect loop
   - URL is clean (no hash tokens)

#### Step 7: Test Re-login
1. Request another magic link for same customer
2. Click link in email
3. **Expected:**
   - Logs in successfully
   - Shows same boats as before
   - No errors

---

## Common Issues & Troubleshooting

### Issue: "No boats found"

**Diagnosis:**
```sql
-- Check boat access
SELECT * FROM customer_boat_access
WHERE customer_account_id = 'CUSTOMER_UUID';

-- Check if IDs match
SELECT
  au.id as auth_id,
  ca.id as customer_id,
  ca.email
FROM auth.users au
FULL OUTER JOIN customer_accounts ca ON au.id = ca.id
WHERE au.email = 'CUSTOMER_EMAIL' OR ca.email = 'CUSTOMER_EMAIL';
```

**Fix:**
- Verify `customer_accounts.id` matches `auth.users.id`
- Verify `customer_boat_access` has correct `customer_account_id`

### Issue: "403 Forbidden" or "406 Not Acceptable"

**Diagnosis:**
- Check browser console for specific API errors
- Check Network tab for failing requests

**Fix:**
- Usually means `customer_accounts.id` ≠ `auth.users.id`
- Run ID fix query (see database docs)

### Issue: Redirect Loop

**Diagnosis:**
- Check if looping between login and portal
- Check console for repeated auth attempts

**Fix:**
- Clear localStorage: `localStorage.clear()`
- Hard refresh: Cmd+Shift+R
- Try in incognito mode

### Issue: "Service logs don't load"

**Diagnosis:**
```sql
-- Check service logs for boat
SELECT COUNT(*) FROM service_logs
WHERE boat_id = 'BOAT_UUID';
```

**Fix:**
- If count = 0, no services recorded (expected)
- If count > 0 but not showing, check RLS policies

---

## Automated Testing Script

For faster testing of multiple customers, create this helper script:

```bash
#!/bin/bash
# test-magic-link-customer.sh

EMAIL=$1

if [ -z "$EMAIL" ]; then
  echo "Usage: ./test-magic-link-customer.sh customer@example.com"
  exit 1
fi

echo "Testing magic link access for: $EMAIL"
echo "=========================================="

# Load database connection
source db-env.sh

# Check customer data
echo -e "\n1. Customer Data:"
psql "$DATABASE_URL" -c "
SELECT
  ca.id,
  ca.email,
  ca.magic_link_enabled,
  CASE WHEN au.id IS NOT NULL THEN 'Yes' ELSE 'No' END as has_auth,
  COUNT(DISTINCT cba.boat_id) as boat_count,
  STRING_AGG(DISTINCT b.name, ', ') as boats
FROM customer_accounts ca
LEFT JOIN auth.users au ON ca.id = au.id
LEFT JOIN customer_boat_access cba ON ca.id = cba.customer_account_id
LEFT JOIN boats b ON cba.boat_id = b.id
WHERE ca.email = '$EMAIL'
GROUP BY ca.id, ca.email, ca.magic_link_enabled, au.id;
"

echo -e "\n2. Next Steps:"
echo "   - Go to https://login.sailorskills.com"
echo "   - Request magic link for: $EMAIL"
echo "   - Click link in email"
echo "   - Verify portal access"
echo ""
```

**Usage:**
```bash
chmod +x test-magic-link-customer.sh
./test-magic-link-customer.sh a.k.shephard@gmail.com
```

---

## Test Results Template

Track testing results in this format:

| Email | Boats | Has Auth | Link Sent | Logged In | Boats Visible | Logout OK | Issues |
|-------|-------|----------|-----------|-----------|---------------|-----------|--------|
| test@example.com | 1 | No | ✅ | ✅ | ✅ | ✅ | None |
| validemailforsure@gmail.com | 1 | Yes | ✅ | ✅ | ✅ | ✅ | None |
| ... | ... | ... | ... | ... | ... | ... | ... |

---

## Recommended Testing Order

1. ✅ **Test with existing working account first**
   - Email: `validemailforsure@gmail.com`
   - Purpose: Baseline - we know this works

2. **Create and test new test account**
   - Email: `standardhuman+testboat@gmail.com`
   - Purpose: Verify auth account creation

3. **Test with a real customer you know**
   - Pick someone you can easily contact
   - Purpose: Verify real-world scenario

4. **Expand to sample of customers**
   - Test 5-10 different customers
   - Mix of single/multi boat owners
   - Purpose: Verify across different scenarios

5. **Roll out to all customers** (if needed)
   - Send announcement email with instructions
   - Monitor for support requests
   - Have troubleshooting guide ready

---

## Success Criteria

**Portal access is considered working if:**
- ✅ Magic link arrives in inbox
- ✅ Link redirects to portal (no loops)
- ✅ Correct boat(s) appear
- ✅ Service history loads (if exists)
- ✅ Logout works cleanly
- ✅ Re-login works

**Testing is considered complete when:**
- ✅ At least 3 different customers tested successfully
- ✅ Mix of auth states (existing auth, new auth)
- ✅ Mix of boat counts (1 boat, 2+ boats)
- ✅ No critical issues found
- ✅ All success criteria met for each test

---

## Next Steps After Testing

1. **If all tests pass:**
   - Document any edge cases found
   - Create user guide for customers
   - Plan rollout communication

2. **If issues found:**
   - Document specific failures
   - Investigate root cause
   - Fix and re-test

3. **For production rollout:**
   - Send email to customers with magic link instructions
   - Monitor login errors in Supabase dashboard
   - Have support process ready for questions

---

**Last Updated:** 2025-11-10
**Owner:** Brian
**Status:** Ready for Testing
