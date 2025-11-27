# Universal SSO Authentication Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement single sign-on (SSO) across all Sailorskills services using Supabase Auth with shared cookie domain.

**Architecture:** Create centralized login service at `login.sailorskills.com`, extract auth logic to shared package, configure Supabase with `.sailorskills.com` cookie domain, implement role-based guards (customer/staff/admin), migrate all services from SimpleAuth to Supabase Auth.

**Tech Stack:** Supabase Auth, Vite, Vanilla JavaScript, PostgreSQL, Vercel

---

## Prerequisites

- [ ] Design document reviewed: `docs/plans/2025-11-07-universal-sso-design.md`
- [ ] Worktree created: `.worktrees/feature/universal-sso`
- [ ] Supabase project credentials available
- [ ] Test accounts ready: customer, staff, admin

---

## Phase 1: Shared Auth Module Foundation

### Task 1: Create Shared Auth Storage Module

**Files:**
- Create: `sailorskills-shared/src/auth/auth-storage.js`
- Create: `sailorskills-shared/src/auth/auth-storage.test.js`

**Step 1: Write failing test for cookie operations**

Create `sailorskills-shared/src/auth/auth-storage.test.js`:

```javascript
import { describe, it, expect, beforeEach } from 'vitest'
import { getCookie, setCookie, deleteCookie } from './auth-storage.js'

describe('Auth Storage - Cookie Operations', () => {
  beforeEach(() => {
    // Clear all cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
  })

  it('should set cookie with domain', () => {
    setCookie('test-key', 'test-value', { domain: '.sailorskills.com' })
    const value = getCookie('test-key')
    expect(value).toBe('test-value')
  })

  it('should delete cookie', () => {
    setCookie('test-key', 'test-value')
    deleteCookie('test-key')
    const value = getCookie('test-key')
    expect(value).toBeNull()
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd sailorskills-shared
npm test auth-storage.test.js
```

Expected: FAIL with "Cannot find module './auth-storage.js'"

**Step 3: Write minimal implementation**

Create `sailorskills-shared/src/auth/auth-storage.js`:

```javascript
/**
 * Cookie utilities for cross-subdomain authentication
 */

/**
 * Get cookie value by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null
 */
export function getCookie(name) {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop().split(';').shift()
  }
  return null
}

/**
 * Set cookie with options
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {Object} options - Cookie options
 */
export function setCookie(name, value, options = {}) {
  const {
    domain = '',
    path = '/',
    maxAge = 604800, // 7 days default
    sameSite = 'lax',
    secure = true
  } = options

  let cookie = `${name}=${value}; path=${path}; max-age=${maxAge}; samesite=${sameSite}`

  if (domain) {
    cookie += `; domain=${domain}`
  }

  if (secure) {
    cookie += '; secure'
  }

  document.cookie = cookie
}

/**
 * Delete cookie by name
 * @param {string} name - Cookie name
 * @param {Object} options - Cookie options (must match original)
 */
export function deleteCookie(name, options = {}) {
  setCookie(name, '', { ...options, maxAge: -1 })
}

/**
 * Custom storage for Supabase that uses cookies with domain
 */
export const customStorage = {
  getItem: (key) => {
    // Try localStorage first (faster), fallback to cookie
    const localValue = localStorage.getItem(key)
    if (localValue) return localValue
    return getCookie(key)
  },

  setItem: (key, value) => {
    // Set in both localStorage and cookie for redundancy
    localStorage.setItem(key, value)
    setCookie(key, value, { domain: '.sailorskills.com' })
  },

  removeItem: (key) => {
    localStorage.removeItem(key)
    deleteCookie(key, { domain: '.sailorskills.com' })
  }
}
```

**Step 4: Run test to verify it passes**

```bash
cd sailorskills-shared
npm test auth-storage.test.js
```

Expected: PASS (2 tests)

**Step 5: Commit**

```bash
git add sailorskills-shared/src/auth/auth-storage.js sailorskills-shared/src/auth/auth-storage.test.js
git commit -m "feat(shared): add auth storage with cookie domain support"
```

---

### Task 2: Create Shared Supabase Client

**Files:**
- Create: `sailorskills-shared/src/auth/supabase-client.js`
- Modify: `sailorskills-shared/package.json` (add @supabase/supabase-js dependency)

**Step 1: Add Supabase dependency**

```bash
cd sailorskills-shared
npm install @supabase/supabase-js
```

**Step 2: Create Supabase client with SSO configuration**

Create `sailorskills-shared/src/auth/supabase-client.js`:

```javascript
import { createClient } from '@supabase/supabase-js'
import { customStorage } from './auth-storage.js'

// Environment variables will be provided by each service
const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration. Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY')
}

/**
 * Shared Supabase client configured for SSO across subdomains
 */
export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: customStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'pkce' // More secure auth flow
    },
    cookieOptions: {
      name: 'sb-auth-token',
      domain: '.sailorskills.com', // KEY: Enables cross-subdomain SSO
      path: '/',
      sameSite: 'lax',
      maxAge: 604800 // 7 days
    }
  }
)

/**
 * Enable debug logging for auth events (dev only)
 */
export function enableAuthDebug() {
  if (import.meta.env?.DEV || process.env.NODE_ENV === 'development') {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth Debug]', event, {
        userId: session?.user?.id,
        expiresAt: session?.expires_at,
        email: session?.user?.email
      })
    })
  }
}
```

**Step 3: Commit**

```bash
git add sailorskills-shared/src/auth/supabase-client.js sailorskills-shared/package.json sailorskills-shared/package-lock.json
git commit -m "feat(shared): add Supabase client with SSO cookie configuration"
```

