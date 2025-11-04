# User Accounts & Audit Logging - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement foundational user accounts system with role-based permissions, comprehensive audit logging, and basic technician attribution across all Sailor Skills services.

**Architecture:** Database-first security with Supabase RLS policies enforcing permissions server-side, automatic audit logging via database triggers, unified auth differentiating staff vs customers via metadata, shared permission utilities in monorepo package.

**Tech Stack:** Supabase (PostgreSQL + Auth + RLS), React (user management UI), Vite (build system), shared monorepo utilities

**Estimated Effort:** 4 weeks (20 days, ~8 hours/day = 160 hours total)

---

## Phases Overview

**Week 1: Foundation + Operations (Days 1-5)**
- Database schema, triggers, RLS policies
- Shared auth utilities
- User management UI in Operations
- Operations service integration

**Week 2: Billing + Inventory (Days 6-10)**
- Billing service integration
- Inventory service integration
- Revenue attribution tracking

**Week 3: Insight + Estimator (Days 11-15)**
- Performance metrics in Insight
- Estimator integration
- Audit log viewer UI

**Week 4: Testing & Polish (Days 16-20)**
- Cross-service integration testing
- Permission boundary testing
- Bug fixes & polish
- Real user onboarding

---

## Week 1: Foundation + Operations

### Task 1: Create Database Migration File

**Files:**
- Create: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Create migration file structure**

Create file with header and sections:

```sql
-- Migration 015: User Accounts & Audit Logging System
-- Date: 2025-11-04
-- Description: Add user accounts, roles, RBAC, and comprehensive audit logging
-- Estimated runtime: 30-60 seconds

-- ============================================================
-- USERS TABLE
-- ============================================================

-- (Content to be added in next tasks)

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

-- ============================================================
-- TRACKING COLUMNS
-- ============================================================

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- ============================================================
-- AUDIT TRIGGERS
-- ============================================================

-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ============================================================
-- AUTH TRIGGERS
-- ============================================================
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): create user accounts migration file structure"
```

---

### Task 2: Add Users Table Schema

**Files:**
- Modify: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Add users table definition**

Insert under `-- USERS TABLE` section:

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'technician', 'contractor', 'viewer')),
  user_type text NOT NULL CHECK (user_type IN ('owner', 'employee', 'contractor')),
  active boolean DEFAULT true,
  hire_date date,
  hourly_rate decimal(10,2),
  phone text,
  preferences jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  created_by uuid REFERENCES users(id),
  updated_by uuid REFERENCES users(id)
);

CREATE INDEX idx_users_active ON users(active);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

COMMENT ON TABLE users IS 'Internal staff accounts with roles and permissions';
COMMENT ON COLUMN users.role IS 'Permission level: owner, admin, technician, contractor, viewer';
COMMENT ON COLUMN users.user_type IS 'Employment relationship: owner, employee, contractor';
COMMENT ON COLUMN users.hourly_rate IS 'Reference only, not used for job-based compensation';
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): add users table schema with roles and permissions"
```

---

### Task 3: Add Audit Logs Table Schema

**Files:**
- Modify: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Add audit_logs table definition**

Insert under `-- AUDIT LOGS TABLE` section:

```sql
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  changes jsonb,
  ip_address text,
  service_name text,
  timestamp timestamptz DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity_type ON audit_logs(entity_type);
CREATE INDEX idx_audit_logs_entity_id ON audit_logs(entity_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_service_name ON audit_logs(service_name);

COMMENT ON TABLE audit_logs IS 'Comprehensive audit trail of all data changes';
COMMENT ON COLUMN audit_logs.changes IS 'JSONB with before/after values: {before: {...}, after: {...}}';
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): add audit_logs table for comprehensive tracking"
```

---

### Task 4: Add Tracking Columns to Core Tables

**Files:**
- Modify: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Add ALTER TABLE statements for tracking columns**

Insert under `-- TRACKING COLUMNS` section:

```sql
-- Service logs
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS technician_id uuid REFERENCES users(id);
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id);
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
ALTER TABLE service_logs ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

-- Invoices
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS service_technician_id uuid REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

-- Boats
ALTER TABLE boats ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE boats ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id);
ALTER TABLE boats ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
ALTER TABLE boats ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

-- Payments
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

-- Customers
ALTER TABLE customers ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

-- Inventory
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id);
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

-- Service orders
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

