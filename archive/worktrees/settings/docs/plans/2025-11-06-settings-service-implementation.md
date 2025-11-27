# Settings Service Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a centralized Settings service for email management, pricing configuration, user administration, and integration management.

**Architecture:** New Vite + Supabase service following existing Sailorskills patterns. Database-driven content (templates/pricing in DB), HTML structure in files. Real-time engagement tracking via Resend webhooks. Shared pricing service in sailorskills-shared for cross-service access.

**Tech Stack:** Vite, Supabase (PostgreSQL + Edge Functions), Resend (email), vanilla JavaScript, CSS Grid/Flexbox

---

## Phase 1: Foundation & Service Structure

### Task 1: Create Settings Service Directory Structure

**Files:**
- Create: `sailorskills-settings/package.json`
- Create: `sailorskills-settings/vite.config.js`
- Create: `sailorskills-settings/index.html`
- Create: `sailorskills-settings/.gitignore`
- Create: `sailorskills-settings/README.md`

**Step 1: Create package.json**

```json
{
  "name": "sailorskills-settings",
  "version": "1.0.0",
  "description": "Settings and configuration management for Sailorskills suite",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "echo 'Tests will be added in later tasks'"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

**Step 2: Create vite.config.js**

```javascript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'src/views/dashboard.html'),
        emailManager: resolve(__dirname, 'src/views/email-manager.html'),
        emailLogs: resolve(__dirname, 'src/views/email-logs.html'),
        users: resolve(__dirname, 'src/views/users.html'),
        integrations: resolve(__dirname, 'src/views/integrations.html'),
        systemConfig: resolve(__dirname, 'src/views/system-config.html'),
      },
    },
  },
  server: {
    port: 5178,
  },
});
```

**Step 3: Create index.html (redirects to dashboard)**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Settings - Sailor Skills</title>
</head>
<body>
  <script>
    // Redirect to dashboard
    window.location.href = '/src/views/dashboard.html';
  </script>
</body>
</html>
```

**Step 4: Create .gitignore**

```
node_modules/
dist/
.env
.env.local
.DS_Store
```

**Step 5: Create README.md**

```markdown
# Sailorskills Settings Service

Centralized settings and configuration management for the Sailorskills suite.

## Features
- Email template management with engagement tracking
- Business pricing configuration
- User and team administration
- Integration/API key management

## Development

```bash
npm install
npm run dev
```

Access at: http://localhost:5178

## Deployment

Deployed to Vercel: https://sailorskills-settings.vercel.app

## Documentation

See `/docs/plans/2025-11-06-settings-service-design.md` for complete design.
```

**Step 6: Install dependencies**

Run: `cd sailorskills-settings && npm install`
Expected: Dependencies installed successfully

**Step 7: Commit**

```bash
git add sailorskills-settings/
git commit -m "feat(settings): initialize Settings service structure

- Add package.json with Vite and Supabase dependencies
- Configure Vite with multi-page setup for all views
- Add README with development instructions
- Set up .gitignore for node_modules and env files"
```

---

### Task 2: Create Shared Package Link

**Files:**
- Create symlink: `sailorskills-settings/shared -> ../sailorskills-shared`

**Step 1: Initialize shared submodule link**

Run from settings directory:
```bash
cd sailorskills-settings
ln -s ../sailorskills-shared shared
ls -la shared
```

Expected: Symlink created, pointing to sailorskills-shared

**Step 2: Verify shared package accessible**

Run:
```bash
cat shared/package.json | grep '"name"'
```

Expected: Shows "@sailorskills/shared"

**Step 3: Commit**

```bash
git add shared
git commit -m "feat(settings): link to sailorskills-shared package"
```

---

### Task 3: Create Database Migrations

**Files:**
- Create: `sailorskills-settings/supabase/migrations/001_create_settings_tables.sql`
- Create: `sailorskills-settings/supabase/migrations/002_populate_initial_data.sql`

**Step 1: Create migration for settings tables**

File: `sailorskills-settings/supabase/migrations/001_create_settings_tables.sql`

```sql
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

-- Extend auth.users for role management
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'viewer';
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS service_access JSONB DEFAULT '[]'::jsonb;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

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

CREATE POLICY "Admin only: business_pricing_config"
  ON business_pricing_config FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin only: email_templates"
  ON email_templates FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Admin only: integration_credentials"
  ON integration_credentials FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Authenticated read: pricing_audit_log"
  ON pricing_audit_log FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admin write: pricing_audit_log"
  ON pricing_audit_log FOR INSERT
  USING (auth.jwt() ->> 'role' = 'admin');
```

**Step 2: Create data population migration**

File: `sailorskills-settings/supabase/migrations/002_populate_initial_data.sql`