---

### Task 3: Create Core Auth Functions

**Files:**
- Create: `sailorskills-shared/src/auth/auth-core.js`
- Create: `sailorskills-shared/src/auth/auth-core.test.js`

**Step 1: Write failing test for auth functions**

Create `sailorskills-shared/src/auth/auth-core.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { login, logout, getCurrentUser, getUserRole } from './auth-core.js'

// Mock Supabase
vi.mock('./supabase-client.js', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}))

describe('Auth Core Functions', () => {
  it('should login with email and password', async () => {
    const result = await login('test@example.com', 'password123')
    expect(result).toHaveProperty('success')
  })

  it('should get current user', async () => {
    const result = await getCurrentUser()
    expect(result).toHaveProperty('user')
  })

  it('should logout', async () => {
    const result = await logout()
    expect(result).toHaveProperty('success')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd sailorskills-shared
npm test auth-core.test.js
```

Expected: FAIL with "Cannot find module './auth-core.js'"

**Step 3: Write implementation**

Create `sailorskills-shared/src/auth/auth-core.js`:

```javascript
import { supabase } from './supabase-client.js'

/**
 * Login with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<{success, user?, role?, error?}>}
 */
export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) throw error

    // Fetch user role from user_profiles
    const { role, serviceAccess } = await getUserRole(data.user.id)

    return {
      success: true,
      user: data.user,
      role,
      serviceAccess
    }
  } catch (error) {
    console.error('Login error:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

/**
 * Get current authenticated user with role
 * @returns {Promise<{user, role, serviceAccess}>}
 */
export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return { user: null, role: null, serviceAccess: {} }
    }

    const { role, serviceAccess } = await getUserRole(user.id)

    return { user, role, serviceAccess }
  } catch (error) {
    console.error('Get user error:', error)
    return { user: null, role: null, serviceAccess: {} }
  }
}

/**
 * Get user role from user_profiles table
 * @param {string} userId - User ID
 * @returns {Promise<{role, serviceAccess}>}
 */
export async function getUserRole(userId) {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('role, service_access')
      .eq('user_id', userId)
      .single()

    if (error) {
      // If no profile exists, check customer_accounts for backward compatibility
      const { data: customerData, error: customerError } = await supabase
        .from('customer_accounts')
        .select('is_admin')
        .eq('id', userId)
        .single()

      if (!customerError && customerData) {
        // Customer account exists - they're a customer or admin
        return {
          role: customerData.is_admin ? 'admin' : 'customer',
          serviceAccess: { portal: true, booking: true }
        }
      }

      console.warn('No user profile found for:', userId)
      return { role: null, serviceAccess: {} }
    }

    return {
      role: data.role,
      serviceAccess: data.service_access || {}
    }
  } catch (error) {
    console.error('Get role error:', error)
    return { role: null, serviceAccess: {} }
  }
}

/**
 * Logout current user
 * @returns {Promise<{success, error?}>}
 */
export async function logout() {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Logout error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get current session
 * @returns {Promise<{session, error?}>}
 */
export async function getCurrentSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) throw error

    return { session, error: null }
  } catch (error) {
    console.error('Get session error:', error)
    return { session: null, error: error.message }
  }
}

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated() {
  const { session } = await getCurrentSession()
  return !!session
}
```

**Step 4: Run test to verify it passes**

```bash
cd sailorskills-shared
npm test auth-core.test.js
```

Expected: PASS (3 tests)

**Step 5: Commit**

```bash
git add sailorskills-shared/src/auth/auth-core.js sailorskills-shared/src/auth/auth-core.test.js
git commit -m "feat(shared): add core auth functions (login, logout, getCurrentUser)"
```

---

### Task 4: Create Auth Guards

**Files:**
- Create: `sailorskills-shared/src/auth/auth-guards.js`
- Create: `sailorskills-shared/src/auth/auth-guards.test.js`

**Step 1: Write failing test for auth guards**

Create `sailorskills-shared/src/auth/auth-guards.test.js`:

```javascript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { requireAuth, requireCustomer, requireStaff, requireAdmin } from './auth-guards.js'

// Mock auth-core
vi.mock('./auth-core.js', () => ({
  getCurrentUser: vi.fn()
}))

describe('Auth Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete window.location
    window.location = { href: '' }
  })

  it('requireAuth should redirect if not authenticated', async () => {
    const { getCurrentUser } = await import('./auth-core.js')
    getCurrentUser.mockResolvedValue({ user: null, role: null })

    const result = await requireAuth()

    expect(result).toBe(false)
    expect(window.location.href).toContain('login.sailorskills.com')
  })

  it('requireCustomer should allow customer role', async () => {
    const { getCurrentUser } = await import('./auth-core.js')
    getCurrentUser.mockResolvedValue({
      user: { id: '123', email: 'test@example.com' },
      role: 'customer'
    })

    const result = await requireCustomer()

    expect(result).toBeTruthy()
    expect(result.role).toBe('customer')
  })

  it('requireStaff should block customer role', async () => {
    const { getCurrentUser } = await import('./auth-core.js')
    getCurrentUser.mockResolvedValue({
      user: { id: '123' },
      role: 'customer'
    })

    const result = await requireStaff()

    expect(result).toBe(false)
  })

  it('requireAdmin should allow admin role', async () => {
    const { getCurrentUser } = await import('./auth-core.js')
    getCurrentUser.mockResolvedValue({
      user: { id: '123' },
      role: 'admin'
    })

    const result = await requireAdmin()

    expect(result).toBeTruthy()
    expect(result.role).toBe('admin')
  })
})
```

