# Revenue Forecasting Configuration - Settings Service Extension

**Date**: November 7, 2025
**Author**: Brian (with Claude)
**Status**: Approved for Implementation
**Dependencies**: Settings Service (in progress), Insight Service (Q1 2026)

## Executive Summary

This document extends the Settings Service design to include **Revenue Forecasting Configuration** - a comprehensive set of financial parameters that enable the Insight Service to perform employee/contractor hiring impact analysis and revenue forecasting.

**Key Capabilities:**
- Configure employee vs contractor financial parameters
- Define overhead costs (benefits, taxes, insurance, equipment)
- Set revenue capacity assumptions
- Provide configuration API for Insight service forecasting models

---

## 1. Database Schema Extension

### 1.1 New Tables

#### `revenue_forecasting_config`
Stores all financial variables needed for hiring impact analysis and revenue forecasting.

```sql
CREATE TABLE revenue_forecasting_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_category TEXT NOT NULL,          -- 'employee_costs', 'contractor_costs', 'overhead', 'capacity'
  config_key TEXT NOT NULL,                -- 'employee_hourly_rate'
  config_value DECIMAL(10,2) NOT NULL,     -- 25.00
  config_value_type TEXT NOT NULL,         -- 'dollars_per_hour', 'percentage', 'dollars_per_year', 'dollars_flat'
  display_name TEXT NOT NULL,              -- 'Employee Hourly Wage'
  description TEXT,                        -- Help text explaining the variable
  display_order INTEGER DEFAULT 0,         -- UI ordering
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(config_category, config_key)
);

CREATE INDEX idx_rev_forecast_category ON revenue_forecasting_config(config_category);
CREATE INDEX idx_rev_forecast_active ON revenue_forecasting_config(is_active);
```

#### `forecasting_scenarios` (optional - for future saved scenarios)
Allows saving "what-if" scenarios for later comparison.

```sql
CREATE TABLE forecasting_scenarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scenario_name TEXT NOT NULL,
  scenario_description TEXT,
  config_snapshot JSONB NOT NULL,       -- Snapshot of all config values at time of save
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  is_favorite BOOLEAN DEFAULT FALSE
);
```

### 1.2 Initial Configuration Data

The table will be seeded with these categories and variables:

#### **Category: `employee_costs`**
| config_key | config_value | config_value_type | display_name | description |
|------------|--------------|-------------------|--------------|-------------|
| `hourly_wage` | 25.00 | dollars_per_hour | Employee Hourly Wage | Base hourly wage before benefits/taxes |
| `annual_salary` | 52000.00 | dollars_per_year | Employee Annual Salary | Alternative to hourly (40hr/wk × 52wk) |
| `payroll_tax_rate` | 7.65 | percentage | Payroll Tax Rate (FICA) | Employer FICA contribution (SS + Medicare) |
| `workers_comp_rate` | 8.50 | percentage | Workers Compensation Rate | Insurance rate (varies by state/industry) |
| `health_insurance_monthly` | 600.00 | dollars_per_month | Health Insurance (Monthly) | Employer contribution to health benefits |
| `vacation_pto_weeks` | 2.00 | weeks_per_year | Paid Time Off (Weeks/Year) | Annual vacation/sick leave |
| `training_cost_annual` | 1500.00 | dollars_per_year | Training Cost (Annual) | Certifications, safety training, skills development |
| `equipment_cost_annual` | 2000.00 | dollars_per_year | Equipment Cost (Annual) | Diving gear, tools, safety equipment amortized |
| `uniform_cost_annual` | 500.00 | dollars_per_year | Uniform/PPE Cost (Annual) | Work apparel and personal protective equipment |

#### **Category: `contractor_costs`**
| config_key | config_value | config_value_type | display_name | description |
|------------|--------------|-------------------|--------------|-------------|
| `hourly_rate` | 45.00 | dollars_per_hour | Contractor Hourly Rate | All-inclusive rate paid to contractor |
| `contract_admin_overhead` | 5.00 | percentage | Contract Admin Overhead | Additional admin cost (invoicing, tracking) |
| `no_benefits_cost` | 0.00 | dollars_per_year | Benefits Cost | Contractors receive no benefits |
| `no_pto_cost` | 0.00 | dollars_per_year | PTO Cost | Contractors receive no paid time off |

