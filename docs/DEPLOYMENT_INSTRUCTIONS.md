# BCC Email Configuration - Deployment Instructions

**Feature:** Database-backed BCC email configuration
**Branch:** `feature/bcc-email-config`
**Status:** Ready for deployment

---

## Pre-Deployment Checklist

- [x] All code changes committed
- [x] Database migration created and tested locally
- [x] All edge functions updated (9 total)
- [x] Settings UI updated with BCC configuration section
- [x] Testing checklist created
- [ ] Code review completed (if applicable)
- [ ] Stakeholder approval obtained

---

## Deployment Steps

### Step 1: Merge Feature Branch to Main

```bash
# From worktree
cd /Users/brian/app-development/sailorskills-repos/.worktrees/bcc-email-config
git push origin feature/bcc-email-config

# From main repo
cd /Users/brian/app-development/sailorskills-repos
git checkout main
git pull origin main
git merge feature/bcc-email-config
git push origin main
```

**Verification:**
- [ ] Branch merged successfully
- [ ] No merge conflicts
- [ ] All commits present in main

---

### Step 2: Deploy Database Migration

**IMPORTANT:** Run this BEFORE deploying edge functions (functions depend on tables existing)

```bash
# Load database connection
source db-env.sh

# Run migration
psql "$DATABASE_URL" -f migrations/2025-11-14-bcc-settings.sql
```

**Verify migration:**
```bash
# Check tables exist
psql "$DATABASE_URL" -c "\d email_bcc_settings"
psql "$DATABASE_URL" -c "\d email_bcc_audit_log"

# Check initial data
psql "$DATABASE_URL" -c "SELECT service_name, bcc_address, is_active FROM email_bcc_settings ORDER BY service_name;"
```

**Expected output:**
```
 service_name |       bcc_address       | is_active
--------------+-------------------------+-----------
 billing      | standardhuman@gmail.com | t
 booking      | standardhuman@gmail.com | t
 operations   | standardhuman@gmail.com | t
 portal       | standardhuman@gmail.com | t
 settings     | standardhuman@gmail.com | t
 shared       | standardhuman@gmail.com | t
(6 rows)
```

---

### Step 3: Deploy Shared Package (BCC Lookup Utility)

**Note:** The shared package contains the `getBccAddress()` function that all edge functions import.

```bash
cd /Users/brian/app-development/sailorskills-shared

# Verify changes
git status
git log -1 --oneline

# Push to shared repo (if needed)
git push origin main
```

**Files changed:**
- `src/lib/bcc-lookup.js` (new file)

---

### Step 4: Deploy Edge Functions

Deploy all 9 updated edge functions to production:

#### Operations (1 function)
```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-operations
supabase functions deploy send-notification
```

#### Billing (2 functions)
```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-billing
supabase functions deploy send-email
supabase functions deploy send-receipt
```

#### Settings (7 functions)
```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-settings
supabase functions deploy send-test-bcc
supabase functions deploy auth-send-magic-link
supabase functions deploy auth-send-password-reset
supabase functions deploy auth-send-signup-confirmation
supabase functions deploy auth-send-email-change
supabase functions deploy auth-send-invite
supabase functions deploy auth-send-reauthentication
```

**Verify deployments:**
```bash
# Check function logs after deployment
supabase functions list
```

---

### Step 5: Deploy Settings UI (Vercel Auto-Deploy)

The Settings UI will auto-deploy when main branch is pushed.

**Check Vercel deployment:**
1. Go to https://vercel.com/dashboard
2. Find `sailorskills-settings` project
3. Verify deployment triggered from main branch
4. Wait for deployment to complete (usually 2-3 minutes)
5. Check deployment logs for errors

**Verify UI deployed:**
- Visit: https://settings.sailorskills.com/src/views/system-config.html
- Scroll to "📧 Email BCC Configuration" section
- Verify table renders with 6 services

---

### Step 6: Verify Production

**Database:**
```bash
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM email_bcc_settings;"
```
Expected: `6`

**Settings UI:**
- [ ] BCC configuration section visible
- [ ] All 6 services listed
- [ ] All addresses show standardhuman@gmail.com
- [ ] Test buttons render

**Edge Functions:**
```bash
# Test one function to verify BCC lookup works
curl -X POST https://fzygakldvvzxmahkdylq.supabase.co/functions/v1/send-test-bcc \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"service_name":"operations","bcc_address":"standardhuman@gmail.com"}'
```

Expected: `{"success":true,"messageId":"re_..."}`

---

### Step 7: Smoke Tests

Run quick smoke tests to ensure emails still work:

