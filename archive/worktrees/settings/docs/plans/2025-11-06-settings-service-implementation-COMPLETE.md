# Settings Service Implementation Plan (COMPLETE)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a centralized Settings service for email management, pricing configuration, user administration, and integration management.

**Architecture:** New Vite + Supabase service following existing Sailorskills patterns. Database-driven content (templates/pricing in DB), HTML structure in files. Real-time engagement tracking via Resend webhooks. Shared pricing service in sailorskills-shared for cross-service access.

**Tech Stack:** Vite, Supabase (PostgreSQL + Edge Functions), Resend (email), vanilla JavaScript, CSS Grid/Flexbox

**Working Directory:** This plan executes in the git worktree at `.worktrees/settings`. All paths are relative to the worktree root.

---

## Phase 1: Foundation & Service Structure

### Task 1: Create Settings Service Package Structure

**Context:** We're working in a git worktree. The worktree root IS the settings service directory.

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `index.html`
- Create: `.gitignore`
- Create: `README.md`

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
    "preview": "vite preview"
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

\`\`\`bash
npm install
npm run dev
\`\`\`

Access at: http://localhost:5178

## Deployment

To be deployed to Vercel

## Documentation

See `/docs/plans/2025-11-06-settings-service-design.md` for complete design.
```

**Step 6: Install dependencies**

Run: `npm install`
Expected: Dependencies installed successfully

**Step 7: Commit**

```bash
git add package.json vite.config.js index.html .gitignore README.md
git commit -m "feat(settings): initialize Settings service structure

- Add package.json with Vite and Supabase dependencies
- Configure Vite with multi-page setup for all views
- Add README with development instructions
- Set up .gitignore for node_modules and env files"
```

---

### Task 2: Create Shared Package Link

**Context:** Link to sailorskills-shared from the worktree. From `.worktrees/settings`, the shared package is at `../../sailorskills-shared`.

**Files:**
- Create symlink: `shared -> ../../sailorskills-shared`

**Step 1: Create shared symlink**

Run:
```bash
ln -s ../../sailorskills-shared shared
ls -la shared
```

Expected: Symlink created, pointing to `../../sailorskills-shared`

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
- Create: `supabase/migrations/001_create_settings_tables.sql`
- Create: `supabase/migrations/002_populate_initial_data.sql`

**Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

**Step 2: Create migration for settings tables**

File: `supabase/migrations/001_create_settings_tables.sql`

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

**Step 3: Create data population migration**

File: `supabase/migrations/002_populate_initial_data.sql`

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
    'Hi {{CUSTOMER_NAME}},

Thanks for choosing Sailor Skills! Your order has been confirmed.

Order Details:
- Boat: {{BOAT_NAME}}
- Service: {{SERVICE_TYPE}}
- Scheduled: {{SERVICE_DATE}}
- Total: ${{TOTAL_AMOUNT}}

We''ll send you a reminder 24 hours before your service.

Thank you,
The Sailor Skills Team',
    'shared/src/email/templates/order-confirmation.html',
    '["ORDER_NUMBER", "CUSTOMER_NAME", "BOAT_NAME", "SERVICE_TYPE", "SERVICE_DATE", "TOTAL_AMOUNT"]'::jsonb,
    'shared'
  ),
  (
    'service_completion',
    'Service Completion',
    'Your {{SERVICE_TYPE}} on {{BOAT_NAME}} is complete',
    'Hi {{CUSTOMER_NAME}},

Great news! We''ve completed the {{SERVICE_TYPE}} service on {{BOAT_NAME}}.

Service Summary:
{{SERVICE_NOTES}}

Your invoice is ready to view in your customer portal.

Thank you for choosing Sailor Skills!

The Sailor Skills Team',
    'operations/src/email/templates/service-completion.html',
    '["CUSTOMER_NAME", "BOAT_NAME", "SERVICE_TYPE", "SERVICE_NOTES", "COMPLETION_DATE"]'::jsonb,
    'operations'
  )
ON CONFLICT (template_key) DO NOTHING;
```

**Step 4: Test migrations locally**

Load database connection:
```bash
source ../../db-env.sh
```

Run migrations:
```bash
psql "$DATABASE_URL" -f supabase/migrations/001_create_settings_tables.sql
psql "$DATABASE_URL" -f supabase/migrations/002_populate_initial_data.sql
```

Expected: Tables created and data inserted

**Step 5: Verify migrations**

```bash
psql "$DATABASE_URL" -c "SELECT config_key, config_value FROM business_pricing_config LIMIT 5"
```

Expected: Shows pricing data

**Step 6: Commit**

```bash
git add supabase/migrations/
git commit -m "feat(settings): add database migrations for Settings tables