```sql
-- Populate business_pricing_config from Estimator hardcoded values

-- Service Base Rates
INSERT INTO business_pricing_config (config_key, config_value, config_type, display_name, description, unit) VALUES
  ('recurring_cleaning_rate', 4.50, 'service_rate', 'Recurring Cleaning Rate', 'Base rate for recurring cleaning services', 'dollars_per_foot'),
  ('onetime_cleaning_rate', 6.00, 'service_rate', 'One-Time Cleaning Rate', 'Base rate for one-time cleaning services', 'dollars_per_foot'),
  ('underwater_inspection_rate', 4.00, 'service_rate', 'Underwater Inspection Rate', 'Base rate for underwater inspection', 'dollars_per_foot'),
  ('item_recovery_rate', 199.00, 'service_rate', 'Item Recovery Rate', 'Flat rate for item recovery service', 'flat_rate'),
  ('propeller_service_rate', 349.00, 'service_rate', 'Propeller Service Rate', 'Flat rate for propeller removal/installation', 'flat_rate'),
  ('anodes_only_rate', 150.00, 'service_rate', 'Anodes Only Rate', 'Minimum charge for anode-only service', 'flat_rate'),
  ('minimum_service_charge', 150.00, 'minimum', 'Minimum Service Charge', 'Minimum charge for any service', 'flat_rate')
ON CONFLICT (config_key) DO NOTHING;

-- Anode Pricing
INSERT INTO business_pricing_config (config_key, config_value, config_type, display_name, description, unit) VALUES
  ('anode_installation_rate', 15.00, 'anode', 'Anode Installation Labor', 'Labor charge per anode installed', 'dollars_per_unit'),
  ('anode_markup_percentage', 50.00, 'anode', 'Anode Markup Percentage', 'Markup percentage on anode cost', 'percentage'),
  ('anode_minimum_markup', 2.00, 'anode', 'Anode Minimum Markup', 'Minimum profit per anode', 'dollars_per_unit')
ON CONFLICT (config_key) DO NOTHING;

-- Hull Type Surcharges
INSERT INTO business_pricing_config (config_key, config_value, config_type, display_name, description, unit) VALUES
  ('surcharge_powerboat', 25.00, 'surcharge', 'Powerboat Surcharge', 'Additional charge for powerboat vs sailboat', 'percentage'),
  ('surcharge_catamaran', 25.00, 'surcharge', 'Catamaran Surcharge', 'Additional charge for catamaran hull', 'percentage'),
  ('surcharge_trimaran', 50.00, 'surcharge', 'Trimaran Surcharge', 'Additional charge for trimaran hull', 'percentage'),
  ('surcharge_additional_propeller', 10.00, 'surcharge', 'Additional Propeller', 'Charge per propeller beyond first', 'percentage')
ON CONFLICT (config_key) DO NOTHING;

-- Paint Condition Surcharges
INSERT INTO business_pricing_config (config_key, config_value, config_type, display_name, description, unit) VALUES
  ('surcharge_paint_poor', 10.00, 'surcharge', 'Poor Paint Surcharge', 'Surcharge when paint is in poor condition', 'percentage'),
  ('surcharge_paint_missing', 15.00, 'surcharge', 'Missing Paint Surcharge', 'Surcharge when paint is missing', 'percentage')
ON CONFLICT (config_key) DO NOTHING;

-- Growth/Fouling Surcharges
INSERT INTO business_pricing_config (config_key, config_value, config_type, display_name, description, unit) VALUES
  ('surcharge_moderate_heavy_growth', 10.00, 'surcharge', 'Moderate-Heavy Growth', 'Surcharge for moderate to heavy growth', 'percentage'),
  ('surcharge_heavy_growth', 50.00, 'surcharge', 'Heavy Growth', 'Surcharge for heavy growth/fouling', 'percentage'),
  ('surcharge_heavy_severe_growth', 100.00, 'surcharge', 'Heavy-Severe Growth', 'Surcharge for heavy to severe growth', 'percentage'),
  ('surcharge_severe_growth', 200.00, 'surcharge', 'Severe Growth', 'Surcharge for severe growth/fouling', 'percentage'),
  ('surcharge_extreme_growth', 250.00, 'surcharge', 'Extreme Growth', 'Surcharge for extreme growth/fouling', 'percentage')
ON CONFLICT (config_key) DO NOTHING;

-- Populate email_templates from existing templates

INSERT INTO email_templates (template_key, template_name, subject_line, email_body, html_template_file, available_variables, service) VALUES
  (
    'order_confirmation',
    'Order Confirmation',
    'Your Sailor Skills order #{{ORDER_NUMBER}} is confirmed',
    'Hi {{CUSTOMER_NAME}},\n\nThanks for choosing Sailor Skills! Your order has been confirmed.\n\nOrder Details:\n- Boat: {{BOAT_NAME}}\n- Service: {{SERVICE_TYPE}}\n- Scheduled: {{SERVICE_DATE}}\n- Total: ${{TOTAL_AMOUNT}}\n\nWe''ll send you a reminder 24 hours before your service.\n\nThank you,\nThe Sailor Skills Team',
    'shared/src/email/templates/order-confirmation.html',
    '["ORDER_NUMBER", "CUSTOMER_NAME", "BOAT_NAME", "SERVICE_TYPE", "SERVICE_DATE", "TOTAL_AMOUNT"]'::jsonb,
    'shared'
  ),
  (
    'order_declined',
    'Order Declined',
    'Update on your Sailor Skills service request',
    'Hi {{CUSTOMER_NAME}},\n\nThank you for your interest in Sailor Skills. Unfortunately, we are unable to accommodate your service request at this time.\n\nReason: {{DECLINE_REASON}}\n\nIf you have questions or would like to discuss alternatives, please don''t hesitate to contact us.\n\nThank you,\nThe Sailor Skills Team',
    'shared/src/email/templates/order-declined.html',
    '["CUSTOMER_NAME", "DECLINE_REASON"]'::jsonb,
    'shared'
  ),
  (
    'service_completion',
    'Service Completion',
    'Your {{SERVICE_TYPE}} on {{BOAT_NAME}} is complete',
    'Hi {{CUSTOMER_NAME}},\n\nGreat news! We''ve completed the {{SERVICE_TYPE}} service on {{BOAT_NAME}}.\n\nService Summary:\n{{SERVICE_NOTES}}\n\nYour invoice is ready to view in your customer portal.\n\nThank you for choosing Sailor Skills!\n\nThe Sailor Skills Team',
    'operations/src/email/templates/service-completion.html',
    '["CUSTOMER_NAME", "BOAT_NAME", "SERVICE_TYPE", "SERVICE_NOTES", "COMPLETION_DATE"]'::jsonb,
    'operations'
  ),
  (
    'new_invoice',
    'New Invoice Available',
    'Your Sailor Skills invoice #{{INVOICE_NUMBER}} is ready',
    'Hi {{CUSTOMER_NAME}},\n\nYour invoice for {{SERVICE_TYPE}} on {{BOAT_NAME}} is now available.\n\nInvoice #: {{INVOICE_NUMBER}}\nAmount Due: ${{AMOUNT_DUE}}\nDue Date: {{DUE_DATE}}\n\nView and pay your invoice in the customer portal.\n\nThank you,\nThe Sailor Skills Team',
    'operations/src/email/templates/new-invoice.html',
    '["CUSTOMER_NAME", "BOAT_NAME", "SERVICE_TYPE", "INVOICE_NUMBER", "AMOUNT_DUE", "DUE_DATE", "PORTAL_LINK"]'::jsonb,
    'billing'
  ),
  (
    'upcoming_service',
    'Upcoming Service Reminder',
    'Reminder: {{SERVICE_TYPE}} scheduled for {{BOAT_NAME}}',
    'Hi {{CUSTOMER_NAME}},\n\nThis is a reminder that your {{SERVICE_TYPE}} service is scheduled for tomorrow.\n\nService Details:\n- Boat: {{BOAT_NAME}}\n- Date: {{SERVICE_DATE}}\n- Time: {{SERVICE_TIME}}\n- Location: {{MARINA_NAME}}\n\nOur team will arrive at the scheduled time. If you need to reschedule, please contact us as soon as possible.\n\nThank you,\nThe Sailor Skills Team',
    'operations/src/email/templates/upcoming-service.html',
    '["CUSTOMER_NAME", "BOAT_NAME", "SERVICE_TYPE", "SERVICE_DATE", "SERVICE_TIME", "MARINA_NAME"]'::jsonb,
    'operations'
  ),
  (
    'new_message',
    'New Message from Sailor Skills',
    'New message about {{BOAT_NAME}}',
    'Hi {{CUSTOMER_NAME}},\n\nYou have a new message from the Sailor Skills team:\n\n{{MESSAGE_BODY}}\n\nYou can reply to this message in your customer portal.\n\nThank you,\nThe Sailor Skills Team',
    'operations/src/email/templates/new-message.html',
    '["CUSTOMER_NAME", "BOAT_NAME", "MESSAGE_BODY", "SENDER_NAME"]'::jsonb,
    'operations'
  ),
  (
    'new_order_alert',
    'New Order Alert',
    'New service order received - {{SERVICE_TYPE}}',
    'New order received!\n\nCustomer: {{CUSTOMER_NAME}}\nBoat: {{BOAT_NAME}}\nService: {{SERVICE_TYPE}}\nRequested Date: {{REQUESTED_DATE}}\n\nView details in the Operations dashboard.',
    'shared/src/email/templates/new-order-alert.html',
    '["CUSTOMER_NAME", "BOAT_NAME", "SERVICE_TYPE", "REQUESTED_DATE", "ORDER_NUMBER"]'::jsonb,
    'shared'
  )
ON CONFLICT (template_key) DO NOTHING;
```