#### **Category: `overhead_costs`**
| config_key | config_value | config_value_type | display_name | description |
|------------|--------------|-------------------|--------------|-------------|
| `vehicle_cost_monthly` | 500.00 | dollars_per_month | Vehicle Cost (Monthly) | Truck/van lease, insurance, fuel |
| `vehicle_maintenance_annual` | 2000.00 | dollars_per_year | Vehicle Maintenance (Annual) | Repairs, registration, inspections |
| `general_liability_annual` | 3000.00 | dollars_per_year | General Liability Insurance (Annual) | Business insurance |
| `tool_replacement_annual` | 1000.00 | dollars_per_year | Tool Replacement (Annual) | Equipment depreciation and replacement |
| `office_overhead_monthly` | 200.00 | dollars_per_month | Office/Admin Overhead (Monthly) | Software, supplies, bookkeeping |

#### **Category: `capacity_assumptions`**
| config_key | config_value | config_value_type | display_name | description |
|------------|--------------|-------------------|--------------|-------------|
| `billable_hours_per_week` | 30.00 | hours_per_week | Billable Hours per Week | Realistic billable hours (excluding drive time, admin) |
| `utilization_rate_target` | 75.00 | percentage | Target Utilization Rate | % of available hours that should be billable |
| `average_service_hours` | 2.50 | hours_per_service | Average Service Duration | Typical time per service call |
| `average_revenue_per_hour` | 120.00 | dollars_per_hour | Average Revenue per Hour | Current business avg (from historical data) |
| `revenue_per_service` | 300.00 | dollars_per_service | Average Revenue per Service | Typical service invoice amount |
| `weeks_per_year` | 50.00 | weeks_per_year | Working Weeks per Year | 52 minus 2 for holidays/downtime |

---

## 2. Settings UI Extension

### 2.1 New Tab: "Revenue Forecasting" (`system-config.html`)

Add a new tab to the existing System Config page:

**Tab Navigation** (updated):
- 💰 Pricing
- 🏢 Business Info
- 🎨 Branding
- ⚙️ Features
- **📊 Revenue Forecasting** ← NEW

### 2.2 Revenue Forecasting Tab Layout

The tab contains 4 collapsible sections:

```
┌─────────────────────────────────────────────────────────────┐
│ 📊 Revenue Forecasting Configuration                          │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│ ▼ Employee Costs                                             │
│   ┌───────────────────────────────────────────────────┐     │
│   │ Hourly Wage:           $ [25.00] /hr              │     │
│   │ OR Annual Salary:      $ [52,000] /year           │     │
│   │ Payroll Tax (FICA):      [7.65] %                 │     │
│   │ Workers Comp Rate:       [8.50] %                 │     │
│   │ Health Insurance:      $ [600] /month             │     │
│   │ Paid Time Off:           [2] weeks/year           │     │
│   │ Training Cost:         $ [1,500] /year            │     │
│   │ Equipment Cost:        $ [2,000] /year            │     │
│   │ Uniform/PPE Cost:      $ [500] /year              │     │
│   └───────────────────────────────────────────────────┘     │
│                                                               │
│ ▼ Contractor Costs                                           │
│   ┌───────────────────────────────────────────────────┐     │
│   │ Hourly Rate:           $ [45.00] /hr              │     │
│   │ Admin Overhead:          [5.00] %                 │     │
│   │ ℹ️ No benefits, PTO, or training costs            │     │
│   └───────────────────────────────────────────────────┘     │
│                                                               │
│ ▼ Overhead Costs                                             │
│   ┌───────────────────────────────────────────────────┐     │
│   │ Vehicle Cost:          $ [500] /month             │     │
│   │ Vehicle Maintenance:   $ [2,000] /year            │     │
│   │ General Liability:     $ [3,000] /year            │     │
│   │ Tool Replacement:      $ [1,000] /year            │     │
│   │ Office/Admin:          $ [200] /month             │     │
│   └───────────────────────────────────────────────────┘     │
│                                                               │
│ ▼ Capacity Assumptions                                       │
│   ┌───────────────────────────────────────────────────┐     │
│   │ Billable Hours/Week:     [30] hours               │     │
│   │ Target Utilization:      [75] %                   │     │
│   │ Avg Service Duration:    [2.5] hours              │     │
│   │ Avg Revenue/Hour:      $ [120] /hr                │     │
│   │ Avg Revenue/Service:   $ [300] /service           │     │
│   │ Working Weeks/Year:      [50] weeks               │     │
│   └───────────────────────────────────────────────────┘     │
│                                                               │
│ [Calculate Total Cost Preview]                               │
│                                                               │
│ ┌─────────────────────────────────────────────────────┐     │
│ │ 💡 Cost Preview                                      │     │
│ │                                                       │     │
│ │ Employee Annual Cost:        $78,425                 │     │
│ │   Base Wage/Salary:          $52,000                 │     │
│ │   Payroll Taxes:             $3,978                  │     │
│ │   Workers Comp:              $4,420                  │     │
│ │   Health Insurance:          $7,200                  │     │
│ │   PTO (2 weeks):             $2,000                  │     │
│ │   Training:                  $1,500                  │     │
│ │   Equipment:                 $2,000                  │     │
│ │   Uniforms:                  $500                    │     │
│ │   Overhead (allocated):      $4,827                  │     │
│ │                                                       │     │
│ │ Contractor Annual Cost:      $70,200                 │     │
│ │   Hourly Rate (1500hr):      $67,500                 │     │
│ │   Admin Overhead:            $2,700                  │     │
│ │                                                       │     │
│ │ Break-Even Analysis:                                 │     │
│ │   Employee requires $52/hr billable to break even   │     │
│ │   Contractor requires $47/hr billable to break even │     │
│ └─────────────────────────────────────────────────────┘     │
│                                                               │
│ [Save Configuration] [Revert to Defaults]                    │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.3 UI Features

**Real-Time Cost Preview**:
- Calculate button triggers instant preview
- Shows full cost breakdown for both employee and contractor
- Displays break-even hourly rate needed
- Updates whenever any input changes

**Smart Defaults**:
- Pre-populated with industry-standard values
- Revert button restores defaults
- All values editable

**Validation**:
- Minimum/maximum ranges on numeric inputs
- Warning if values seem unrealistic (e.g., hourly wage < $15 or > $100)
- Confirmation modal before saving major changes

**Help Text**:
- Tooltip (ℹ️) on each field explaining purpose
- Link to "How to Calculate" guide for complex fields
- Examples of typical values

---

## 3. API Endpoints for Insight Service

### 3.1 GET `/api/forecasting-config`

Returns all active forecasting configuration as a structured JSON object.

**Response Structure**:
```json
{
  "employee_costs": {
    "hourly_wage": 25.00,
    "annual_salary": 52000.00,
    "payroll_tax_rate": 7.65,
    "workers_comp_rate": 8.50,
    "health_insurance_monthly": 600.00,
    "vacation_pto_weeks": 2.00,
    "training_cost_annual": 1500.00,
    "equipment_cost_annual": 2000.00,
    "uniform_cost_annual": 500.00
  },
  "contractor_costs": {
    "hourly_rate": 45.00,
    "contract_admin_overhead": 5.00
  },
  "overhead_costs": {
    "vehicle_cost_monthly": 500.00,
    "vehicle_maintenance_annual": 2000.00,
    "general_liability_annual": 3000.00,
    "tool_replacement_annual": 1000.00,
    "office_overhead_monthly": 200.00
  },
  "capacity_assumptions": {
    "billable_hours_per_week": 30.00,
    "utilization_rate_target": 75.00,
    "average_service_hours": 2.50,
    "average_revenue_per_hour": 120.00,
    "revenue_per_service": 300.00,
    "weeks_per_year": 50.00
  },
  "last_updated": "2025-11-07T10:30:00Z",
  "version": "1.0"
}
```

**Usage by Insight**:
```javascript
// Insight Service fetches config
const config = await fetch('https://sailorskills-settings.vercel.app/api/forecasting-config')
  .then(r => r.json());