- Create business_pricing_config with 21 pricing variables
- Create email_templates table
- Create integration_credentials table
- Create pricing_audit_log table
- Extend email_logs for engagement tracking
- Add RLS policies for admin-only access
- Populate initial data from Estimator/Billing"
```

---

## Phase 2: Email Management

### Task 4: Create Email Service Library

**Files:**
- Create: `src/lib/supabase-client.js`
- Create: `src/lib/email-service.js`

**Step 1: Create src/lib directory**

```bash
mkdir -p src/lib
```

**Step 2: Create Supabase client**

File: `src/lib/supabase-client.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

**Step 3: Create email service**

File: `src/lib/email-service.js`

```javascript
import { supabase } from './supabase-client.js';

export async function getEmailTemplates() {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('template_name');

  if (error) throw error;
  return data;
}

export async function getEmailTemplate(templateKey) {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_key', templateKey)
    .single();

  if (error) throw error;
  return data;
}

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

export function renderTemplate(template, data) {
  let subject = template.subject_line;
  let body = template.email_body;

  Object.keys(data).forEach(key => {
    const regex = new RegExp(`{{${key}}}`, 'g');
    subject = subject.replace(regex, data[key] || '');
    body = body.replace(regex, data[key] || '');
  });

  return { subject, body };
}
```

**Step 4: Commit**

```bash
git add src/lib/
git commit -m "feat(settings): add email service library

- Create Supabase client
- Add CRUD operations for email templates
- Add template rendering with variable substitution"
```

---

**(Continuing with Tasks 5-30...)**

**Due to message length limits, I'll provide the critical remaining tasks. Would you like me to:**

1. **Save this corrected foundation (Tasks 1-4) and continue writing Tasks 5-30 in a follow-up message**
2. **Create a much more concise version of all 30 tasks with less code detail**
3. **Focus on the most critical MVP tasks only (reduce scope to ~15 essential tasks)**

**For the agent waiting: Tell them option 1 - "Execute corrected tasks 1-4 now, complete plan coming in next message"**

What would you prefer?
## Phase 2 (Continued): Email Management UI

### Task 5: Build Email Manager Interface

**Files:**
- Create: `src/views/email-manager.html`
- Create: `src/views/email-manager.js`
- Create: `src/styles/email-manager.css`

**Steps:**
1. Create `src/views/` and `src/styles/` directories
2. Build three-panel HTML layout (template list, editor, preview)
3. Add CSS with navy blue theme matching other services
4. Implement JavaScript for template loading, editing, and preview
5. Test by running `npm run dev` and visiting http://localhost:5178
6. Commit

**Key Features:**
- Left sidebar with template list grouped by type
- Center editor with subject/body inputs
- Right preview panel with mobile/desktop toggle
- Live preview updates as you type
- Test data generation from template variables

---

### Task 6: Add Pricing Configuration Service

**Files:**
- Create: `src/lib/pricing-service.js`
- Create: `../../sailorskills-shared/src/config/pricing.js` (relative to worktree)

**Steps:**
1. Create `src/lib/pricing-service.js` with CRUD operations for pricing config
2. Add `calculatePricingImpact()` function for revenue analysis
3. Add `getPricingHistory()` for audit trail
4. Create shared pricing service at `../../sailorskills-shared/src/config/pricing.js`
5. Add caching (5 min TTL) and real-time subscriptions
6. Test with sample pricing changes
7. Commit both files

**Shared Service Features:**
- Cached pricing lookups (5 minute TTL)
- Real-time cache invalidation on updates
- Used by Estimator/Billing for dynamic pricing

---

### Task 7: Build System Configuration UI

**Files:**
- Create: `src/views/system-config.html`
- Create: `src/views/system-config.js`
- Create: `src/styles/system-config.css`

**Steps:**
1. Create HTML form with all 21 pricing variables grouped by type
2. Add "Preview Impact" modal that shows revenue analysis
3. Add change history section at bottom
4. Implement save/revert functionality
5. Add validation for minimum values
6. Test by changing pricing and viewing impact
7. Commit

**UI Sections:**
- Service Base Rates (7 fields)
- Anode Pricing (3 fields)
- Hull Type Surcharges (4 fields)
- Paint Surcharges (2 fields)
- Growth Surcharges (5 fields)
- Preview Impact button
- Change history log

---

## Phase 3: Email Logs & Analytics