**Step 2: Run test to verify it fails**

```bash
cd sailorskills-shared
npm test auth-guards.test.js
```

Expected: FAIL with "Cannot find module './auth-guards.js'"

**Step 3: Write implementation**

Create `sailorskills-shared/src/auth/auth-guards.js`:

```javascript
import { getCurrentUser } from './auth-core.js'

const LOGIN_URL = 'https://login.sailorskills.com/login.html'

/**
 * Base authentication check
 * Redirects to login if not authenticated
 * @returns {Promise<Object|boolean>} User object or false
 */
export async function requireAuth() {
  const { user } = await getCurrentUser()

  if (!user) {
    // Store intended destination for redirect after login
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('redirectAfterLogin', window.location.href)
    }
    window.location.href = LOGIN_URL
    return false
  }

  return user
}

/**
 * Customer-only access (Portal, Booking)
 * Allows: customer, admin
 * @returns {Promise<Object|boolean>} User + role or false
 */
export async function requireCustomer() {
  const { user, role } = await getCurrentUser()

  if (!user || !['customer', 'admin'].includes(role)) {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('redirectAfterLogin', window.location.href)
    }
    window.location.href = LOGIN_URL
    return false
  }

  return { user, role }
}

/**
 * Staff access (Operations, Billing, Inventory)
 * Allows: staff, admin
 * @returns {Promise<Object|boolean>} User + role or false
 */
export async function requireStaff() {
  const { user, role } = await getCurrentUser()

  if (!user || !['staff', 'admin'].includes(role)) {
    showAccessDenied('This service requires staff access')
    return false
  }

  return { user, role }
}

/**
 * Admin-only access (Settings)
 * Allows: admin only
 * @returns {Promise<Object|boolean>} User + role or false
 */
export async function requireAdmin() {
  const { user, role } = await getCurrentUser()

  if (!user || role !== 'admin') {
    showAccessDenied('This service requires admin access')
    return false
  }

  return { user, role }
}

/**
 * Show access denied modal
 * @param {string} message - Error message to display
 */
function showAccessDenied(message) {
  const modal = document.createElement('div')
  modal.className = 'access-denied-modal'
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `

  modal.innerHTML = `
    <div style="
      background: white;
      padding: 2rem;
      border-radius: 8px;
      max-width: 500px;
      text-align: center;
    ">
      <h2 style="color: #dc2626; margin: 0 0 1rem 0;">🚫 Access Denied</h2>
      <p style="margin: 0 0 1rem 0;">${message}</p>
      <button onclick="window.location.href='https://portal.sailorskills.com'" style="
        background: #2563eb;
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
      ">Go to Customer Portal</button>
    </div>
  `

  document.body.appendChild(modal)
}
```

**Step 4: Run test to verify it passes**

```bash
cd sailorskills-shared
npm test auth-guards.test.js
```

Expected: PASS (4 tests)

**Step 5: Commit**

```bash
git add sailorskills-shared/src/auth/auth-guards.js sailorskills-shared/src/auth/auth-guards.test.js
git commit -m "feat(shared): add auth guards for role-based access control"
```

---

### Task 5: Create Auth Module Index

**Files:**
- Create: `sailorskills-shared/src/auth/index.js`
- Modify: `sailorskills-shared/package.json` (update exports)

**Step 1: Create index file**

Create `sailorskills-shared/src/auth/index.js`:

```javascript
/**
 * Shared Authentication Module
 * Provides SSO functionality across all Sailorskills services
 */

// Storage utilities
export { getCookie, setCookie, deleteCookie, customStorage } from './auth-storage.js'

// Supabase client
export { supabase, enableAuthDebug } from './supabase-client.js'

// Core auth functions
export {
  login,
  logout,
  getCurrentUser,
  getUserRole,
  getCurrentSession,
  isAuthenticated
} from './auth-core.js'

// Auth guards
export {
  requireAuth,
  requireCustomer,
  requireStaff,
  requireAdmin
} from './auth-guards.js'
```

**Step 2: Update package.json exports**

Modify `sailorskills-shared/package.json`:

```json
{
  "name": "@sailorskills/shared",
  "version": "1.0.0",
  "type": "module",
  "exports": {
    "./auth": "./src/auth/index.js",
    "./components/*": "./src/components/*.js",
    "./utils/*": "./src/utils/*.js"
  }
}
```

**Step 3: Commit**

```bash
git add sailorskills-shared/src/auth/index.js sailorskills-shared/package.json
git commit -m "feat(shared): export auth module for use in services"
```

---

## Phase 2: Login Service

### Task 6: Create sailorskills-login Service

**Files:**
- Create: `sailorskills-login/` directory
- Create: `sailorskills-login/package.json`
- Create: `sailorskills-login/vite.config.js`
- Create: `sailorskills-login/vercel.json`
- Create: `sailorskills-login/.gitignore`

**Step 1: Create service directory structure**

```bash
mkdir -p sailorskills-login/src/{auth,lib,styles}
mkdir -p sailorskills-login/tests
```

**Step 2: Create package.json**

Create `sailorskills-login/package.json`:

```json
{
  "name": "sailorskills-login",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5179",
    "build": "vite build",
    "preview": "vite preview",
    "test": "playwright test"
  },
  "dependencies": {
    "@sailorskills/shared": "file:../sailorskills-shared",
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "@playwright/test": "^1.40.0"
  }
}
```

**Step 3: Create vite.config.js**

Create `sailorskills-login/vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        login: resolve(__dirname, 'login.html'),
        signup: resolve(__dirname, 'signup.html'),
        reset: resolve(__dirname, 'reset-password.html')
      }
    }
  },
  server: {
    port: 5179
  }
})
```

**Step 4: Create vercel.json**

Create `sailorskills-login/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/", "destination": "/login.html" },
    { "source": "/(.*)", "destination": "/$1" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        }
      ]
    }
  ]
}
```

**Step 5: Create .gitignore**

Create `sailorskills-login/.gitignore`:

```
node_modules/
dist/
.env
.env.local
.DS_Store
```

**Step 6: Install dependencies**

```bash
cd sailorskills-login
npm install
```

**Step 7: Commit**

```bash
git add sailorskills-login/
git commit -m "feat(login): initialize login service project structure"
```

---

### Task 7: Create Login Page (Reuse Portal UI)

**Files:**
- Copy: `sailorskills-portal/login.html` → `sailorskills-login/login.html`
- Copy: `sailorskills-portal/src/auth/login.js` → `sailorskills-login/src/auth/login.js`
- Modify: Update imports to use shared auth module

**Step 1: Copy login.html from Portal**

```bash
cp sailorskills-portal/login.html sailorskills-login/login.html
```

**Step 2: Create login.js using shared auth**

Create `sailorskills-login/src/auth/login.js`:

```javascript
import { login, enableAuthDebug } from '@sailorskills/shared/auth'