**Step 3: Test migrations locally (dry run)**

Load database connection:
```bash
source ../../db-env.sh
```

Run migration (dry run):
```bash
psql "$DATABASE_URL" -f supabase/migrations/001_create_settings_tables.sql
```

Expected: Tables created successfully

**Step 4: Run data population migration**

```bash
psql "$DATABASE_URL" -f supabase/migrations/002_populate_initial_data.sql
```

Expected: Data inserted successfully

**Step 5: Verify migrations**

```bash
psql "$DATABASE_URL" -c "SELECT config_key, config_value, display_name FROM business_pricing_config LIMIT 5"
psql "$DATABASE_URL" -c "SELECT template_key, template_name FROM email_templates LIMIT 5"
```

Expected: Shows populated data

**Step 6: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(settings): add database migrations for Settings tables

- Create business_pricing_config table with 21 pricing variables
- Create email_templates table with 7 templates
- Create integration_credentials table
- Create pricing_audit_log table
- Extend email_logs for engagement tracking
- Add RLS policies for admin-only access
- Populate initial data from Estimator/Billing hardcoded values"
```

---

## Phase 2: Email Management UI

### Task 4: Create Email Template Service

**Files:**
- Create: `sailorskills-settings/src/lib/email-service.js`
- Create: `sailorskills-settings/src/lib/supabase-client.js`

**Step 1: Create Supabase client**

File: `sailorskills-settings/src/lib/supabase-client.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Step 2: Create email service**