-- Boat anodes
ALTER TABLE boat_anodes ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE boat_anodes ADD COLUMN IF NOT EXISTS updated_by uuid REFERENCES users(id);
ALTER TABLE boat_anodes ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT NOW();
ALTER TABLE boat_anodes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT NOW();

COMMENT ON COLUMN service_logs.technician_id IS 'Who performed the service (for revenue attribution)';
COMMENT ON COLUMN invoices.service_technician_id IS 'Technician who performed service (copied from service_logs)';
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): add tracking columns to all core tables"
```

---

### Task 5: Add Helper Functions

**Files:**
- Modify: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Add helper functions**

Insert under `-- HELPER FUNCTIONS` section:

```sql
-- Get user role for RLS policies
CREATE OR REPLACE FUNCTION get_user_role(user_uuid uuid) RETURNS text AS $$
  SELECT role FROM users WHERE id = user_uuid AND active = true;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_user_role IS 'Get active user role for RLS policies';

-- Get current user metadata
CREATE OR REPLACE FUNCTION get_user_metadata() RETURNS jsonb AS $$
  SELECT (auth.jwt() -> 'user_metadata')::jsonb;
$$ LANGUAGE sql STABLE;

COMMENT ON FUNCTION get_user_metadata IS 'Get current user metadata from JWT';
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): add helper functions for RLS policies"
```

---

### Task 6: Add Audit Logging Trigger Function

**Files:**
- Modify: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Add audit trigger function**

Insert under `-- AUDIT TRIGGERS` section:

```sql
CREATE OR REPLACE FUNCTION log_audit_trail() RETURNS trigger AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    entity_type,
    entity_id,
    action,
    changes,
    ip_address,
    service_name,
    timestamp
  ) VALUES (
    auth.uid(),
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    TG_OP,
    CASE
      WHEN TG_OP = 'DELETE' THEN jsonb_build_object('before', row_to_json(OLD))
      WHEN TG_OP = 'INSERT' THEN jsonb_build_object('after', row_to_json(NEW))
      WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('before', row_to_json(OLD), 'after', row_to_json(NEW))
    END,
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('app.service_name', true),
    NOW()
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION log_audit_trail IS 'Automatically log all table changes to audit_logs';

-- Apply audit triggers to all core tables
CREATE TRIGGER audit_service_logs
  AFTER INSERT OR UPDATE OR DELETE ON service_logs
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_boats
  AFTER INSERT OR UPDATE OR DELETE ON boats
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_invoices
  AFTER INSERT OR UPDATE OR DELETE ON invoices
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_payments
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_customers
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_inventory
  AFTER INSERT OR UPDATE OR DELETE ON inventory
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_users
  AFTER INSERT OR UPDATE OR DELETE ON users
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_boat_anodes
  AFTER INSERT OR UPDATE OR DELETE ON boat_anodes
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_service_orders
  AFTER INSERT OR UPDATE OR DELETE ON service_orders
  FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): add audit logging trigger function and apply to all tables"
```

---

### Task 7: Add RLS Policies - Users Table

**Files:**
- Modify: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Add users table RLS policies**

Insert under `-- RLS POLICIES` section:

```sql
-- ============================================================
-- USERS TABLE RLS
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Staff can view all users
CREATE POLICY "users_select_staff" ON users
  FOR SELECT USING (
    get_user_metadata() ->> 'user_type' = 'staff'
  );

-- Only owners/admins can insert users
CREATE POLICY "users_insert_admin" ON users
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

-- Owners/admins can update any user, users can update own profile
CREATE POLICY "users_update" ON users
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
    OR id = auth.uid()
  );

-- Only owners can delete users
CREATE POLICY "users_delete_owner" ON users
  FOR DELETE USING (
    get_user_role(auth.uid()) = 'owner'
  );
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): add RLS policies for users table"
```

---

### Task 8: Add RLS Policies - Audit Logs Table

**Files:**
- Modify: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Add audit_logs table RLS policies**

Insert after users RLS policies:

```sql
-- ============================================================
-- AUDIT LOGS TABLE RLS
-- ============================================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only owners/admins can view audit logs
CREATE POLICY "audit_logs_select_admin" ON audit_logs
  FOR SELECT USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

-- No one can manually insert/update/delete audit logs (only via triggers)
CREATE POLICY "audit_logs_no_manual_changes" ON audit_logs
  FOR ALL USING (false);
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): add RLS policies for audit_logs table"
```

---

### Task 9: Add RLS Policies - Service Logs Table

**Files:**
- Modify: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Add service_logs table RLS policies**

Insert after audit_logs RLS policies:

```sql
-- ============================================================
-- SERVICE LOGS TABLE RLS
-- ============================================================

