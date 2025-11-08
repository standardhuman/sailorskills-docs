import {
  getPricingConfig,
  updatePricingConfig,
  calculatePricingImpact,
  getPricingHistory,
} from '../lib/pricing-service.js';
import { supabase } from '../lib/supabase-client.js';
import { initNavigation } from '../../shared/src/ui/navigation.js';

let currentPricing = {};
let originalPricing = {};
let changedFields = new Set();

// Cleaning Frequency data
let cleaningIntervals = [];
let cleaningFormulas = {};
let cleaningOverrides = {};

// Logout handler
async function logout() {
  try {
    await supabase.auth.signOut();
    window.location.href = 'https://login.sailorskills.com/login.html';
  } catch (error) {
    console.error('Logout error:', error);
    window.location.href = 'https://login.sailorskills.com/login.html';
  }
}

// Initialize
async function init() {
  // Initialize global navigation with Settings sub-pages
  initNavigation({
    currentPage: 'settings',
    currentSubPage: 'src/views/system-config',
    onLogout: logout
  });

  try {
    currentPricing = await getPricingConfig();
    originalPricing = { ...currentPricing };
    renderPricingForm();
    loadChangeHistory();
    await initCleaningFrequency();
  } catch (error) {
    console.error('Failed to load pricing config:', error);
    alert('Failed to load pricing configuration. Please refresh the page.');
  }
}

// Render pricing form with current values
function renderPricingForm() {
  const inputs = document.querySelectorAll('input[data-key]');

  inputs.forEach(input => {
    const key = input.dataset.key;
    if (currentPricing[key]) {
      input.value = currentPricing[key].value;
    }

    // Track changes
    input.addEventListener('input', () => {
      markFieldAsChanged(input, key);
    });
  });
}

// Mark field as changed
function markFieldAsChanged(input, key) {
  const currentValue = parseFloat(input.value);
  const originalValue = originalPricing[key]?.value;

  if (currentValue !== originalValue) {
    input.classList.add('changed');
    changedFields.add(key);
  } else {
    input.classList.remove('changed');
    changedFields.delete(key);
  }
}

// Get changed pricing values
function getChangedPricing() {
  const changes = {};

  changedFields.forEach(key => {
    const input = document.querySelector(`input[data-key="${key}"]`);
    changes[key] = parseFloat(input.value);
  });

  return changes;
}

// Preview impact
async function previewImpact() {
  if (changedFields.size === 0) {
    alert('No changes to preview. Modify pricing values first.');
    return;
  }

  try {
    const changes = getChangedPricing();

    // Merge changes with current pricing for impact calculation
    const newPricing = { ...currentPricing };
    Object.keys(changes).forEach(key => {
      newPricing[key] = changes[key];
    });

    const impact = await calculatePricingImpact(newPricing);

    showImpactModal(impact, changes);
  } catch (error) {
    console.error('Failed to calculate impact:', error);
    alert('Failed to calculate pricing impact. Please try again.');
  }
}

// Show impact modal
function showImpactModal(impact, changes) {
  const modal = document.getElementById('impact-modal');
  const summaryEl = document.getElementById('impact-summary');
  const samplesEl = document.getElementById('impact-samples');

  // Render summary
  summaryEl.innerHTML = `
    <div class="impact-stat">
      <strong>Services Analyzed:</strong> ${impact.servicesAnalyzed} (last 30 days)
    </div>
    <div class="impact-stat">
      <strong>Average Price Change:</strong> $${impact.averageIncrease}
    </div>
    <div class="impact-stat">
      <strong>Projected Monthly Impact:</strong> $${impact.projectedMonthlyImpact}
    </div>
    <div class="impact-stat">
      <strong>Changes:</strong> ${Object.keys(changes).length} pricing variables modified
    </div>
  `;

  // Render sample calculations
  if (impact.samples && impact.samples.length > 0) {
    samplesEl.innerHTML = `
      <h3>Sample Impact (5 recent services):</h3>
      ${impact.samples.map(sample => `
        <div class="sample-item">
          <div class="sample-desc">${sample.description}</div>
          <div class="sample-prices">
            <span>Current: $${sample.currentPrice}</span>
            <span>→</span>
            <span>New: $${sample.newPrice}</span>
            <span class="price-change ${parseFloat(sample.change) < 0 ? 'negative' : ''}">
              (${parseFloat(sample.change) >= 0 ? '+' : ''}$${sample.change})
            </span>
          </div>
        </div>
      `).join('')}
    `;
  }

  modal.style.display = 'flex';
}

