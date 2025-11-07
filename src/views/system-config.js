import {
  getPricingConfig,
  updatePricingConfig,
  calculatePricingImpact,
  getPricingHistory,
} from '../lib/pricing-service.js';
import { supabase } from '../lib/supabase-client.js';

let currentPricing = {};
let originalPricing = {};
let changedFields = new Set();

// Initialize
async function init() {
  try {
    currentPricing = await getPricingConfig();
    originalPricing = { ...currentPricing };
    renderPricingForm();
    loadChangeHistory();
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

// Initialize on page load
init();