ALTER TABLE service_logs ENABLE ROW LEVEL SECURITY;

-- Owners/admins/viewers see all, techs/contractors see only their own
CREATE POLICY "service_logs_select" ON service_logs
  FOR SELECT USING (
    get_user_metadata() ->> 'user_type' = 'staff'
    AND (
      get_user_role(auth.uid()) IN ('owner', 'admin', 'viewer')
      OR technician_id = auth.uid()
    )
  );

-- Techs/contractors can create service logs
CREATE POLICY "service_logs_insert" ON service_logs
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'admin', 'technician', 'contractor')
  );

-- Owners/admins can update any, techs can update their own
CREATE POLICY "service_logs_update" ON service_logs
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
    OR (
      get_user_role(auth.uid()) IN ('technician', 'contractor')
      AND technician_id = auth.uid()
    )
  );

-- Only owners/admins can delete
CREATE POLICY "service_logs_delete" ON service_logs
  FOR DELETE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): add RLS policies for service_logs table"
```

---

### Task 10: Add RLS Policies - Invoices Table

**Files:**
- Modify: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Add invoices table RLS policies**

Insert after service_logs RLS policies:

```sql
-- ============================================================
-- INVOICES TABLE RLS
-- ============================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Owners/admins/viewers see all, techs/contractors see only their own
CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    get_user_metadata() ->> 'user_type' = 'staff'
    AND (
      get_user_role(auth.uid()) IN ('owner', 'admin', 'viewer')
      OR service_technician_id = auth.uid()
    )
  );

-- Only owners/admins can modify invoices
CREATE POLICY "invoices_insert" ON invoices
  FOR INSERT WITH CHECK (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "invoices_update" ON invoices
  FOR UPDATE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );

CREATE POLICY "invoices_delete" ON invoices
  FOR DELETE USING (
    get_user_role(auth.uid()) IN ('owner', 'admin')
  );
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): add RLS policies for invoices table"
```

---

### Task 11: Add Auto-Create User Record Trigger

**Files:**
- Modify: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Add auth signup trigger**

Insert under `-- AUTH TRIGGERS` section:

```sql
CREATE OR REPLACE FUNCTION handle_new_staff_user() RETURNS trigger AS $$
BEGIN
  IF (NEW.raw_user_meta_data->>'user_type') = 'staff' THEN
    INSERT INTO public.users (
      id,
      email,
      full_name,
      role,
      user_type,
      active
    ) VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'role',
      COALESCE(NEW.raw_user_meta_data->>'user_type_detail', 'employee'),
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_staff_user();

COMMENT ON FUNCTION handle_new_staff_user IS 'Auto-create users table record when staff user signs up via Supabase Auth';
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): add trigger to auto-create user record on signup"
```

---

### Task 12: Add Migration Grants and Comments

**Files:**
- Modify: `migrations/015_user_accounts_audit_logging.sql`

**Step 1: Add grants and final comments**

Append at end of file:

```sql
-- ============================================================
-- GRANTS
-- ============================================================

GRANT SELECT, INSERT, UPDATE ON users TO authenticated;
GRANT SELECT ON audit_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;

-- ============================================================
-- COMPLETION
-- ============================================================

COMMENT ON DATABASE postgres IS 'Sailor Skills multi-user database with comprehensive audit logging';
```

**Step 2: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): add grants and completion comments to migration"
```

---

### Task 13: Run Database Migration

**Files:**
- Read: `migrations/015_user_accounts_audit_logging.sql`
- Database: Supabase PostgreSQL

**Step 1: Load database credentials**

```bash
source db-env.sh
```

Expected: Database URL loaded into environment

**Step 2: Run migration**

```bash
psql "$DATABASE_URL" -f migrations/015_user_accounts_audit_logging.sql
```

Expected output:
```
CREATE TABLE
CREATE INDEX
CREATE INDEX
CREATE INDEX
COMMENT
CREATE TABLE
CREATE INDEX
...
GRANT
COMMENT
```

**Step 3: Verify tables created**

```bash
psql "$DATABASE_URL" -c "\d users"
psql "$DATABASE_URL" -c "\d audit_logs"
```

Expected: Table definitions displayed

**Step 4: Verify triggers created**