### Task 8: Build Email Logs Viewer

**Files:**
- Create: `src/views/email-logs.html`
- Create: `src/views/email-logs.js`
- Create: `src/styles/email-logs.css`
- Create: `src/lib/email-logs-service.js`

**Steps:**
1. Create service for querying `email_logs` table with filters
2. Build HTML with filters (status, type, date range)
3. Add email logs table with pagination
4. Add email detail modal
5. Implement search functionality
6. Add export to CSV feature
7. Test with existing email logs
8. Commit

**Key Features:**
- Filter by status (sent/failed/pending)
- Filter by type (order confirmation, etc.)
- Date range picker
- Pagination (50 per page)
- Click row for details modal
- Export logs to CSV

---

### Task 9: Add Email Analytics Dashboard

**Files:**
- Modify: `src/views/email-logs.html`
- Modify: `src/views/email-logs.js`
- Create: `src/lib/email-analytics.js`

**Steps:**
1. Create analytics service with aggregation queries
2. Add summary cards (sent count, open rate, click rate, etc.)
3. Add engagement funnel visualization (sent → opened → clicked)
4. Add email type performance comparison table
5. Add time-series chart for trends
6. Add insights section with recommendations
7. Commit

**Analytics Features:**
- Summary stats cards
- Engagement funnel (Sent → Delivered → Opened → Clicked → Replied)
- Performance by email type
- 7-day trends chart
- Best/worst performing emails
- Automated insights

---

### Task 10: Deploy Resend Webhook

**Files:**
- Create: `supabase/functions/resend-webhook/index.ts`

**Steps:**
1. Create Deno edge function for webhook
2. Handle events: `email.opened`, `email.clicked`, `email.bounced`, `email.complained`
3. Update `email_logs` table with engagement data
4. Add error handling and logging
5. Deploy: `supabase functions deploy resend-webhook`
6. Configure webhook in Resend dashboard
7. Test with curl or Resend test webhook
8. Commit

---

## Phase 4: User & Integration Management

### Task 11: Build Users Management UI

**Files:**
- Create: `src/views/users.html`
- Create: `src/views/users.js`
- Create: `src/lib/user-service.js`

**Steps:**
1. Create user service for CRUD on `auth.users`
2. Build user list table
3. Add role permissions matrix display
4. Create add/edit user modal
5. Implement role assignment (admin, technician, viewer)
6. Add service access checkboxes
7. Commit

**Roles:**
- Admin: Full access to everything
- Technician: Service completion, inventory, view-only billing
- Viewer: Read-only access

---

### Task 12: Build Integrations Management UI

**Files:**
- Create: `src/views/integrations.html`
- Create: `src/views/integrations.js`
- Create: `src/lib/integration-service.js`

**Steps:**
1. Create integration service for managing credentials
2. Build integration cards for each service (Resend, Stripe, YouTube, etc.)
3. Add masked API key display with show/hide
4. Add connection testing buttons
5. Add status indicators
6. Encrypt credentials before saving (use Supabase vault if available)
7. Commit

**Integrations to Support:**
- Resend (email)
- Stripe (payments)
- YouTube (video management)
- Google Calendar (booking)
- Notion (roadmap - future)

---

### Task 13: Create Settings Dashboard

**Files:**
- Create: `src/views/dashboard.html`
- Create: `src/views/dashboard.js`
- Create: `src/styles/dashboard.css`
- Create: `src/components/nav.js`

**Steps:**
1. Create navigation component with links to all views
2. Build dashboard with cards for each section
3. Add quick stats (recent pricing changes, email stats, user count)
4. Add recent activity feed
5. Style with navy blue theme
6. Commit

**Dashboard Sections:**
- Email Management card → email-manager.html
- Email Logs card → email-logs.html
- Pricing Config card → system-config.html
- Users card → users.html
- Integrations card → integrations.html

---

## Phase 5: Integration with Existing Services

### Task 14: Update Estimator to Use Dynamic Pricing

**Context:** Work in main repo, not worktree. Edit Estimator service files.

**Files:**
- Modify: `../../sailorskills-estimator/calculator.js`
- Modify: `../../sailorskills-estimator/configuration.js`

**Steps:**
1. Switch to main repo: `cd ../../`
2. Add import: `import { getPricingConfig } from './shared/src/config/pricing.js'`
3. Comment out hardcoded pricing values (keep for rollback)
4. Replace with: `const pricing = await getPricingConfig()`
5. Update all rate references to use `pricing.config_key` format
6. Test quote generation with Settings pricing
7. Commit to main branch
8. Return to worktree: `cd .worktrees/settings`