// Use in what-if scenario calculations
const employeeAnnualCost = calculateEmployeeCost(config.employee_costs, config.overhead_costs);
const contractorAnnualCost = calculateContractorCost(config.contractor_costs);
```

### 3.2 POST `/api/forecasting-config/update`

Updates one or more configuration values (admin only).

**Request Body**:
```json
{
  "updates": [
    {
      "config_category": "employee_costs",
      "config_key": "hourly_wage",
      "config_value": 28.00
    },
    {
      "config_category": "capacity_assumptions",
      "config_key": "billable_hours_per_week",
      "config_value": 32.00
    }
  ],
  "reason": "Updated based on 2026 market rates"
}
```

**Response**:
```json
{
  "success": true,
  "updated_count": 2,
  "audit_log_ids": ["uuid1", "uuid2"]
}
```

### 3.3 GET `/api/forecasting-config/calculate-totals`

Helper endpoint that returns calculated annual costs (useful for quick previews).

**Query Parameters**:
- `?scenario=employee` or `?scenario=contractor`
- `?hours_per_week=30` (override default)

**Response**:
```json
{
  "scenario": "employee",
  "annual_cost_breakdown": {
    "base_compensation": 52000.00,
    "payroll_taxes": 3978.00,
    "workers_comp": 4420.00,
    "health_insurance": 7200.00,
    "pto_cost": 2000.00,
    "training": 1500.00,
    "equipment": 2000.00,
    "uniforms": 500.00,
    "overhead_allocated": 4827.00,
    "total_annual_cost": 78425.00
  },
  "break_even_analysis": {
    "billable_hours_per_year": 1500,
    "hourly_rate_required": 52.28,
    "services_per_year_required": 261
  }
}
```

---

## 4. Migration Script

### 4.1 Migration File: `015_revenue_forecasting_config.sql`

```sql
-- Migration: Revenue Forecasting Configuration
-- Date: 2025-11-07
-- Purpose: Add revenue forecasting configuration for Insight service

-- Create revenue_forecasting_config table
CREATE TABLE revenue_forecasting_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_category TEXT NOT NULL,
  config_key TEXT NOT NULL,
  config_value DECIMAL(10,2) NOT NULL,
  config_value_type TEXT NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id),
  UNIQUE(config_category, config_key)
);

CREATE INDEX idx_rev_forecast_category ON revenue_forecasting_config(config_category);
CREATE INDEX idx_rev_forecast_active ON revenue_forecasting_config(is_active);

-- Seed employee costs
INSERT INTO revenue_forecasting_config (config_category, config_key, config_value, config_value_type, display_name, description, display_order) VALUES
('employee_costs', 'hourly_wage', 25.00, 'dollars_per_hour', 'Employee Hourly Wage', 'Base hourly wage before benefits/taxes', 1),
('employee_costs', 'annual_salary', 52000.00, 'dollars_per_year', 'Employee Annual Salary', 'Alternative to hourly (40hr/wk × 52wk)', 2),
('employee_costs', 'payroll_tax_rate', 7.65, 'percentage', 'Payroll Tax Rate (FICA)', 'Employer FICA contribution (SS + Medicare)', 3),
('employee_costs', 'workers_comp_rate', 8.50, 'percentage', 'Workers Compensation Rate', 'Insurance rate (varies by state/industry)', 4),
('employee_costs', 'health_insurance_monthly', 600.00, 'dollars_per_month', 'Health Insurance (Monthly)', 'Employer contribution to health benefits', 5),
('employee_costs', 'vacation_pto_weeks', 2.00, 'weeks_per_year', 'Paid Time Off (Weeks/Year)', 'Annual vacation/sick leave', 6),
('employee_costs', 'training_cost_annual', 1500.00, 'dollars_per_year', 'Training Cost (Annual)', 'Certifications, safety training, skills development', 7),
('employee_costs', 'equipment_cost_annual', 2000.00, 'dollars_per_year', 'Equipment Cost (Annual)', 'Diving gear, tools, safety equipment amortized', 8),
('employee_costs', 'uniform_cost_annual', 500.00, 'dollars_per_year', 'Uniform/PPE Cost (Annual)', 'Work apparel and personal protective equipment', 9);

-- Seed contractor costs
INSERT INTO revenue_forecasting_config (config_category, config_key, config_value, config_value_type, display_name, description, display_order) VALUES
('contractor_costs', 'hourly_rate', 45.00, 'dollars_per_hour', 'Contractor Hourly Rate', 'All-inclusive rate paid to contractor', 1),
('contractor_costs', 'contract_admin_overhead', 5.00, 'percentage', 'Contract Admin Overhead', 'Additional admin cost (invoicing, tracking)', 2);

