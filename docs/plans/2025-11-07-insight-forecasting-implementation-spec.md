# Insight Service: Revenue Forecasting & Hiring Impact Analysis - Implementation Specification

**Date**: November 7, 2025
**Target Service**: sailorskills-insight
**Timeline**: Q1 2026 (Week 6-7 of Insight transformation)
**Dependencies**: Settings Service revenue forecasting configuration (Q4 2025), User Accounts system (Q1 2026)
**Status**: Ready for Implementation

## Executive Summary

This specification details the implementation of **revenue forecasting and hiring impact analysis** features for the Insight service. These features enable data-driven decisions about employee vs. contractor hiring, capacity planning, and break-even analysis.

**Key Features**:
- Employee vs. Contractor cost comparison
- Multi-scenario analysis (hire 1, 2, or 3+ people)
- Break-even analysis with detailed cost breakdown
- Revenue capacity modeling
- Profit margin impact visualization
- Time-to-profitability calculator
- Utilization rate sensitivity analysis

---

## 1. Architecture Overview

### 1.1 System Components

```
┌─────────────────────────────────────────────────────────────┐
│                   Insight Service (Frontend)                  │
│                                                                │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  What-If Scenarios Dashboard                          │   │
│  │  - Pricing Scenarios                                  │   │
│  │  - Capacity Scenarios                                 │   │
│  │  - Hiring Scenarios ← NEW                             │   │
│  │  - Retention Scenarios                                │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Forecasting Calculation Engine                       │   │
│  │  /src/lib/forecasting-calculations.js                 │   │
│  └──────────────────────────────────────────────────────┘   │
│           ↓                                                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Forecasting API Client                               │   │
│  │  /src/lib/forecasting-api.js                         │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                        ↓ HTTP/JSON
┌─────────────────────────────────────────────────────────────┐
│           Settings Service API (Configuration)                │
│  GET /api/forecasting-config                                  │
│  Returns: employee/contractor costs, overhead, capacity       │
└─────────────────────────────────────────────────────────────┘
                        ↓ Supabase Query
┌─────────────────────────────────────────────────────────────┐
│                    Supabase Database                          │
│  - revenue_forecasting_config                                 │
│  - service_logs (historical performance data)                 │
│  - invoices (revenue data)                                    │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 File Structure

```
sailorskills-insight/
├── src/
│   ├── views/
│   │   ├── what-if-scenarios.html        ← Main what-if dashboard
│   │   └── hiring-forecast.html          ← Dedicated hiring analysis page
│   ├── components/
│   │   ├── hiring-scenario-widget.js     ← Widget for Executive perspective
│   │   ├── cost-breakdown-chart.js       ← Visualization component
│   │   ├── utilization-sensitivity.js    ← Sensitivity analysis chart
│   │   └── scenario-comparison-table.js  ← Side-by-side comparison
│   ├── lib/
│   │   ├── forecasting-api.js            ← API client
│   │   ├── forecasting-calculations.js   ← Business logic
│   │   ├── forecasting-cache.js          ← Config caching
│   │   └── chart-helpers.js              ← Charting utilities
│   └── styles/
│       └── forecasting.css
└── package.json
```

---

## 2. API Integration

### 2.1 Forecasting API Client (`/src/lib/forecasting-api.js`)

```javascript
import { supabaseClient } from './supabase-client.js';

const SETTINGS_API_BASE = 'https://sailorskills-settings.vercel.app/api';
const CACHE_KEY = 'forecasting_config_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

/**
 * Fetch revenue forecasting configuration from Settings service
 * Includes local caching to reduce API calls
 *
 * @returns {Promise<ForecastingConfig>}
 */