```bash
psql "$DATABASE_URL" -c "SELECT tgname FROM pg_trigger WHERE tgname LIKE 'audit_%'"
```

Expected: List of audit_* triggers

**Step 5: Commit**

```bash
git add migrations/015_user_accounts_audit_logging.sql
git commit -m "feat(db): run migration - users and audit logging active"
```

---

### Task 14: Create Shared Auth Permissions Module

**Files:**
- Create: `shared/src/auth/permissions.js`

**Step 1: Create permissions matrix**

```javascript
/**
 * Permission Matrix for Role-Based Access Control
 * Server-side enforcement via Supabase RLS, client-side guards for UX
 */

export const PERMISSIONS = {
  // ============================================================
  // OPERATIONS SERVICE
  // ============================================================
  VIEW_ALL_SERVICE_LOGS: ['owner', 'admin', 'viewer'],
  CREATE_SERVICE_LOG: ['owner', 'admin', 'technician', 'contractor'],
  MODIFY_ANY_SERVICE_LOG: ['owner', 'admin'],
  MODIFY_OWN_SERVICE_LOG: ['owner', 'admin', 'technician', 'contractor'],
  VIEW_ALL_BOATS: ['owner', 'admin', 'technician', 'viewer'],
  CREATE_BOAT: ['owner', 'admin', 'technician'],
  SCHEDULE_SERVICE: ['owner', 'admin', 'technician'],

  // ============================================================
  // BILLING SERVICE
  // ============================================================
  VIEW_ALL_INVOICES: ['owner', 'admin', 'viewer'],
  PROCESS_PAYMENT: ['owner', 'admin'],
  MODIFY_PRICING: ['owner'],
  COMPLETE_SERVICE: ['owner', 'admin', 'technician', 'contractor'],

  // ============================================================
  // INVENTORY SERVICE
  // ============================================================
  VIEW_INVENTORY: ['owner', 'admin', 'technician', 'contractor', 'viewer'],
  PLACE_ORDER: ['owner', 'admin'],
  MODIFY_INVENTORY: ['owner', 'admin'],

  // ============================================================
  // INSIGHT SERVICE
  // ============================================================
  VIEW_ALL_ANALYTICS: ['owner', 'admin', 'viewer'],
  VIEW_FINANCIALS: ['owner', 'admin', 'viewer'],
  VIEW_OWN_PERFORMANCE: ['owner', 'admin', 'technician', 'contractor'],

  // ============================================================
  // ESTIMATOR SERVICE
  // ============================================================
  CREATE_QUOTE: ['owner', 'admin', 'technician'],
  MODIFY_QUOTE_PRICING: ['owner'],

  // ============================================================
  // USER MANAGEMENT
  // ============================================================
  INVITE_USER: ['owner', 'admin'],
  MANAGE_USERS: ['owner', 'admin'],
  MANAGE_OWNER_ROLES: ['owner'],
  VIEW_AUDIT_LOGS: ['owner', 'admin']
};

/**
 * Check if user role has permission
 * @param {string} permission - Permission key from PERMISSIONS
 * @param {string} userRole - User role (owner, admin, technician, contractor, viewer)
 * @returns {boolean}
 */
export function canUserAccess(permission, userRole) {
  if (!permission || !userRole) return false;
  return PERMISSIONS[permission]?.includes(userRole) || false;
}

/**
 * Get all permissions for a role
 * @param {string} userRole - User role
 * @returns {string[]} Array of permission keys
 */
export function getUserPermissions(userRole) {
  return Object.entries(PERMISSIONS)
    .filter(([_, roles]) => roles.includes(userRole))
    .map(([permission]) => permission);
}

/**
 * Check if user can access feature (allows checking multiple permissions)
 * @param {string|string[]} permissions - Permission key(s)
 * @param {string} userRole - User role
 * @returns {boolean}
 */
export function hasAnyPermission(permissions, userRole) {
  const perms = Array.isArray(permissions) ? permissions : [permissions];
  return perms.some(perm => canUserAccess(perm, userRole));
}
```

**Step 2: Commit**

```bash
git add shared/src/auth/permissions.js
git commit -m "feat(auth): add permissions matrix for RBAC"
```

---

### Task 15: Create Shared User Context Hook

**Files:**
- Create: `shared/src/auth/user-context.js`

**Step 1: Create user context provider**