-- Seed overhead costs
INSERT INTO revenue_forecasting_config (config_category, config_key, config_value, config_value_type, display_name, description, display_order) VALUES
('overhead_costs', 'vehicle_cost_monthly', 500.00, 'dollars_per_month', 'Vehicle Cost (Monthly)', 'Truck/van lease, insurance, fuel', 1),
('overhead_costs', 'vehicle_maintenance_annual', 2000.00, 'dollars_per_year', 'Vehicle Maintenance (Annual)', 'Repairs, registration, inspections', 2),
('overhead_costs', 'general_liability_annual', 3000.00, 'dollars_per_year', 'General Liability Insurance (Annual)', 'Business insurance', 3),
('overhead_costs', 'tool_replacement_annual', 1000.00, 'dollars_per_year', 'Tool Replacement (Annual)', 'Equipment depreciation and replacement', 4),
('overhead_costs', 'office_overhead_monthly', 200.00, 'dollars_per_month', 'Office/Admin Overhead (Monthly)', 'Software, supplies, bookkeeping', 5);

-- Seed capacity assumptions
INSERT INTO revenue_forecasting_config (config_category, config_key, config_value, config_value_type, display_name, description, display_order) VALUES
('capacity_assumptions', 'billable_hours_per_week', 30.00, 'hours_per_week', 'Billable Hours per Week', 'Realistic billable hours (excluding drive time, admin)', 1),
('capacity_assumptions', 'utilization_rate_target', 75.00, 'percentage', 'Target Utilization Rate', '% of available hours that should be billable', 2),
('capacity_assumptions', 'average_service_hours', 2.50, 'hours_per_service', 'Average Service Duration', 'Typical time per service call', 3),
('capacity_assumptions', 'average_revenue_per_hour', 120.00, 'dollars_per_hour', 'Average Revenue per Hour', 'Current business avg (from historical data)', 4),
('capacity_assumptions', 'revenue_per_service', 300.00, 'dollars_per_service', 'Average Revenue per Service', 'Typical service invoice amount', 5),
('capacity_assumptions', 'weeks_per_year', 50.00, 'weeks_per_year', 'Working Weeks per Year', '52 minus 2 for holidays/downtime', 6);

-- Enable RLS (restrict to admin users)
ALTER TABLE revenue_forecasting_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to forecasting config"
ON revenue_forecasting_config
FOR ALL
USING (
  auth.uid() IN (
    SELECT id FROM auth.users WHERE role = 'admin'
  )
);

-- Grant access to authenticated users (read-only for API)
CREATE POLICY "Authenticated users can read forecasting config"
ON revenue_forecasting_config
FOR SELECT
USING (auth.role() = 'authenticated');

-- Audit table for tracking changes
CREATE TABLE revenue_forecasting_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_category TEXT NOT NULL,
  config_key TEXT NOT NULL,
  old_value DECIMAL(10,2),
  new_value DECIMAL(10,2),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT
);