export async function getForecastingConfig() {
  // Check cache first
  const cached = getCachedConfig();
  if (cached) {
    return cached;
  }

  // Fetch from Settings API
  const session = await supabaseClient.auth.getSession();
  const token = session?.data?.session?.access_token;

  if (!token) {
    throw new Error('User not authenticated');
  }

  const response = await fetch(`${SETTINGS_API_BASE}/forecasting-config`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch forecasting config: ${response.statusText}`);
  }

  const config = await response.json();

  // Cache the result
  cacheConfig(config);

  return config;
}

/**
 * Get cached configuration if available and not expired
 * @returns {ForecastingConfig|null}
 */
function getCachedConfig() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const { data, timestamp } = JSON.parse(cached);
    const age = Date.now() - timestamp;

    if (age > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Cache read error:', error);
    return null;
  }
}

/**
 * Cache configuration with timestamp
 * @param {ForecastingConfig} config
 */
function cacheConfig(config) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      data: config,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Cache write error:', error);
  }
}

/**
 * Clear cached configuration (useful after Settings are updated)
 */
export function clearForecastingCache() {
  localStorage.removeItem(CACHE_KEY);
}

/**
 * Fetch historical performance data for capacity calculations
 * @returns {Promise<PerformanceData>}
 */
export async function getHistoricalPerformance() {
  const { data, error } = await supabaseClient
    .from('service_logs')
    .select('total_hours, service_date')
    .gte('service_date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
    .not('total_hours', 'is', null);

  if (error) throw error;

  // Calculate average hours per week
  const totalHours = data.reduce((sum, log) => sum + parseFloat(log.total_hours || 0), 0);
  const weeks = 13; // 90 days ≈ 13 weeks
  const avgHoursPerWeek = totalHours / weeks;

  return {
    avgHoursPerWeek,
    totalServices: data.length,
    avgHoursPerService: totalHours / data.length
  };
}

/**
 * Fetch average revenue metrics
 * @returns {Promise<RevenueMetrics>}
 */
export async function getRevenueMetrics() {
  const { data, error } = await supabaseClient
    .rpc('get_revenue_metrics', {
      days: 90
    });

  if (error) throw error;

  return {
    avgRevenuePerHour: data.avg_revenue_per_hour || 120,
    avgRevenuePerService: data.avg_revenue_per_service || 300,
    totalRevenue: data.total_revenue || 0,
    totalHours: data.total_hours || 0
  };
}
```

### 2.2 Type Definitions (TypeScript/JSDoc)

```javascript
/**
 * @typedef {Object} ForecastingConfig
 * @property {EmployeeCosts} employee_costs
 * @property {ContractorCosts} contractor_costs
 * @property {OverheadCosts} overhead_costs
 * @property {CapacityAssumptions} capacity_assumptions
 * @property {string} last_updated - ISO timestamp
 * @property {string} version - Config version
 */

/**
 * @typedef {Object} EmployeeCosts
 * @property {number} hourly_wage
 * @property {number} annual_salary
 * @property {number} payroll_tax_rate - Percentage
 * @property {number} workers_comp_rate - Percentage
 * @property {number} health_insurance_monthly
 * @property {number} vacation_pto_weeks
 * @property {number} training_cost_annual
 * @property {number} equipment_cost_annual
 * @property {number} uniform_cost_annual
 */

/**
 * @typedef {Object} ContractorCosts
 * @property {number} hourly_rate
 * @property {number} contract_admin_overhead - Percentage
 */

/**
 * @typedef {Object} OverheadCosts
 * @property {number} vehicle_cost_monthly
 * @property {number} vehicle_maintenance_annual
 * @property {number} general_liability_annual
 * @property {number} tool_replacement_annual
 * @property {number} office_overhead_monthly
 */

/**
 * @typedef {Object} CapacityAssumptions
 * @property {number} billable_hours_per_week
 * @property {number} utilization_rate_target - Percentage
 * @property {number} average_service_hours
 * @property {number} average_revenue_per_hour
 * @property {number} revenue_per_service
 * @property {number} weeks_per_year
 */
```

---

## 3. Calculation Engine

### 3.1 Core Calculations (`/src/lib/forecasting-calculations.js`)

```javascript
/**
 * Calculate total annual cost for an employee
 * Includes all direct costs, benefits, taxes, and allocated overhead
 *
 * @param {ForecastingConfig} config
 * @returns {EmployeeCostBreakdown}
 */
export function calculateEmployeeAnnualCost(config) {
  const { employee_costs, overhead_costs, capacity_assumptions } = config;

  // Base compensation (prefer salary if set, otherwise calculate from hourly)
  const baseCompensation = employee_costs.annual_salary > 0
    ? employee_costs.annual_salary
    : employee_costs.hourly_wage * 40 * capacity_assumptions.weeks_per_year;

  // Payroll taxes (FICA: 7.65% employer portion)
  const payrollTaxes = baseCompensation * (employee_costs.payroll_tax_rate / 100);

  // Workers compensation insurance
  const workersComp = baseCompensation * (employee_costs.workers_comp_rate / 100);

  // Health insurance (annual cost)
  const healthInsurance = employee_costs.health_insurance_monthly * 12;

  // PTO cost (paying for non-working time)
  const weeklyWage = employee_costs.hourly_wage * 40;
  const ptoCost = weeklyWage * employee_costs.vacation_pto_weeks;

  // Direct annual costs
  const training = employee_costs.training_cost_annual;
  const equipment = employee_costs.equipment_cost_annual;
  const uniforms = employee_costs.uniform_cost_annual;

  // Overhead allocation (vehicle, insurance, office, tools)
  const overheadMonthly = overhead_costs.vehicle_cost_monthly + overhead_costs.office_overhead_monthly;
  const overheadAnnual = (overheadMonthly * 12) +
                         overhead_costs.vehicle_maintenance_annual +
                         overhead_costs.general_liability_annual +
                         overhead_costs.tool_replacement_annual;

  // Total annual cost
  const totalAnnualCost = baseCompensation + payrollTaxes + workersComp + healthInsurance +
                          ptoCost + training + equipment + uniforms + overheadAnnual;

  return {
    base_compensation: roundTo(baseCompensation, 2),
    payroll_taxes: roundTo(payrollTaxes, 2),
    workers_comp: roundTo(workersComp, 2),
    health_insurance: roundTo(healthInsurance, 2),
    pto_cost: roundTo(ptoCost, 2),
    training: roundTo(training, 2),
    equipment: roundTo(equipment, 2),
    uniforms: roundTo(uniforms, 2),
    overhead: roundTo(overheadAnnual, 2),
    total_annual_cost: roundTo(totalAnnualCost, 2),
    monthly_cost: roundTo(totalAnnualCost / 12, 2),
    hourly_cost: roundTo(totalAnnualCost / (capacity_assumptions.billable_hours_per_week * capacity_assumptions.weeks_per_year), 2)
  };
}

/**
 * Calculate total annual cost for a contractor
 * Much simpler: just hourly rate × hours + admin overhead
 *
 * @param {ForecastingConfig} config
 * @param {number} hoursPerYear - Override billable hours if needed
 * @returns {ContractorCostBreakdown}
 */
export function calculateContractorAnnualCost(config, hoursPerYear = null) {
  const { contractor_costs, capacity_assumptions } = config;

  const billableHours = hoursPerYear || (capacity_assumptions.billable_hours_per_week * capacity_assumptions.weeks_per_year);
  const baseRate = contractor_costs.hourly_rate * billableHours;
  const adminOverhead = baseRate * (contractor_costs.contract_admin_overhead / 100);

  const totalAnnualCost = baseRate + adminOverhead;

  return {
    base_rate: roundTo(baseRate, 2),
    admin_overhead: roundTo(adminOverhead, 2),
    total_annual_cost: roundTo(totalAnnualCost, 2),
    monthly_cost: roundTo(totalAnnualCost / 12, 2),
    hourly_cost: roundTo(contractor_costs.hourly_rate + (contractor_costs.hourly_rate * contractor_costs.contract_admin_overhead / 100), 2),
    billable_hours_per_year: billableHours
  };
}

/**
 * Calculate break-even analysis
 * How much revenue is needed to cover the cost?
 *
 * @param {number} totalAnnualCost
 * @param {number} billableHoursPerYear
 * @param {CapacityAssumptions} capacityAssumptions
 * @returns {BreakEvenAnalysis}
 */
export function calculateBreakEven(totalAnnualCost, billableHoursPerYear, capacityAssumptions) {
  const hourlyRateRequired = totalAnnualCost / billableHoursPerYear;
  const monthlyRevenueRequired = totalAnnualCost / 12;
  const servicesPerYearRequired = billableHoursPerYear / capacityAssumptions.average_service_hours;
  const revenuePerServiceRequired = totalAnnualCost / servicesPerYearRequired;

  return {
    hourly_rate_required: roundTo(hourlyRateRequired, 2),
    monthly_revenue_required: roundTo(monthlyRevenueRequired, 2),
    annual_revenue_required: roundTo(totalAnnualCost, 2),
    services_per_year_required: Math.ceil(servicesPerYearRequired),
    revenue_per_service_required: roundTo(revenuePerServiceRequired, 2),
    billable_hours_per_year: billableHoursPerYear
  };
}

/**
 * Run a comprehensive hiring scenario
 * Calculates costs, capacity, revenue potential, and profitability
 *
 * @param {ForecastingConfig} config
 * @param {number} numEmployees
 * @param {number} numContractors
 * @param {number} utilizationRate - Override default (0-100)
 * @returns {HiringScenario}
 */
export function runHiringScenario(config, numEmployees, numContractors, utilizationRate = null) {
  const { capacity_assumptions } = config;

  // Calculate costs
  const employeeCosts = calculateEmployeeAnnualCost(config);
  const contractorCosts = calculateContractorAnnualCost(config);

  const totalEmployeeCost = employeeCosts.total_annual_cost * numEmployees;
  const totalContractorCost = contractorCosts.total_annual_cost * numContractors;
  const totalHiringCost = totalEmployeeCost + totalContractorCost;

  // Calculate capacity added
  const billableHoursPerYear = capacity_assumptions.billable_hours_per_week * capacity_assumptions.weeks_per_year;
  const totalPotentialHours = billableHoursPerYear * (numEmployees + numContractors);

  // Apply utilization rate
  const utilization = utilizationRate !== null ? utilizationRate : capacity_assumptions.utilization_rate_target;
  const totalBillableHours = totalPotentialHours * (utilization / 100);

  // Calculate services added
  const servicesAdded = totalBillableHours / capacity_assumptions.average_service_hours;

  // Calculate revenue potential
  const avgRevenuePerHour = capacity_assumptions.average_revenue_per_hour;
  const potentialRevenue = totalBillableHours * avgRevenuePerHour;

  // Calculate profitability
  const grossProfit = potentialRevenue - totalHiringCost;
  const profitMargin = (grossProfit / potentialRevenue) * 100;
  const monthlyProfit = grossProfit / 12;

  // Break-even utilization rate
  const breakEvenUtilization = (totalHiringCost / (totalPotentialHours * avgRevenuePerHour)) * 100;

  return {
    scenario_id: `E${numEmployees}_C${numContractors}_U${utilization}`,
    team_composition: {
      employees: numEmployees,
      contractors: numContractors,
      total_team_size: numEmployees + numContractors
    },
    costs: {
      employees: roundTo(totalEmployeeCost, 2),
      contractors: roundTo(totalContractorCost, 2),
      total_annual: roundTo(totalHiringCost, 2),
      total_monthly: roundTo(totalHiringCost / 12, 2),
      cost_per_hour: roundTo(totalHiringCost / totalBillableHours, 2)
    },
    capacity: {
      potential_hours_per_year: totalPotentialHours,
      billable_hours_per_year: totalBillableHours,
      utilization_rate: utilization,
      services_per_year: Math.floor(servicesAdded),
      services_per_month: Math.floor(servicesAdded / 12)
    },
    revenue: {
      potential_annual: roundTo(potentialRevenue, 2),
      potential_monthly: roundTo(potentialRevenue / 12, 2),
      avg_revenue_per_hour: avgRevenuePerHour,
      break_even_utilization: roundTo(breakEvenUtilization, 2)
    },
    profitability: {
      gross_profit_annual: roundTo(grossProfit, 2),
      gross_profit_monthly: roundTo(monthlyProfit, 2),
      profit_margin_percent: roundTo(profitMargin, 2),
      profitable: grossProfit > 0
    },
    break_even: calculateBreakEven(totalHiringCost, totalBillableHours, capacity_assumptions)
  };
}

/**
 * Compare multiple hiring scenarios side-by-side
 *
 * @param {ForecastingConfig} config
 * @param {Array<{employees: number, contractors: number}>} scenarios
 * @returns {Array<HiringScenario>}
 */
export function compareHiringScenarios(config, scenarios) {
  return scenarios.map(({ employees, contractors, utilization }) =>
    runHiringScenario(config, employees, contractors, utilization)
  );
}

/**
 * Calculate utilization sensitivity analysis
 * Show profitability at different utilization rates
 *
 * @param {ForecastingConfig} config
 * @param {number} numEmployees
 * @param {number} numContractors
 * @returns {Array<UtilizationPoint>}
 */
export function calculateUtilizationSensitivity(config, numEmployees, numContractors) {
  const utilizationRates = [50, 60, 70, 75, 80, 85, 90, 95, 100];

  return utilizationRates.map(rate => {
    const scenario = runHiringScenario(config, numEmployees, numContractors, rate);
    return {
      utilization_rate: rate,
      annual_revenue: scenario.revenue.potential_annual,
      annual_cost: scenario.costs.total_annual,
      annual_profit: scenario.profitability.gross_profit_annual,
      profit_margin: scenario.profitability.profit_margin_percent,
      profitable: scenario.profitability.profitable
    };
  });
}

/**
 * Calculate time to profitability
 * How many months until the hire pays for themselves?
 *
 * @param {HiringScenario} scenario
 * @param {number} onboardingCost - One-time cost to hire/train
 * @returns {TimeToProfit}
 */
export function calculateTimeToProfit(scenario, onboardingCost = 5000) {
  const monthlyProfit = scenario.profitability.gross_profit_monthly;

  if (monthlyProfit <= 0) {
    return {
      months_to_profit: null,
      profitable: false,
      message: 'This scenario is not profitable at current utilization rate'
    };
  }

  const monthsToProfit = Math.ceil(onboardingCost / monthlyProfit);

  return {
    months_to_profit: monthsToProfit,
    onboarding_cost: onboardingCost,
    monthly_profit: monthlyProfit,
    profitable: true,
    message: `Profitable after ${monthsToProfit} months`
  };
}

/**
 * Helper: Round to specified decimal places
 */
function roundTo(num, decimals) {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}
```

---

## 4. UI Components

### 4.1 Hiring Scenario Widget (`/src/components/hiring-scenario-widget.js`)

This widget appears in the **Financial Performance Perspective** of the What-If Scenarios dashboard.

```javascript
import { getForecastingConfig } from '../lib/forecasting-api.js';
import { runHiringScenario, compareHiringScenarios } from '../lib/forecasting-calculations.js';

export class HiringScenarioWidget {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.config = null;
    this.currentScenario = null;
  }

  async init() {
    try {
      this.config = await getForecastingConfig();
      this.render();
    } catch (error) {
      this.renderError(error);
    }
  }

  render() {
    this.container.innerHTML = `
      <div class="hiring-scenario-widget">
        <div class="widget-header">
          <h3>💼 Hiring Impact Analysis</h3>
          <button class="btn-secondary" onclick="hiringWidget.openDetailedView()">
            Detailed Analysis →
          </button>
        </div>

        <div class="scenario-inputs">
          <div class="input-group">
            <label>Employees to Hire</label>
            <input type="number" id="num-employees" min="0" max="10" value="1" />
          </div>
          <div class="input-group">
            <label>Contractors to Hire</label>
            <input type="number" id="num-contractors" min="0" max="10" value="0" />
          </div>
          <div class="input-group">
            <label>Expected Utilization %</label>
            <input type="number" id="utilization-rate" min="0" max="100"
                   value="${this.config.capacity_assumptions.utilization_rate_target}" />
          </div>
          <button class="btn-primary" onclick="hiringWidget.calculate()">
            Calculate Impact
          </button>
        </div>

        <div id="scenario-results" class="scenario-results hidden">
          <!-- Results rendered here -->
        </div>

        <div class="quick-comparisons">
          <h4>Quick Comparisons</h4>
          <button class="btn-link" onclick="hiringWidget.quickCompare(1, 0)">
            1 Employee
          </button>
          <button class="btn-link" onclick="hiringWidget.quickCompare(0, 1)">
            1 Contractor
          </button>
          <button class="btn-link" onclick="hiringWidget.quickCompare(2, 0)">
            2 Employees
          </button>
          <button class="btn-link" onclick="hiringWidget.quickCompare(1, 1)">
            1 of Each
          </button>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  calculate() {
    const numEmployees = parseInt(document.getElementById('num-employees').value);
    const numContractors = parseInt(document.getElementById('num-contractors').value);
    const utilization = parseFloat(document.getElementById('utilization-rate').value);

    if (numEmployees + numContractors === 0) {
      alert('Please hire at least one person');
      return;
    }

    this.currentScenario = runHiringScenario(this.config, numEmployees, numContractors, utilization);
    this.renderResults(this.currentScenario);
  }

  renderResults(scenario) {
    const resultsDiv = document.getElementById('scenario-results');
    resultsDiv.classList.remove('hidden');

    const isProfitable = scenario.profitability.profitable;
    const profitClass = isProfitable ? 'profit-positive' : 'profit-negative';

    resultsDiv.innerHTML = `
      <div class="results-grid">
        <div class="result-card">
          <div class="result-label">Annual Cost</div>
          <div class="result-value">$${scenario.costs.total_annual.toLocaleString()}</div>
          <div class="result-breakdown">
            Employees: $${scenario.costs.employees.toLocaleString()}<br>
            Contractors: $${scenario.costs.contractors.toLocaleString()}
          </div>
        </div>

        <div class="result-card">
          <div class="result-label">Revenue Potential</div>
          <div class="result-value">$${scenario.revenue.potential_annual.toLocaleString()}</div>
          <div class="result-breakdown">
            ${scenario.capacity.services_per_year} services/year<br>
            ${scenario.capacity.billable_hours_per_year} billable hours
          </div>
        </div>

        <div class="result-card ${profitClass}">
          <div class="result-label">Annual Profit</div>
          <div class="result-value">
            $${Math.abs(scenario.profitability.gross_profit_annual).toLocaleString()}
            ${isProfitable ? '✓' : '✗'}
          </div>
          <div class="result-breakdown">
            ${scenario.profitability.profit_margin_percent.toFixed(1)}% margin<br>
            $${scenario.profitability.gross_profit_monthly.toLocaleString()}/month
          </div>
        </div>

        <div class="result-card">
          <div class="result-label">Break-Even Point</div>
          <div class="result-value">${scenario.revenue.break_even_utilization.toFixed(1)}%</div>
          <div class="result-breakdown">
            Utilization rate needed to break even<br>
            Current: ${scenario.capacity.utilization_rate}%
          </div>
        </div>
      </div>

      ${!isProfitable ? `
        <div class="alert alert-warning">
          ⚠️ This scenario is not profitable at ${scenario.capacity.utilization_rate}% utilization.
          You need at least ${scenario.revenue.break_even_utilization.toFixed(1)}% to break even.
        </div>
      ` : `
        <div class="alert alert-success">
          ✅ This scenario is profitable! You'll generate $${scenario.profitability.gross_profit_monthly.toLocaleString()}/month in profit.
        </div>
      `}
    `;
  }

  quickCompare(employees, contractors) {
    document.getElementById('num-employees').value = employees;
    document.getElementById('num-contractors').value = contractors;
    this.calculate();
  }

  openDetailedView() {
    window.location.href = '/hiring-forecast.html';
  }

  attachEventListeners() {
    // Auto-calculate on input change
    ['num-employees', 'num-contractors', 'utilization-rate'].forEach(id => {
      const input = document.getElementById(id);
      if (input) {
        input.addEventListener('input', () => {
          // Optionally auto-calculate
          // this.calculate();
        });
      }
    });
  }

  renderError(error) {
    this.container.innerHTML = `
      <div class="widget-error">
        <p>Failed to load forecasting configuration</p>
        <p class="error-message">${error.message}</p>
        <button class="btn-secondary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }
}

// Export singleton instance
export const hiringWidget = new HiringScenarioWidget('hiring-scenario-widget');
```

### 4.2 Detailed Hiring Forecast Page (`/src/views/hiring-forecast.html`)

Full-page detailed analysis with multiple scenarios, charts, and comparisons.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hiring Forecast - Insight</title>
  <link rel="stylesheet" href="/shared/src/ui/styles.css">
  <link rel="stylesheet" href="../styles/forecasting.css">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
</head>
<body>
  <!-- Three-tier navigation (from shared package) -->
  <nav id="top-nav"></nav>
  <nav id="secondary-nav"></nav>
  <nav id="tertiary-nav"></nav>

  <main class="hiring-forecast-page">
    <header class="page-header">
      <h1>📊 Hiring Impact Analysis</h1>
      <p>Model the financial impact of hiring employees or contractors</p>
    </header>

    <!-- Scenario Builder Section -->
    <section class="scenario-builder">
      <div class="card">
        <h2>Build Your Scenario</h2>

        <div class="scenario-tabs">
          <button class="tab active" data-tab="single">Single Scenario</button>
          <button class="tab" data-tab="compare">Compare Scenarios</button>
          <button class="tab" data-tab="sensitivity">Sensitivity Analysis</button>
        </div>

        <!-- Tab: Single Scenario -->
        <div id="single-scenario-tab" class="tab-content active">
          <div class="form-grid">
            <div class="form-group">
              <label>Employees to Hire</label>
              <input type="number" id="single-employees" min="0" max="10" value="1">
              <span class="help-text">Full-time W2 employees with benefits</span>
            </div>

            <div class="form-group">
              <label>Contractors to Hire</label>
              <input type="number" id="single-contractors" min="0" max="10" value="0">
              <span class="help-text">1099 contractors, no benefits</span>
            </div>

            <div class="form-group">
              <label>Expected Utilization %</label>
              <input type="range" id="single-utilization" min="50" max="100" value="75" step="5">
              <output id="utilization-display">75%</output>
              <span class="help-text">% of time spent on billable work</span>
            </div>

            <div class="form-group">
              <label>Onboarding Cost (optional)</label>
              <input type="number" id="onboarding-cost" value="5000" step="500">
              <span class="help-text">One-time hiring/training cost</span>
            </div>
          </div>

          <button class="btn-primary btn-large" id="calculate-single">
            Calculate Impact
          </button>
        </div>

        <!-- Tab: Compare Scenarios -->
        <div id="compare-scenarios-tab" class="tab-content hidden">
          <p>Compare up to 4 scenarios side-by-side</p>

          <div class="scenarios-grid">
            <div class="scenario-input" data-scenario="1">
              <h4>Scenario 1</h4>
              <input type="number" placeholder="Employees" min="0" max="10" value="1">
              <input type="number" placeholder="Contractors" min="0" max="10" value="0">
            </div>

            <div class="scenario-input" data-scenario="2">
              <h4>Scenario 2</h4>
              <input type="number" placeholder="Employees" min="0" max="10" value="0">
              <input type="number" placeholder="Contractors" min="0" max="10" value="1">
            </div>

            <div class="scenario-input" data-scenario="3">
              <h4>Scenario 3</h4>
              <input type="number" placeholder="Employees" min="0" max="10" value="2">
              <input type="number" placeholder="Contractors" min="0" max="10" value="0">
            </div>

            <div class="scenario-input" data-scenario="4">
              <h4>Scenario 4</h4>
              <input type="number" placeholder="Employees" min="0" max="10" value="1">
              <input type="number" placeholder="Contractors" min="0" max="10" value="1">
            </div>
          </div>

          <button class="btn-primary btn-large" id="calculate-compare">
            Compare All Scenarios
          </button>
        </div>

        <!-- Tab: Sensitivity Analysis -->
        <div id="sensitivity-tab" class="tab-content hidden">
          <p>See how profitability changes at different utilization rates</p>

          <div class="form-grid">
            <div class="form-group">
              <label>Employees</label>
              <input type="number" id="sens-employees" min="0" max="10" value="1">
            </div>

            <div class="form-group">
              <label>Contractors</label>
              <input type="number" id="sens-contractors" min="0" max="10" value="0">
            </div>
          </div>

          <button class="btn-primary btn-large" id="calculate-sensitivity">
            Run Sensitivity Analysis
          </button>
        </div>
      </div>
    </section>

    <!-- Results Section (dynamically populated) -->
    <section id="results-section" class="results-section hidden">
      <!-- Single Scenario Results -->
      <div id="single-results" class="hidden">
        <div class="results-header">
          <h2>Scenario Results</h2>
          <button class="btn-secondary" id="export-results">Export PDF</button>
        </div>

        <div class="metrics-grid">
          <!-- Key metrics cards -->
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <h3>Cost Breakdown</h3>
            <canvas id="cost-breakdown-chart"></canvas>
          </div>

          <div class="chart-card">
            <h3>Monthly Cash Flow</h3>
            <canvas id="cashflow-chart"></canvas>
          </div>
        </div>

        <div class="details-tables">
          <!-- Detailed breakdowns -->
        </div>
      </div>

      <!-- Comparison Results -->
      <div id="comparison-results" class="hidden">
        <h2>Scenario Comparison</h2>
        <div class="comparison-table-container">
          <table id="comparison-table" class="comparison-table">
            <!-- Dynamically populated -->
          </table>
        </div>

        <div class="chart-card">
          <h3>Profit Comparison</h3>
          <canvas id="comparison-chart"></canvas>
        </div>
      </div>

      <!-- Sensitivity Results -->
      <div id="sensitivity-results" class="hidden">
        <h2>Utilization Sensitivity Analysis</h2>
        <p class="subtitle">How does profitability change at different utilization rates?</p>

        <div class="chart-card chart-large">
          <canvas id="sensitivity-chart"></canvas>
        </div>

        <div class="sensitivity-table-container">
          <table id="sensitivity-table" class="data-table">
            <!-- Dynamically populated -->
          </table>
        </div>
      </div>
    </section>

    <!-- Configuration Display (collapsible) -->
    <section class="config-display collapsed">
      <button class="collapse-toggle" id="toggle-config">
        ⚙️ Current Configuration (from Settings)
      </button>
      <div id="config-details" class="hidden">
        <!-- Display current forecasting config -->
      </div>
    </section>
  </main>

  <script type="module" src="../lib/forecasting-api.js"></script>
  <script type="module" src="../lib/forecasting-calculations.js"></script>
  <script type="module">
    import { getForecastingConfig } from '../lib/forecasting-api.js';
    import {
      runHiringScenario,
      compareHiringScenarios,
      calculateUtilizationSensitivity,
      calculateTimeToProfit
    } from '../lib/forecasting-calculations.js';

    let config = null;

    // Initialize
    async function init() {
      try {
        config = await getForecastingConfig();
        displayConfiguration();
        setupEventListeners();
      } catch (error) {
        console.error('Failed to load configuration:', error);
        alert('Failed to load forecasting configuration. Please check Settings service.');
      }
    }

    function displayConfiguration() {
      // Populate config details section
      const configDiv = document.getElementById('config-details');
      configDiv.innerHTML = `
        <div class="config-grid">
          <div class="config-section">
            <h4>Employee Costs</h4>
            <ul>
              <li>Hourly Wage: $${config.employee_costs.hourly_wage}/hr</li>
              <li>Annual Salary: $${config.employee_costs.annual_salary.toLocaleString()}</li>
              <li>Payroll Tax: ${config.employee_costs.payroll_tax_rate}%</li>
              <li>Workers Comp: ${config.employee_costs.workers_comp_rate}%</li>
              <li>Health Insurance: $${config.employee_costs.health_insurance_monthly}/mo</li>
            </ul>
          </div>

          <div class="config-section">
            <h4>Contractor Costs</h4>
            <ul>
              <li>Hourly Rate: $${config.contractor_costs.hourly_rate}/hr</li>
              <li>Admin Overhead: ${config.contractor_costs.contract_admin_overhead}%</li>
            </ul>
          </div>

          <div class="config-section">
            <h4>Capacity Assumptions</h4>
            <ul>
              <li>Billable Hours/Week: ${config.capacity_assumptions.billable_hours_per_week}</li>
              <li>Target Utilization: ${config.capacity_assumptions.utilization_rate_target}%</li>
              <li>Avg Revenue/Hour: $${config.capacity_assumptions.average_revenue_per_hour}</li>
            </ul>
          </div>
        </div>
        <a href="https://sailorskills-settings.vercel.app/system-config.html#forecasting"
           target="_blank" class="btn-link">
          Edit Configuration in Settings →
        </a>
      `;
    }

    function setupEventListeners() {
      // Tab switching
      document.querySelectorAll('.scenario-tabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
          const targetTab = tab.dataset.tab;
          switchTab(targetTab);
        });
      });

      // Single scenario
      document.getElementById('calculate-single').addEventListener('click', calculateSingleScenario);

      // Compare scenarios
      document.getElementById('calculate-compare').addEventListener('click', calculateComparison);

      // Sensitivity analysis
      document.getElementById('calculate-sensitivity').addEventListener('click', calculateSensitivity);

      // Utilization slider
      document.getElementById('single-utilization').addEventListener('input', (e) => {
        document.getElementById('utilization-display').textContent = e.target.value + '%';
      });

      // Config toggle
      document.getElementById('toggle-config').addEventListener('click', () => {
        const configDetails = document.getElementById('config-details');
        configDetails.classList.toggle('hidden');
        document.querySelector('.config-display').classList.toggle('collapsed');
      });
    }

    function switchTab(tabName) {
      // Hide all tabs
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
        content.classList.remove('active');
      });

      // Show target tab
      const targetContent = document.getElementById(`${tabName}-scenario-tab`) ||
                            document.getElementById(`${tabName}-tab`);
      if (targetContent) {
        targetContent.classList.remove('hidden');
        targetContent.classList.add('active');
      }

      // Update tab buttons
      document.querySelectorAll('.scenario-tabs .tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
          tab.classList.add('active');
        }
      });
    }

    function calculateSingleScenario() {
      const numEmployees = parseInt(document.getElementById('single-employees').value);
      const numContractors = parseInt(document.getElementById('single-contractors').value);
      const utilization = parseInt(document.getElementById('single-utilization').value);
      const onboardingCost = parseInt(document.getElementById('onboarding-cost').value);

      if (numEmployees + numContractors === 0) {
        alert('Please hire at least one person');
        return;
      }

      const scenario = runHiringScenario(config, numEmployees, numContractors, utilization);
      const timeToProfit = calculateTimeToProfit(scenario, onboardingCost);

      displaySingleResults(scenario, timeToProfit);
    }

    function displaySingleResults(scenario, timeToProfit) {
      // Show results section
      document.getElementById('results-section').classList.remove('hidden');
      document.getElementById('single-results').classList.remove('hidden');
      document.getElementById('comparison-results').classList.add('hidden');
      document.getElementById('sensitivity-results').classList.add('hidden');

      // TODO: Implement full rendering logic with charts and tables
      // This is a placeholder - full implementation would include:
      // - Metrics cards (cost, revenue, profit, break-even)
      // - Cost breakdown pie chart
      // - Monthly cash flow chart
      // - Detailed cost tables
      // - Time to profitability timeline

      console.log('Scenario:', scenario);
      console.log('Time to Profit:', timeToProfit);
    }

    function calculateComparison() {
      // TODO: Implement comparison logic
    }

    function calculateSensitivity() {
      const numEmployees = parseInt(document.getElementById('sens-employees').value);
      const numContractors = parseInt(document.getElementById('sens-contractors').value);

      if (numEmployees + numContractors === 0) {
        alert('Please specify at least one hire');
        return;
      }

      const sensitivityData = calculateUtilizationSensitivity(config, numEmployees, numContractors);

      displaySensitivityResults(sensitivityData);
    }

    function displaySensitivityResults(data) {
      // Show results section
      document.getElementById('results-section').classList.remove('hidden');
      document.getElementById('sensitivity-results').classList.remove('hidden');
      document.getElementById('single-results').classList.add('hidden');
      document.getElementById('comparison-results').classList.add('hidden');

      // TODO: Render sensitivity chart and table
      console.log('Sensitivity Data:', data);
    }

    // Initialize on page load
    init();
  </script>
