# Settings Service Troubleshooting Guide

## Current Issue: Login Fails in Production

### Symptoms
- Error: `TypeError: Failed to execute 'fetch' on 'Window': Invalid value`
- Occurs when calling `supabase.auth.signInWithPassword()`
- Local development works perfectly ✅
- Production deployment fails ❌

### Root Cause Investigation

**What We've Confirmed:**
1. ✅ Environment variables ARE set in Vercel (both shared and project-level)
2. ✅ Environment variables ARE baked into the build (verified in bundle)
3. ✅ Supabase URL is correct: `https://fzygakldvvzxmahkdylq.supabase.co`
4. ✅ Authentication works locally with same credentials
5. ✅ RLS policies have been fixed
6. ✅ Admin user profile exists in database

**What's Still Wrong:**
- Production login fails with "Invalid value" header error
- This typically means invalid characters or formatting in HTTP headers
- The error occurs deep in the Supabase client's fetch call

### Potential Causes

1. **Environment Variable Encoding Issues**
   - Vercel might be adding extra characters or newlines
   - Copy/paste artifacts in the Vercel dashboard
   - Special character encoding

2. **Build-Time vs Runtime Discrepancy**
   - Vite replaces `import.meta.env.VITE_*` at build time
   - If values changed after build, old values persist

3. **Vercel Deployment Cache**
   - Edge network might be serving cached version
   - Even after redeploy, cache might not clear

### Immediate Action Required

**Step 1: Verify Vercel Environment Variables**

Go to: https://vercel.com/[team]/sailorskills-settings/settings/environment-variables

For BOTH variables, click the three dots and "Edit":
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Check for:**
- Extra whitespace before/after the value
- Hidden characters (copy to text editor to check)
- Newlines in the value
- Quote marks around the value (there should be NONE)

**Correct Values (no quotes, no spaces):**
```
VITE_SUPABASE_URL
https://fzygakldvvzxmahkdylq.supabase.co

VITE_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eWdha2xkdnZ6eG1haGtkeWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODM4OTgsImV4cCI6MjA2OTY1OTg5OH0.8BNDF5zmpk2HFdprTjsdOWTDh_XkAPdTnGo7omtiVIk
```

**Step 2: Force Complete Rebuild**

After fixing any issues in Step 1:

```bash
# In this directory
git commit --allow-empty -m "chore: force complete rebuild"
git push
```

**Step 3: Clear Edge Cache**

In Vercel dashboard:
1. Go to Deployments
2. Find latest deployment
3. Click three dots → "Redeploy"
4. **UNCHECK "Use existing Build Cache"**
5. Click Redeploy

**Step 4: Test with Hard Refresh**

Once deployment completes:
1. Open: https://sailorskills-settings.vercel.app/login.html
2. **Hard refresh:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. Open DevTools Console (F12)
4. Try logging in

Look for:
```
Environment check: {hasUrl: true, hasKey: true, urlValue: ..., urlLength: X, keyLength: Y}
```

If `urlLength` and `keyLength` are shown, you have the latest build.

### Alternative: Check Live Values

To see exactly what's in production, run this in the browser console on the login page:

```javascript
// This won't work because import.meta.env is build-time only
// But you can check the network request headers
```

Actually, let's add a debug endpoint. The test file `test-auth.mjs` can be used to verify locally.

### If Still Failing

**Try Alternative Supabase Client Creation:**

The current code uses:
```javascript
export const supabase = createClient(cleanUrl, cleanKey, {
  auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
});
```

If this continues to fail, we may need to investigate:
1. Supabase service status
2. CORS configuration in Supabase project
3. Supabase Auth settings in dashboard

### Success Criteria

When fixed, you should see:
1. No console errors on login page load
2. Successful login redirect to dashboard
3. Console shows: "SIGNED_IN" event

### Files Modified in This Session

- `src/lib/supabase-client.js` - Added validation and trimming
- `src/lib/auth-guard.js` - NEW: Authentication guards
- `login.html` - NEW: Login page
- `src/views/dashboard.js` - Added auth requirement
- `src/views/system-config.js` - Added auth requirement
- `test-auth.mjs` - NEW: Automated auth testing
- Database: Fixed RLS policies, created admin user

### Test Locally

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-settings
npm run dev
# Visit: http://localhost:5178/login.html
# Login with: standardhuman@gmail.com / KLRss!650
```

Local should work perfectly. If it does, the issue is purely in the Vercel deployment/environment configuration.