-- Trigger to log changes
CREATE OR REPLACE FUNCTION log_forecasting_config_changes()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO revenue_forecasting_audit_log (
    config_category,
    config_key,
    old_value,
    new_value,
    changed_by,
    reason
  ) VALUES (
    OLD.config_category,
    OLD.config_key,
    OLD.config_value,
    NEW.config_value,
    NEW.updated_by,
    'Configuration updated'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER forecasting_config_audit_trigger
AFTER UPDATE ON revenue_forecasting_config
FOR EACH ROW
WHEN (OLD.config_value IS DISTINCT FROM NEW.config_value)
EXECUTE FUNCTION log_forecasting_config_changes();

COMMENT ON TABLE revenue_forecasting_config IS 'Configuration for revenue forecasting and hiring impact analysis in Insight service';
COMMENT ON TABLE revenue_forecasting_audit_log IS 'Audit trail for revenue forecasting configuration changes';
```

---

## 5. Implementation Checklist

### Phase 1: Database & Migration (Day 1)
- [ ] Create migration script `015_revenue_forecasting_config.sql`
- [ ] Test migration on staging database
- [ ] Run migration on production
- [ ] Verify seed data inserted correctly
- [ ] Test RLS policies (admin can edit, users can read)

### Phase 2: API Endpoints (Day 1-2)
- [ ] Create `/api/forecasting-config` GET endpoint
- [ ] Create `/api/forecasting-config/update` POST endpoint
- [ ] Create `/api/forecasting-config/calculate-totals` GET helper
- [ ] Add authentication middleware (admin-only for updates)
- [ ] Write API documentation
- [ ] Test endpoints with Postman/curl

### Phase 3: Settings UI (Day 2-3)
- [ ] Add "Revenue Forecasting" tab to `system-config.html`
- [ ] Build collapsible sections UI (Employee, Contractor, Overhead, Capacity)
- [ ] Implement form inputs with validation
- [ ] Build real-time cost preview calculator
- [ ] Add save/revert functionality
- [ ] Add tooltips and help text
- [ ] Test responsive design

### Phase 4: Cost Calculation Logic (Day 3)
- [ ] Implement employee annual cost calculation
- [ ] Implement contractor annual cost calculation
- [ ] Implement break-even analysis logic
- [ ] Add validation for realistic values
- [ ] Test edge cases (extreme values, missing data)

### Phase 5: Testing & Documentation (Day 4)
- [ ] End-to-end testing (UI → API → Database)
- [ ] Test with realistic scenarios
- [ ] Document API for Insight service integration
- [ ] Create user guide for Settings UI
- [ ] Commit and push to Settings service repo

### Phase 6: Integration Support (Day 5)
- [ ] Provide Insight team with API documentation
- [ ] Create example integration code
- [ ] Test API from Insight service preview
- [ ] Verify CORS and authentication working
- [ ] Final deployment verification

---

## 6. Insight Service Integration Guide

### 6.1 Fetching Configuration

```javascript
// In Insight Service (sailorskills-insight)
// File: src/lib/forecasting-api.js

export async function getForecastingConfig() {
  const response = await fetch('https://sailorskills-settings.vercel.app/api/forecasting-config', {
    headers: {
      'Authorization': `Bearer ${supabaseClient.auth.session().access_token}`
    }
  });

  if (!response.ok) {
    throw new Error('Failed to fetch forecasting configuration');
  }

  return await response.json();
}
```

### 6.2 Calculating Employee Cost

```javascript
// File: src/lib/forecasting-calculations.js

export function calculateEmployeeAnnualCost(config) {
  const { employee_costs, overhead_costs } = config;

  // Base compensation (use salary if set, otherwise calculate from hourly)
  const baseCompensation = employee_costs.annual_salary > 0
    ? employee_costs.annual_salary
    : employee_costs.hourly_wage * 40 * config.capacity_assumptions.weeks_per_year;

  // Payroll taxes
  const payrollTaxes = baseCompensation * (employee_costs.payroll_tax_rate / 100);

  // Workers compensation
  const workersComp = baseCompensation * (employee_costs.workers_comp_rate / 100);

  // Health insurance
  const healthInsurance = employee_costs.health_insurance_monthly * 12;

  // PTO cost (wage for non-working weeks)
  const ptoCost = (employee_costs.hourly_wage * 40 * employee_costs.vacation_pto_weeks);

  // Direct costs
  const training = employee_costs.training_cost_annual;
  const equipment = employee_costs.equipment_cost_annual;
  const uniforms = employee_costs.uniform_cost_annual;

  // Overhead allocation
  const overheadMonthly = overhead_costs.vehicle_cost_monthly + overhead_costs.office_overhead_monthly;
  const overheadAnnual = (overheadMonthly * 12) + overhead_costs.vehicle_maintenance_annual +
                         overhead_costs.general_liability_annual + overhead_costs.tool_replacement_annual;

  // Total
  const totalAnnualCost = baseCompensation + payrollTaxes + workersComp + healthInsurance +
                          ptoCost + training + equipment + uniforms + overheadAnnual;

  return {
    base_compensation: baseCompensation,
    payroll_taxes: payrollTaxes,
    workers_comp: workersComp,
    health_insurance: healthInsurance,
    pto_cost: ptoCost,
    training: training,
    equipment: equipment,
    uniforms: uniforms,
    overhead: overheadAnnual,
    total_annual_cost: totalAnnualCost
  };
}

export function calculateContractorAnnualCost(config, hoursPerYear = 1500) {
  const { contractor_costs } = config;

  const baseRate = contractor_costs.hourly_rate * hoursPerYear;
  const adminOverhead = baseRate * (contractor_costs.contract_admin_overhead / 100);

  return {
    base_rate: baseRate,
    admin_overhead: adminOverhead,
    total_annual_cost: baseRate + adminOverhead
  };
}

export function calculateBreakEven(totalAnnualCost, billableHoursPerYear) {
  const hourlyRateRequired = totalAnnualCost / billableHoursPerYear;
  return {
    hourly_rate_required: hourlyRateRequired,
    monthly_revenue_required: (totalAnnualCost / 12),
    billable_hours_per_year: billableHoursPerYear
  };
}
```

### 6.3 What-If Scenario Example

```javascript
// File: src/views/what-if-scenarios.html
// Hiring Scenario Component

async function runHiringScenario(numEmployees, numContractors) {
  const config = await getForecastingConfig();

  // Calculate costs
  const employeeCosts = calculateEmployeeAnnualCost(config);
  const contractorCosts = calculateContractorAnnualCost(config);

  const totalEmployeeCost = employeeCosts.total_annual_cost * numEmployees;
  const totalContractorCost = contractorCosts.total_annual_cost * numContractors;
  const totalHiringCost = totalEmployeeCost + totalContractorCost;

  // Calculate capacity added
  const billableHoursPerYear = config.capacity_assumptions.billable_hours_per_week *
                                config.capacity_assumptions.weeks_per_year;
  const totalHoursAdded = billableHoursPerYear * (numEmployees + numContractors);

  // Calculate revenue potential
  const avgRevenuePerHour = config.capacity_assumptions.average_revenue_per_hour;
  const potentialRevenue = totalHoursAdded * avgRevenuePerHour;

  // Calculate profit
  const grossProfit = potentialRevenue - totalHiringCost;
  const profitMargin = (grossProfit / potentialRevenue) * 100;

  return {
    costs: {
      employees: totalEmployeeCost,
      contractors: totalContractorCost,
      total: totalHiringCost
    },
    capacity: {
      hours_added: totalHoursAdded,
      services_added: totalHoursAdded / config.capacity_assumptions.average_service_hours
    },
    revenue: {
      potential_revenue: potentialRevenue,
      break_even_utilization: (totalHiringCost / potentialRevenue) * 100
    },
    profitability: {
      gross_profit: grossProfit,
      profit_margin: profitMargin,
      monthly_profit: grossProfit / 12
    }
  };
}

// Usage in UI:
// User inputs: numEmployees = 2, numContractors = 1
// Display results in dashboard widget
```

---

## 7. Success Metrics

### Configuration Quality
- [ ] All 25+ configuration variables seeded with realistic defaults
- [ ] Admin can update any value via Settings UI
- [ ] Changes are logged in audit table
- [ ] API returns configuration in <200ms

### Settings UI
- [ ] Revenue Forecasting tab renders without errors
- [ ] All inputs validate properly (min/max, required)
- [ ] Cost preview calculator shows accurate totals
- [ ] Mobile-responsive layout works on tablets

### API Integration
- [ ] Insight service can fetch configuration successfully
- [ ] Authentication and CORS working correctly
- [ ] API documentation complete and tested
- [ ] Example integration code provided

### Business Value
- [ ] Enables Insight service hiring what-if scenarios (Q1 2026)
- [ ] Provides single source of truth for financial planning
- [ ] Admin can adjust assumptions as business evolves
- [ ] Supports employee vs contractor decision-making

---

## 8. Future Enhancements

### Q2 2026 and Beyond
- **Historical Configuration Snapshots**: Track how assumptions changed over time
- **Scenario Comparison Tool**: Save and compare multiple "what-if" scenarios
- **Industry Benchmarks**: Compare your rates to industry averages
- **Automated Recommendations**: AI-suggested optimizations based on actual results
- **Multi-Location Support**: Different costs per geographic region
- **Seasonal Adjustments**: Variable rates for peak vs off-season

---

## Document Version
- **Version**: 1.0
- **Last Updated**: 2025-11-07
- **Next Review**: Q1 2026 (when Insight service implements forecasting)