</body>
</html>
```

---

## 5. Testing & Validation

### 5.1 Unit Tests

```javascript
// /tests/forecasting-calculations.test.js

import { describe, it, expect } from 'vitest';
import {
  calculateEmployeeAnnualCost,
  calculateContractorAnnualCost,
  runHiringScenario
} from '../src/lib/forecasting-calculations.js';

describe('Forecasting Calculations', () => {
  const mockConfig = {
    employee_costs: {
      hourly_wage: 25,
      annual_salary: 52000,
      payroll_tax_rate: 7.65,
      workers_comp_rate: 8.50,
      health_insurance_monthly: 600,
      vacation_pto_weeks: 2,
      training_cost_annual: 1500,
      equipment_cost_annual: 2000,
      uniform_cost_annual: 500
    },
    contractor_costs: {
      hourly_rate: 45,
      contract_admin_overhead: 5
    },
    overhead_costs: {
      vehicle_cost_monthly: 500,
      vehicle_maintenance_annual: 2000,
      general_liability_annual: 3000,
      tool_replacement_annual: 1000,
      office_overhead_monthly: 200
    },
    capacity_assumptions: {
      billable_hours_per_week: 30,
      utilization_rate_target: 75,
      average_service_hours: 2.5,
      average_revenue_per_hour: 120,
      revenue_per_service: 300,
      weeks_per_year: 50
    }
  };

  it('calculates employee annual cost correctly', () => {
    const result = calculateEmployeeAnnualCost(mockConfig);

    expect(result.base_compensation).toBe(52000);
    expect(result.payroll_taxes).toBeCloseTo(3978, 0);
    expect(result.total_annual_cost).toBeGreaterThan(52000);
    expect(result.hourly_cost).toBeGreaterThan(0);
  });

  it('calculates contractor annual cost correctly', () => {
    const result = calculateContractorAnnualCost(mockConfig);

    // 45/hr * 30hr/wk * 50wk = 67,500
    expect(result.base_rate).toBe(67500);
    // 5% overhead = 3,375
    expect(result.admin_overhead).toBe(3375);
    expect(result.total_annual_cost).toBe(70875);
  });

  it('runs hiring scenario with 1 employee', () => {
    const scenario = runHiringScenario(mockConfig, 1, 0, 75);

    expect(scenario.team_composition.employees).toBe(1);
    expect(scenario.team_composition.contractors).toBe(0);
    expect(scenario.costs.total_annual).toBeGreaterThan(0);
    expect(scenario.revenue.potential_annual).toBeGreaterThan(0);
    expect(scenario.profitability.profitable).toBeDefined();
  });

  it('compares employee vs contractor correctly', () => {
    const employeeScenario = runHiringScenario(mockConfig, 1, 0, 75);
    const contractorScenario = runHiringScenario(mockConfig, 0, 1, 75);

    // Same revenue potential (same hours worked)
    expect(employeeScenario.revenue.potential_annual).toBe(contractorScenario.revenue.potential_annual);

    // Different costs
    expect(employeeScenario.costs.total_annual).not.toBe(contractorScenario.costs.total_annual);

    // Both should have valid profitability calculations
    expect(employeeScenario.profitability.gross_profit_annual).toBeDefined();
    expect(contractorScenario.profitability.gross_profit_annual).toBeDefined();
  });

  it('calculates break-even utilization correctly', () => {
    const scenario = runHiringScenario(mockConfig, 1, 0, 50);

    // At 50% utilization, should show higher break-even rate needed
    expect(scenario.revenue.break_even_utilization).toBeGreaterThan(50);
  });
});
```

### 5.2 Integration Tests

```javascript
// /tests/forecasting-api.test.js

