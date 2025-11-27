# Universal SSO Authentication Design

**Date:** 2025-11-07
**Status:** Design Complete - Ready for Implementation
**Goal:** Implement single sign-on (SSO) across all Sailorskills services

---

## Executive Summary

Implement universal SSO authentication across all Sailorskills services (Portal, Operations, Billing, Settings, Inventory, Booking, Video) using Supabase Auth with shared cookie domain. Users login once at `login.sailorskills.com` and gain automatic access to all services based on their role (customer/staff/admin).

**Key Benefits:**
- ✅ Login once, access all authorized services
- ✅ Centralized session management
- ✅ Role-based access control
- ✅ Consistent logout across all services
- ✅ Leverages existing Supabase Auth (Portal, Settings already using it)

---

## Architecture Overview

### How SSO Works

1. **Single Login Point**: User logs in at `login.sailorskills.com`
2. **Supabase Creates Session**: Supabase Auth creates session with JWT token
3. **Shared Cookie**: Session cookie set with `domain=.sailorskills.com` (all subdomains)
4. **Automatic Access**: User navigates to any service - session already present
5. **Role Check**: Each service validates user role and shows appropriate UI

### Components

- **Supabase Auth**: Handles authentication, session tokens, refresh tokens
- **sailorskills-login**: New lightweight service at `login.sailorskills.com`
- **Shared Auth Module**: Centralized auth guards in `sailorskills-shared/src/auth/`
- **Role-Based Guards**: `requireAuth()`, `requireCustomer()`, `requireStaff()`, `requireAdmin()`
- **User Profile Table**: `user_profiles` table with role assignments

---

## Database Schema

### User Tables Structure

```sql
-- Core Supabase auth table (managed by Supabase)
auth.users
├── id (UUID)
├── email
├── encrypted_password
└── created_at

-- User profiles table (source of truth for roles)
user_profiles
├── user_id (UUID) → auth.users(id)
├── role (TEXT) → 'customer' | 'staff' | 'admin'
├── service_access (JSONB) → { "portal": true, "operations": true, etc. }
├── is_active (BOOLEAN)
└── metadata (JSONB) → custom fields per role

-- Customer-specific table (Portal users)
customers
├── id (UUID)
├── user_id (UUID) → auth.users(id) [NULLABLE for backward compatibility]
├── name, email, phone
└── customer_id (legacy)

-- Customer accounts (Portal's current auth table)
customer_accounts
├── id (UUID) → auth.users(id)
├── email
├── is_admin (BOOLEAN)
├── last_login_at
└── notification_preferences (JSONB)
```

### Role Hierarchy

- **customer**: Access Portal, Booking (own data only via RLS)
- **staff**: Access Operations, Billing, Inventory (all customer data)
- **admin**: Access everything including Settings (full system access)

### Migration Strategy

Currently two user systems exist:
1. **Portal**: Uses `customer_accounts` with Supabase Auth
2. **Settings**: Uses `user_profiles` with admin role check

**Unification Plan:**
- All users in `auth.users` (Supabase managed)
- `user_profiles` becomes source of truth for roles
- `customer_accounts` maintained for backward compatibility or migrated to `user_profiles`

---

## Shared Cookie Configuration

### Supabase Client Setup

```javascript
// In sailorskills-shared/src/auth/supabase-client.js
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: customStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce'
    },
    cookieOptions: {
      name: 'sb-auth-token',
      domain: '.sailorskills.com',  // KEY: Dot prefix = all subdomains
      path: '/',
      sameSite: 'lax',
      maxAge: 604800  // 7 days
    }
  }
)
```

### Custom Storage Implementation

```javascript
// Handles localStorage with domain-aware cookie fallback
const customStorage = {
  getItem: (key) => {
    return localStorage.getItem(key) || getCookie(key)
  },
  setItem: (key, value) => {
    localStorage.setItem(key, value)
    setCookie(key, value, { domain: '.sailorskills.com' })
  },
  removeItem: (key) => {
    localStorage.removeItem(key)
    deleteCookie(key, { domain: '.sailorskills.com' })
  }
}
```

### Session Lifecycle

1. User logs in at any service → Supabase creates session
2. Cookie set with `.sailorskills.com` domain
3. User navigates to different subdomain → cookie automatically sent
4. New service reads cookie → session already authenticated
5. User logs out from any service → all services see logout

### Security Considerations

