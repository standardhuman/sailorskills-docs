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

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

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

-- ============================================================
-- AUDIT TRIGGERS
-- ============================================================

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

-- ============================================================
-- RLS POLICIES
-- ============================================================

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

-- ============================================================
-- AUTH TRIGGERS
-- ============================================================

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