**Pricing Variables to Replace:**
- `recurringCleaningRate` → `pricing.recurring_cleaning_rate`
- `onetimeCleaningRate` → `pricing.onetime_cleaning_rate`
- All surcharges (20+ variables)

---

### Task 15: Update Billing to Use Dynamic Pricing

**Files:**
- Modify: `../../sailorskills-billing/src/admin/wizard-pricing.js`

**Steps:**
1. Switch to main repo: `cd ../../`
2. Import shared pricing service
3. Replace hardcoded RATES and SURCHARGES objects
4. Use `getPricingConfig()` instead
5. Update invoice calculations
6. Test invoice generation
7. Commit to main branch
8. Return to worktree

---

### Task 16: Add Settings Link to Operations Nav

**Files:**
- Modify: `../../sailorskills-operations/src/components/nav.html`

**Steps:**
1. Add "Settings" link to operations navigation
2. Link to: `https://sailorskills-settings.vercel.app` (or localhost:5178 in dev)
3. Add admin-only visibility check
4. Style consistently with other nav items
5. Commit

---

## Phase 6: Deployment & Testing

### Task 17: Configure Vercel Deployment

**Files:**
- Create: `vercel.json`
- Create: `.env.example`

**Steps:**
1. Create `vercel.json` with build settings
2. Create `.env.example` with all required variables
3. Push to GitHub (from worktree)
4. Connect repo to Vercel
5. Set environment variables in Vercel dashboard
6. Deploy and verify

**Vercel Config:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

---

### Task 18: Test Email Management End-to-End

**Steps:**
1. Load email-manager.html
2. Select a template
3. Edit subject and body
4. Preview on mobile and desktop
5. Send test email to yourself
6. Save changes
7. Verify database updated
8. Check test email received
9. Verify engagement tracking (open email, click links)
10. Check email_logs updated with opened_at, clicked_at

---

### Task 19: Test Pricing Configuration End-to-End

**Steps:**
1. Open system-config.html
2. Change recurring_cleaning_rate from $4.50 to $5.00
3. Click "Preview Impact"
4. Verify impact calculation shows revenue increase
5. Confirm changes
6. Verify database updated
7. Open Estimator
8. Generate new quote
9. Verify quote uses new $5.00 rate
10. Check pricing_audit_log has change record

---

### Task 20: Test Email Analytics & Engagement

**Steps:**
1. Send multiple test emails
2. Open some emails (track opens)
3. Click links in emails (track clicks)
4. Wait for webhook events (check edge function logs)
5. Open email-logs.html
6. Verify engagement indicators show (👁️ 🖱️)
7. Check analytics dashboard shows correct stats
8. Verify engagement funnel displays properly

---

### Task 21: Cross-Service Integration Test

**Steps:**
1. Update pricing in Settings
2. Generate quote in Estimator → verify new pricing
3. Complete service in Operations
4. Check email sent with engagement tracking
5. View email logs in Settings
6. Verify audit trail recorded pricing change
7. Test across all three services (Estimator, Operations, Billing)

---

## Phase 7: Documentation & Polish

### Task 22: Update Settings README

**Files:**
- Modify: `README.md`

**Steps:**
1. Add deployment URL
2. Add feature list with descriptions
3. Add development setup instructions
4. Add testing instructions
5. Add troubleshooting section
6. Add links to design doc
7. Commit

---

### Task 23: Create Migration Guide

**Files:**
- Create: `docs/MIGRATION_GUIDE.md`

**Steps:**
1. Document how pricing moved from hardcoded to database
2. List all changed files in Estimator and Billing
3. Add rollback instructions
4. Document testing checklist
5. Add FAQ section
6. Commit

---

### Task 24: Add Error Handling & Validation

**Files:**
- Modify all service files in `src/lib/`

**Steps:**
1. Add try/catch to all async functions
2. Add user-friendly error messages
3. Add form validation for pricing inputs (min/max values)
4. Add loading states to all buttons
5. Add success notifications
6. Test error scenarios
7. Commit

---

### Task 25: Performance Optimization

**Steps:**
1. Add loading skeletons to all data tables
2. Implement debouncing for live preview
3. Add pagination to email logs (already planned)
4. Optimize Supabase queries with proper indexes (already done in migrations)
5. Add service worker for offline capability (optional)
6. Test performance with large datasets
7. Commit

---

### Task 26: Accessibility Improvements

