# Vercel Staging Environment Setup

**Status**: Ready to configure
**Date**: 2025-11-10
**Time Estimate**: 2-3 hours for all 13 services

---

## Overview

This guide walks through configuring Vercel staging deployments for all 13 Sailor Skills services.

**Prerequisites:**
- ✅ Staging database created (Supabase)
- ✅ All services have staging branches in GitHub
- ✅ Staging credentials stored in `.env.staging`

---

## Service Priority Order

Configure in this order (SSO must work first):

1. **sailorskills-login** (CRITICAL - SSO for all services)
2. **sailorskills-portal** (Customer-facing)
3. **sailorskills-operations** (Admin dashboard)
4. **sailorskills-billing** (Payment processing)
5. **sailorskills-estimator** (Customer acquisition)
6. **sailorskills-settings** (Configuration)
7. **sailorskills-inventory** (Parts management)
8. **sailorskills-insight** (Analytics)
9. **sailorskills-video** (Video workflows)
10. **sailorskills-booking** (Training scheduling)
11. **sailorskills-marketing** (Marketing site)
12. **sailorskills-site** (Main website)
13. **sailorskills-shared** (Shared package)

---

## Quick Setup Checklist

For each service, complete these 4 steps:

- [ ] 1. Verify staging branch is tracked in Vercel
- [ ] 2. Add staging environment variables (scope: Preview → staging branch)
- [ ] 3. Configure custom domain: `[service]-staging.sailorskills.com`
- [ ] 4. Trigger initial staging deployment

---

## Step-by-Step: Per Service Configuration

### Step 1: Verify Git Branch Tracking

1. Go to: `https://vercel.com/[team]/[service]/settings/git`
2. Ensure "staging" branch is in production or preview branches
3. If not listed, add it under **Git** → **Production Branch**
   - Or ensure it deploys as Preview

### Step 2: Add Environment Variables

1. Go to: `https://vercel.com/[team]/[service]/settings/environment-variables`
2. For each variable below:
   - Click **Add New**
   - Enter Key and Value
   - Select Environment: **Preview**
   - Select Branch: **staging** (specific branch, not all previews)
   - Click **Save**

**Common Variables (All Services):**

```bash
# Supabase Staging
VITE_SUPABASE_URL=https://aaxnoeirtjlizdhnbqbr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFheG5vZWlydGpsaXpkaG5icWJyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3ODM5MzYsImV4cCI6MjA3ODM1OTkzNn0.VNi_UCqEiUAM8AoAtH1QrPJUocJILq28a3RV-W1qyII

# Service Role (backend/admin operations)
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFheG5vZWlydGpsaXpkaG5icWJyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2Mjc4MzkzNiwiZXhwIjoyMDc4MzU5OTM2fQ.Lyhz5uPuKw_NnGd4dJlBxSa0w8sbtLqgYZeFneCYIv0

# Database (for migrations/scripts)
DATABASE_URL=postgresql://postgres.aaxnoeirtjlizdhnbqbr:syzdYf-geshiw-xacdy7@aws-1-us-east-1.pooler.supabase.com:5432/postgres
```

**Service-Specific Variables:**

#### sailorskills-login
```bash
# Add common variables above, no service-specific variables needed
```

#### sailorskills-billing
```bash
# Stripe TEST Mode Keys (get from https://dashboard.stripe.com/test/apikeys)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_[YOUR_TEST_KEY]
STRIPE_SECRET_KEY=sk_test_[YOUR_TEST_KEY]
STRIPE_WEBHOOK_SECRET=whsec_[YOUR_TEST_WEBHOOK_SECRET]
```

#### sailorskills-operations
```bash
# Google APIs (can reuse production or create staging-specific)
VITE_GOOGLE_CLIENT_ID=[YOUR_STAGING_GOOGLE_CLIENT_ID]
VITE_GOOGLE_API_KEY=[YOUR_STAGING_GOOGLE_API_KEY]
GOOGLE_CLIENT_SECRET=[YOUR_STAGING_GOOGLE_CLIENT_SECRET]
```

#### sailorskills-video
```bash
# YouTube API (can reuse production)
VITE_YOUTUBE_API_KEY=[YOUR_YOUTUBE_API_KEY]
```

#### sailorskills-booking
```bash
# Google Calendar API (staging calendar recommended)
VITE_GOOGLE_CLIENT_ID=[YOUR_STAGING_GOOGLE_CLIENT_ID]
VITE_GOOGLE_API_KEY=[YOUR_STAGING_GOOGLE_API_KEY]
GOOGLE_CALENDAR_ID=[YOUR_STAGING_CALENDAR_ID]
```

#### sailorskills-estimator
```bash
# Gemini API (can reuse production or separate for staging)
VITE_GEMINI_API_KEY=[YOUR_GEMINI_API_KEY]
```

#### sailorskills-settings
```bash
# Email service (Resend - can use same account)
RESEND_API_KEY=[YOUR_RESEND_API_KEY]
```

### Step 3: Configure Custom Staging Domain

1. Go to: `https://vercel.com/[team]/[service]/settings/domains`
2. Click **Add Domain**
3. Enter: `[service-name]-staging.sailorskills.com`
   - Examples:
     - `login-staging.sailorskills.com`
     - `portal-staging.sailorskills.com`
     - `ops-staging.sailorskills.com`
4. Select **Git Branch**: `staging`
5. Click **Add**