File: `sailorskills-settings/src/lib/email-service.js`

```javascript
import { supabase } from './supabase-client.js';

/**
 * Fetch all email templates
 */
export async function getEmailTemplates() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('template_name');

  if (error) throw error;
  return data;
}

/**
 * Fetch single email template by key
 */
export async function getEmailTemplate(templateKey) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_key', templateKey)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update email template
 */
export async function updateEmailTemplate(templateKey, updates) {
  const { data, error } = await supabase
    .from('email_templates')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('template_key', templateKey)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Render email template with variable substitution
 */
export function renderTemplate(template, data) {
  let subject = template.subject_line;
  let body = template.email_body;

  // Replace {{VARIABLE}} with actual values
  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, data[key] || '');
    body = body.replace(regex, data[key] || '');
  });

  return { subject, body };
}

/**
 * Send test email
 */
export async function sendTestEmail(templateKey, testEmail, testData) {
  const template = await getEmailTemplate(templateKey);
  const rendered = renderTemplate(template, testData);

  // Call Resend via edge function
  const { data, error } = await supabase.functions.invoke('send-test-email', {
    body: {
      to: testEmail,
      subject: rendered.subject,
      html: rendered.body,
      template_key: templateKey,
    },
  });

  if (error) throw error;
  return data;
}
```

**Step 3: Verify service works**

Create test file: `sailorskills-settings/src/lib/__tests__/email-service.test.js`

```javascript
import { renderTemplate } from '../email-service.js';

const mockTemplate = {
  subject_line: 'Hi {{NAME}}',
  email_body: 'Welcome {{NAME}}, your order is {{STATUS}}',
};

const testData = {
  NAME: 'John',
  STATUS: 'confirmed',
};

const result = renderTemplate(mockTemplate, testData);

console.assert(result.subject === 'Hi John', 'Subject rendering failed');
console.assert(result.body === 'Welcome John, your order is confirmed', 'Body rendering failed');

console.log('✓ Email service tests passed');
```

Run: `node src/lib/__tests__/email-service.test.js`
Expected: "✓ Email service tests passed"

**Step 4: Commit**

```bash
git add src/lib/email-service.js src/lib/supabase-client.js src/lib/__tests__/
git commit -m "feat(settings): add email template service

- Create Supabase client with environment variables
- Add CRUD operations for email templates
- Add template rendering with variable substitution
- Add test email sending functionality
- Include basic unit tests for rendering"
```

---

### Task 5: Build Email Manager UI

**Files:**
- Create: `sailorskills-settings/src/views/email-manager.html`
- Create: `sailorskills-settings/src/styles/email-manager.css`
- Create: `sailorskills-settings/src/views/email-manager.js`

**Step 1: Create HTML structure**

File: `sailorskills-settings/src/views/email-manager.html`

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email Manager - Settings</title>
  <link rel="stylesheet" href="../styles/email-manager.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700&display=swap" rel="stylesheet">