**Steps:**
1. Add ARIA labels to all form inputs
2. Ensure keyboard navigation works
3. Add focus states to all interactive elements
4. Test with screen reader
5. Ensure color contrast meets WCAG AA
6. Add skip navigation links
7. Commit

---

### Task 27: Create Settings User Guide

**Files:**
- Create: `docs/USER_GUIDE.md`

**Steps:**
1. Add screenshots of each view
2. Write step-by-step guides for common tasks
3. Document all email variables
4. Explain pricing configuration workflow
5. Add tips and best practices
6. Commit

---

### Task 28: Final Testing Checklist

**Manual Testing:**
- [ ] Email template editing works
- [ ] Email preview accurate (mobile + desktop)
- [ ] Test email sending works
- [ ] Email engagement tracking works (opens, clicks)
- [ ] Pricing changes apply to Estimator quotes
- [ ] Pricing changes apply to Billing invoices
- [ ] Impact calculator shows accurate projections
- [ ] Pricing audit log records all changes
- [ ] User management works (add/edit/roles)
- [ ] Integration credentials save/display correctly
- [ ] All navigation links work
- [ ] Authentication required for all pages
- [ ] Admin-only access enforced

**Browser Testing:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari
- [ ] Mobile Chrome

---

### Task 29: Merge to Main Branch

**Steps:**
1. Ensure all tests pass
2. Ensure all commits follow conventional commits format
3. Push worktree branch: `git push -u origin feature/settings-service`
4. Create pull request on GitHub
5. Review changes
6. Merge to main
7. Delete worktree: `git worktree remove .worktrees/settings`
8. Verify deployed to production

---

### Task 30: Post-Launch Monitoring

**Steps:**
1. Monitor Resend webhook for errors
2. Check email engagement rates after 7 days
3. Monitor pricing changes audit log
4. Gather user feedback from admin
5. Create issues for any bugs found
6. Plan Phase 2 features (A/B testing, bulk emails, etc.)

---

## Completion Checklist

**Foundation:**
- [x] Task 1: Service structure created
- [x] Task 2: Shared package linked
- [x] Task 3: Database migrations run
- [x] Task 4: Email service library created

**Email Management:**
- [ ] Task 5: Email manager UI built
- [ ] Task 6: Pricing service created
- [ ] Task 7: System config UI built

**Analytics:**
- [ ] Task 8: Email logs viewer built
- [ ] Task 9: Analytics dashboard built
- [ ] Task 10: Resend webhook deployed

**User/Integration Management:**
- [ ] Task 11: Users UI built
- [ ] Task 12: Integrations UI built
- [ ] Task 13: Settings dashboard created

**Integration:**
- [ ] Task 14: Estimator updated
- [ ] Task 15: Billing updated
- [ ] Task 16: Nav links added

**Deployment:**
- [ ] Task 17: Vercel configured
- [ ] Task 18: Email management tested
- [ ] Task 19: Pricing config tested
- [ ] Task 20: Analytics tested
- [ ] Task 21: Cross-service tested

**Polish:**
- [ ] Task 22: README updated
- [ ] Task 23: Migration guide created
- [ ] Task 24: Error handling added
- [ ] Task 25: Performance optimized
- [ ] Task 26: Accessibility improved
- [ ] Task 27: User guide created
- [ ] Task 28: Final testing complete
- [ ] Task 29: Merged to main
- [ ] Task 30: Monitoring in place

---

## Summary

**Total Tasks:** 30
**Estimated Time:** 4 weeks
**Priority Order:**
1. Foundation (Tasks 1-4) - CRITICAL
2. Email Management (Tasks 5-7) - HIGH
3. Analytics (Tasks 8-10) - HIGH
4. Integration (Tasks 14-16) - HIGH
5. User/Integration UI (Tasks 11-13) - MEDIUM
6. Deployment (Tasks 17-21) - MEDIUM
7. Polish (Tasks 22-28) - LOW
8. Launch (Tasks 29-30) - FINAL

**Key Milestones:**
- After Task 7: Email and pricing management functional
- After Task 10: Full email analytics with engagement tracking
- After Task 16: Integrated with Estimator and Billing
- After Task 21: Ready for production deployment
- After Task 30: Launched and monitored

**Success Criteria:**
- ✅ All 21 pricing variables centralized in database
- ✅ Estimator and Billing use dynamic pricing
- ✅ Email engagement tracking fully operational
- ✅ Admin can edit email templates without code deployment
- ✅ Impact calculator accurately projects revenue changes
- ✅ Zero pricing duplications remain in codebase

---

**End of Complete Implementation Plan**

