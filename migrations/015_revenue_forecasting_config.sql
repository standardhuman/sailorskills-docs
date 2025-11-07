-- Migration: Revenue Forecasting Configuration
-- Date: 2025-11-07
-- Purpose: Add revenue forecasting configuration for Insight service hiring impact analysis
-- Dependencies: Settings Service, User authentication
-- Target Services: Settings (configuration), Insight (consumption)

-- =============================================================================
-- TABLE: revenue_forecasting_config
-- =============================================================================
-- Stores all financial variables needed for hiring impact analysis and revenue forecasting

CREATE TABLE IF NOT EXISTS revenue_forecasting_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_category TEXT NOT NULL CHECK (config_category IN ('employee_costs', 'contractor_costs', 'overhead_costs', 'capacity_assumptions')),
  config_key TEXT NOT NULL,
  config_value DECIMAL(10,2) NOT NULL CHECK (config_value >= 0),
  config_value_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(config_category, config_key)
);

-- Indexes for performance
CREATE INDEX idx_rev_forecast_category ON revenue_forecasting_config(config_category) WHERE is_active = TRUE;
CREATE INDEX idx_rev_forecast_active ON revenue_forecasting_config(is_active);
CREATE INDEX idx_rev_forecast_display_order ON revenue_forecasting_config(config_category, display_order);

-- =============================================================================
-- SEED DATA: Employee Costs
-- =============================================================================

INSERT INTO revenue_forecasting_config (config_category, config_key, config_value, config_value_type, display_name, description, display_order) VALUES
('employee_costs', 'hourly_wage', 25.00, 'dollars_per_hour', 'Employee Hourly Wage', 'Base hourly wage before benefits/taxes', 1),
('employee_costs', 'annual_salary', 52000.00, 'dollars_per_year', 'Employee Annual Salary', 'Alternative to hourly (40hr/wk × 52wk). Use this OR hourly wage.', 2),
('employee_costs', 'payroll_tax_rate', 7.65, 'percentage', 'Payroll Tax Rate (FICA)', 'Employer FICA contribution (6.2% SS + 1.45% Medicare)', 3),
('employee_costs', 'workers_comp_rate', 8.50, 'percentage', 'Workers Compensation Rate', 'Insurance rate (varies by state/industry, marine services typically 5-12%)', 4),
('employee_costs', 'health_insurance_monthly', 600.00, 'dollars_per_month', 'Health Insurance (Monthly)', 'Employer contribution to health benefits (family coverage)', 5),
('employee_costs', 'vacation_pto_weeks', 2.00, 'weeks_per_year', 'Paid Time Off (Weeks/Year)', 'Annual vacation/sick leave (typically 2-4 weeks)', 6),
('employee_costs', 'training_cost_annual', 1500.00, 'dollars_per_year', 'Training Cost (Annual)', 'Certifications, safety training, skills development, diving recertification', 7),
('employee_costs', 'equipment_cost_annual', 2000.00, 'dollars_per_year', 'Equipment Cost (Annual)', 'Diving gear, tools, safety equipment (amortized over lifespan)', 8),
('employee_costs', 'uniform_cost_annual', 500.00, 'dollars_per_year', 'Uniform/PPE Cost (Annual)', 'Work apparel, wetsuits, personal protective equipment', 9)
ON CONFLICT (config_category, config_key) DO NOTHING;

-- =============================================================================
-- SEED DATA: Contractor Costs
-- =============================================================================

INSERT INTO revenue_forecasting_config (config_category, config_key, config_value, config_value_type, display_name, description, display_order) VALUES
('contractor_costs', 'hourly_rate', 45.00, 'dollars_per_hour', 'Contractor Hourly Rate', 'All-inclusive rate paid to contractor (no benefits, PTO, or training)', 1),
('contractor_costs', 'contract_admin_overhead', 5.00, 'percentage', 'Contract Admin Overhead', 'Additional admin cost for invoicing, tracking, 1099 processing', 2)
ON CONFLICT (config_category, config_key) DO NOTHING;

-- =============================================================================
-- SEED DATA: Overhead Costs
-- =============================================================================

