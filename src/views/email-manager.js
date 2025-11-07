import {
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  renderTemplate,
} from '../lib/email-service.js';
import { initNavigation } from '../../shared/src/ui/navigation.js';

let templates = [];
let currentTemplate = null;
let originalTemplate = null;

// Initialize
async function init() {
  // Initialize global navigation with Settings sub-pages
  initNavigation({
    currentPage: 'settings',
    currentSubPage: 'src/views/email-manager'
  });

  try {
    templates = await getEmailTemplates();
    renderTemplateList();
  } catch (error) {
    console.error('Failed to load templates:', error);
    alert('Failed to load email templates. Please refresh the page.');
  }
}

// Render template list in sidebar
function renderTemplateList() {
  const customerContainer = document.getElementById('customer-templates');
  const internalContainer = document.getElementById('internal-templates');

  customerContainer.innerHTML = '';
  internalContainer.innerHTML = '';

  templates.forEach(template => {
    const item = document.createElement('div');
    item.className = 'template-item';
    item.textContent = template.template_name;
    item.addEventListener('click', () => selectTemplate(template.template_key));

    if (template.service === 'shared' && !template.template_key.includes('alert')) {
      customerContainer.appendChild(item);
    } else {
      internalContainer.appendChild(item);
    }
  });
}

// Select and load template
async function selectTemplate(templateKey) {
  try {
    currentTemplate = await getEmailTemplate(templateKey);
    originalTemplate = { ...currentTemplate };

    // Update UI
    document.getElementById('editor-empty').style.display = 'none';
    document.getElementById('editor-content').style.display = 'block';

    document.getElementById('template-title').textContent = currentTemplate.template_name;
    document.getElementById('subject-input').value = currentTemplate.subject_line;
    document.getElementById('body-input').value = currentTemplate.email_body;

    // Show available variables
    const variables = currentTemplate.available_variables || [];
    document.getElementById('variables-list').textContent = variables.join(', ');

    // Create test data inputs
    createTestDataInputs(variables);

    // Update active state in sidebar
    document.querySelectorAll('.template-item').forEach(item => {
      item.classList.remove('active');
      if (item.textContent === currentTemplate.template_name) {
        item.classList.add('active');
      }
    });

    // Refresh preview
    refreshPreview();
  } catch (error) {
    console.error('Failed to load template:', error);
    alert('Failed to load template details.');
  }
}

// Create test data input fields
function createTestDataInputs(variables) {
  const container = document.getElementById('test-data-inputs');
  container.innerHTML = '';

  // Sample data for common variables
  const sampleData = {
    CUSTOMER_NAME: 'John Smith',
    BOAT_NAME: 'Sea Breeze',
    SERVICE_TYPE: 'Hull Cleaning',
    ORDER_NUMBER: 'ORD-1234',
    SERVICE_DATE: 'November 15, 2025',
    TOTAL_AMOUNT: '450.00',
    INVOICE_NUMBER: 'INV-5678',
    SERVICE_NOTES: 'Hull cleaned, anodes inspected.',
    COMPLETION_DATE: 'November 10, 2025',
  };

  variables.forEach(variable => {
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = variable;
    input.value = sampleData[variable] || `[${variable}]`;
    input.dataset.variable = variable;
    container.appendChild(input);
  });
}

// Get test data from inputs
function getTestData() {
  const inputs = document.querySelectorAll('#test-data-inputs input');
  const data = {};
  inputs.forEach(input => {
    data[input.dataset.variable] = input.value;
  });
  return data;
}

// Refresh preview
function refreshPreview() {
  if (!currentTemplate) return;

  const subject = document.getElementById('subject-input').value;
  const body = document.getElementById('body-input').value;
  const testData = getTestData();

  const rendered = renderTemplate(
    { subject_line: subject, email_body: body },
    testData
  );

  // Create preview HTML
  const previewHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          line-height: 1.6;
        }
        .subject {
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 2px solid #1a237e;
        }
        .body {
          white-space: pre-wrap;
        }
      </style>
    </head>
    <body>
      <div class="subject">${rendered.subject}</div>
      <div class="body">${rendered.body}</div>
    </body>
    </html>
  `;

  const iframe = document.getElementById('preview-frame');
  iframe.srcdoc = previewHTML;
}

// Save template changes
async function saveTemplate() {
  if (!currentTemplate) return;

  try {
    const updates = {
      subject_line: document.getElementById('subject-input').value,
      email_body: document.getElementById('body-input').value,
    };

    await updateEmailTemplate(currentTemplate.template_key, updates);

    alert('Template saved successfully!');
    originalTemplate = { ...currentTemplate, ...updates };
  } catch (error) {
    console.error('Failed to save template:', error);
    alert('Failed to save template. Please try again.');
  }
}

// Revert to original
function revertTemplate() {
  if (!originalTemplate) return;

  document.getElementById('subject-input').value = originalTemplate.subject_line;
  document.getElementById('body-input').value = originalTemplate.email_body;
  refreshPreview();
}

// Send test email (placeholder - would need edge function)
async function sendTest() {
  if (!currentTemplate) return;

  const testEmail = document.getElementById('test-email-input').value;
  if (!testEmail) {
    alert('Please enter an email address');
    return;
  }

  alert('Test email feature requires Resend integration (coming in Task 10).\n\nFor now, use the preview to verify your changes.');
}

// Event listeners
document.getElementById('save-btn').addEventListener('click', saveTemplate);
document.getElementById('revert-btn').addEventListener('click', revertTemplate);
document.getElementById('refresh-preview').addEventListener('click', refreshPreview);
document.getElementById('send-test-btn').addEventListener('click', sendTest);

// Preview toggle
document.getElementById('preview-mobile').addEventListener('click', () => {
  document.getElementById('preview-frame').className = 'preview-frame mobile';
  document.querySelectorAll('.preview-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('preview-mobile').classList.add('active');
});

document.getElementById('preview-desktop').addEventListener('click', () => {
  document.getElementById('preview-frame').className = 'preview-frame desktop';
  document.querySelectorAll('.preview-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById('preview-desktop').classList.add('active');
});

// Live preview updates
document.getElementById('subject-input').addEventListener('input', refreshPreview);
document.getElementById('body-input').addEventListener('input', refreshPreview);

// Initialize on page load
init();