- ✅ HTTPS required (Vercel provides automatically)
- ✅ `sameSite: 'lax'` prevents CSRF while allowing subdomain navigation
- ✅ PKCE flow adds extra security layer
- ✅ Tokens auto-refresh before expiry
- ✅ HTTP-only cookies (Supabase default)
- ✅ Role verified on every protected route
- ✅ RLS policies enforce database-level security

---

## Login Service Architecture

### New Service: `sailorskills-login`

**Deployment:** `login.sailorskills.com`

**Purpose:** Centralized authentication entry point (neutral, not tied to any specific service)

```
sailorskills-login/
├── login.html              # Main login page
├── signup.html             # Customer signup
├── reset-password.html     # Password reset
├── src/
│   ├── auth/
│   │   ├── login.js        # Login logic
│   │   ├── signup.js       # Signup logic
│   │   └── reset.js        # Reset logic
│   └── lib/
│       └── supabase.js     # Supabase client
├── shared/                 # Git submodule (reuse Portal UI components)
├── vite.config.js
├── vercel.json            # Deploy to login.sailorskills.com
└── package.json
```

**UI Design:** Reuses Portal's login modal design (clean, professional)

### Login Flow

1. User visits `operations.sailorskills.com`
2. `requireStaff()` runs, no session found
3. Redirect to `login.sailorskills.com/login.html?redirect=https://operations.sailorskills.com`
4. User logs in, Supabase sets session cookie with `domain=.sailorskills.com`
5. Redirect back to `operations.sailorskills.com`
6. Session cookie is present, user is authenticated

### Future Migration Path

**Phase 2 (After Wix Migration):**
- When marketing site moves to Vercel, integrate login pages at `sailorskills.com/login.html`
- Update auth guards to redirect to root domain instead
- Cookie domain stays the same - no changes to SSO behavior
- Easy migration: just change redirect URLs in auth guards

---

## Shared Auth Module

### Package Structure

```
sailorskills-shared/src/auth/
├── supabase-client.js       # Configured Supabase client (shared cookie setup)
├── auth-core.js             # Core auth functions (login, logout, getUser)
├── auth-guards.js           # Role-based access guards
├── auth-storage.js          # Custom storage implementation
└── index.js                 # Public API exports
```

### Core Auth Functions

**File:** `auth-core.js`

```javascript
// Login (works from any service)
export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { success: false, error: error.message }

  // Fetch user role from user_profiles
  const { role, serviceAccess } = await getUserRole(data.user.id)

  return { success: true, user: data.user, role, serviceAccess }
}

// Get current authenticated user with role
export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { user: null, role: null }

  const { role, serviceAccess } = await getUserRole(user.id)
  return { user, role, serviceAccess }
}

// Logout (clears session across all services)
export async function logout() {
  await supabase.auth.signOut()
  // Cookie automatically cleared by Supabase
}

// Get user role from user_profiles table
async function getUserRole(userId) {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('role, service_access')
    .eq('user_id', userId)
    .single()

  if (error) {
    console.error('Failed to fetch user role:', error)
    return { role: null, serviceAccess: {} }
  }

  return { role: data.role, serviceAccess: data.service_access || {} }
}
```

### Auth Guards

**File:** `auth-guards.js`

```javascript
const LOGIN_URL = 'https://login.sailorskills.com/login.html'

// Base authentication check
export async function requireAuth() {
  const { user } = await getCurrentUser()
  if (!user) {
    sessionStorage.setItem('redirectAfterLogin', window.location.href)
    window.location.href = LOGIN_URL
    return false
  }
  return user
}

// Customer-only access (Portal, Booking)
export async function requireCustomer() {
  const { user, role } = await getCurrentUser()
  if (!user || !['customer', 'admin'].includes(role)) {
    sessionStorage.setItem('redirectAfterLogin', window.location.href)
    window.location.href = LOGIN_URL
    return false
  }
  return { user, role }
}

// Staff access (Operations, Billing, Inventory)
export async function requireStaff() {
  const { user, role } = await getCurrentUser()
  if (!user || !['staff', 'admin'].includes(role)) {
    showAccessDenied('This service requires staff access')
    return false
  }
  return { user, role }
}

// Admin-only access (Settings)
export async function requireAdmin() {
  const { user, role } = await getCurrentUser()
  if (!user || role !== 'admin') {
    showAccessDenied('This service requires admin access')
    return false
  }
  return { user, role }
}

// Show access denied modal
function showAccessDenied(message) {
  const modal = document.createElement('div')
  modal.className = 'access-denied-modal'
  modal.innerHTML = `
    <div class="modal-content">
      <h2>🚫 Access Denied</h2>
      <p>${message}</p>
      <p>Your account type: <strong>${role}</strong></p>
      <button onclick="window.location.href='https://portal.sailorskills.com'">
        Go to Customer Portal
      </button>
    </div>
  `
  document.body.appendChild(modal)
}
```