// Enable auth debugging in development
if (import.meta.env.DEV) {
  enableAuthDebug()
}

// Get redirect URL from query params or default to portal
const urlParams = new URLSearchParams(window.location.search)
const redirectUrl = urlParams.get('redirect') || 'https://portal.sailorskills.com'

// Store redirect for after login
sessionStorage.setItem('redirectAfterLogin', redirectUrl)

// Handle login form submission
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const errorDiv = document.getElementById('error-message')
  const submitBtn = document.getElementById('submit-btn')

  // Clear previous errors
  errorDiv.style.display = 'none'
  submitBtn.disabled = true
  submitBtn.textContent = 'Logging in...'

  try {
    const result = await login(email, password)

    if (result.success) {
      // Login successful - redirect to intended destination
      const redirect = sessionStorage.getItem('redirectAfterLogin') || 'https://portal.sailorskills.com'
      sessionStorage.removeItem('redirectAfterLogin')
      window.location.href = redirect
    } else {
      // Login failed - show error
      errorDiv.textContent = result.error || 'Login failed. Please check your credentials.'
      errorDiv.style.display = 'block'
      submitBtn.disabled = false
      submitBtn.textContent = 'Log In'
    }
  } catch (error) {
    console.error('Login error:', error)
    errorDiv.textContent = 'An unexpected error occurred. Please try again.'
    errorDiv.style.display = 'block'
    submitBtn.disabled = false
    submitBtn.textContent = 'Log In'
  }
})

// Handle "Forgot Password" link
document.getElementById('forgot-password')?.addEventListener('click', (e) => {
  e.preventDefault()
  window.location.href = '/reset-password.html'
})

// Handle "Sign Up" link (for customers)
document.getElementById('signup-link')?.addEventListener('click', (e) => {
  e.preventDefault()
  window.location.href = '/signup.html'
})
```

**Step 3: Update login.html to use new script**

Modify `sailorskills-login/login.html` (update script src):

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Login - Sailorskills</title>
  <link rel="stylesheet" href="/src/styles/login.css">
</head>
<body>
  <div class="login-container">
    <div class="login-card">
      <h1>Sailorskills Login</h1>
      <p class="subtitle">Sign in to access your account</p>

      <form id="login-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autocomplete="email"
            placeholder="your@email.com"
          >
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            autocomplete="current-password"
            placeholder="Enter your password"
          >
        </div>

        <div id="error-message" class="error-message" style="display: none;"></div>

        <button type="submit" id="submit-btn" class="btn-primary">
          Log In
        </button>
      </form>

      <div class="links">
        <a href="#" id="forgot-password">Forgot password?</a>
        <span>•</span>
        <a href="#" id="signup-link">Sign up</a>
      </div>
    </div>
  </div>

  <script type="module" src="/src/auth/login.js"></script>
</body>
</html>
```

**Step 4: Copy styles from Portal**

```bash
cp sailorskills-portal/src/styles/login.css sailorskills-login/src/styles/login.css
```

**Step 5: Test locally**

```bash
cd sailorskills-login
npm run dev
```

Visit: http://localhost:5179/login.html
Expected: Login page renders correctly

**Step 6: Commit**

```bash
git add sailorskills-login/login.html sailorskills-login/src/auth/login.js sailorskills-login/src/styles/login.css
git commit -m "feat(login): add login page with shared auth integration"
```

---

### Task 8: Create Signup Page

**Files:**
- Create: `sailorskills-login/signup.html`
- Create: `sailorskills-login/src/auth/signup.js`

**Step 1: Create signup.html**

Create `sailorskills-login/signup.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Up - Sailorskills</title>
  <link rel="stylesheet" href="/src/styles/login.css">
</head>
<body>
  <div class="login-container">
    <div class="login-card">
      <h1>Create Account</h1>
      <p class="subtitle">Sign up for Sailorskills customer portal</p>

      <form id="signup-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autocomplete="email"
            placeholder="your@email.com"
          >
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            required
            autocomplete="new-password"
            placeholder="At least 8 characters"
            minlength="8"
          >
        </div>

        <div class="form-group">
          <label for="confirm-password">Confirm Password</label>
          <input
            type="password"
            id="confirm-password"
            name="confirm-password"
            required
            autocomplete="new-password"
            placeholder="Re-enter password"
          >
        </div>

        <div id="error-message" class="error-message" style="display: none;"></div>
        <div id="success-message" class="success-message" style="display: none;"></div>

        <button type="submit" id="submit-btn" class="btn-primary">
          Create Account
        </button>
      </form>

      <div class="links">
        <span>Already have an account?</span>
        <a href="/login.html">Log in</a>
      </div>
    </div>
  </div>

  <script type="module" src="/src/auth/signup.js"></script>
</body>
</html>
```

