import {
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  renderTemplate,
} from '../lib/email-service.js';
import { initNavigation } from '../../shared/src/ui/navigation.js';
import { supabase } from '../lib/supabase-client.js';

let templates = [];
let currentTemplate = null;
let originalTemplate = null;

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
    currentSubPage: 'src/views/email-manager',
    onLogout: logout
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

// Extract editable content from HTML template
function extractEditableContent(html) {
  const sections = {};

  // Extract header title
  const headerMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/i);
  if (headerMatch) sections.headerTitle = headerMatch[1].trim();

  // Extract greeting
  const greetingMatch = html.match(/<h2[^>]*>(.*?)<\/h2>/i);
  if (greetingMatch) sections.greeting = greetingMatch[1].trim();

  // Extract main message (first paragraph in content)
  const mainMessageMatch = html.match(/<div class="content"[^>]*>[\s\S]*?<\/h2>\s*<p[^>]*>(.*?)<\/p>/i);
  if (mainMessageMatch) sections.mainMessage = mainMessageMatch[1].trim();

  // Extract button text
  const buttonMatch = html.match(/<a[^>]*class="button"[^>]*>(.*?)<\/a>/i);
  if (buttonMatch) sections.buttonText = buttonMatch[1].trim();

  // Extract button link
  const linkMatch = html.match(/<a[^>]*href="([^"]*)"[^>]*class="button"/i);
  if (linkMatch) sections.buttonLink = linkMatch[1].trim();

  // Extract closing message (last paragraph before footer)
  const closingMatch = html.match(/<\/a>\s*<\/p>\s*<p[^>]*>(.*?)<\/p>\s*<\/div>\s*<div class="footer"/i);
  if (closingMatch) sections.closingMessage = closingMatch[1].trim();

  return sections;
}