INSERT INTO revenue_forecasting_config (config_category, config_key, config_value, config_value_type, display_name, description, display_order) VALUES
('overhead_costs', 'vehicle_cost_monthly', 500.00, 'dollars_per_month', 'Vehicle Cost (Monthly)', 'Truck/van lease, insurance, fuel, depreciation', 1),
('overhead_costs', 'vehicle_maintenance_annual', 2000.00, 'dollars_per_year', 'Vehicle Maintenance (Annual)', 'Repairs, tires, oil changes, registration, inspections', 2),
('overhead_costs', 'general_liability_annual', 3000.00, 'dollars_per_year', 'General Liability Insurance (Annual)', 'Business insurance, marine liability coverage', 3),
('overhead_costs', 'tool_replacement_annual', 1000.00, 'dollars_per_year', 'Tool Replacement (Annual)', 'Equipment depreciation and replacement reserve', 4),
('overhead_costs', 'office_overhead_monthly', 200.00, 'dollars_per_month', 'Office/Admin Overhead (Monthly)', 'Software subscriptions, supplies, bookkeeping, phone', 5)
ON CONFLICT (config_category, config_key) DO NOTHING;

-- =============================================================================
-- SEED DATA: Capacity Assumptions
-- =============================================================================

INSERT INTO revenue_forecasting_config (config_category, config_key, config_value, config_value_type, display_name, description, display_order) VALUES
('capacity_assumptions', 'billable_hours_per_week', 30.00, 'hours_per_week', 'Billable Hours per Week', 'Realistic billable hours (excluding drive time, admin, equipment prep)', 1),
('capacity_assumptions', 'utilization_rate_target', 75.00, 'percentage', 'Target Utilization Rate', '% of available hours that should be billable (75-85% is realistic)', 2),
('capacity_assumptions', 'average_service_hours', 2.50, 'hours_per_service', 'Average Service Duration', 'Typical time per service call (use historical data from service_logs)', 3),
('capacity_assumptions', 'average_revenue_per_hour', 120.00, 'dollars_per_hour', 'Average Revenue per Hour', 'Current business avg (calculate from invoices / total_hours)', 4),
('capacity_assumptions', 'revenue_per_service', 300.00, 'dollars_per_service', 'Average Revenue per Service', 'Typical service invoice amount (from invoice history)', 5),
('capacity_assumptions', 'weeks_per_year', 50.00, 'weeks_per_year', 'Working Weeks per Year', '52 minus 2 weeks for holidays/maintenance downtime', 6)
ON CONFLICT (config_category, config_key) DO NOTHING;

-- =============================================================================
-- TABLE: revenue_forecasting_audit_log
-- =============================================================================
-- Audit trail for tracking all configuration changes

CREATE TABLE IF NOT EXISTS revenue_forecasting_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_category TEXT NOT NULL,
  config_key TEXT NOT NULL,
  old_value DECIMAL(10,2),
  new_value DECIMAL(10,2),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT,
  change_source TEXT DEFAULT 'settings_ui' -- 'settings_ui', 'api', 'migration'
);

CREATE INDEX idx_forecast_audit_date ON revenue_forecasting_audit_log(changed_at DESC);
CREATE INDEX idx_forecast_audit_key ON revenue_forecasting_audit_log(config_category, config_key);
CREATE INDEX idx_forecast_audit_user ON revenue_forecasting_audit_log(changed_by);

-- =============================================================================
-- TRIGGER: Automatic audit logging on configuration changes
-- =============================================================================

CREATE OR REPLACE FUNCTION log_forecasting_config_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if value actually changed
  IF OLD.config_value IS DISTINCT FROM NEW.config_value THEN
    INSERT INTO revenue_forecasting_audit_log (
      config_category,
      config_key,
      old_value,
      new_value,
      changed_by,
      reason,
      change_source
    ) VALUES (
      NEW.config_category,
      NEW.config_key,
      OLD.config_value,
      NEW.config_value,
      NEW.updated_by,
      'Configuration updated via Settings service',
      'settings_ui'
    );
  END IF;

  -- Update timestamp
  NEW.updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS forecasting_config_audit_trigger ON revenue_forecasting_config;

CREATE TRIGGER forecasting_config_audit_trigger
BEFORE UPDATE ON revenue_forecasting_config
FOR EACH ROW
EXECUTE FUNCTION log_forecasting_config_changes();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

ALTER TABLE revenue_forecasting_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE revenue_forecasting_audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Admin users have full access to forecasting configuration
DROP POLICY IF EXISTS "Admin full access to forecasting config" ON revenue_forecasting_config;

