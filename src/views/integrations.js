import {
  getIntegrations,
  getAvailableIntegrations,
  saveIntegration,
  testIntegration,
  maskApiKey,
} from '../lib/integration-service.js';
import { initNavigation } from '../../shared/src/ui/navigation.js';

let currentIntegration = null;
let savedIntegrations = {};

async function init() {
  // Initialize global navigation with Settings sub-pages
  initNavigation({
    currentPage: 'settings',
    currentSubPage: 'src/views/integrations'
  });

  await loadIntegrations();
  setupEventListeners();
}

async function loadIntegrations() {
  try {
    const saved = await getIntegrations();
    savedIntegrations = saved.reduce((acc, int) => {
      acc[int.integration_name] = int;
      return acc;
    }, {});

    renderIntegrationCards();
  } catch (error) {
    console.error('Failed to load integrations:', error);
  }
}

function renderIntegrationCards() {
  const grid = document.getElementById('integrations-grid');
  const available = getAvailableIntegrations();

  grid.innerHTML = available.map(integration => {
    const saved = savedIntegrations[integration.name];
    const isConfigured = !!saved?.api_key_encrypted;
    const isActive = saved?.is_active !== false;

    return `
      <div class="integration-card">
        <div class="integration-header">
          <span class="integration-icon">${integration.icon}</span>
          <span class="integration-status ${isActive && isConfigured ? 'status-active' : 'status-inactive'}">
            ${isActive && isConfigured ? '✓' : '○'}
          </span>
        </div>
        <div class="integration-info">
          <h3>${integration.displayName}</h3>
          <p>${integration.description}</p>
        </div>
        ${isConfigured ? `
          <div class="integration-key">${maskApiKey(saved.api_key_encrypted)}</div>
        ` : ''}
        <div class="integration-actions">
          <button class="btn btn-primary btn-small configure-btn" data-integration="${integration.name}">
            ${isConfigured ? 'Configure' : 'Setup'}
          </button>
          ${saved?.last_verified ? `
            <span style="font-size: 12px; color: #666;">
              Verified ${new Date(saved.last_verified).toLocaleDateString()}
            </span>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');

  // Add click handlers
  grid.querySelectorAll('.configure-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      showEditModal(btn.dataset.integration);
    });
  });
}

function showEditModal(integrationName) {
  const available = getAvailableIntegrations();
  const integration = available.find(i => i.name === integrationName);
  const saved = savedIntegrations[integrationName];

  if (!integration) return;

  currentIntegration = integrationName;

  document.getElementById('modal-title').textContent = `Configure ${integration.displayName}`;
  document.getElementById('modal-description').textContent = integration.description;
  document.getElementById('integration-name').value = integrationName;
  document.getElementById('api-key-label').textContent = integration.keyLabel;
  document.getElementById('api-key-input').placeholder = integration.keyPlaceholder;
  document.getElementById('api-key-input').value = saved?.api_key_encrypted || '';
  document.getElementById('is-active-checkbox').checked = saved?.is_active !== false;
  document.getElementById('docs-link').href = integration.docsUrl;
  document.getElementById('test-result').style.display = 'none';

  document.getElementById('edit-modal').style.display = 'flex';
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const integrationName = document.getElementById('integration-name').value;
  const apiKey = document.getElementById('api-key-input').value;
  const isActive = document.getElementById('is-active-checkbox').checked;

  try {
    await saveIntegration(integrationName, apiKey, {}, isActive);
    alert('Integration saved successfully!');
    document.getElementById('edit-modal').style.display = 'none';
    await loadIntegrations();
  } catch (error) {
    console.error('Failed to save integration:', error);
    alert('Failed to save integration. Please try again.');
  }
}

async function handleTestConnection() {
  const integrationName = document.getElementById('integration-name').value;
  const apiKey = document.getElementById('api-key-input').value;

  if (!apiKey) {
    alert('Please enter an API key first');
    return;
  }

  const resultDiv = document.getElementById('test-result');
  resultDiv.innerHTML = '<div style="text-align: center; color: #666;">Testing connection...</div>';
  resultDiv.style.display = 'block';

  try {
    const result = await testIntegration(integrationName, apiKey);

    resultDiv.className = `test-result ${result.success ? 'test-success' : 'test-error'}`;
    resultDiv.innerHTML = `
      <strong>${result.success ? '✓' : '✗'} ${result.success ? 'Success' : 'Failed'}</strong><br>
      ${result.message}
    `;
  } catch (error) {
    resultDiv.className = 'test-result test-error';
    resultDiv.innerHTML = `<strong>✗ Error</strong><br>${error.message}`;
  }
}

function toggleVisibility() {
  const input = document.getElementById('api-key-input');
  input.type = input.type === 'password' ? 'text' : 'password';
}

function setupEventListeners() {
  document.getElementById('integration-form').addEventListener('submit', handleFormSubmit);
  document.getElementById('test-connection-btn').addEventListener('click', handleTestConnection);
  document.getElementById('toggle-visibility-btn').addEventListener('click', toggleVisibility);

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('edit-modal').style.display = 'none';
    });
  });
}

init();