**Expected Domains:**
```
login-staging.sailorskills.com        → sailorskills-login (staging branch)
portal-staging.sailorskills.com       → sailorskills-portal (staging branch)
ops-staging.sailorskills.com          → sailorskills-operations (staging branch)
billing-staging.sailorskills.com      → sailorskills-billing (staging branch)
estimator-staging.sailorskills.com    → sailorskills-estimator (staging branch)
settings-staging.sailorskills.com     → sailorskills-settings (staging branch)
inventory-staging.sailorskills.com    → sailorskills-inventory (staging branch)
insight-staging.sailorskills.com      → sailorskills-insight (staging branch)
video-staging.sailorskills.com        → sailorskills-video (staging branch)
booking-staging.sailorskills.com      → sailorskills-booking (staging branch)
marketing-staging.sailorskills.com    → sailorskills-marketing (staging branch)
site-staging.sailorskills.com         → sailorskills-site (staging branch)
```

### Step 4: Trigger Staging Deployment

1. Go to: `https://vercel.com/[team]/[service]`
2. Click **Deployments** tab
3. Find latest deployment from `staging` branch
4. If no deployment exists:
   - Make a trivial commit to staging branch (e.g., update README)
   - Or use **Redeploy** button in Vercel
5. Verify deployment succeeds
6. Visit `https://[service]-staging.sailorskills.com` to test

---

## DNS Configuration (Phase 5)

If using **external DNS provider** (not Vercel DNS):

Add CNAME records for each staging subdomain:

```
login-staging.sailorskills.com      → CNAME → cname.vercel-dns.com
portal-staging.sailorskills.com     → CNAME → cname.vercel-dns.com
ops-staging.sailorskills.com        → CNAME → cname.vercel-dns.com
billing-staging.sailorskills.com    → CNAME → cname.vercel-dns.com
estimator-staging.sailorskills.com  → CNAME → cname.vercel-dns.com
settings-staging.sailorskills.com   → CNAME → cname.vercel-dns.com
inventory-staging.sailorskills.com  → CNAME → cname.vercel-dns.com
insight-staging.sailorskills.com    → CNAME → cname.vercel-dns.com
video-staging.sailorskills.com      → CNAME → cname.vercel-dns.com
booking-staging.sailorskills.com    → CNAME → cname.vercel-dns.com
marketing-staging.sailorskills.com  → CNAME → cname.vercel-dns.com
site-staging.sailorskills.com       → CNAME → cname.vercel-dns.com
```

**If using Vercel DNS**: This should be automatic when you add custom domains.

---

## Verification Checklist

After configuring each service:

- [ ] Deployment succeeds (green checkmark in Vercel)
- [ ] Custom domain resolves (no DNS errors)
- [ ] Service loads at `https://[service]-staging.sailorskills.com`
- [ ] No console errors in browser
- [ ] Supabase connection works (can query database)
- [ ] Authentication redirects to login-staging.sailorskills.com

**Critical Verification (Login Service):**
- [ ] Can visit `https://login-staging.sailorskills.com`
- [ ] Can log in with test credentials (standardhuman@gmail.com)
- [ ] Auth cookie is set for `.sailorskills.com` domain
- [ ] After login, redirects back to original service

---

## Troubleshooting

### Issue: "Domain is already in use"
**Solution**: Domain may be assigned to another project or environment. Remove it first, then re-add with correct branch assignment.

### Issue: "Branch not found"
**Solution**: Ensure staging branch exists in GitHub (`git push origin staging`)

### Issue: Build fails with "Missing environment variable"
**Solution**: Add the missing variable in Vercel settings, scoped to Preview → staging branch

### Issue: 404 after deployment
**Solution**: Check `vercel.json` routes configuration. May need to add rewrites for SPA routing.

### Issue: CORS errors
**Solution**: Supabase staging project may need CORS configuration. Add staging domains to Supabase → Authentication → URL Configuration

### Issue: SSL certificate errors
**Solution**: Wait 5-10 minutes for Vercel to provision SSL certificate. If persists, remove and re-add domain.

---

## Next Steps After Vercel Setup

Once all 13 services are deployed to staging:

1. **Phase 6**: Update SSO cookie domain for staging
2. **Phase 7**: Update Playwright test configs with staging URLs
3. **Phase 8**: Configure GitHub Actions for staging deployment automation
4. **Phase 9**: Document staging workflow for team
5. **Phase 10**: Run comprehensive integration tests
6. **Phase 11**: Update service READMEs with staging info

---

## Quick Reference: Staging URLs

Once configured, your staging environment will be:

```
Login:      https://login-staging.sailorskills.com
Portal:     https://portal-staging.sailorskills.com
Operations: https://ops-staging.sailorskills.com
Billing:    https://billing-staging.sailorskills.com
Estimator:  https://estimator-staging.sailorskills.com
Settings:   https://settings-staging.sailorskills.com
Inventory:  https://inventory-staging.sailorskills.com
Insight:    https://insight-staging.sailorskills.com
Video:      https://video-staging.sailorskills.com
Booking:    https://booking-staging.sailorskills.com
Marketing:  https://marketing-staging.sailorskills.com
Site:       https://site-staging.sailorskills.com
```

**Supabase Staging Dashboard:**
https://supabase.com/dashboard/project/aaxnoeirtjlizdhnbqbr

---

## Notes

- **Stripe**: Use TEST mode keys only - prevents real charges
- **Google OAuth**: Consider separate staging OAuth client for clean redirect URI management
- **YouTube API**: Can safely reuse production key (quota is shared)
- **Database**: Staging database is isolated - safe to test destructive operations
- **Cost**: Staging adds ~$25/month (Supabase Pro) + minimal Vercel usage

---

**Document Version**: 1.0
**Last Updated**: 2025-11-10
**Owner**: Brian
