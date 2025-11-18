-- Create email_bcc_settings table
CREATE TABLE IF NOT EXISTS email_bcc_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT UNIQUE NOT NULL,
  bcc_address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create email_bcc_audit_log table
CREATE TABLE IF NOT EXISTS email_bcc_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT NOT NULL,
  old_address TEXT,
  new_address TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bcc_service ON email_bcc_settings(service_name);
CREATE INDEX IF NOT EXISTS idx_bcc_active ON email_bcc_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_bcc_audit_service ON email_bcc_audit_log(service_name);
CREATE INDEX IF NOT EXISTS idx_bcc_audit_date ON email_bcc_audit_log(changed_at DESC);

-- RLS Policies
ALTER TABLE email_bcc_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_bcc_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only: email_bcc_settings"
  ON email_bcc_settings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin view: email_bcc_audit_log"
  ON email_bcc_audit_log FOR SELECT
  USING (is_admin());

-- Initial data
INSERT INTO email_bcc_settings (service_name, bcc_address, is_active, description) VALUES
  ('operations', 'standardhuman@gmail.com', true, 'Service notifications, completions, invoices'),
  ('billing', 'standardhuman@gmail.com', true, 'Invoice and payment emails'),
  ('booking', 'standardhuman@gmail.com', true, 'Booking confirmations and reminders'),
  ('portal', 'standardhuman@gmail.com', true, 'Customer portal notifications'),
  ('settings', 'standardhuman@gmail.com', true, 'Auth emails (magic links, password resets)'),
  ('shared', 'standardhuman@gmail.com', true, 'Payment receipts and shared notifications')
ON CONFLICT (service_name) DO NOTHING;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_bcc_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bcc_settings_timestamp
  BEFORE UPDATE ON email_bcc_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_bcc_settings_updated_at();

COMMENT ON TABLE email_bcc_settings IS 'Per-service BCC email configuration with fallback to ENV variable';
COMMENT ON TABLE email_bcc_audit_log IS 'Audit trail for all BCC address changes';
