# Staging Environment Setup Guide

**Created**: 2025-11-10
**Estimated Time**: 6-8 hours (spread over 2-3 days)
**Monthly Cost**: ~$25 (Supabase Pro)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1: Documentation Cleanup](#phase-1-documentation-cleanup-✅-complete)
4. [Phase 2: Supabase Staging Database](#phase-2-supabase-staging-database)
5. [Phase 3: Git Branch Strategy](#phase-3-git-branch-strategy)
6. [Phase 4: Vercel Configuration](#phase-4-vercel-configuration)
7. [Phase 5: DNS Configuration](#phase-5-dns-configuration)
8. [Phase 6: SSO Configuration](#phase-6-sso-configuration)
9. [Phase 7: Playwright Configuration](#phase-7-playwright-configuration)
10. [Phase 8: GitHub Actions](#phase-8-github-actions)
11. [Phase 9: Documentation Updates](#phase-9-documentation-updates)
12. [Phase 10: Testing & Validation](#phase-10-testing--validation)
13. [Phase 11: Team Training](#phase-11-team-training)
14. [Troubleshooting](#troubleshooting)

---

## Overview

This guide walks you through setting up a complete staging environment for the Sailor Skills platform. After completion, your workflow will be:

```
Old: Local → Production
New: Local → Staging → Production
```

**Benefits:**
- Test features safely without affecting customers
- Preview changes in production-like environment
- Catch bugs before they reach production
- Dedicated staging URLs for each service

---

## Prerequisites

**Tools Required:**
- [ ] Supabase account with billing enabled
- [ ] Vercel account with access to all 13 service projects
- [ ] DNS management access (Vercel DNS or your provider)
- [ ] 1Password access to team vault
- [ ] Node.js v18+ installed
- [ ] PostgreSQL client tools (`psql`, `pg_dump`)

**Install PostgreSQL tools** (if not already installed):
```bash
# macOS
brew install postgresql

# Verify installation
psql --version
pg_dump --version
```

---

## Phase 1: Documentation Cleanup ✅ COMPLETE

Historical documentation has been archived to `/docs/archive/deployment-history/`.

---

## Phase 2: Supabase Staging Database

### Step 2.1: Create Supabase Staging Project

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard

2. **Create New Project**:
   - Click "New Project"
   - Organization: (your organization)
   - Project Name: `Sailor Skills Staging`
   - Database Password: Generate strong password (save it!)
   - Region: `US East (N. Virginia)` (same as production)
   - Plan: **Pro Plan** (~$25/month)

3. **Wait for provisioning** (~2 minutes)

4. **Collect credentials** (Settings → API):
   - Project URL: `https://[project-ref].supabase.co`
   - Project Ref: `[project-ref]`
   - Anon/Public Key: Settings → API → `anon` `public`
   - Service Role Key: Settings → API → `service_role` (⚠️ Keep secret!)

5. **Get Database Connection String** (Settings → Database):
   - Connection string → URI (Session pooler)
   - Format: `postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres`

6. **Store in 1Password**:
   - Create entry: "Sailor Skills Staging - Supabase"
   - Save all credentials above

### Step 2.2: Configure Local Environment

1. **Copy environment template**:
   ```bash
   cd /Users/brian/app-development/sailorskills-repos
   cp .env.staging.template .env.staging
   ```

2. **Edit `.env.staging`** and fill in your staging credentials:
   ```bash
   # Open in your editor
   code .env.staging
   # or
   nano .env.staging
   ```

3. **Fill in these required fields**:
   - `VITE_SUPABASE_URL_STAGING` → Your staging project URL
   - `VITE_SUPABASE_ANON_KEY_STAGING` → Your staging anon key
   - `SUPABASE_SERVICE_KEY_STAGING` → Your staging service role key
   - `DATABASE_URL_STAGING` → Your staging database connection string
   - `SUPABASE_PROJECT_REF_STAGING` → Your project ref
   - `DATABASE_URL_PRODUCTION` → Your current production database URL

4. **Verify `.env.staging` is ignored by git**:
   ```bash
   git status
   # Should NOT show .env.staging as untracked
   ```

### Step 2.3: Export Production Schema

```bash
node scripts/staging/export-production-schema.mjs
```

**Expected output:**
```
🔄 Exporting production database schema...
📦 Running pg_dump...
✅ Schema exported successfully!
📄 Saved to: scripts/staging/production-schema.sql
```

**Troubleshooting:**
- If `pg_dump` not found: Install PostgreSQL tools (see Prerequisites)
- If connection fails: Verify `DATABASE_URL_PRODUCTION` in `.env.staging`

### Step 2.4: Apply Schema to Staging

```bash
node scripts/staging/apply-schema-to-staging.mjs
```

**You'll be asked to confirm**:
```
⚠️  WARNING: This will replace the staging database schema
   Database: postgresql://postgres.***@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   Schema file: scripts/staging/production-schema.sql

Are you sure you want to continue? (yes/no):
```

Type `yes` and press Enter.

**Expected output:**
```
📦 Applying schema...
✅ Schema applied successfully!

📋 Summary:
   - All tables, views, and functions created
   - RLS policies applied
   - Indexes created
```

### Step 2.5: Seed Test Data

```bash
node scripts/staging/seed-staging-data.mjs
```

**Expected output:**
```
🌱 Seeding staging database with test data...
📦 Running seed script...

✅ Test data seeded successfully!

📊 Summary:
   - 5 test customers
   - 7 test boats
   - 5 test service logs
   - 5 test invoices
   - 4 test bookings
   - 5 test inventory items
```

### Step 2.6: Create Test Users in Supabase

**Manual step** (Supabase manages auth.users):

1. Go to Supabase Dashboard → Your Staging Project → Authentication → Users
2. Click "Add user" for each:

**Admin User:**
- Email: `test-admin@sailorskills.com`
- Password: `TestAdmin123!`
- Auto Confirm: ✅ Yes

**Customer User:**
- Email: `test-customer@sailorskills.com`
- Password: `TestCustomer123!`
- Auto Confirm: ✅ Yes

**Field Tech User:**
- Email: `test-field@sailorskills.com`
- Password: `TestField123!`
- Auto Confirm: ✅ Yes

---

## Phase 3: Git Branch Strategy

### Step 3.1: Create Staging Branches

For each of the 13 service repositories, create a `staging` branch:

```bash
# Navigate to each service directory and run:
cd sailorskills-login
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging

cd ../sailorskills-operations
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging

# Repeat for all services:
# - sailorskills-billing
# - sailorskills-portal
# - sailorskills-estimator
# - sailorskills-inventory
# - sailorskills-insight
# - sailorskills-settings
# - sailorskills-video
# - sailorskills-booking
# - sailorskills-marketing
# - sailorskills-site
# - sailorskills-shared
```

**Or use this automation script:**

```bash
# Create staging branches in all services
for service in sailorskills-login sailorskills-operations sailorskills-billing \
sailorskills-portal sailorskills-estimator sailorskills-inventory \
sailorskills-insight sailorskills-settings sailorskills-video \
sailorskills-booking sailorskills-marketing sailorskills-site sailorskills-shared; do
  echo "Creating staging branch for $service..."
  cd "$service" || continue
  git checkout main
  git pull origin main
  git checkout -b staging
  git push -u origin staging
  cd ..
done
```

---

## Phase 4: Vercel Configuration

For each of the 13 Vercel projects, you'll configure:
1. Staging branch deployment
2. Staging environment variables
3. Custom staging domain

### Step 4.1: Configure Critical Services First

**Order of priority:**
1. Login (SSO must work first)
2. Portal (customer-facing)
3. Operations (admin dashboard)
4. Billing (payment processing)
5. All remaining services

### Step 4.2: Configure Each Service in Vercel

**For sailorskills-login:**

1. Go to Vercel Dashboard → Project: `sailorskills-login`

2. **Settings → Git → Production Branch**:
   - Production Branch: `main`

3. **Settings → Environment Variables**:
   Click "Add" for each variable below, set Scope to: **Preview (staging branch only)**

   ```
   VITE_SUPABASE_URL
   Value: [Your staging Supabase URL from .env.staging]
   Scope: Preview

   VITE_SUPABASE_ANON_KEY
   Value: [Your staging anon key from .env.staging]
   Scope: Preview

   SUPABASE_SERVICE_KEY
   Value: [Your staging service key from .env.staging]
   Scope: Preview

   DATABASE_URL
   Value: [Your staging database URL from .env.staging]
   Scope: Preview
   ```

4. **Settings → Domains**:
   - Add custom domain: `login-staging.sailorskills.com`
   - Select branch: `staging`

5. **Deploy staging branch**:
   - Go to Deployments tab
   - Find latest deployment from `staging` branch
   - Click "Redeploy" to trigger with new env vars

**Repeat Step 4.2 for each service** with appropriate domain:

| Service | Staging Domain |
|---------|----------------|
| login | `login-staging.sailorskills.com` |
| operations | `ops-staging.sailorskills.com` |
| billing | `billing-staging.sailorskills.com` |
| portal | `portal-staging.sailorskills.com` |
| estimator | `diving-staging.sailorskills.com` |
| inventory | `inventory-staging.sailorskills.com` |
| insight | `insight-staging.sailorskills.com` |
| settings | `settings-staging.sailorskills.com` |
| video | `video-staging.sailorskills.com` |
| booking | `booking-staging.sailorskills.com` |
| marketing | `marketing-staging.sailorskills.com` |
| site | `staging.sailorskills.com` |

---

## Phase 5: DNS Configuration

**If using Vercel DNS** (recommended):

DNS records are automatically configured when you add custom domains in Vercel (Phase 4).

**If using external DNS provider:**

Add CNAME records for each staging subdomain:

```
login-staging.sailorskills.com → cname.vercel-dns.com
ops-staging.sailorskills.com → cname.vercel-dns.com
billing-staging.sailorskills.com → cname.vercel-dns.com
portal-staging.sailorskills.com → cname.vercel-dns.com
diving-staging.sailorskills.com → cname.vercel-dns.com
inventory-staging.sailorskills.com → cname.vercel-dns.com
insight-staging.sailorskills.com → cname.vercel-dns.com
settings-staging.sailorskills.com → cname.vercel-dns.com
video-staging.sailorskills.com → cname.vercel-dns.com
booking-staging.sailorskills.com → cname.vercel-dns.com
marketing-staging.sailorskills.com → cname.vercel-dns.com
staging.sailorskills.com → cname.vercel-dns.com
```

**SSL Certificates**: Automatically provisioned by Vercel (no action needed)

---

## Phase 6: SSO Configuration

(To be completed after Phases 4 & 5 are done)

Update the login service to detect staging environment and set appropriate cookie domain.

**Details**: Coming in Phase 6 implementation

---

## Phase 7: Playwright Configuration

(To be completed after staging services are deployed)

Update all Playwright config files to support staging environment testing.

**Details**: Coming in Phase 7 implementation

---

## Phase 8: GitHub Actions

(To be completed after Playwright configs are updated)

Update CI/CD workflows to run tests against staging environment.

**Details**: Coming in Phase 8 implementation

---

## Phase 9: Documentation Updates

(To be completed after staging is functional)

Create comprehensive documentation for using the staging environment.

**Details**: Coming in Phase 9 implementation

---

## Phase 10: Testing & Validation

(To be completed after all infrastructure is in place)

Comprehensive testing checklist for staging environment.

**Details**: Coming in Phase 10 implementation

---

## Phase 11: Team Training

(To be completed after testing passes)

Team documentation and quick reference guides.

**Details**: Coming in Phase 11 implementation

---

## Troubleshooting

### Database Connection Issues

**Problem**: `psql: error: connection to server failed`

**Solution**:
- Verify `DATABASE_URL_STAGING` in `.env.staging` is correct
- Check database password has no special characters that need escaping
- Try connecting directly: `psql "$DATABASE_URL_STAGING"`

### Schema Export Fails

**Problem**: `pg_dump: command not found`

**Solution**:
```bash
# macOS
brew install postgresql

# Verify
pg_dump --version
```

### Test Data Won't Seed

**Problem**: Foreign key constraint violations

**Solution**:
- Ensure schema was applied successfully first
- Check that all tables exist: `psql "$DATABASE_URL_STAGING" -c "\dt"`
- Verify you're connecting to staging, not production

### Vercel Environment Variables Not Working

**Problem**: Staging site still using production database

**Solution**:
- Verify env vars are scoped to "Preview" for `staging` branch
- Redeploy after adding environment variables
- Check deployment logs for which env vars are loaded

---

## Current Progress

**✅ Complete:**
- Phase 1: Documentation cleanup

**🔄 In Progress:**
- Phase 2: Database setup (scripts created, waiting for Supabase project creation)

**⏳ Pending:**
- Phases 3-11

---

## Next Steps

**Right now, you need to:**

1. **Create Supabase staging project** (Phase 2.1)
2. **Fill in `.env.staging`** with your credentials (Phase 2.2)
3. **Run database migration scripts** (Phase 2.3-2.5)
4. **Create test users** (Phase 2.6)

Then we'll continue with Phase 3!

---

**Questions?** Refer to the troubleshooting section or create an issue in the repo.
