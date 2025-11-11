# Logout Redirect Loop Fix

**Date:** 2025-11-10
**Status:** ✅ FIXED - Logout now properly clears hash tokens and prevents loops
**Related:** Magic Link PKCE Fix (HANDOFF_2025-11-10_MAGIC_LINK_PKCE_FIX.md)

---

## 🎯 Problem Summary

After clicking logout in the portal, users experienced an infinite redirect loop between:
1. `https://portal.sailorskills.com/portal.html#access_token=...`
2. `https://login.sailorskills.com/login.html?redirect=https://portal.sailorskills.com/portal.html`

The loop occurred because:
- Portal cleared localStorage but not URL hash tokens
- Login service detected hash tokens and tried to establish session
- Hash tokens were stale/expired, so session establishment failed
- User stayed on login page but with hash tokens still in URL
- Browser cache/history preserved these tokens
- Subsequent visits triggered the same flow

---

## 🔍 Root Cause Analysis

### The Logout Flow (Broken)

**Portal logout (auth.js:227):**
```javascript
1. clearImpersonation()
2. supabase.auth.signOut() ✅
3. Clear localStorage (supabase keys) ✅
4. Clear sessionStorage ✅
5. Redirect to: login.sailorskills.com?redirect=portal.sailorskills.com/portal.html ✅
```

**Missing:** Clean URL hash tokens before redirect ❌

**Result:** URL like `portal.html#access_token=...` gets added to browser history

### The Login Detection (Broken)

**Login service (login.js:10):**
```javascript
1. Check for hash tokens: window.location.hash.includes('access_token') ✅
2. Wait for Supabase auto-detection (500ms) ✅
3. Try to get session: supabase.auth.getSession() ✅
4. If no session established → show warning ⚠️
5. BUT: Don't clear the hash tokens ❌
```

**Missing:** Clear stale tokens when session can't be established ❌

**Result:** Hash tokens remain in URL, triggering same flow on every page load/navigation

### Why Hash Tokens Persisted

1. **Browser history caching** - URLs with hash fragments are cached
2. **No explicit cleanup** - Neither service cleared the hash after failed auth
3. **Implicit flow behavior** - Hash tokens are meant to be ephemeral but weren't cleaned up
4. **Logout doesn't clear hash** - `window.location.href = newURL` preserves current hash in browser state

---

## ✅ The Solution

### Portal Fix (src/auth/auth.js)

**Added hash cleanup before redirect:**
```javascript
// Clean up URL hash to remove any lingering tokens
if (window.location.hash) {
  history.replaceState(null, '', window.location.pathname + window.location.search);
}

// Redirect to SSO login service (simplified, no redirect param needed)
window.location.href = "https://login.sailorskills.com/login.html";
```

**Changes:**
1. ✅ Clear hash before redirecting using `history.replaceState()`
2. ✅ Simplified redirect URL (removed `?redirect=` param - not needed after login)
3. ✅ Prevents hash tokens from being cached in browser history

### Login Fix (src/auth/login.js)

**Added defensive token cleanup:**
```javascript
if (hasHashTokens) {
  // ... wait for Supabase detection
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    console.error('[LOGIN] Session error:', error)
    // NEW: Clear invalid hash tokens to prevent loops
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  } else if (session) {
    // Established session - redirect as before
  } else {
    console.warn('[LOGIN] Hash tokens present but no session - clearing stale tokens')
    // NEW: Clear stale hash tokens (likely from logout redirect)
    if (window.location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }
}
```

**Changes:**
1. ✅ Clear hash tokens when session error occurs
2. ✅ Clear hash tokens when tokens present but no session established
3. ✅ Prevents stale tokens from triggering repeated auth attempts

---

## 🧪 Testing Instructions

### Test Logout Flow

1. **Login to portal:**
   - Go to https://login.sailorskills.com
   - Use magic link or password login
   - Verify portal loads with boat data

2. **Click logout:**
   - Click logout button in portal navigation
   - Should redirect to login page
   - URL should be: `https://login.sailorskills.com/login.html` (no hash)

3. **Verify no loop:**
   - Should stay on login page
   - Should see login form
   - Check console for: `[LOGIN] No session found, showing login form`
   - Should NOT see repeated redirect messages

4. **Check URL cleanup:**
   - Inspect URL bar - should have NO `#access_token=...`
   - Check browser history - previous portal URL should have NO hash

5. **Test repeat logout:**
   - Login again
   - Logout again
   - Should behave identically (no cumulative issues)

### Expected Console Output

**After clicking logout:**
```
[PORTAL] Logging out...
[LOGIN] Session check: { hasSession: false }
[LOGIN] No session found, showing login form
```

**Should NOT see:**
```
❌ [LOGIN] Magic link tokens detected in hash...
❌ [LOGIN] Hash tokens present but no session established (repeatedly)
❌ [PORTAL DEBUG] access_token detected in hash...
```

---

## 📊 Comparison: Before vs After

| Behavior | Before Fix | After Fix |
|----------|-----------|-----------|
| **Logout redirect** | portal → login with stale hash | portal → login (clean URL) |
| **Hash tokens** | Preserved in URL/history | Cleared before redirect |
| **Login detection** | Detected stale tokens, no cleanup | Detects and clears stale tokens |
| **Loop prevention** | ❌ No mechanism | ✅ Defensive cleanup at both ends |
| **Browser history** | Polluted with hash tokens | Clean URLs only |

---

## 🔑 Key Insights

### Why history.replaceState?

**Not `window.location.hash = ''`:**
- This would ADD a new history entry
- User pressing back would see `portal.html#` (with empty hash)