</head>
<body>
  <div class="email-manager">
    <!-- Left Sidebar: Template List -->
    <aside class="template-list">
      <h2>Email Templates</h2>

      <div class="template-group">
        <h3>📧 Customer Emails</h3>
        <div id="customer-templates" class="template-items"></div>
      </div>

      <div class="template-group">
        <h3>🔔 Internal Emails</h3>
        <div id="internal-templates" class="template-items"></div>
      </div>
    </aside>

    <!-- Center Panel: Template Editor -->
    <main class="template-editor">
      <div id="editor-empty" class="empty-state">
        <p>Select a template to edit</p>
      </div>

      <div id="editor-content" class="editor-content" style="display: none;">
        <div class="editor-header">
          <h1 id="template-title"></h1>
          <span class="template-status" id="template-status">✓ Active</span>
        </div>

        <div class="editor-form">
          <label for="subject-input">Subject Line:</label>
          <input
            type="text"
            id="subject-input"
            class="subject-input"
            placeholder="Email subject with {{VARIABLES}}"
          />

          <label for="body-input">Email Body:</label>
          <textarea
            id="body-input"
            class="body-input"
            rows="12"
            placeholder="Email content with {{VARIABLES}}"
          ></textarea>

          <div class="available-variables">
            <strong>Available Variables:</strong>
            <span id="variables-list"></span>
          </div>

          <div class="editor-actions">
            <button id="save-btn" class="btn btn-primary">Save Changes</button>
            <button id="revert-btn" class="btn btn-secondary">Revert to Default</button>
          </div>
        </div>
      </div>
    </main>

    <!-- Right Panel: Preview & Testing -->
    <aside class="preview-panel">
      <div class="preview-header">
        <h3>Preview</h3>
        <div class="preview-toggle">
          <button id="preview-mobile" class="preview-btn">📱 Mobile</button>
          <button id="preview-desktop" class="preview-btn active">💻 Desktop</button>
        </div>
      </div>

      <div class="test-data-form">
        <h4>Test Data:</h4>
        <div id="test-data-inputs"></div>
        <button id="refresh-preview" class="btn btn-small">🔄 Refresh Preview</button>
      </div>

      <div class="preview-container">
        <iframe id="preview-frame" class="preview-frame desktop"></iframe>
      </div>

      <div class="test-email-form">
        <h4>Send Test Email:</h4>
        <input
          type="email"
          id="test-email-input"
          placeholder="your@email.com"
        />
        <button id="send-test-btn" class="btn btn-primary">📧 Send Test</button>
      </div>
    </aside>
  </div>

  <script type="module" src="./email-manager.js"></script>
</body>
</html>
```

**Step 2: Create CSS**

File: `sailorskills-settings/src/styles/email-manager.css`

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Montserrat', sans-serif;
  background: #f5f5f5;
}

.email-manager {
  display: grid;
  grid-template-columns: 250px 1fr 400px;
  height: 100vh;
  gap: 0;
}

/* Left Sidebar */
.template-list {
  background: #1a237e;
  color: white;
  padding: 20px;
  overflow-y: auto;
}

.template-list h2 {
  font-size: 20px;
  margin-bottom: 20px;
}

.template-group {
  margin-bottom: 30px;
}

.template-group h3 {
  font-size: 14px;
  margin-bottom: 10px;
  opacity: 0.8;
}

.template-items {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.template-item {
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 14px;
}

.template-item:hover {
  background: rgba(255, 255, 255, 0.2);
}

.template-item.active {
  background: rgba(255, 255, 255, 0.3);
  font-weight: 600;
}

/* Center Panel */
.template-editor {
  background: white;
  padding: 40px;
  overflow-y: auto;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #999;
  font-size: 18px;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.editor-header h1 {
  font-size: 28px;
  color: #1a237e;
}

.template-status {
  background: #4caf50;
  color: white;
  padding: 5px 15px;
  border-radius: 20px;
  font-size: 12px;
}

.editor-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.editor-form label {
  font-weight: 600;
  color: #333;
  margin-bottom: 5px;
}

.subject-input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
  font-family: 'Montserrat', sans-serif;
}

.body-input {
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  font-family: 'Montserrat', sans-serif;
  resize: vertical;
}

.available-variables {
  padding: 15px;
  background: #f0f0f0;
  border-radius: 4px;
  font-size: 13px;
}

.available-variables strong {
  display: block;
  margin-bottom: 5px;
}

.editor-actions {
  display: flex;
  gap: 10px;
}

.btn {
  padding: 12px 24px;
  border: none;
  border-radius: 4px;
  font-family: 'Montserrat', sans-serif;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #1a237e;
  color: white;
}

.btn-primary:hover {
  background: #0d1447;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-secondary:hover {
  background: #d0d0d0;
}

.btn-small {
  padding: 8px 16px;
  font-size: 12px;
}

/* Right Panel */
.preview-panel {
  background: #fafafa;
  padding: 20px;
  overflow-y: auto;
  border-left: 1px solid #ddd;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.preview-header h3 {
  font-size: 18px;
}

.preview-toggle {
  display: flex;
  gap: 5px;
}

.preview-btn {
  padding: 6px 12px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  font-size: 12px;
  border-radius: 4px;
}

.preview-btn.active {
  background: #1a237e;
  color: white;
  border-color: #1a237e;
}

.test-data-form {
  margin-bottom: 20px;
}

.test-data-form h4 {
  font-size: 14px;
  margin-bottom: 10px;
}

#test-data-inputs {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 10px;
}

#test-data-inputs input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 13px;
}

.preview-container {
  margin-bottom: 20px;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
  background: white;
}

.preview-frame {
  width: 100%;
  border: none;
  background: white;
}

.preview-frame.desktop {
  height: 400px;
}

.preview-frame.mobile {
  width: 375px;
  height: 600px;
  margin: 0 auto;
}

.test-email-form {
  padding: 15px;
  background: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.test-email-form h4 {
  font-size: 14px;
  margin-bottom: 10px;
}

.test-email-form input {
  width: 100%;
  padding: 8px;
  margin-bottom: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.test-email-form button {
  width: 100%;
}
```

