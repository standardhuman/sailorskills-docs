-- Migration 016: User Accounts & Audit Logging System
-- Date: 2025-11-04
-- Description: Add user accounts, roles, RBAC, and comprehensive audit logging
-- Estimated runtime: 30-60 seconds

-- ============================================================
-- USERS TABLE
-- ============================================================

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

-- ============================================================
-- AUDIT LOGS TABLE
-- ============================================================

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