// Save all changes
async function saveAllChanges() {
  if (changedFields.size === 0) {
    alert('No changes to save.');
    return;
  }

  try {
    const changes = getChangedPricing();
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    // Save each changed field
    for (const [key, value] of Object.entries(changes)) {
      await updatePricingConfig(key, value, userId, 'Manual update from Settings UI');
    }

    alert(`Successfully saved ${Object.keys(changes).length} pricing changes!`);

    // Reload data
    currentPricing = await getPricingConfig();
    originalPricing = { ...currentPricing };
    changedFields.clear();

    // Remove changed styling
    document.querySelectorAll('input.changed').forEach(input => {
      input.classList.remove('changed');
    });

    // Reload history
    loadChangeHistory();
  } catch (error) {
    console.error('Failed to save changes:', error);
    alert('Failed to save pricing changes. Please try again.');
  }
}

// Load change history
async function loadChangeHistory() {
  try {
    const history = await getPricingHistory(10);
    const historyEl = document.getElementById('change-history');

    if (!history || history.length === 0) {
      historyEl.innerHTML = '<p style="color: #666;">No recent changes</p>';
      return;
    }

    historyEl.innerHTML = history.map(item => {
      const date = new Date(item.changed_at);
      const changeAmount = parseFloat(item.new_value) - parseFloat(item.old_value);

      return `
        <div class="history-item">
          <div class="timestamp">${date.toLocaleString()}</div>
          <div class="change-detail">
            <strong>${item.config_key}</strong>
          </div>
          <div class="change-detail">
            <span class="change-value">$${item.old_value}</span>
            →
            <span class="change-value">$${item.new_value}</span>
            <span style="color: ${changeAmount >= 0 ? '#4caf50' : '#f44336'}">
              (${changeAmount >= 0 ? '+' : ''}$${changeAmount.toFixed(2)})
            </span>
          </div>
          ${item.reason ? `<div class="change-detail" style="font-size: 12px; color: #666;">${item.reason}</div>` : ''}
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load change history:', error);
  }
}

// Event listeners
document.getElementById('preview-impact-btn').addEventListener('click', previewImpact);
document.getElementById('save-all-btn').addEventListener('click', saveAllChanges);

// Modal controls
document.querySelector('.modal-close').addEventListener('click', () => {
  document.getElementById('impact-modal').style.display = 'none';
});

document.getElementById('cancel-changes-btn').addEventListener('click', () => {
  document.getElementById('impact-modal').style.display = 'none';
});

document.getElementById('confirm-changes-btn').addEventListener('click', async () => {
  document.getElementById('impact-modal').style.display = 'none';
  await saveAllChanges();
});

// ========================================
// Cleaning Frequency Configuration
// ========================================

// Initialize cleaning frequency section
async function initCleaningFrequency() {
  try {
    await loadCleaningData();
    renderIntervalsList();
    renderFormulas();
    renderSurchargeMatrix();
    attachCleaningEventListeners();
  } catch (error) {
    console.error('Failed to initialize cleaning frequency config:', error);
  }
}

// Load cleaning intervals, formulas, and overrides from database
async function loadCleaningData() {
  try {
    // Load intervals
    const { data: intervals, error: intervalsError } = await supabase
      .from('cleaning_time_intervals')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');

    if (intervalsError) throw intervalsError;
    cleaningIntervals = intervals || [];

    // Load formulas
    const { data: formulas, error: formulasError } = await supabase
      .from('cleaning_frequency_formulas')
      .select('*');

    if (formulasError) throw formulasError;
    cleaningFormulas = {};
    (formulas || []).forEach(f => {
      cleaningFormulas[f.paint_condition] = f;
    });

    // Load overrides
    const { data: overrides, error: overridesError } = await supabase
      .from('cleaning_frequency_overrides')
      .select('*');

    if (overridesError) throw overridesError;
    cleaningOverrides = {};
    (overrides || []).forEach(o => {
      const key = `${o.interval_key}_${o.paint_condition}`;
      cleaningOverrides[key] = o.override_multiplier;
    });

  } catch (error) {
    console.error('Error loading cleaning data:', error);
    throw error;
  }
}

// Render intervals list
function renderIntervalsList() {
  const listEl = document.getElementById('intervals-list');

  listEl.innerHTML = cleaningIntervals.map((interval, index) => `
    <div class="interval-item" data-interval-id="${interval.id}">
      <span class="drag-handle">⋮⋮</span>
      <input type="number"
             class="interval-min"
             value="${interval.min_months}"
             min="0"
             placeholder="Min months"
             data-field="min_months" />
      <input type="number"
             class="interval-max"
             value="${interval.max_months || ''}"
             min="0"
             placeholder="Max months (blank = unlimited)"
             data-field="max_months" />
      <input type="text"
             class="interval-label"
             value="${interval.display_label}"
             placeholder="Display label"
             data-field="display_label" />
      <button class="delete-interval-btn" title="Delete interval">🗑</button>
      <span class="interval-key">${interval.interval_key}</span>
    </div>
  `).join('');
}

// Render formula inputs
function renderFormulas() {
  const paintConditions = ['excellent', 'good', 'fair', 'poor'];

  paintConditions.forEach(condition => {
    const formula = cleaningFormulas[condition] || { base_rate: 0, escalation_factor: 0, max_rate: 100 };
    const fieldEl = document.querySelector(`.formula-field[data-condition="${condition}"]`);

    if (!fieldEl) return;

    const baseInput = fieldEl.querySelector('[data-field="base_rate"]');
    const escalationInput = fieldEl.querySelector('[data-field="escalation_factor"]');
    const maxInput = fieldEl.querySelector('[data-field="max_rate"]');

    if (baseInput) baseInput.value = formula.base_rate;
    if (escalationInput) escalationInput.value = formula.escalation_factor;
    if (maxInput) maxInput.value = formula.max_rate;
  });
}

// Calculate surcharge using formula or override
function calculateSurcharge(intervalIndex, paintCondition) {
  const interval = cleaningIntervals[intervalIndex];
  if (!interval) return 0;

  const formula = cleaningFormulas[paintCondition];
  if (!formula) return 0;

  // Check for override
  const overrideKey = `${interval.interval_key}_${paintCondition}`;
  if (cleaningOverrides[overrideKey] !== undefined) {
    return parseFloat(cleaningOverrides[overrideKey]);
  }

  // Calculate using formula: min(base_rate + (index * escalation_factor), max_rate)
  const calculated = parseFloat(formula.base_rate) + (intervalIndex * parseFloat(formula.escalation_factor));
  return Math.min(calculated, parseFloat(formula.max_rate));
}

// Get surcharge level class for color coding
function getSurchargeClass(percentage) {
  if (percentage >= 80) return 'very-high';
  if (percentage >= 50) return 'high';
  if (percentage >= 25) return 'medium';
  return 'low';
}

// Render surcharge preview matrix
function renderSurchargeMatrix() {
  const matrixEl = document.getElementById('surcharge-matrix');
  const paintConditions = ['excellent', 'good', 'fair', 'poor'];

  let html = '<table><thead><tr><th>Time Since Cleaning</th>';
  paintConditions.forEach(condition => {
    html += `<th>${condition.charAt(0).toUpperCase() + condition.slice(1)}</th>`;
  });
  html += '</tr></thead><tbody>';

  cleaningIntervals.forEach((interval, index) => {
    html += `<tr><td class="interval-label">${interval.display_label}</td>`;

    paintConditions.forEach(condition => {
      const surcharge = calculateSurcharge(index, condition);
      const colorClass = getSurchargeClass(surcharge);
      html += `<td class="surcharge-value ${colorClass}">${surcharge.toFixed(0)}%</td>`;
    });

    html += '</tr>';
  });

  html += '</tbody></table>';
  matrixEl.innerHTML = html;
}

// Attach event listeners for cleaning frequency section
function attachCleaningEventListeners() {
  // Formula inputs - recalculate matrix on change
  document.querySelectorAll('.formula-field input').forEach(input => {
    input.addEventListener('input', handleFormulaChange);
  });

  // Preset buttons
  document.getElementById('load-conservative-preset')?.addEventListener('click', loadConservativePreset);
  document.getElementById('load-aggressive-preset')?.addEventListener('click', loadAggressivePreset);
  document.getElementById('reset-to-current')?.addEventListener('click', resetToCurrentValues);

  // Save button
  document.getElementById('save-cleaning-frequency-btn')?.addEventListener('click', saveCleaningFrequency);
}

// Handle formula input change
function handleFormulaChange(e) {
  const field = e.target.dataset.field;
  const condition = e.target.closest('.formula-field').dataset.condition;
  const value = parseFloat(e.target.value) || 0;

  if (!cleaningFormulas[condition]) {
    cleaningFormulas[condition] = { base_rate: 0, escalation_factor: 0, max_rate: 100 };
  }

  cleaningFormulas[condition][field] = value;

  // Recalculate and re-render matrix
  renderSurchargeMatrix();
}

// Load conservative preset (slower escalation)
function loadConservativePreset() {
  cleaningFormulas = {
    excellent: { base_rate: 0, escalation_factor: 10, max_rate: 75 },
    good: { base_rate: 0, escalation_factor: 12, max_rate: 80 },
    fair: { base_rate: 5, escalation_factor: 13, max_rate: 85 },
    poor: { base_rate: 15, escalation_factor: 12, max_rate: 90 }
  };

  renderFormulas();
  renderSurchargeMatrix();
}

// Load aggressive preset (faster escalation)
function loadAggressivePreset() {
  cleaningFormulas = {
    excellent: { base_rate: 0, escalation_factor: 18, max_rate: 100 },
    good: { base_rate: 0, escalation_factor: 20, max_rate: 100 },
    fair: { base_rate: 10, escalation_factor: 22, max_rate: 100 },
    poor: { base_rate: 35, escalation_factor: 15, max_rate: 100 }
  };

  renderFormulas();
  renderSurchargeMatrix();
}

// Reset to current database values
async function resetToCurrentValues() {
  await loadCleaningData();
  renderFormulas();
  renderSurchargeMatrix();
}

// Save cleaning frequency configuration
async function saveCleaningFrequency() {
  const saveBtn = document.getElementById('save-cleaning-frequency-btn');
  const statusEl = document.getElementById('cleaning-frequency-save-status');

  // Disable button during save
  saveBtn.disabled = true;
  saveBtn.textContent = '💾 Saving...';
  statusEl.className = 'save-status';
  statusEl.style.display = 'none';

  try {
    const user = await supabase.auth.getUser();
    const userId = user.data.user?.id;

    if (!userId) {
      throw new Error('User not authenticated');
    }

    // Save formulas
    let savedCount = 0;
    for (const [condition, formula] of Object.entries(cleaningFormulas)) {
      const { error } = await supabase
        .from('cleaning_frequency_formulas')
        .update({
          base_rate: parseFloat(formula.base_rate) || 0,
          escalation_factor: parseFloat(formula.escalation_factor) || 0,
          max_rate: parseFloat(formula.max_rate) || 100,
          updated_by: userId
        })
        .eq('paint_condition', condition);

      if (error) throw error;
      savedCount++;
    }

    // Show success message
    statusEl.textContent = `✓ Saved ${savedCount} formula configurations successfully!`;
    statusEl.className = 'save-status success';

    // Reload data to confirm save
    await loadCleaningData();
    renderSurchargeMatrix();

    // Auto-hide success message after 5 seconds
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);

  } catch (error) {
    console.error('Error saving cleaning frequency config:', error);

    // Show error message
    statusEl.textContent = `✗ Failed to save: ${error.message}`;
    statusEl.className = 'save-status error';

    // Auto-hide error message after 8 seconds
    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 8000);
  } finally {
    // Re-enable button
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save Cleaning Frequency Configuration';
  }
}

// Initialize on page load
init();