1. **Operations**: Complete a service → verify email sent and BCC received
2. **Billing**: Generate an invoice → verify email sent and BCC received
3. **Settings**: Trigger password reset → verify email sent and BCC received

**Check function logs:**
```bash
# In Supabase dashboard, check function logs for:
[BCC] operations: standardhuman@gmail.com (from database)
[BCC] billing: standardhuman@gmail.com (from database)
[BCC] settings: standardhuman@gmail.com (from database)
```

---

### Step 8: Monitor for 24-48 Hours

**Monitoring checklist:**
- [ ] Check Supabase function logs daily for BCC-related errors
- [ ] Verify emails are being delivered to customers
- [ ] Verify BCC copies are being received
- [ ] Check `email_bcc_audit_log` for any unexpected changes
- [ ] Monitor function error rates in Supabase dashboard
- [ ] Check customer support for any email-related complaints

**Log queries:**
```sql
-- Check audit log
SELECT * FROM email_bcc_audit_log
ORDER BY changed_at DESC
LIMIT 20;

-- Verify BCC settings are stable
SELECT service_name, bcc_address, is_active, updated_at
FROM email_bcc_settings
ORDER BY updated_at DESC;
```

---

## Rollback Procedure

If critical issues are discovered:

### Option 1: Disable Database Lookup (Fastest)

```sql
-- Force all services to use ENV fallback
UPDATE email_bcc_settings SET is_active = false;
```

This immediately reverts to using `EMAIL_BCC_ADDRESS` environment variable for all services.

### Option 2: Redeploy Previous Edge Function Versions

```bash
# List previous deployments
supabase functions list

# Redeploy specific previous version
supabase functions deploy send-notification --version-id <previous-version-id>
```

### Option 3: Revert Git Commits

```bash
cd /Users/brian/app-development/sailorskills-repos
git checkout main
git revert <commit-hash>
git push origin main
```

This will trigger Vercel to redeploy previous UI version.

---

## Post-Deployment Tasks

After successful deployment:

1. **Complete Testing Checklist:**
   - Use `docs/BCC_TESTING_CHECKLIST.md`
   - Document all test results
   - Archive for compliance

2. **Update Documentation:**
   - Mark deployment complete in HANDOFF document
   - Update CLAUDE.md with BCC feature details
   - Update README if needed

3. **Team Communication:**
   - Notify team of new BCC configuration feature
   - Share link to Settings UI BCC section
   - Provide quick training on how to use

4. **Create Deployment Summary:**
   - Use template in `docs/DEPLOYMENT_SUMMARY_BCC_CONFIG.md`
   - Include deployment date, time, and results
   - Document any issues encountered

---

## Troubleshooting

### Issue: Edge function can't find shared package

**Error:** `Cannot find module '../../../sailorskills-shared/src/lib/bcc-lookup.js'`

**Solution:**
```bash
# Ensure shared package is properly linked
cd sailorskills-settings
ls -la shared
# Should point to: ../../sailorskills-shared

# Redeploy with --import-map if needed
supabase functions deploy auth-send-magic-link --import-map
```

### Issue: Database table not found

**Error:** `relation "email_bcc_settings" does not exist`

**Solution:**
- Run migration again: `psql "$DATABASE_URL" -f migrations/2025-11-14-bcc-settings.sql`
- Verify tables: `psql "$DATABASE_URL" -c "\dt email_bcc*"`

### Issue: UI not loading BCC section

**Possible causes:**
- Vercel deployment failed
- JavaScript error in browser console
- Database query failing (check RLS policies)

**Solution:**
1. Check Vercel deployment logs
2. Open browser dev tools, check console for errors
3. Verify RLS policies allow admin access

### Issue: BCC not being sent

**Check:**
1. Function logs show successful BCC lookup
2. Database has correct BCC address
3. `is_active` is set to `true`
4. Resend API is not blocking BCC

---

## Success Criteria

Deployment considered successful when:

- [x] All edge functions deployed without errors
- [x] Database migration applied successfully
- [x] Settings UI shows BCC configuration section
- [ ] Test email sends successfully with BCC
- [ ] Live email sends successfully with BCC
- [ ] Audit log records changes correctly
- [ ] No errors in function logs after 24 hours
- [ ] No customer complaints about email delivery

---

## Contacts

**For deployment issues:**
- Technical lead: _____________________
- Database admin: _____________________
- DevOps: _____________________

**For rollback authorization:**
- Product owner: _____________________
- Engineering manager: _____________________

---

**Deployment Date:** _____________________
**Deployed by:** _____________________
**Deployment Status:** _____________________