**Step 2: Create signup.js**

Create `sailorskills-login/src/auth/signup.js`:

```javascript
import { supabase } from '@sailorskills/shared/auth'

document.getElementById('signup-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const confirmPassword = document.getElementById('confirm-password').value
  const errorDiv = document.getElementById('error-message')
  const successDiv = document.getElementById('success-message')
  const submitBtn = document.getElementById('submit-btn')

  // Clear previous messages
  errorDiv.style.display = 'none'
  successDiv.style.display = 'none'

  // Validate passwords match
  if (password !== confirmPassword) {
    errorDiv.textContent = 'Passwords do not match'
    errorDiv.style.display = 'block'
    return
  }

  submitBtn.disabled = true
  submitBtn.textContent = 'Creating account...'

  try {
    // Sign up with Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/login.html`
      }
    })

    if (authError) throw authError

    // Create customer account record
    const { error: accountError } = await supabase
      .from('customer_accounts')
      .insert({
        id: authData.user.id,
        email: email,
        magic_link_enabled: true,
        password_enabled: true
      })

    if (accountError) {
      console.warn('Customer account creation warning:', accountError)
      // Don't fail signup if account record fails - can be created later
    }

    // Show success message
    successDiv.textContent = 'Account created! Please check your email to verify your account.'
    successDiv.style.display = 'block'

    // Redirect to login after 3 seconds
    setTimeout(() => {
      window.location.href = '/login.html'
    }, 3000)

  } catch (error) {
    console.error('Signup error:', error)
    errorDiv.textContent = error.message || 'Signup failed. Please try again.'
    errorDiv.style.display = 'block'
    submitBtn.disabled = false
    submitBtn.textContent = 'Create Account'
  }
})
```

**Step 3: Add success message styles**

Modify `sailorskills-login/src/styles/login.css` (add):

```css
.success-message {
  background: #dcfce7;
  color: #166534;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.875rem;
}
```

**Step 4: Test signup flow**

```bash
cd sailorskills-login
npm run dev
```

Visit: http://localhost:5179/signup.html
Expected: Signup page renders, can create account

**Step 5: Commit**

```bash
git add sailorskills-login/signup.html sailorskills-login/src/auth/signup.js sailorskills-login/src/styles/login.css
git commit -m "feat(login): add customer signup page"
```

---

### Task 9: Create Password Reset Page

**Files:**
- Create: `sailorskills-login/reset-password.html`
- Create: `sailorskills-login/src/auth/reset.js`

**Step 1: Create reset-password.html**

Create `sailorskills-login/reset-password.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Password - Sailorskills</title>
  <link rel="stylesheet" href="/src/styles/login.css">
</head>
<body>
  <div class="login-container">
    <div class="login-card">
      <h1>Reset Password</h1>
      <p class="subtitle">Enter your email to receive a password reset link</p>

      <form id="reset-form">
        <div class="form-group">
          <label for="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            required
            autocomplete="email"
            placeholder="your@email.com"
          >
        </div>

        <div id="error-message" class="error-message" style="display: none;"></div>
        <div id="success-message" class="success-message" style="display: none;"></div>

        <button type="submit" id="submit-btn" class="btn-primary">
          Send Reset Link
        </button>
      </form>

      <div class="links">
        <a href="/login.html">Back to login</a>
      </div>
    </div>
  </div>

  <script type="module" src="/src/auth/reset.js"></script>
</body>
</html>
```

**Step 2: Create reset.js**

Create `sailorskills-login/src/auth/reset.js`:

```javascript
import { supabase } from '@sailorskills/shared/auth'

