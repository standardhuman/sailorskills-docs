-- Business Pricing Configuration Table
CREATE TABLE IF NOT EXISTS business_pricing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT UNIQUE NOT NULL,
  config_value DECIMAL(10,2) NOT NULL,
  config_type TEXT NOT NULL CHECK (config_type IN ('service_rate', 'surcharge', 'minimum', 'anode')),
  display_name TEXT NOT NULL,
  description TEXT,
  unit TEXT CHECK (unit IN ('dollars_per_foot', 'percentage', 'flat_rate', 'dollars_per_unit')),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Email Templates Table
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key TEXT UNIQUE NOT NULL,
  template_name TEXT NOT NULL,
  subject_line TEXT NOT NULL,
  email_body TEXT NOT NULL,
  html_template_file TEXT NOT NULL,
  available_variables JSONB DEFAULT '[]'::jsonb,
  service TEXT CHECK (service IN ('shared', 'operations', 'billing', 'portal')),
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Integration Credentials Table
CREATE TABLE IF NOT EXISTS integration_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_name TEXT UNIQUE NOT NULL,
  api_key_encrypted TEXT,
  config_json JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  last_verified TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pricing Audit Log Table
CREATE TABLE IF NOT EXISTS pricing_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT NOT NULL,
  old_value DECIMAL(10,2),
  new_value DECIMAL(10,2),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT
);

-- Extend email_logs table for engagement tracking
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS first_click_at TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS click_count INTEGER DEFAULT 0;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS replied_at TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS complained_at TIMESTAMP;

-- User Profiles Table (for role management - cannot modify auth.users directly)
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'viewer' CHECK (role IN ('admin', 'technician', 'viewer')),
  service_access JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_config_key ON business_pricing_config(config_key);
CREATE INDEX IF NOT EXISTS idx_pricing_config_type ON business_pricing_config(config_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_key ON email_templates(template_key);
CREATE INDEX IF NOT EXISTS idx_email_templates_service ON email_templates(service);
CREATE INDEX IF NOT EXISTS idx_integration_name ON integration_credentials(integration_name);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_key ON pricing_audit_log(config_key);
CREATE INDEX IF NOT EXISTS idx_pricing_audit_date ON pricing_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_opened ON email_logs(opened_at);
CREATE INDEX IF NOT EXISTS idx_email_logs_clicked ON email_logs(first_click_at);

-- RLS Policies (Admin only)
ALTER TABLE business_pricing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admin only: business_pricing_config"
  ON business_pricing_config FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin only: email_templates"
  ON email_templates FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin only: integration_credentials"
  ON integration_credentials FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Authenticated read: pricing_audit_log"
  ON pricing_audit_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin write: pricing_audit_log"
  ON pricing_audit_log FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admin only: user_profiles"
  ON user_profiles FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Users can read own profile"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid());
