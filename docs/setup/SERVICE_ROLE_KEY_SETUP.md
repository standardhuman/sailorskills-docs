# Supabase Service Role Key Setup
**Created:** 2025-10-29
**Purpose:** Enable full database access in integration tests (bypasses RLS)

## Overview

The **Service Role Key** is a special Supabase API key that bypasses Row-Level Security (RLS) policies. This is needed for integration tests that need to:
- Create test data directly in the database
- Query across multiple customers for validation
- Test RLS policies themselves
- Set up complex test scenarios

⚠️ **CRITICAL:** This key has admin-level database access. Never use in client-side code!

---

## How to Get the Service Role Key

### Option 1: Supabase Dashboard (Recommended)

1. **Open Supabase Project:**
   - Go to https://supabase.com/dashboard
   - Select your project: `fzygakldvvzxmahkdylq`

2. **Navigate to API Settings:**
   - Click "Settings" (bottom left)
   - Click "API"

3. **Find Service Role Key:**
   - Scroll to "Project API keys" section
   - Look for **"service_role"** key (NOT the "anon" key)
   - Click "Reveal" to show the key
   - **Format:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS...` (very long)

4. **Copy the Key:**
   - Copy the entire service_role key
   - It's a JWT token, much longer than the anon key

---

## Add to GitHub Secrets

### Step 1: Open GitHub Secrets

Go to: https://github.com/standardhuman/sailorskills-docs/settings/secrets/actions

### Step 2: Create New Secret

1. Click "New repository secret"
2. **Name:** `SUPABASE_SERVICE_ROLE_KEY`
3. **Value:** [Paste the service_role key from Supabase]
4. Click "Add secret"

### Step 3: Verify

You should now see 5 secrets:
- ✅ TEST_DATABASE_URL
- ✅ VITE_SUPABASE_URL
- ✅ VITE_SUPABASE_ANON_KEY
- ✅ PRODUCTION_URL
- ✅ SUPABASE_SERVICE_ROLE_KEY (new!)

---

## Update Integration Tests

Once the secret is added, integration tests can use it for full database access:

### Example: Using Service Role Key in Tests

```javascript
import { createClient } from '@supabase/supabase-js';

// For tests that need to bypass RLS
const supabaseAdmin = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // Full database access
);

// Create test data directly (bypasses RLS)
const { data: testCustomer } = await supabaseAdmin
  .from('customers')
  .insert({
    email: 'test@example.com',
    name: 'Test Customer',
    is_test: true
  })
  .select()
  .single();

// For client-side testing (respects RLS)
const supabaseClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY  // Normal client access
);
```

### When to Use Which Key

| Key Type | Purpose | RLS | Use In |
|----------|---------|-----|--------|
| **anon** | Client-side access | ✅ Enforced | Production code, client tests |
| **service_role** | Server-side/admin access | ❌ Bypassed | Integration tests, admin operations |

---

## Security Best Practices

### ✅ DO:
- Use service_role key only in GitHub Actions (server-side)
- Store in GitHub Secrets (never commit to code)
- Use for test data creation and cleanup
- Use for testing RLS policies themselves
- Rotate key if ever exposed

### ❌ DON'T:
- Never commit service_role key to git
- Never use in client-side JavaScript
- Never expose in browser/frontend code
- Never use in production client apps
- Don't share the key in Slack/email

---

## Testing the Setup

After adding the secret, the integration tests should pass. You can verify by:

### Option 1: Run Tests Locally

```bash
# Set environment variable locally (temporary, for testing)
export SUPABASE_SERVICE_ROLE_KEY="your-key-here"

# Run integration tests
npx playwright test tests/integration/

# Clean up
unset SUPABASE_SERVICE_ROLE_KEY
```

### Option 2: Trigger GitHub Actions

1. Make a small change to code
2. Create a PR
3. GitHub Actions will run with the secret
4. Check that integration tests pass

---

## Troubleshooting

### Tests Still Fail with RLS Errors

**Problem:** Integration tests hit RLS policy violations

**Solution:**
- Verify SUPABASE_SERVICE_ROLE_KEY secret is set in GitHub
- Check test code is using `process.env.SUPABASE_SERVICE_ROLE_KEY`
- Confirm you're creating `supabaseAdmin` client with service_role key
- Ensure tests aren't using the anon key by mistake

### "Missing: SUPABASE_SERVICE_ROLE_KEY" Error

**Problem:** Secret not found in environment

**Solution:**
- Verify secret name is exactly `SUPABASE_SERVICE_ROLE_KEY` (case-sensitive)
- Check secret is added to correct repository
- Try re-running the GitHub Actions workflow

### Key Doesn't Work

**Problem:** Service role key rejected or unauthorized

**Solution:**
- Verify you copied the **service_role** key, not the **anon** key
- Check for extra spaces or characters when pasting
- Try revealing and copying the key again from Supabase dashboard
- Confirm Supabase project is active and not paused

---

## Next Steps

After adding SUPABASE_SERVICE_ROLE_KEY:

1. ✅ All 5 GitHub secrets configured
2. ✅ Integration tests can create test data freely
3. ✅ RLS policy tests can validate isolation
4. ✅ Cross-service tests can set up complex scenarios
5. ✅ Test data cleanup works correctly

---

## Reference

- **Supabase Service Role Documentation:** https://supabase.com/docs/guides/api/api-keys
- **When to Use Service Role:** https://supabase.com/docs/guides/database/testing

---

**Status:** Waiting for SERVICE_ROLE_KEY to be added to GitHub Secrets
**Next:** Add secret, then integration tests will have full database access
