# Vercel Deployment Fix Guide

**Issue:** Production login fails with "Failed to execute 'fetch' on 'Window': Invalid value"

**Diagnosis:** Environment variables are present but may have encoding issues, OR the bundle was built with old/invalid values

**Solution:** Re-enter environment variables in Vercel and trigger a fresh build

---

## 🔧 Step-by-Step Fix

### 1. Access Vercel Project Settings

Go to: https://vercel.com/[your-team]/sailorskills-settings/settings/environment-variables

### 2. Delete Existing Variables

Delete both variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**Why:** This ensures no hidden characters or encoding issues remain

### 3. Re-add Variables with Correct Values

Add `VITE_SUPABASE_URL`:
```
https://fzygakldvvzxmahkdylq.supabase.co
```

Add `VITE_SUPABASE_ANON_KEY`:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ6eWdha2xkdnZ6eG1haGtkeWxxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQwODM4OTgsImV4cCI6MjA2OTY1OTg5OH0.8BNDF5zmpk2HFdprTjsdOWTDh_XkAPdTnGo7omtiVIk
```

**CRITICAL CHECKS:**
- ✅ NO spaces before or after the values
- ✅ NO newlines or line breaks
- ✅ NO quotes around the values
- ✅ Copy-paste directly from this file (don't type manually)

### 4. Set Environment Scope

For both variables:
- ✅ Check "Production"
- ✅ Check "Preview"
- ✅ Check "Development"

### 5. Trigger a Fresh Build

**Option A: Redeploy from Vercel Dashboard**
1. Go to: https://vercel.com/[your-team]/sailorskills-settings
2. Click "Deployments" tab
3. Find the latest deployment
4. Click "⋯" (three dots menu)
5. Click "Redeploy"
6. **IMPORTANT:** Uncheck "Use existing Build Cache"
7. Click "Redeploy"

**Option B: Push a commit to trigger rebuild**
```bash
git commit --allow-empty -m "chore: trigger rebuild for env vars"
git push origin feature/settings-service
```

### 6. Wait for Deployment

Monitor the deployment at: https://vercel.com/[your-team]/sailorskills-settings

- Wait for "Building..." to complete
- Wait for "Deploying..." to complete
- Status should show "Ready"

### 7. Verify the Fix

Test at: https://sailorskills-settings.vercel.app/login.html

**Credentials:**
- Email: `standardhuman@gmail.com`
- Password: `KLRss!650`

**Success Criteria:**
- ✅ No console errors
- ✅ Login redirects to dashboard
- ✅ Dashboard loads without errors
- ✅ Can navigate to other pages

---

## 🧪 Testing Checklist

After deployment completes:

```bash
# Run automated test
python3 test_production_auth.py
```

Expected output:
```
✅ Login page loads: 200
✅ Login form found with email and password fields
✅ Filled credentials: standardhuman@gmail.com
✅ Clicked submit button
✅ Successfully redirected after login
✅ Dashboard heading found: Settings Dashboard
✅ No console errors detected!
```

Manual tests:
- [ ] Login works
- [ ] Dashboard displays correctly
- [ ] Email Manager loads
- [ ] System Config loads
- [ ] Users page loads
- [ ] Integrations page loads
- [ ] No console errors in any page

---

## 🔍 Understanding the Issue

### Why This Happens

**Vite's Build-Time Variable Replacement:**
- Vite replaces `import.meta.env.VITE_*` variables at **build time**
- The values are baked into the JavaScript bundle
- Updating env vars in Vercel doesn't affect existing bundles
- You must rebuild to get new values

**The "Invalid value" Error:**
- Occurs when `fetch()` receives an invalid URL parameter
- Could be: whitespace, newlines, undefined, empty string
- Happens before any network request is made

### Why Local Works But Production Doesn't

**Local Development:**
- Vite reads `.env.local` file
- Variables are injected fresh on every page load
- Changes take effect immediately

**Production Build:**
- Vite reads from `process.env` during build
- Values are compiled into bundle
- Bundle is deployed to Vercel
- Updating Vercel env vars doesn't change the bundle

---

## 🚨 Troubleshooting

### If Login Still Fails After Fix

**1. Check Browser Console**
```javascript
// Open browser console on login page and check:
console.log('Supabase URL exists:', !!import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key exists:', !!import.meta.env.VITE_SUPABASE_ANON_KEY);
```

**2. Check Build Logs**
- Go to: https://vercel.com/[your-team]/sailorskills-settings/deployments
- Click on the latest deployment
- Check "Build Logs" tab
- Look for environment variable confirmations

**3. Check Network Tab**
- Open browser DevTools → Network tab
- Attempt login
- Look for requests to `*.supabase.co`
- If no requests appear, the URL is invalid

**4. Check for Cached Bundles**
- Hard refresh the page: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows/Linux)
- Or clear browser cache completely

### If Environment Variables Don't Appear in Build

**Possible causes:**
1. Variables not scoped to "Production"
2. Build cache still using old values
3. Framework preset not set to "Vite"

**Fix:**
1. Go to Project Settings → General
2. Check "Framework Preset" is set to "Vite"
3. Go to Environment Variables
4. Verify both variables show "Production" badge
5. Trigger fresh deployment with cache disabled

---

## 📊 Success Indicators

**Console Log (should see):**
```
Environment check: {
  hasUrl: true,
  hasKey: true,
  urlValue: https://fzygakldvvzxmahkdylq.supabase.co,
  urlType: string,
  keyType: string
}
```

**Network Requests (should see):**
```
POST https://fzygakldvvzxmahkdylq.supabase.co/auth/v1/token?grant_type=password
Status: 200 OK
```

**No Errors:**
- No "Invalid value" errors
- No "Failed to fetch" errors
- No console errors at all

---

## 📞 If Still Not Working

Run the diagnostic script:
```bash
python3 test_env_vars.py
python3 test_network.py
```

Share the output for further diagnosis.

**Common issues:**
1. Environment variables have hidden characters
2. Build cache not cleared
3. Wrong Vercel project selected
4. Framework preset not set correctly
5. Variables not scoped to all environments

---

**Created:** 2025-11-07
**Last Updated:** 2025-11-07
**Status:** Ready for use