**Using `history.replaceState()`:**
- Replaces current history entry
- Removes hash entirely from URL
- Doesn't create new history state
- Clean URL in browser bar and history

### Why Clear in Both Services?

**Defense in depth:**
- **Portal cleanup** - Prevents tokens from entering browser history
- **Login cleanup** - Handles edge cases (cached pages, direct navigation, bookmarks)
- **Together** - Comprehensive protection against loop conditions

**Example edge cases handled:**
- User bookmarks portal page with hash tokens
- Browser auto-restores previous session
- Email client pre-fetches links with tokens
- Network issues during logout redirect

### Implicit Flow Considerations

**Hash tokens are meant to be ephemeral:**
- OAuth implicit flow uses hash specifically because it doesn't reach server
- Client is responsible for consuming and clearing tokens
- Tokens should NEVER persist in browser history or cache

**Our implementation:**
- ✅ Consume tokens immediately on portal load (setSession)
- ✅ Clear hash after consumption (history.replaceState)
- ✅ Clear hash on logout (prevent caching)
- ✅ Clear stale tokens on login service (defensive)

---

## 🚀 Deployment Status

### Commits

**Portal Service:**
- **86a8b62** - `fix: prevent logout redirect loop by cleaning hash tokens`
  - Clean hash before redirect
  - Simplified logout redirect URL
  - Deployed: 2025-11-10 22:37 EST

**Login Service:**
- **084b7ea** - `fix: clear stale hash tokens to prevent logout loops`
  - Clear tokens if session can't be established
  - Clear tokens on error
  - Deployed: 2025-11-10 22:38 EST

### Production Deployments

**Portal:**
- Latest: `https://sailorskills-portal-c6eeutxke-sailorskills.vercel.app`
- Status: ✅ Ready
- Custom domain: https://portal.sailorskills.com

**Login:**
- Latest: `https://sailorskills-login-op377xe9w-sailorskills.vercel.app`
- Status: ✅ Ready
- Custom domain: https://login.sailorskills.com

---

## 📝 Related Issues

### This Fix Complements

1. **Magic Link PKCE → Implicit Fix**
   - Magic links now use implicit flow (hash tokens)
   - This fix ensures those tokens are properly cleaned up
   - Prevents logout loops specifically with implicit flow

2. **Previous Redirect Loop Fixes**
   - Removed `type=recovery` from session transfers
   - Fixed race conditions in auth callback processing
   - This adds logout-specific cleanup

### Future Improvements

1. **Session expiration handling**
   - Detect when session expires during active use
   - Show user-friendly message
   - Auto-redirect to login with clean state

2. **Token refresh on portal**
   - Implement automatic token refresh
   - Prevent session expiration during active use
   - Maintain seamless user experience

3. **Remember me option**
   - Longer session duration setting
   - Persistent across browser restarts
   - With proper security considerations

---

## 💡 Lessons Learned

### Browser History is Not Your Friend

**URLs with hash fragments are cached aggressively:**
- Browser back/forward preserves full URL including hash
- Auto-restore session features preserve hashes
- Bookmarks capture current URL state

**Solution:** Explicitly clean up using `history.replaceState()` - don't rely on redirects to clear state

### Defensive Programming for Auth

**Never assume tokens are valid:**
- Just because tokens are in URL doesn't mean they're valid
- Always verify with `getSession()` before trusting
- Clear invalid/stale tokens immediately

**Fail safely:**
- If session establishment fails, clean up and show login
- Don't leave system in ambiguous state
- Prefer showing login form over error loops

### Implicit Flow Requires Explicit Cleanup

**OAuth implicit flow is client-side:**
- Tokens in hash are client's responsibility
- Server never sees them (good for security)
- Client must consume AND clean up

**Best practices:**
1. Consume tokens immediately
2. Clear hash after consumption
3. Never allow tokens to persist in history
4. Clear on logout explicitly

---

## 📞 Troubleshooting

### "Still seeing redirect loop after logout"

**Diagnosis:**
1. Clear browser cache and localStorage: `localStorage.clear()`
2. Check browser console for: `[LOGIN] Hash tokens present but no session`
3. Verify latest deployments are live (check Vercel)
4. Try in private/incognito window

**If still loops:**
- Check browser history - manually clear history
- Test in different browser
- Verify both services deployed successfully

### "Logout redirects but shows portal again"

**Diagnosis:**
- Likely a valid session still exists
- Check: `localStorage` for supabase keys
- Check: Another tab with active session

**Solution:**
- Close all browser tabs for portal/login
- Clear localStorage completely
- Try logout again

### "Login page shows blank/stuck"

**Diagnosis:**
- Check console for JavaScript errors
- Look for: `[LOGIN] Session check:` log

**Solution:**
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Clear cache
- Verify login service deployment

---

## 🎓 Related Documentation

- [Magic Link PKCE Fix](HANDOFF_2025-11-10_MAGIC_LINK_PKCE_FIX.md) - Why we use implicit flow
- [Initial Magic Link Handoff](HANDOFF_2025-11-10_MAGIC_LINK_AUTHENTICATION_FIX.md) - Original debugging
- [Supabase Implicit Flow](https://supabase.com/docs/guides/auth/server-side/oauth-with-pkce-flow-for-ssr#implicit-flow)

---

**Last Updated:** 2025-11-10 22:40 EST
**Next Review:** After testing logout across multiple scenarios
**Owner:** Brian
**Assisted by:** Claude Code

**Status:** ✅ RESOLVED - Logout properly clears tokens and prevents loops