### Usage in Services

```javascript
// In any service (e.g., operations/src/main.js)
import { requireStaff } from '@sailorskills/shared/auth'

async function init() {
  const auth = await requireStaff()
  if (!auth) return  // Guard redirected or blocked

  // Continue with authenticated user
  console.log('Logged in as:', auth.user.email, 'Role:', auth.role)
  loadDashboard()
}
```

---

## Migration & Rollout Plan

### Current State Analysis

Services have different auth implementations:

1. **Portal** (`portal.sailorskills.com`): ✅ Full Supabase Auth working
2. **Settings** (`settings.sailorskills.com`): ✅ Supabase Auth with admin guards
3. **Operations** (`operations.sailorskills.com`): Uses `SimpleAuth` (password hash)
4. **Billing** (`billing.sailorskills.com`): Likely similar to Operations
5. **Inventory, Booking, Video**: Need to check current auth implementation

### Migration Phases

**Phase 1: Foundation (Week 1)**
- [ ] Create `sailorskills-login` service
- [ ] Deploy to `login.sailorskills.com`
- [ ] Update `sailorskills-shared` auth module with SSO-ready guards
- [ ] Configure Supabase cookie domain setting
- [ ] Test cookie sharing across subdomains

**Phase 2: Database Migration (Week 1-2)**
- [ ] Unify user tables (`user_profiles` becomes source of truth)
- [ ] Migrate existing Portal users (currently in `customer_accounts`)
- [ ] Create staff/admin users in `user_profiles` table
- [ ] Set up RLS policies for role-based access
- [ ] Test role-based queries

**Phase 3: Service Migration (Week 2-4)**
- [ ] Migrate Settings (already uses Supabase, just update to shared module)
- [ ] Migrate Operations (replace `SimpleAuth` with Supabase auth)
- [ ] Migrate Billing (replace `SimpleAuth` with Supabase auth)
- [ ] Migrate Inventory (replace `SimpleAuth` with Supabase auth)
- [ ] Migrate Booking (replace `SimpleAuth` with Supabase auth)
- [ ] Migrate Video (replace `SimpleAuth` with Supabase auth)
- [ ] Portal stays as-is (already using Supabase Auth correctly)

