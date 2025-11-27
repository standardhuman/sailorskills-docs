# GitHub Secrets Setup - Quick Reference
**Date:** 2025-10-29

## Add These Secrets to GitHub

Go to: https://github.com/[your-org]/sailorskills-repos/settings/secrets/actions

Click "New repository secret" for each:

---

### 1. TEST_DATABASE_URL

**Name:** `TEST_DATABASE_URL`

**Value:**
```
postgresql://postgres.fzygakldvvzxmahkdylq:hy9hiH%3FhB-6VaQP@aws-0-us-east-1.pooler.supabase.com:6543/postgres
```

**Purpose:** Database connection for running schema validation and RLS policy tests

---

### 2. VITE_SUPABASE_URL

**Name:** `VITE_SUPABASE_URL`

**Value:**
```
https://fzygakldvvzxmahkdylq.supabase.co
```

**Purpose:** Supabase project URL for tests

---

### 3. VITE_SUPABASE_ANON_KEY

**Name:** `VITE_SUPABASE_ANON_KEY`

**Value:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eWdha2xkdnZ6eG1haGtkeWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODM4OTgsImV4cCI6MjA2OTY1OTg5OH0.8BNDF5zmpk2HFdprTjsdOWTDh_XkAPdTnGo7omtiVIk
```

**Purpose:** Supabase anonymous key for client-side access

---

### 4. PRODUCTION_URL

**Name:** `PRODUCTION_URL`

**Value:**
```
https://portal.sailorskills.com
```

**Purpose:** Production URL for smoke tests after deployment

---

## Step-by-Step Instructions

1. **Open GitHub Secrets:**
   - Go to your repository on GitHub
   - Click "Settings" (top right)
   - Click "Secrets and variables" → "Actions" (left sidebar)

2. **Add Each Secret:**
   - Click "New repository secret"
   - Copy the **Name** exactly (e.g., `TEST_DATABASE_URL`)
   - Copy the **Value** exactly (including all special characters)
   - Click "Add secret"
   - Repeat for all 4 secrets

3. **Verify:**
   - You should see 4 secrets listed
   - Names should match exactly (case-sensitive)

---

## Testing the Setup

After adding secrets, we'll create a test PR to verify GitHub Actions can:
- ✅ Access the secrets
- ✅ Connect to Vercel preview deployments
- ✅ Run Playwright tests
- ✅ Validate database schema

---

**Next:** Add these secrets to GitHub, then we'll create a test PR!