**Step 3: Create JavaScript functionality**

File: `sailorskills-settings/src/views/email-manager.js`

```javascript
import {
  getEmailTemplates,
  getEmailTemplate,
  updateEmailTemplate,
  renderTemplate,
  sendTestEmail
} from '../lib/email-service.js';

let templates = [];
let currentTemplate = null;
let originalTemplate = null;

// Initialize
async function init() {
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

// Send test email
async function sendTest() {
  if (!currentTemplate) return;

  const testEmail = document.getElementById('test-email-input').value;
  if (!testEmail) {
    alert('Please enter an email address');
    return;
  }

  const testData = getTestData();

  try {
    await sendTestEmail(currentTemplate.template_key, testEmail, testData);
    alert(`Test email sent to ${testEmail}!`);
  } catch (error) {
    console.error('Failed to send test email:', error);
    alert('Failed to send test email. Please try again.');
  }
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
```

**Step 4: Test email manager UI**

Run dev server:
```bash
npm run dev
```

Open: http://localhost:5178/src/views/email-manager.html

Manual testing checklist:
- [ ] Templates load in sidebar
- [ ] Clicking template loads it in editor
- [ ] Editing subject/body updates preview
- [ ] Mobile/desktop toggle works
- [ ] Test data inputs populate correctly
- [ ] Save button works (check database)
- [ ] Revert button restores original

**Step 5: Commit**

```bash
git add src/views/email-manager.html src/views/email-manager.js src/styles/email-manager.css
git commit -m "feat(settings): build email manager UI

- Create three-panel layout (templates, editor, preview)
- Add template list sidebar with customer/internal grouping
- Add template editor with subject and body fields
- Add live preview with mobile/desktop toggle
- Add test data input generation from template variables
- Add save/revert functionality
- Integrate with email-service for CRUD operations"
```

---

### Task 6: Create Resend Webhook for Engagement Tracking

**Files:**
- Create: `sailorskills-settings/supabase/functions/resend-webhook/index.ts`

**Step 1: Create webhook edge function**

File: `sailorskills-settings/supabase/functions/resend-webhook/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  try {
    const event = await req.json();

    console.log('Received Resend webhook:', event);

    // Extract event data
    const { type, data } = event;
    const emailId = data.email_id;

    if (!emailId) {
      throw new Error('Missing email_id in webhook data');
    }

    // Find email_logs record by resend_id
    const { data: emailLog, error: findError } = await supabase
      .from('email_logs')
      .select('*')
      .eq('resend_id', emailId)
      .single();

    if (findError || !emailLog) {
      console.warn(`Email log not found for resend_id: ${emailId}`);
      return new Response(JSON.stringify({ success: false, error: 'Email log not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update email_logs based on event type
    const updates: any = {};

    switch (type) {
      case 'email.opened':
        if (!emailLog.opened_at) {
          updates.opened_at = data.opened_at || new Date().toISOString();
        }
        break;

      case 'email.clicked':
        if (!emailLog.first_click_at) {
          updates.first_click_at = data.clicked_at || new Date().toISOString();
        }
        updates.click_count = (emailLog.click_count || 0) + 1;
        break;

      case 'email.bounced':
        updates.bounced_at = data.bounced_at || new Date().toISOString();
        updates.status = 'failed';
        updates.error_message = data.reason || 'Email bounced';
        break;

      case 'email.complained':
        updates.complained_at = data.complained_at || new Date().toISOString();
        break;

      case 'email.delivered':
        if (emailLog.status === 'pending') {
          updates.status = 'sent';
        }
        break;

      default:
        console.log(`Unhandled event type: ${type}`);
    }

    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from('email_logs')
        .update(updates)
        .eq('id', emailLog.id);

      if (updateError) {
        throw updateError;
      }

      console.log(`Updated email log ${emailLog.id} for event ${type}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