import { describe, it, expect, beforeAll } from 'vitest';
import { getForecastingConfig } from '../src/lib/forecasting-api.js';

describe('Forecasting API Integration', () => {
  let config;

  beforeAll(async () => {
    // Requires Settings service to be running
    config = await getForecastingConfig();
  });

  it('fetches configuration from Settings service', () => {
    expect(config).toBeDefined();
    expect(config.employee_costs).toBeDefined();
    expect(config.contractor_costs).toBeDefined();
    expect(config.overhead_costs).toBeDefined();
    expect(config.capacity_assumptions).toBeDefined();
  });

  it('has all required employee cost fields', () => {
    const { employee_costs } = config;

    expect(employee_costs.hourly_wage).toBeGreaterThan(0);
    expect(employee_costs.payroll_tax_rate).toBeGreaterThan(0);
    expect(employee_costs.workers_comp_rate).toBeGreaterThan(0);
  });

  it('has realistic default values', () => {
    // Sanity checks on values
    expect(config.employee_costs.hourly_wage).toBeGreaterThan(15); // Above minimum wage
    expect(config.employee_costs.hourly_wage).toBeLessThan(200); // Reasonable upper bound

    expect(config.contractor_costs.hourly_rate).toBeGreaterThan(config.employee_costs.hourly_wage);

    expect(config.capacity_assumptions.billable_hours_per_week).toBeGreaterThan(0);
    expect(config.capacity_assumptions.billable_hours_per_week).toBeLessThan(60); // Realistic
  });
});
```

---

## 6. Implementation Timeline

### Week 6 (3-4 days)
- **Day 1**: API client setup, fetch configuration, caching
- **Day 2**: Core calculation functions (employee cost, contractor cost, scenarios)
- **Day 3**: Hiring scenario widget for What-If dashboard
- **Day 4**: Basic testing, bug fixes

### Week 7 (3-4 days)
- **Day 1**: Detailed hiring forecast page HTML/CSS
- **Day 2**: Charts and visualizations (Chart.js integration)
- **Day 3**: Comparison and sensitivity analysis features
- **Day 4**: Comprehensive testing, documentation, deployment

**Total Effort**: 1-2 weeks (consistent with roadmap estimate)

---

## 7. Success Metrics

### Technical Metrics
- [ ] API successfully fetches config from Settings service in <200ms
- [ ] All calculation functions return accurate results (validated with manual calculations)
- [ ] UI renders without errors on desktop/tablet/mobile
- [ ] Charts display correctly with Chart.js
- [ ] Caching reduces API calls by 80%+

### User Experience Metrics
- [ ] Admin can model hiring scenarios in <1 minute
- [ ] Results display break-even analysis clearly
- [ ] Comparison of employee vs contractor is intuitive
- [ ] Sensitivity analysis helps identify utilization targets
- [ ] Configuration link to Settings service works

### Business Value Metrics
- [ ] Enables data-driven hiring decisions
- [ ] Provides clear ROI projections for each hire
- [ ] Identifies break-even utilization rates
- [ ] Supports contractor vs employee financial comparison
- [ ] Time-to-profitability calculator helps plan cash flow

---

## Document Version
- **Version**: 1.0
- **Last Updated**: 2025-11-07
- **Implementation Target**: Q1 2026 (Week 6-7)
- **Dependencies**: Settings Service revenue forecasting config (Q4 2025)