**Phase 4: SSO Validation (Week 4)**
- [ ] Test cross-service navigation (login once, access all)
- [ ] Verify role-based access (customer can't access Operations)
- [ ] Test logout propagation (logout from one service = all services)
- [ ] Playwright end-to-end tests across services
- [ ] Performance testing (cookie overhead, session validation speed)

### Rollback Safety

- Each service keeps old auth code until SSO confirmed working
- Feature flag: `USE_SSO=true` environment variable per service
- Can roll back per-service if issues arise
- Database changes are additive (don't delete old tables during migration)

### Testing Strategy

- Test with real users (internal team) before customers
- Create test accounts for each role:
  - `customer-test@sailorskills.com` (role: customer)
  - `staff-test@sailorskills.com` (role: staff)
  - `admin-test@sailorskills.com` (role: admin)
- Verify cross-service navigation works
- Check cookie persistence (7 day expiry)
- Test multi-tab behavior (logout propagation)

---

## Error Handling & Edge Cases

### Common Scenarios

**1. Session Expiry**
```javascript
// Auto-refresh tokens before expiry
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    console.log('Session refreshed automatically')
  }
  if (event === 'SIGNED_OUT') {
    window.location.href = 'https://login.sailorskills.com/login.html'
  }
})
```

**2. Role Changes**
- Admin demotes a user from staff → customer
- User's next page load checks fresh role from database
- If role changed, may lose access to current service
- Show friendly message: "Your access level has changed. Redirecting..."

**3. Multi-Tab Behavior**
- User logs out in one tab
- Supabase broadcasts `SIGNED_OUT` event to all tabs via Broadcast Channel API
- All tabs redirect to login simultaneously

**4. Network Failures**
- Cookie present but can't reach Supabase to validate
- Show: "Connection issue. Retrying..."
- Retry with exponential backoff (1s, 2s, 4s)
- After 3 failures, redirect to login

**5. Invalid/Corrupted Session**
- Cookie exists but token is invalid
- Supabase returns 401
- Clear cookie, redirect to login
- Silent recovery (no error shown to user)

**6. Cross-Browser Sessions**
- User logs in on Chrome, opens Safari
- Cookie is browser-specific (by design for security)
- User needs to login again on Safari
- Expected behavior (not a bug)

**7. Access Denied Scenarios**
- Customer tries to access Operations → Show access denied modal
- Staff tries to access Settings → Show access denied modal
- Non-authenticated user tries any service → Redirect to login

**8. Migration Period Edge Cases**
- Some services on SSO, some still on old auth
- User needs separate logins during migration
- Clear communication: "We're upgrading authentication. You may need to login again."
- Track which services migrated via `SSO_ENABLED` env var

### Monitoring & Debugging

```javascript
// Add to shared auth module
export function enableAuthDebugMode() {
  if (import.meta.env.DEV) {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth Debug]', event, {
        userId: session?.user?.id,
        expiresAt: session?.expires_at,
        role: session?.user?.user_metadata?.role
      })
    })
  }
}
```

---

## Service-Specific Implementation

### Portal (Already Using Supabase Auth)

**Changes Required:**
- Update to use shared auth module from `sailorskills-shared`
- Change login redirect to `login.sailorskills.com`
- Add `requireCustomer()` guard to all pages
- Remove local auth implementation, use shared

### Settings (Recently Added Supabase Auth)

**Changes Required:**
- Update to use shared auth module
- Change login redirect to `login.sailorskills.com`
- Keep `requireAdmin()` guard
- Ensure cookie domain is `.sailorskills.com`

### Operations (Currently Uses SimpleAuth)

**Changes Required:**
- Remove `SimpleAuth` implementation
- Add shared auth module from `sailorskills-shared`
- Add `requireStaff()` guard to all pages
- Update login flow to redirect to `login.sailorskills.com`
- Test with staff/admin users

### Billing, Inventory, Booking, Video

**Similar to Operations:**
- Replace `SimpleAuth` with shared Supabase auth
- Add appropriate role guards (`requireStaff()`)
- Update login redirects
- Test thoroughly

---

## Success Criteria

SSO implementation is complete when:

- [ ] User can login at `login.sailorskills.com`
- [ ] Session cookie set with `domain=.sailorskills.com`
- [ ] User navigates to any authorized service without re-login
- [ ] Role-based access enforced (customer can't access Operations)
- [ ] Logout from any service clears session across all services
- [ ] All services migrated from `SimpleAuth` to Supabase Auth
- [ ] Playwright tests verify cross-service navigation
- [ ] Production tested with real users (internal team)
- [ ] No console errors or authentication failures
- [ ] Session persists across browser restarts (7 day cookie)

---

## Future Enhancements

### Phase 2: Marketing Site Integration
- When `sailorskills.com` migrates from Wix to Vercel
- Move login pages from `login.sailorskills.com` to `sailorskills.com/login.html`
- Update auth guard redirect URLs
- No changes to SSO behavior (cookie domain stays the same)

### Potential Features
- OAuth providers (Google, Microsoft)
- Two-factor authentication (2FA)
- Remember Me option (30-day cookie)
- Session activity logging
- Account security dashboard
- Password strength requirements
- Magic link authentication for customers

---

## Technical References

### Supabase Documentation
- [Auth: Sessions](https://supabase.com/docs/guides/auth/sessions)
- [Auth: Cookie-based Auth](https://supabase.com/docs/guides/auth/server-side/cookies)
- [PKCE Flow](https://supabase.com/docs/guides/auth/server-side/pkce-flow)

### Related Documents
- `sailorskills-settings/HANDOFF_2025-11-07_AUTHENTICATION.md` - Settings auth implementation
- `sailorskills-portal/CLAUDE.md` - Portal authentication overview
- `sailorskills-shared/README.md` - Shared package documentation

---

**Last Updated:** 2025-11-07
**Status:** Design Complete - Ready for Implementation
**Next Step:** Create `sailorskills-login` service and shared auth module