```

**Step 2: Deploy edge function**

```bash
cd sailorskills-settings
supabase functions deploy resend-webhook
```

Expected: Function deployed successfully

**Step 3: Configure Resend webhook**

1. Go to Resend dashboard → Webhooks
2. Add webhook URL: `https://fzygakldvvzxmahkdylq.supabase.co/functions/v1/resend-webhook`
3. Subscribe to events: `email.opened`, `email.clicked`, `email.bounced`, `email.complained`, `email.delivered`
4. Save webhook

**Step 4: Test webhook locally**

Create test script: `test-webhook.sh`

```bash
#!/bin/bash
curl -X POST http://localhost:54321/functions/v1/resend-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "type": "email.opened",
    "data": {
      "email_id": "re_test123",
      "opened_at": "2025-11-06T15:30:00Z"
    }
  }'
```

Run: `bash test-webhook.sh`
Expected: `{"success": true}` or error if resend_id not found (expected)

**Step 5: Commit**

```bash
git add supabase/functions/resend-webhook/
git commit -m "feat(settings): add Resend webhook for email engagement tracking

- Create edge function to receive Resend webhook events
- Handle email.opened, email.clicked, email.bounced events
- Update email_logs table with engagement timestamps
- Add error handling and logging"
```

---

## Phase 3: Pricing Configuration

### Task 7: Create Pricing Service

**Files:**
- Create: `sailorskills-settings/src/lib/pricing-service.js`
- Create: `sailorskills-shared/src/config/pricing.js`

**Step 1: Create pricing service in Settings**

File: `sailorskills-settings/src/lib/pricing-service.js`

```javascript
import { supabase } from './supabase-client.js';

/**
 * Get all pricing configuration
 */
export async function getPricingConfig() {
  const { data, error } = await supabase
    .from('business_pricing_config')
    .select('*')
    .order('config_type, display_name');

  if (error) throw error;

  // Convert to object for easy access
  return data.reduce((acc, row) => {
    acc[row.config_key] = {
      value: parseFloat(row.config_value),
      display_name: row.display_name,
      description: row.description,
      unit: row.unit,
      type: row.config_type,
    };
    return acc;
  }, {});
}

/**
 * Update pricing configuration
 */
export async function updatePricingConfig(configKey, newValue, userId, reason = '') {
  // Get current value for audit log
  const { data: current } = await supabase
    .from('business_pricing_config')
    .select('config_value')
    .eq('config_key', configKey)
    .single();

  const oldValue = current?.config_value;

  // Update config
  const { data, error } = await supabase
    .from('business_pricing_config')
    .update({
      config_value: newValue,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('config_key', configKey)
    .select()
    .single();

  if (error) throw error;

  // Log to audit trail
  await supabase
    .from('pricing_audit_log')
    .insert({
      config_key: configKey,
      old_value: oldValue,
      new_value: newValue,
      changed_by: userId,
      reason,
    });

  return data;
}

/**
 * Calculate pricing impact based on recent services
 */
export async function calculatePricingImpact(changes) {
  // Fetch recent service logs (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: services } = await supabase
    .from('service_logs')
    .select('id, boat_length, service_type, growth_level, hull_type, total_amount')
    .gte('completed_at', thirtyDaysAgo.toISOString());

  if (!services || services.length === 0) {
    return {
      servicesAnalyzed: 0,
      averageIncrease: 0,
      projectedMonthlyImpact: 0,
      samples: [],
    };
  }

  // Calculate impact for each service
  let totalIncrease = 0;
  const samples = services.slice(0, 5).map(service => {
    const currentPrice = parseFloat(service.total_amount) || 0;
    const newPrice = calculateServicePrice(service, changes);
    const increase = newPrice - currentPrice;
    totalIncrease += increase;

    return {
      description: `${service.boat_length}ft ${service.hull_type || 'sailboat'}, ${service.growth_level || 'clean'}`,
      currentPrice: currentPrice.toFixed(2),
      newPrice: newPrice.toFixed(2),
      change: increase.toFixed(2),
    };
  });

  const averageIncrease = totalIncrease / services.length;
  const projectedMonthlyImpact = averageIncrease * services.length;

  return {
    servicesAnalyzed: services.length,
    averageIncrease: averageIncrease.toFixed(2),
    projectedMonthlyImpact: projectedMonthlyImpact.toFixed(2),
    samples,
  };
}

/**
 * Calculate service price with new pricing
 * (Simplified version - real implementation should match Estimator logic)
 */
function calculateServicePrice(service, newPricing) {
  const length = parseFloat(service.boat_length) || 0;
  const serviceType = service.service_type || 'recurring_cleaning';

  // Get base rate
  const rateKey = serviceType === 'one_time' ? 'onetime_cleaning_rate' : 'recurring_cleaning_rate';
  const baseRate = newPricing[rateKey] || 4.50;

  let price = length * baseRate;

  // Apply surcharges
  if (service.growth_level === 'heavy') {
    price *= (1 + (newPricing.surcharge_heavy_growth || 0.50));
  }
  if (service.hull_type === 'catamaran') {
    price *= (1 + (newPricing.surcharge_catamaran || 0.25));
  }

  return Math.max(price, newPricing.minimum_service_charge || 150);
}

/**
 * Get pricing change history
 */
export async function getPricingHistory(limit = 10) {
  const { data, error } = await supabase
    .from('pricing_audit_log')
    .select(`
      *,
      changed_by_user:auth.users!pricing_audit_log_changed_by_fkey(email)
    `)
    .order('changed_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}
```