CREATE POLICY "Admin full access to forecasting config"
ON revenue_forecasting_config
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- Policy: All authenticated users can read forecasting config (for Insight service)
DROP POLICY IF EXISTS "Authenticated users can read forecasting config" ON revenue_forecasting_config;

CREATE POLICY "Authenticated users can read forecasting config"
ON revenue_forecasting_config
FOR SELECT
TO authenticated
USING (is_active = TRUE);

-- Policy: Admin users can view audit log
DROP POLICY IF EXISTS "Admin can view audit log" ON revenue_forecasting_audit_log;

CREATE POLICY "Admin can view audit log"
ON revenue_forecasting_audit_log
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE auth.users.id = auth.uid()
    AND auth.users.raw_user_meta_data->>'role' = 'admin'
  )
);

-- =============================================================================
-- HELPER FUNCTION: Get all configuration as JSON
-- =============================================================================
-- This function makes it easy for the API to return well-structured config

CREATE OR REPLACE FUNCTION get_forecasting_config_json()
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'employee_costs', (
      SELECT jsonb_object_agg(config_key, config_value)
      FROM revenue_forecasting_config
      WHERE config_category = 'employee_costs' AND is_active = TRUE
    ),
    'contractor_costs', (
      SELECT jsonb_object_agg(config_key, config_value)
      FROM revenue_forecasting_config
      WHERE config_category = 'contractor_costs' AND is_active = TRUE
    ),
    'overhead_costs', (
      SELECT jsonb_object_agg(config_key, config_value)
      FROM revenue_forecasting_config
      WHERE config_category = 'overhead_costs' AND is_active = TRUE
    ),
    'capacity_assumptions', (
      SELECT jsonb_object_agg(config_key, config_value)
      FROM revenue_forecasting_config
      WHERE config_category = 'capacity_assumptions' AND is_active = TRUE
    ),
    'last_updated', (
      SELECT MAX(updated_at)::TEXT
      FROM revenue_forecasting_config
    ),
    'version', '1.0'
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_forecasting_config_json() TO authenticated;

-- =============================================================================
-- COMMENTS FOR DOCUMENTATION
-- =============================================================================

COMMENT ON TABLE revenue_forecasting_config IS 'Configuration for revenue forecasting and hiring impact analysis. Used by Settings service (admin UI) and Insight service (forecasting calculations).';

COMMENT ON COLUMN revenue_forecasting_config.config_category IS 'One of: employee_costs, contractor_costs, overhead_costs, capacity_assumptions';

COMMENT ON COLUMN revenue_forecasting_config.config_value_type IS 'Unit type for display and calculation: dollars_per_hour, dollars_per_year, percentage, etc.';

COMMENT ON COLUMN revenue_forecasting_config.display_order IS 'Order to display fields in Settings UI within each category';

COMMENT ON TABLE revenue_forecasting_audit_log IS 'Audit trail for all changes to revenue forecasting configuration. Tracks who changed what and when.';

COMMENT ON FUNCTION get_forecasting_config_json() IS 'Returns all active forecasting configuration as a structured JSON object. Used by API endpoints.';

-- =============================================================================
-- VERIFICATION QUERIES (for testing)
-- =============================================================================

-- To verify migration success, run these queries:

-- 1. Check that all config categories are populated
-- SELECT config_category, COUNT(*) as variable_count
-- FROM revenue_forecasting_config
-- WHERE is_active = TRUE
-- GROUP BY config_category
-- ORDER BY config_category;
--
-- Expected results:
--   capacity_assumptions | 6
--   contractor_costs     | 2
--   employee_costs       | 9
--   overhead_costs       | 5

-- 2. Test the helper function
-- SELECT get_forecasting_config_json();

-- 3. Verify RLS policies are working
-- (Run as non-admin user - should only see active records)
-- SELECT * FROM revenue_forecasting_config;

-- =============================================================================
-- ROLLBACK INSTRUCTIONS
-- =============================================================================

-- To rollback this migration:
/*
DROP FUNCTION IF EXISTS get_forecasting_config_json();
DROP TRIGGER IF EXISTS forecasting_config_audit_trigger ON revenue_forecasting_config;
DROP FUNCTION IF EXISTS log_forecasting_config_changes();
DROP TABLE IF EXISTS revenue_forecasting_audit_log;
DROP TABLE IF EXISTS revenue_forecasting_config;
*/

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