document.getElementById('reset-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value
  const errorDiv = document.getElementById('error-message')
  const successDiv = document.getElementById('success-message')
  const submitBtn = document.getElementById('submit-btn')

  // Clear previous messages
  errorDiv.style.display = 'none'
  successDiv.style.display = 'none'

  submitBtn.disabled = true
  submitBtn.textContent = 'Sending...'

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login.html`
    })

    if (error) throw error

    // Show success message
    successDiv.textContent = 'Password reset link sent! Check your email.'
    successDiv.style.display = 'block'

    // Reset form
    document.getElementById('reset-form').reset()
    submitBtn.disabled = false
    submitBtn.textContent = 'Send Reset Link'

  } catch (error) {
    console.error('Reset error:', error)
    errorDiv.textContent = error.message || 'Failed to send reset link. Please try again.'
    errorDiv.style.display = 'block'
    submitBtn.disabled = false
    submitBtn.textContent = 'Send Reset Link'
  }
})
```

**Step 3: Test reset flow**

```bash
cd sailorskills-login
npm run dev
```

Visit: http://localhost:5179/reset-password.html
Expected: Reset page renders, can request reset link

**Step 4: Commit**

```bash
git add sailorskills-login/reset-password.html sailorskills-login/src/auth/reset.js
git commit -m "feat(login): add password reset page"
```

---

## Phase 3: Database Migration

### Task 10: Create User Profiles Migration

**Files:**
- Create: `migrations/024_unified_user_profiles.sql`

**Step 1: Write migration SQL**

Create `migrations/024_unified_user_profiles.sql`:

```sql
-- Unified User Profiles Migration
-- Creates user_profiles table as source of truth for roles and access

-- Create user_profiles table if not exists
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'staff', 'admin')),
  service_access JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on role for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_user_profiles_active ON user_profiles(is_active);

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admins can see all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );

-- Users can see their own profile
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid());

-- Only admins can insert/update/delete profiles
CREATE POLICY "Admins can manage profiles"
  ON user_profiles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
      WHERE up.user_id = auth.uid() AND up.role = 'admin'
    )
  );

-- Migrate existing customer_accounts to user_profiles
-- Only insert if not already exists
INSERT INTO user_profiles (user_id, role, service_access, is_active)
SELECT
  id,
  CASE
    WHEN is_admin = true THEN 'admin'
    ELSE 'customer'
  END,
  jsonb_build_object('portal', true, 'booking', true),
  true
FROM customer_accounts
WHERE NOT EXISTS (
  SELECT 1 FROM user_profiles WHERE user_id = customer_accounts.id
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_profiles IS 'Unified user profiles with role-based access control for SSO';
```

**Step 2: Test migration locally**

```bash
# Load database connection
source db-env.sh

# Run migration
psql "$DATABASE_URL" -f migrations/024_unified_user_profiles.sql
```

Expected: Migration completes successfully

**Step 3: Verify migration**

```bash
psql "$DATABASE_URL" -c "SELECT user_id, role, service_access FROM user_profiles LIMIT 5"
```

Expected: Shows migrated users with roles

**Step 4: Commit**

```bash
git add migrations/024_unified_user_profiles.sql
git commit -m "feat(db): add unified user_profiles table for SSO"
```

---

### Task 11: Create Test Users

**Files:**
- Create: `scripts/create-test-users.mjs`

**Step 1: Write test user creation script**

Create `scripts/create-test-users.mjs`:

```javascript
#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Admin key for user creation
)

const testUsers = [
  {
    email: 'customer-test@sailorskills.com',
    password: 'TestCustomer123!',
    role: 'customer',
    serviceAccess: { portal: true, booking: true }
  },
  {
    email: 'staff-test@sailorskills.com',
    password: 'TestStaff123!',
    role: 'staff',
    serviceAccess: { operations: true, billing: true, inventory: true }
  },
  {
    email: 'admin-test@sailorskills.com',
    password: 'TestAdmin123!',
    role: 'admin',
    serviceAccess: { '*': true }
  }
]

async function createTestUsers() {
  console.log('Creating test users...\n')

  for (const user of testUsers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true
      })

      if (authError) {
        console.error(`❌ Failed to create ${user.role}:`, authError.message)
        continue
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          role: user.role,
          service_access: user.serviceAccess,
          is_active: true
        })

      if (profileError) {
        console.error(`❌ Failed to create profile for ${user.role}:`, profileError.message)
        continue
      }

      console.log(`✅ Created ${user.role}: ${user.email}`)
      console.log(`   User ID: ${authData.user.id}`)
      console.log(`   Password: ${user.password}\n`)

    } catch (error) {
      console.error(`❌ Error creating ${user.role}:`, error.message)
    }
  }

  console.log('Done!')
}

createTestUsers()
```

**Step 2: Run script to create test users**

```bash
chmod +x scripts/create-test-users.mjs
node scripts/create-test-users.mjs
```

Expected: Creates 3 test users (customer, staff, admin)

**Step 3: Verify test users**

```bash
psql "$DATABASE_URL" -c "SELECT email, role FROM user_profiles JOIN auth.users ON user_profiles.user_id = auth.users.id WHERE email LIKE '%test@sailorskills.com'"
```

Expected: Shows 3 test users

**Step 4: Commit**

```bash
git add scripts/create-test-users.mjs
git commit -m "feat(scripts): add test user creation script"
```

---

## Phase 4: Service Migration - Settings

### Task 12: Update Settings to Use Shared Auth

**Files:**
- Modify: `sailorskills-settings/src/lib/auth-guard.js`
- Modify: `sailorskills-settings/src/views/dashboard.js`
- Modify: `sailorskills-settings/src/views/system-config.js`

**Step 1: Replace auth-guard.js with shared module**

Modify `sailorskills-settings/src/lib/auth-guard.js`:

```javascript
// Re-export from shared module
export { requireAuth, requireAdmin } from '@sailorskills/shared/auth'

// Note: Settings service uses requireAdmin for all pages
```

**Step 2: Update dashboard.js**

Modify `sailorskills-settings/src/views/dashboard.js`:

```javascript
import { requireAdmin } from '@sailorskills/shared/auth'

async function init() {
  // Require admin access
  const auth = await requireAdmin()
  if (!auth) return // Guard will handle redirect

  console.log('Logged in as admin:', auth.user.email)

  // Continue with dashboard initialization
  loadDashboard()
}

init()
```

**Step 3: Update system-config.js**

Modify `sailorskills-settings/src/views/system-config.js`:

```javascript
import { requireAdmin } from '@sailorskills/shared/auth'

async function init() {
  const auth = await requireAdmin()
  if (!auth) return

  console.log('Logged in as admin:', auth.user.email)

  loadSystemConfig()
}

init()
```

**Step 4: Test Settings service**

```bash
cd sailorskills-settings
npm run dev
```

Visit: http://localhost:5178
Expected: Redirects to login.sailorskills.com (if running), or login page

**Step 5: Commit**

```bash
git add sailorskills-settings/src/lib/auth-guard.js sailorskills-settings/src/views/dashboard.js sailorskills-settings/src/views/system-config.js
git commit -m "feat(settings): migrate to shared auth module"
```

---

## Phase 5: Testing & Deployment

### Task 13: Create End-to-End SSO Test

**Files:**
- Create: `tests/integration/sso-flow.spec.js`

**Step 1: Write SSO flow test**

Create `tests/integration/sso-flow.spec.js`:

```javascript
import { test, expect } from '@playwright/test'

const LOGIN_URL = 'http://localhost:5179/login.html'
const PORTAL_URL = 'http://localhost:5174'
const OPERATIONS_URL = 'http://localhost:5173'
const SETTINGS_URL = 'http://localhost:5178'

test.describe('Universal SSO Flow', () => {
  test('should login once and access multiple services', async ({ page }) => {
    // 1. Visit login page
    await page.goto(LOGIN_URL)
    await expect(page.locator('h1')).toContainText('Sailorskills Login')

    // 2. Login as admin
    await page.fill('#email', 'admin-test@sailorskills.com')
    await page.fill('#password', 'TestAdmin123!')
    await page.click('#submit-btn')

    // 3. Should redirect to portal
    await expect(page).toHaveURL(/portal/)

    // 4. Navigate to Operations - should be automatically authenticated
    await page.goto(OPERATIONS_URL)
    await expect(page).not.toHaveURL(/login/)

    // 5. Navigate to Settings - should be automatically authenticated
    await page.goto(SETTINGS_URL)
    await expect(page).not.toHaveURL(/login/)

    // 6. Logout from Settings
    await page.click('#logout-btn')

    // 7. Navigate to Portal - should redirect to login
    await page.goto(PORTAL_URL)
    await expect(page).toHaveURL(/login/)
  })

  test('should enforce role-based access', async ({ page }) => {
    // 1. Login as customer
    await page.goto(LOGIN_URL)
    await page.fill('#email', 'customer-test@sailorskills.com')
    await page.fill('#password', 'TestCustomer123!')
    await page.click('#submit-btn')

    // 2. Should redirect to portal
    await expect(page).toHaveURL(/portal/)

    // 3. Try to access Operations - should show access denied
    await page.goto(OPERATIONS_URL)
    await expect(page.locator('.access-denied-modal')).toBeVisible()

    // 4. Try to access Settings - should show access denied
    await page.goto(SETTINGS_URL)
    await expect(page.locator('.access-denied-modal')).toBeVisible()
  })
})
```

**Step 2: Run test**

```bash
npx playwright test tests/integration/sso-flow.spec.js --headed
```

Expected: Tests pass (login works, SSO works, role checks work)

**Step 3: Commit**

```bash
git add tests/integration/sso-flow.spec.js
git commit -m "test: add end-to-end SSO flow tests"
```

---

### Task 14: Deploy Login Service to Vercel

**Files:**
- None (deployment task)

**Step 1: Build login service**

```bash
cd sailorskills-login
npm run build
```

Expected: Build completes successfully, `dist/` directory created

**Step 2: Create Vercel project**

```bash
cd sailorskills-login
vercel
```

Follow prompts:
- Set up and deploy? Y
- Which scope? (your team)
- Link to existing project? N
- Project name: sailorskills-login
- Directory: ./
- Override settings? N

**Step 3: Configure custom domain**

In Vercel Dashboard:
1. Go to sailorskills-login project
2. Settings → Domains
3. Add domain: `login.sailorskills.com`
4. Follow DNS setup instructions

**Step 4: Set environment variables**

In Vercel Dashboard:
1. Settings → Environment Variables
2. Add variables for all environments (Production, Preview, Development):
   - `VITE_SUPABASE_URL`: https://fzygakldvvzxmahkdylq.supabase.co
   - `VITE_SUPABASE_ANON_KEY`: (your anon key)

**Step 5: Redeploy with environment variables**

```bash
cd sailorskills-login
vercel --prod
```

Expected: Deployment succeeds, available at login.sailorskills.com

**Step 6: Test production login**

Visit: https://login.sailorskills.com/login.html
Expected: Login page loads, can login successfully

**Step 7: Document deployment**

Update `sailorskills-login/README.md`:

```markdown
# Sailorskills Login Service

Centralized authentication for all Sailorskills services.

**Production:** https://login.sailorskills.com
**Platform:** Vercel

## Deployment

```bash
npm run build
vercel --prod
```

## Environment Variables

Required in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
```

**Step 8: Commit**

```bash
git add sailorskills-login/README.md
git commit -m "docs(login): add deployment documentation"
```

---

## Phase 6: Additional Service Migrations

### Task 15: Migrate Operations Service

**Files:**
- Modify: `sailorskills-operations/src/main.js`
- Remove: `sailorskills-operations/src/lib/simple-auth.js` (old auth)

**Step 1: Update main.js to use shared auth**

Modify `sailorskills-operations/src/main.js`:

```javascript
import { requireStaff } from '@sailorskills/shared/auth'

async function init() {
  // Require staff or admin access
  const auth = await requireStaff()
  if (!auth) return // Guard will handle redirect or access denied

  console.log('Logged in as:', auth.user.email, 'Role:', auth.role)

  // Continue with Operations initialization
  loadOperationsDashboard()
}

init()
```

**Step 2: Remove old auth files**

```bash
rm sailorskills-operations/src/lib/simple-auth.js
```

**Step 3: Test Operations service**

```bash
cd sailorskills-operations
npm run dev
```

Visit: http://localhost:5173
Expected: Redirects to login (if not authenticated) or loads dashboard

**Step 4: Test with different roles**

- Login as staff-test@sailorskills.com → Should work
- Login as customer-test@sailorskills.com → Should show access denied

**Step 5: Commit**

```bash
git add sailorskills-operations/src/main.js
git rm sailorskills-operations/src/lib/simple-auth.js
git commit -m "feat(operations): migrate to shared auth with SSO"
```

---

### Task 16: Migrate Billing Service

**Files:**
- Modify: `sailorskills-billing/src/main.js`
- Remove: `sailorskills-billing/src/lib/simple-auth.js`

**Step 1: Update main.js**

Modify `sailorskills-billing/src/main.js`:

```javascript
import { requireStaff } from '@sailorskills/shared/auth'

async function init() {
  const auth = await requireStaff()
  if (!auth) return

  console.log('Logged in as:', auth.user.email, 'Role:', auth.role)

  loadBillingDashboard()
}

init()
```

**Step 2: Remove old auth**

```bash
rm sailorskills-billing/src/lib/simple-auth.js
```

**Step 3: Test Billing service**

```bash
cd sailorskills-billing
npm run dev
```

Expected: Works with SSO, enforces staff/admin access

**Step 4: Commit**

```bash
git add sailorskills-billing/src/main.js
git rm sailorskills-billing/src/lib/simple-auth.js
git commit -m "feat(billing): migrate to shared auth with SSO"
```

---

### Task 17: Update Portal Service

**Files:**
- Modify: `sailorskills-portal/src/auth/auth.js` (use shared module)
- Modify: `sailorskills-portal/login.html` (redirect to login.sailorskills.com)

**Step 1: Update Portal auth to use shared module**

Portal already uses Supabase Auth, but we need to:
- Update to use shared auth guards
- Change login redirect to login.sailorskills.com

Modify `sailorskills-portal/src/views/portal.js`:

```javascript
import { requireCustomer } from '@sailorskills/shared/auth'

async function init() {
  // Require customer or admin access
  const auth = await requireCustomer()
  if (!auth) return

  console.log('Logged in as:', auth.user.email, 'Role:', auth.role)

  loadPortalDashboard()
}

init()
```

**Step 2: Remove Portal login page** (users should use login.sailorskills.com)

```bash
# Keep login.html for backward compatibility but redirect to new login
```

Update `sailorskills-portal/login.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="refresh" content="0; url=https://login.sailorskills.com/login.html">
  <title>Redirecting to Login...</title>
</head>
<body>
  <p>Redirecting to login page...</p>
  <script>
    window.location.href = 'https://login.sailorskills.com/login.html?redirect=' + encodeURIComponent(window.location.origin + '/portal.html')
  </script>
</body>
</html>
```

**Step 3: Test Portal**

```bash
cd sailorskills-portal
npm run dev
```

Expected: Redirects to login.sailorskills.com if not authenticated

**Step 4: Commit**

```bash
git add sailorskills-portal/src/views/portal.js sailorskills-portal/login.html
git commit -m "feat(portal): integrate with SSO login service"
```

---

## Final Validation

### Task 18: Cross-Service SSO Test

**Step 1: Start all services locally**

In separate terminals:

```bash
# Terminal 1 - Login
cd sailorskills-login && npm run dev

# Terminal 2 - Portal
cd sailorskills-portal && npm run dev

# Terminal 3 - Operations
cd sailorskills-operations && npm run dev

# Terminal 4 - Billing
cd sailorskills-billing && npm run dev

# Terminal 5 - Settings
cd sailorskills-settings && npm run dev
```

**Step 2: Manual SSO test**

1. Visit http://localhost:5179/login.html
2. Login as admin-test@sailorskills.com
3. Visit http://localhost:5174 (Portal) - should be authenticated
4. Visit http://localhost:5173 (Operations) - should be authenticated
5. Visit http://localhost:5176 (Billing) - should be authenticated
6. Visit http://localhost:5178 (Settings) - should be authenticated
7. Logout from Settings
8. Visit Portal - should redirect to login

**Step 3: Role-based access test**

1. Login as customer-test@sailorskills.com
2. Visit Portal - should work
3. Visit Operations - should show access denied
4. Visit Settings - should show access denied

**Step 4: Create validation checklist**

```markdown
## SSO Validation Checklist

- [ ] Login service deployed to login.sailorskills.com
- [ ] Shared auth module working in all services
- [ ] Cookie domain set to .sailorskills.com
- [ ] Login once, access all authorized services
- [ ] Logout from any service logs out everywhere
- [ ] Customer role can access Portal, Booking only
- [ ] Staff role can access Operations, Billing, Inventory
- [ ] Admin role can access everything including Settings
- [ ] Access denied modal shows for unauthorized access
- [ ] Redirect after login works correctly
- [ ] Session persists across browser tabs
- [ ] Session expires after 7 days
- [ ] All services deployed and working in production
```

---

## Success Criteria

✅ SSO implementation is complete when:

- [ ] User can login at login.sailorskills.com
- [ ] Session cookie set with domain=.sailorskills.com
- [ ] User navigates to any authorized service without re-login
- [ ] Role-based access enforced (customer can't access Operations)
- [ ] Logout from any service clears session across all services
- [ ] All services migrated from SimpleAuth to Supabase Auth
- [ ] Playwright tests verify cross-service navigation
- [ ] Production tested with real users (internal team)
- [ ] No console errors or authentication failures
- [ ] Session persists across browser restarts (7 day cookie)

---

## Rollback Plan

If issues occur:

1. **Per-service rollback:** Set `USE_SSO=false` environment variable
2. **Database rollback:** user_profiles table is additive, safe to ignore
3. **Login service:** Can disable by changing DNS back to old login pages
4. **Shared module:** Each service can revert to old auth code

---

**Total Estimated Time:** 2-4 weeks
**Tasks:** 18
**Services Affected:** 7 (Login, Portal, Operations, Billing, Inventory, Booking, Settings)