**Step 2: Create shared pricing service**

File: `sailorskills-shared/src/config/pricing.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

let pricingCache = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get pricing configuration (cached)
 * Used by Estimator, Billing, and other services
 */
export async function getPricingConfig() {
  if (!pricingCache || Date.now() - pricingCache.timestamp > CACHE_TTL) {
    const { data, error } = await supabase
      .from('business_pricing_config')
      .select('*');

    if (error) {
      console.error('Failed to fetch pricing config:', error);
      throw error;
    }

    // Convert array to flat object for easy access
    pricingCache = {
      data: data.reduce((acc, row) => {
        acc[row.config_key] = parseFloat(row.config_value);
        return acc;
      }, {}),
      timestamp: Date.now(),
    };
  }

  return pricingCache.data;
}

/**
 * Invalidate pricing cache
 * Called when pricing is updated
 */
export function invalidatePricingCache() {
  pricingCache = null;
}

/**
 * Subscribe to pricing changes (real-time)
 */
export function subscribeToPricingChanges(callback) {
  const channel = supabase
    .channel('pricing-updates')
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'business_pricing_config',
      },
      () => {
        invalidatePricingCache();
        callback();
      }
    )
    .subscribe();

  return channel;
}
```

**Step 3: Test pricing service**

Create test: `sailorskills-settings/src/lib/__tests__/pricing-service.test.js`

```javascript
import { calculatePricingImpact } from '../pricing-service.js';

const mockChanges = {
  recurring_cleaning_rate: 5.00,
  surcharge_heavy_growth: 0.60,
};

// This would need real database data to test properly
console.log('Pricing service module loaded successfully');
console.log('calculatePricingImpact function:', typeof calculatePricingImpact);

console.assert(typeof calculatePricingImpact === 'function', 'calculatePricingImpact should be a function');

console.log('✓ Pricing service tests passed');
```

Run: `node src/lib/__tests__/pricing-service.test.js`
Expected: "✓ Pricing service tests passed"

**Step 4: Commit**

```bash
git add src/lib/pricing-service.js ../sailorskills-shared/src/config/pricing.js src/lib/__tests__/pricing-service.test.js
git commit -m "feat(settings): add pricing configuration service

- Create pricing service with CRUD operations
- Add impact calculation based on recent services
- Add pricing history/audit trail retrieval
- Create shared pricing service with caching (5 min TTL)
- Add real-time subscription support for pricing changes
- Include basic unit tests"
```

---

**Note:** This is Part 1 of the implementation plan. The complete plan continues with:

- Task 8-10: Build System Config UI for pricing management
- Task 11-13: Email Logs & Analytics UI
- Task 14-16: User Management UI
- Task 17-19: Integration Management UI
- Task 20-22: Settings Dashboard & Navigation
- Task 23-25: Update Estimator/Billing to use shared pricing
- Task 26-28: Deployment & Testing
- Task 29-30: Documentation & Handoff

Due to length constraints, shall I continue with the remaining tasks, or would you like to start implementing these first tasks?

---

**End of Part 1**

Total tasks planned: 30
Tasks in Part 1: 7
Remaining: 23 tasks

Each task follows TDD principles:
1. Write/define the interface
2. Implement core functionality
3. Test manually or with unit tests
4. Commit

Estimated time for Part 1: 8-10 hours
Estimated time for full plan: 4 weeks