```javascript
import { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext(null);

/**
 * Provider for current user context
 * Must wrap app to provide user info to all components
 */
export function UserProvider({ children, supabase }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadUser() {
      try {
        // Get current auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;

        // Check if staff user
        if (user && user.user_metadata?.user_type === 'staff') {
          // Fetch full user record with role
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (userError) throw userError;

          setCurrentUser(userData);
        } else {
          // Not a staff user, clear current user
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUser();
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  return (
    <UserContext.Provider value={{ currentUser, loading, error }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to access current user context
 * @returns {{ currentUser: object|null, loading: boolean, error: Error|null }}
 */
export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within UserProvider');
  }
  return context;
}

/**
 * Check if current user has permission
 * @param {string} permission - Permission key
 * @returns {boolean}
 */
export function useHasPermission(permission) {
  const { currentUser } = useCurrentUser();
  if (!currentUser) return false;

  const { canUserAccess } = require('./permissions');
  return canUserAccess(permission, currentUser.role);
}
```

**Step 2: Commit**

```bash
git add shared/src/auth/user-context.js
git commit -m "feat(auth): add user context provider and hooks"
```

---

### Task 16: Create User Management API Module

**Files:**
- Create: `sailorskills-operations/src/api/users.js`

**Step 1: Create user management API**

```javascript
import { supabase } from '../config/supabase.js';

/**
 * Fetch all users (staff only)
 * @returns {Promise<{data: Array, error: Error}>}
 */
export async function getAllUsers() {
  return await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
}

/**
 * Fetch user by ID
 * @param {string} userId
 * @returns {Promise<{data: object, error: Error}>}
 */
export async function getUserById(userId) {
  return await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
}

/**
 * Invite new user (sends Supabase magic link)
 * @param {object} userData - { email, full_name, role, user_type, hire_date, hourly_rate, phone }
 * @returns {Promise<{data: object, error: Error}>}
 */
export async function inviteUser(userData) {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    userData.email,
    {
      data: {
        user_type: 'staff',
        role: userData.role,
        full_name: userData.full_name,
        user_type_detail: userData.user_type || 'employee'
      },
      redirectTo: window.location.origin + '/operations'
    }
  );

  if (error) return { data: null, error };

  // Also create initial users record (will be overwritten by trigger, but sets additional fields)
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: data.user.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      user_type: userData.user_type || 'employee',
      hire_date: userData.hire_date,
      hourly_rate: userData.hourly_rate,
      phone: userData.phone,
      active: true
    });

  return { data: data.user, error: insertError };
}

/**
 * Update user
 * @param {string} userId
 * @param {object} updates - Fields to update
 * @returns {Promise<{data: object, error: Error}>}
 */
export async function updateUser(userId, updates) {
  return await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
}

/**
 * Deactivate user
 * @param {string} userId
 * @returns {Promise<{data: object, error: Error}>}
 */
export async function deactivateUser(userId) {
  return await updateUser(userId, { active: false });
}

/**
 * Reactivate user
 * @param {string} userId
 * @returns {Promise<{data: object, error: Error}>}
 */
export async function reactivateUser(userId) {
  return await updateUser(userId, { active: true });
}
```

**Step 2: Commit**

```bash
git add sailorskills-operations/src/api/users.js
git commit -m "feat(ops): add user management API module"
```

---

**Note:** This is a comprehensive 4-week plan with 160+ tasks total. Due to length constraints, I'm providing the first ~16 tasks (Week 1 foundation work). The full plan would continue with:

- **Week 1 (continued):** User Management UI, Operations integration
- **Week 2:** Billing & Inventory service integration
- **Week 3:** Insight & Estimator integration, Audit Log Viewer UI
- **Week 4:** Cross-service testing, permission boundary tests, bug fixes, polish, real user onboarding

---

## Implementation Strategy

Given the scale (160+ tasks), I recommend:

**Option 1: Subagent-Driven Development**
- Stay in this session
- I dispatch fresh subagent per task group (5-10 tasks)
- Review code between task groups
- Fast iteration with quality gates
- **Best for:** Close collaboration, learning the system as we build

**Option 2: Execute Full Weeks in Batches**
- Use superpowers:executing-plans
- Complete Week 1 (database foundation) in one batch
- Review and test after each week
- **Best for:** When you have dedicated time blocks

**Option 3: Hybrid Approach**
- Week 1 (Foundation): Subagent-driven with close review
- Weeks 2-3 (Service Integration): Batch execution
- Week 4 (Testing): Interactive review
- **Best for:** Balance of speed and oversight

Which approach would you like to use?