// Inject edited content back into HTML template
function injectEditableContent(html, sections) {
  let updatedHtml = html;

  if (sections.headerTitle !== undefined) {
    updatedHtml = updatedHtml.replace(/(<h1[^>]*>)(.*?)(<\/h1>)/i, `$1${sections.headerTitle}$3`);
  }

  if (sections.greeting !== undefined) {
    updatedHtml = updatedHtml.replace(/(<h2[^>]*>)(.*?)(<\/h2>)/i, `$1${sections.greeting}$3`);
  }

  if (sections.mainMessage !== undefined) {
    updatedHtml = updatedHtml.replace(/(<div class="content"[^>]*>[\s\S]*?<\/h2>\s*<p[^>]*>)(.*?)(<\/p>)/i, `$1${sections.mainMessage}$3`);
  }

  if (sections.buttonText !== undefined) {
    updatedHtml = updatedHtml.replace(/(<a[^>]*class="button"[^>]*>)(.*?)(<\/a>)/i, `$1${sections.buttonText}$3`);
  }

  if (sections.buttonLink !== undefined) {
    updatedHtml = updatedHtml.replace(/(<a[^>]*)(href="[^"]*")([^>]*class="button")/i, `$1href="${sections.buttonLink}"$3`);
  }

  if (sections.closingMessage !== undefined) {
    updatedHtml = updatedHtml.replace(/(<\/a>\s*<\/p>\s*<p[^>]*>)(.*?)(<\/p>\s*<\/div>\s*<div class="footer")/i, `$1${sections.closingMessage}$3`);
  }

  return updatedHtml;
}

// Create simple editor fields
function createSimpleEditorFields(sections) {
  const container = document.getElementById('content-fields');
  container.innerHTML = '';

  const fields = [
    { key: 'headerTitle', label: 'Email Header', help: 'Main title at the top of the email' },
    { key: 'greeting', label: 'Greeting', help: 'e.g., Hello {{customerName}},' },
    { key: 'mainMessage', label: 'Main Message', help: 'Primary message to the customer', multiline: true },
    { key: 'buttonText', label: 'Button Text', help: 'Text on the call-to-action button' },
    { key: 'buttonLink', label: 'Button Link', help: 'URL the button links to' },
    { key: 'closingMessage', label: 'Closing Message', help: 'Final message before footer', multiline: true }
  ];

  fields.forEach(field => {
    if (sections[field.key] !== undefined) {
      const fieldDiv = document.createElement('div');
      fieldDiv.className = 'content-field';

      const label = document.createElement('label');
      label.textContent = field.label;
      label.htmlFor = `field-${field.key}`;
      fieldDiv.appendChild(label);

      const input = field.multiline ? document.createElement('textarea') : document.createElement('input');
      input.id = `field-${field.key}`;
      input.value = sections[field.key];
      input.dataset.key = field.key;
      if (field.multiline) {
        input.rows = 3;
      }
      fieldDiv.appendChild(input);

      if (field.help) {
        const helpText = document.createElement('div');
        helpText.className = 'field-help';
        helpText.textContent = field.help;
        fieldDiv.appendChild(helpText);
      }

      container.appendChild(fieldDiv);
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

    // Populate both simple and advanced editors
    const htmlContent = currentTemplate.html_template_file || currentTemplate.email_body;
    const editableContent = extractEditableContent(htmlContent);

    // Simple editor
    document.getElementById('subject-input').value = currentTemplate.subject_line;
    createSimpleEditorFields(editableContent);

    // Advanced editor
    document.getElementById('subject-input-advanced').value = currentTemplate.subject_line;
    document.getElementById('body-input').value = htmlContent;

    // Show available variables
    const variables = currentTemplate.available_variables || [];
    document.getElementById('variables-list').textContent = variables.join(', ');
    document.getElementById('variables-list-advanced').textContent = variables.join(', ');

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

  const testData = getTestData();
  const isSimpleMode = document.getElementById('simple-editor').style.display !== 'none';

  let subject, body;

  if (isSimpleMode) {
    // Simple editor - collect from form fields and inject into HTML
    subject = document.getElementById('subject-input').value;

    // Collect edited content from form fields
    const sections = {};
    document.querySelectorAll('#content-fields input, #content-fields textarea').forEach(input => {
      sections[input.dataset.key] = input.value;
    });

    // Inject edited content back into HTML
    const originalHtml = currentTemplate.html_template_file || currentTemplate.email_body;
    body = injectEditableContent(originalHtml, sections);
  } else {
    // Advanced editor - use raw HTML
    subject = document.getElementById('subject-input-advanced').value;
    body = document.getElementById('body-input').value;
  }

  // Check if this is an HTML template or plain text
  const isHTML = body.trim().startsWith('<!DOCTYPE') || body.trim().startsWith('<html');

  let previewHTML;

  if (isHTML) {
    // Render HTML template with variable substitution
    let renderedHTML = body;
    Object.keys(testData).forEach(key => {
      const regex = new RegExp(`{{${key}}}`, 'g');
      renderedHTML = renderedHTML.replace(regex, testData[key] || '');
    });
    previewHTML = renderedHTML;
  } else {
    // Render plain text template
    const rendered = renderTemplate(
      { subject_line: subject, email_body: body },
      testData
    );

    // Create preview HTML for plain text
    previewHTML = `
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
  }

  const iframe = document.getElementById('preview-frame');
  iframe.srcdoc = previewHTML;
}

// Save template changes
// Save from simple editor
async function saveTemplate() {
  if (!currentTemplate) return;

  try {
    // Collect edited content from form fields
    const sections = {};
    document.querySelectorAll('#content-fields input, #content-fields textarea').forEach(input => {
      sections[input.dataset.key] = input.value;
    });

    // Inject edited content back into HTML
    const originalHtml = currentTemplate.html_template_file || currentTemplate.email_body;
    const updatedHtml = injectEditableContent(originalHtml, sections);

    const updates = {
      subject_line: document.getElementById('subject-input').value,
      html_template_file: updatedHtml
    };

    await updateEmailTemplate(currentTemplate.template_key, updates);

    alert('Template saved successfully!');
    originalTemplate = { ...currentTemplate, ...updates };
    currentTemplate = { ...currentTemplate, ...updates };

    // Update advanced editor with the changes
    document.getElementById('subject-input-advanced').value = updates.subject_line;
    document.getElementById('body-input').value = updatedHtml;

    // Refresh preview
    refreshPreview();
  } catch (error) {
    console.error('Failed to save template:', error);
    alert('Failed to save template. Please try again.');
  }
}

// Save from advanced editor
async function saveAdvancedTemplate() {
  if (!currentTemplate) return;

  try {
    const bodyContent = document.getElementById('body-input').value;
    const isHTML = bodyContent.trim().startsWith('<!DOCTYPE') || bodyContent.trim().startsWith('<html');

    const updates = {
      subject_line: document.getElementById('subject-input-advanced').value,
    };

    // Save to html_template_file if it's HTML, otherwise to email_body
    if (isHTML) {
      updates.html_template_file = bodyContent;
    } else {
      updates.email_body = bodyContent;
    }

    await updateEmailTemplate(currentTemplate.template_key, updates);

    alert('Template saved successfully!');
    originalTemplate = { ...currentTemplate, ...updates };
    currentTemplate = { ...currentTemplate, ...updates };

    // Update simple editor with the changes
    document.getElementById('subject-input').value = updates.subject_line;
    const editableContent = extractEditableContent(bodyContent);
    createSimpleEditorFields(editableContent);

    // Refresh preview
    refreshPreview();
  } catch (error) {
    console.error('Failed to save template:', error);
    alert('Failed to save template. Please try again.');
  }
}

// Revert to original
function revertTemplate() {
  if (!originalTemplate) return;

  document.getElementById('subject-input').value = originalTemplate.subject_line;
  document.getElementById('body-input').value = originalTemplate.html_template_file || originalTemplate.email_body;
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

// Editor mode switching
document.getElementById('simple-mode-btn').addEventListener('click', () => {
  document.getElementById('simple-editor').style.display = 'flex';
  document.getElementById('advanced-editor').style.display = 'none';
  document.getElementById('simple-mode-btn').classList.add('active');
  document.getElementById('advanced-mode-btn').classList.remove('active');
});

document.getElementById('advanced-mode-btn').addEventListener('click', () => {
  document.getElementById('simple-editor').style.display = 'none';
  document.getElementById('advanced-editor').style.display = 'flex';
  document.getElementById('simple-mode-btn').classList.remove('active');
  document.getElementById('advanced-mode-btn').classList.add('active');
});

// Advanced editor event listeners
document.getElementById('save-advanced-btn').addEventListener('click', saveAdvancedTemplate);
document.getElementById('revert-advanced-btn').addEventListener('click', revertTemplate);

// Live preview updates
document.getElementById('subject-input').addEventListener('input', refreshPreview);
document.getElementById('subject-input-advanced').addEventListener('input', refreshPreview);
document.getElementById('body-input').addEventListener('input', refreshPreview);

// Live preview for simple editor fields
document.getElementById('content-fields').addEventListener('input', (e) => {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    refreshPreview();
  }
});

// Resize handle functionality
const resizeHandle = document.getElementById('resize-handle');
const emailManager = document.querySelector('.email-manager');
let isResizing = false;
let startX = 0;
let startWidth = 0;

resizeHandle.addEventListener('mousedown', (e) => {
  isResizing = true;
  startX = e.clientX;

  // Get current width of preview panel
  const previewPanel = document.querySelector('.preview-panel');
  startWidth = previewPanel.offsetWidth;

  // Prevent text selection during resize
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'col-resize';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;

  // Calculate new width
  const deltaX = startX - e.clientX;
  const newWidth = startWidth + deltaX;

  // Constrain width between 300px and 800px
  const constrainedWidth = Math.max(300, Math.min(800, newWidth));

  // Update grid template
  emailManager.style.gridTemplateColumns = `250px 1fr 4px ${constrainedWidth}px`;
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }
  if (isResizingVertical) {
    isResizingVertical = false;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }
});

// Vertical resize handle functionality for preview
const previewResizeHandle = document.getElementById('preview-resize-handle');
const previewFrame = document.getElementById('preview-frame');
let isResizingVertical = false;
let startY = 0;
let startHeight = 0;

previewResizeHandle.addEventListener('mousedown', (e) => {
  isResizingVertical = true;
  startY = e.clientY;

  // Get current height of preview frame
  startHeight = previewFrame.offsetHeight;

  // Prevent text selection during resize
  document.body.style.userSelect = 'none';
  document.body.style.cursor = 'row-resize';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizingVertical) return;

  // Calculate new height
  const deltaY = e.clientY - startY;
  const newHeight = startHeight + deltaY;

  // Constrain height between 300px and 1200px
  const constrainedHeight = Math.max(300, Math.min(1200, newHeight));

  // Update iframe height
  previewFrame.style.height = `${constrainedHeight}px`;
});

// Initialize on page load
init();
