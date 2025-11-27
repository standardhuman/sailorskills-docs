# Sailorskills Settings Service - Design Document

**Date**: November 6, 2025
**Author**: Brian (with Claude)
**Status**: Approved for Implementation

## Executive Summary

The Settings service centralizes system-wide configuration for the Sailorskills suite, addressing critical pain points:
- **Pricing variables duplicated** across Estimator and Billing (20+ hardcoded values)
- **No visibility** into email delivery and customer engagement
- **Code deployments required** to update email content
- **Scattered API credentials** across services

This service provides a unified admin interface for email management, pricing configuration, user administration, and integration settings.

---

## 1. Service Architecture

### 1.1 Service Structure

```
sailorskills-settings/
├── src/
│   ├── views/
│   │   ├── dashboard.html          # Settings home/navigation
│   │   ├── email-manager.html      # Email template management
│   │   ├── email-logs.html         # Email history & analytics
│   │   ├── users.html              # Team/user management
│   │   ├── integrations.html       # API key configuration
│   │   └── system-config.html      # Business settings
│   ├── components/
│   │   ├── email-preview.js        # Live preview (mobile + desktop)
│   │   ├── pricing-calculator.js   # Impact analysis calculator
│   │   ├── analytics-charts.js     # Engagement visualizations
│   │   └── template-editor.js      # Rich text editor
│   ├── lib/
│   │   ├── email-service.js        # Email template CRUD
│   │   ├── pricing-service.js      # Pricing config CRUD
│   │   ├── user-service.js         # User/role management
│   │   └── integration-service.js  # API key management
│   └── styles/
│       └── settings.css
├── supabase/
│   └── functions/
│       ├── resend-webhook/         # Email engagement tracking
│       └── update-pricing-config/  # Pricing validation & updates
├── shared/ -> ../sailorskills-shared
└── package.json
```

### 1.2 Authentication & Access Control

- **Admin-only access** for Settings service
- **Role-based permissions** (Admin, Technician, Viewer)
- **Supabase RLS policies** enforce access control
- **Accessible from Operations** via new "Settings" nav link

---

## 2. Database Schema

### 2.1 New Tables

#### `business_pricing_config`
Centralized pricing variables (eliminates Estimator/Billing duplicates).

```sql
CREATE TABLE business_pricing_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT UNIQUE NOT NULL,        -- 'recurring_cleaning_rate'
  config_value DECIMAL(10,2) NOT NULL,    -- 4.50
  config_type TEXT NOT NULL,              -- 'service_rate', 'surcharge', 'minimum'
  display_name TEXT NOT NULL,             -- 'Recurring Cleaning Rate'
  description TEXT,                       -- Help text for admin UI
  unit TEXT,                              -- 'dollars_per_foot', 'percentage', 'flat_rate'
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);
```

**Initial Data** (20+ variables from Estimator):
- Service base rates (6): Recurring cleaning $4.50/ft, one-time $6/ft, inspection $4/ft, item recovery $199, propeller $349, anodes only $150
- Growth surcharges (5): Moderate-heavy 10%, heavy 50%, heavy-severe 100%, severe 200%, extreme 250%
- Hull type surcharges (4): Powerboat 25%, catamaran 25%, trimaran 50%, additional propeller 10%
- Paint surcharges (2): Poor paint 10%, missing paint 15%
- Anode pricing (3): Installation $15/anode, markup 50%, minimum $2
- Minimums (1): Service minimum $150

#### `email_templates`
Database-driven email content (HTML structure stays in files).

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_key TEXT UNIQUE NOT NULL,      -- 'order_confirmation'
  template_name TEXT NOT NULL,            -- 'Order Confirmation'
  subject_line TEXT NOT NULL,             -- 'Your order #{{ORDER_NUMBER}}'
  email_body TEXT NOT NULL,               -- Editable content blocks
  html_template_file TEXT NOT NULL,       -- 'shared/src/email/templates/...'
  available_variables JSONB,              -- ['ORDER_NUMBER', 'CUSTOMER_NAME', ...]
  service TEXT,                           -- 'shared', 'operations', 'billing'
  is_active BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);
```

**Initial Templates** (9 total):
- **Customer emails**: Order confirmation, order declined, service completion, new invoice, upcoming service, new message
- **Internal emails**: New order alert
- **Auth emails** (future): Password reset, magic link

#### `integration_credentials`
Secure API key storage (encrypted with Supabase vault).

```sql
CREATE TABLE integration_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  integration_name TEXT UNIQUE NOT NULL,  -- 'resend', 'stripe', 'youtube'
  api_key_encrypted TEXT,                 -- Encrypted via vault
  config_json JSONB,                      -- Additional settings
  is_active BOOLEAN DEFAULT TRUE,
  last_verified TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);
```

#### `pricing_audit_log`
Track all pricing changes for compliance/analysis.

```sql
CREATE TABLE pricing_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT NOT NULL,
  old_value DECIMAL(10,2),
  new_value DECIMAL(10,2),
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT
);
```

### 2.2 Enhanced Existing Tables

#### `email_logs` (extend for engagement tracking)

```sql
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS
  opened_at TIMESTAMP,           -- When recipient opened
  first_click_at TIMESTAMP,      -- First link click
  click_count INTEGER DEFAULT 0, -- Total clicks
  replied_at TIMESTAMP,          -- Reply timestamp
  bounced_at TIMESTAMP,          -- Bounce timestamp
  complained_at TIMESTAMP;       -- Spam complaint
```

#### `auth.users` (extend for role management)

```sql
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS
  role TEXT DEFAULT 'viewer',          -- 'admin', 'technician', 'viewer'
  service_access JSONB DEFAULT '[]',   -- ['estimator', 'operations', ...]
  is_active BOOLEAN DEFAULT TRUE;
```

---

## 3. Email Management Interface

### 3.1 Template Editor (`email-manager.html`)

**Layout**: Three-panel interface

**Left Panel - Template List**
- Customer Emails (6 templates)
- Internal Emails (1 template)
- Auth Emails (2 future templates)

**Center Panel - Editor**
- Subject line input (with {{VARIABLE}} support)
- Email body editor (rich text with variable insertion)
- Available variables reference
- Save/Revert buttons

**Right Panel - Preview & Testing**
- Mobile/desktop preview toggle
- Test data scenarios dropdown
  - Real customer data (from database)
  - Predefined test scenarios: "New customer", "Long boat name", "Missing data", "Edge cases"
- Live preview (updates as you type)
- Send test email form

**Key Features**:
- **Database-driven content**: Subject + body stored in database
- **HTML structure in files**: Layout/styling stays in version control
- **Variable substitution**: {{CUSTOMER_NAME}}, {{BOAT_NAME}}, etc.
- **Real-time preview**: See changes immediately
- **Test sending**: Send to real email addresses for client testing

### 3.2 Email Logs & Analytics (`email-logs.html`)

**Top Bar - Filters**
- Search by recipient email/name
- Filter by status (Sent, Failed, Pending)
- Filter by type (Order Confirmation, Service Complete, etc.)
- Date range selector
- Export to CSV

**Summary Cards**
- Total sent (last 30 days)
- Open rate percentage
- Click rate percentage
- Reply rate percentage
- Failure rate percentage

**Email Log Table**
- Columns: Date/Time, Type, Recipient, Status, Engagement indicators
- Engagement icons: 👁️ (opened), 🖱️ (clicked), 💬 (replied)
- Click row for detailed modal
- Pagination (50 per page)

**Email Detail Modal**
- Full email metadata (to, subject, status, timestamps)
- Engagement timeline (delivered → opened → clicked → replied)
- Link click breakdown (which links, how many times)
- Linked records (service log, invoice, order)
- Actions: View content, Resend, Retry (if failed)

**Analytics Dashboard** (Bottom tabs)

**Overview Tab**:
- Emails by type (bar chart, last 30 days)
- Delivery trends (line chart, 7 days)
- Common failure reasons

**Engagement Tab**:
- Engagement funnel (Sent → Delivered → Opened → Clicked → Replied)
- Engagement by email type (table with percentages)
- Engagement over time (line chart)
- Best performing emails (ranked by open rate)
- Time to first open (average by email type)

**Insights Tab**:
- Automated recommendations based on data
- Best/worst send times
- Subject line performance patterns
- A/B testing suggestions

**Integration**: Resend webhook at `/functions/v1/resend-webhook` receives events:
- `email.opened` - Updates `opened_at`
- `email.clicked` - Updates `first_click_at`, increments `click_count`
- `email.bounced` - Updates `bounced_at`, marks failed
- `email.complained` - Updates `complained_at`, flags for review
- `email.delivered` - Confirms successful delivery

---

## 4. Pricing Configuration Interface

### 4.1 System Config (`system-config.html`)

**Tab Navigation**
- 💰 Pricing (primary)
- 🏢 Business Info
- 🎨 Branding
- ⚙️ Features

**Pricing Tab - Sections**

**Service Base Rates**
- Recurring Cleaning: $[4.50] per foot
- One-Time Cleaning: $[6.00] per foot
- Underwater Inspection: $[4.00] per foot
- Item Recovery: $[199] flat rate
- Propeller Service: $[349] flat rate
- Anodes Only: $[150] minimum
- Minimum Service Charge: $[150]

**Anode Pricing**
- Installation Labor: $[15.00] per anode
- Markup Strategy: [Percentage ▼]
- Markup Percentage: [50]%
- Minimum Markup: $[2.00] per anode

**Hull Type Surcharges**
- Powerboat: [25]%
- Catamaran: [25]%
- Trimaran: [50]%
- Additional Propeller: [10]% per propeller

**Paint Condition Surcharges**
- Poor Paint: [10]%
- Missing Paint: [15]%

**Growth/Fouling Surcharges**
- Moderate-Heavy: [10]%
- Heavy: [50]%
- Heavy-Severe: [100]%
- Severe: [200]%
- Extreme: [250]%

**Actions**
- Save All Changes (validates + confirms)
- Revert to Defaults (restore original values)
- Preview Impact (shows revenue analysis)

### 4.2 Impact Preview Feature

**Triggered by**: Clicking "Preview Impact" before saving

**Modal displays**:
1. **Changes summary**: Old value → New value (% change)
2. **Sample service impacts**: Table showing how 3-5 typical services would change
3. **Revenue projection**: Based on last 30 days of completed services
   - Number of services
   - Average price increase/decrease per service
   - Projected monthly revenue impact

**Example**:
```
Changes:
• Recurring Cleaning: $4.50 → $5.00 (+11%)
• Heavy Growth: 50% → 60% (+10 points)

Impact on Sample Services:
Service Example           Current   New      Change
35ft sailboat, clean      $157.50   $175.00  +$17.50
45ft, heavy growth        $354.38   $396.00  +$41.62
60ft catamaran            $450.00   $500.00  +$50.00

Revenue Impact (last 30 days):
• 84 services completed
• Average increase: +$28.45 per service
• Projected monthly increase: +$2,389.80
```

### 4.3 Change Audit Trail

**Displayed below pricing form**:
- Recent changes log (last 10)
- Format: "Date - User updated 'Config Name' from X to Y"
- Full history link (view all pricing changes)
- Export audit log (CSV for compliance)

---

## 5. User & Team Management

### 5.1 User Management (`users.html`)

**User List Table**
- Columns: Name, Email, Role, Status
- Click row to edit
- Add User button (top right)

**Roles**:
- **Admin**: Full access to all services and Settings
- **Technician**: Service completion, inventory, view-only for billing
- **Viewer**: Read-only access (for office staff, observers)

**Permissions Matrix** (displayed on page):
```
Permission                 Admin  Technician  Viewer
View Services                ✓       ✓         ✓
Complete Services            ✓       ✓         ✗
Edit Customers               ✓       ✗         ✗
Create Invoices              ✓       ✗         ✗
Manage Inventory             ✓       ✓         ✗
Edit Email Templates         ✓       ✗         ✗
Edit Pricing                 ✓       ✗         ✗
Manage Users                 ✓       ✗         ✗
```

**Add/Edit User Modal**:
- Name, Email inputs
- Role dropdown
- Service access checkboxes (Estimator, Operations, Billing, etc.)
- Send invitation email checkbox
- Save/Cancel buttons

---

## 6. Integration Settings

### 6.1 Integrations (`integrations.html`)

**Integration Cards** (expandable sections):

**Resend (Email Service)** - ✅ Connected
- API Key: `re_••••••••••5tAk` [Show] [Edit]
- From Address: `orders@sailorskills.com`
- Last Verified: Nov 6, 2025 at 10:30 AM
- Status: Active - 847/3,000 emails used this month
- Actions: Test Connection, View Documentation

**Stripe (Payments)** - ✅ Connected
- Publishable Key: `pk_live_••••••abc123`
- Secret Key: `sk_live_••••••xyz789` [Show] [Edit]
- Webhook Secret: `whsec_•••••def456` [Show] [Edit]
- Mode: Live / Test toggle
- Last Transaction: Nov 6, 2025 at 2:45 PM
- Actions: Test Connection, Switch Mode, View Dashboard

**YouTube (Video Management)** - ✅ Connected
- API Key: `AIza••••••••••XyZ`
- Channel: Sailor Skills
- Last Sync: Nov 6, 2025 at 9:00 AM
- Actions: Reconnect, Refresh Playlists

**Google Calendar (Booking)** - ✅ Connected
- OAuth: Connected as brian@sailorskills.com
- Calendar: Sailor Skills Services
- Last Sync: Nov 6, 2025 at 2:50 PM
- Actions: Reconnect, Test Sync

**Notion (Roadmap)** - ⚠️ Needs Setup
- Integration Token: Not configured
- Actions: Connect Notion, Setup Guide

**Twilio (SMS - Future)** - ⏸️ Not Connected
- Actions: Connect Twilio

**Key Features**:
- **Masked credentials**: Show bullets, reveal on click
- **Connection testing**: One-click verify
- **Usage monitoring**: Show quota/limits where applicable
- **Security**: All keys encrypted in database via Supabase vault

---

## 7. Technical Implementation

### 7.1 Data Flow

**Pricing Change Flow**:
```
1. Admin opens system-config.html → Pricing tab
2. Changes recurring_cleaning_rate: $4.50 → $5.00
3. Clicks "Preview Impact"
4. UI calls: POST /functions/v1/update-pricing-config (preview mode)
5. Edge function calculates impact using recent service data
6. Shows modal with revenue projection
7. Admin confirms
8. Edge function:
   - Saves to business_pricing_config
   - Logs to pricing_audit_log
   - Invalidates pricing cache
9. Estimator/Billing fetch new pricing on next load
```

**Email Template Edit Flow**:
```
1. Admin opens email-manager.html
2. Selects "Order Confirmation" template
3. Edits subject line and body content
4. Previews with test data (mobile + desktop)
5. Sends test email to verify
6. Clicks "Save Changes"
7. UI calls: PATCH /rest/v1/email_templates
8. Database updates via RLS policy
9. Next order confirmation uses new content
```

**Email Engagement Tracking Flow**:
```
1. Service sends email via Resend API
2. Resend delivers to customer
3. Customer opens email
4. Resend fires webhook: POST /functions/v1/resend-webhook
   Body: { type: 'email.opened', email_id: 're_xyz', opened_at: '...' }
5. Edge function:
   - Finds email_logs record by resend_id
   - Updates opened_at timestamp
6. Email logs UI refreshes (every 30s or on user action)
7. Admin sees engagement indicator in logs
```

### 7.2 Shared Package Updates

**New file**: `sailorskills-shared/src/config/pricing.js`

```javascript
let pricingCache = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getPricingConfig() {
  if (!pricingCache || Date.now() - pricingCache.timestamp > CACHE_TTL) {
    const { data } = await supabase
      .from('business_pricing_config')
      .select('*');

    // Convert array to object for easy access
    pricingCache = {
      data: data.reduce((acc, row) => {
        acc[row.config_key] = row.config_value;
        return acc;
      }, {}),
      timestamp: Date.now()
    };
  }

  return pricingCache.data;
}

// Real-time cache invalidation
supabase
  .channel('pricing-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'business_pricing_config'
  }, () => {
    pricingCache = null; // Force refetch on next call
  })
  .subscribe();
```

**Updated Estimator usage**:
```javascript
// OLD: configuration.js
const recurringCleaningRate = 4.50;

// NEW: calculator.js
import { getPricingConfig } from '@sailorskills/shared/config/pricing';

async function calculateQuote(serviceData) {
  const pricing = await getPricingConfig();
  const recurringCleaningRate = pricing.recurring_cleaning_rate;
  // ... rest of calculation
}
```

### 7.3 Security (RLS Policies)

```sql
-- Admin-only access to pricing config
CREATE POLICY "Admin only: business_pricing_config"
  ON business_pricing_config FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Admin-only access to email templates
CREATE POLICY "Admin only: email_templates"
  ON email_templates FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- Admin-only access to integration credentials
CREATE POLICY "Admin only: integration_credentials"
  ON integration_credentials FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

-- All authenticated users can view email logs
CREATE POLICY "Authenticated view: email_logs"
  ON email_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only admins can edit email logs
CREATE POLICY "Admin edit: email_logs"
  ON email_logs FOR UPDATE
  USING (auth.jwt() ->> 'role' = 'admin');
```

### 7.4 New Edge Functions

**`/functions/v1/resend-webhook`**
- Receives Resend webhook events
- Events: email.opened, email.clicked, email.bounced, email.complained
- Updates email_logs table with engagement data
- Validates webhook signature for security

**`/functions/v1/update-pricing-config`**
- Validates pricing changes
- Calculates revenue impact (preview mode)
- Saves to business_pricing_config (confirmed mode)
- Logs to pricing_audit_log
- Invalidates pricing cache

---

## 8. Deployment Strategy

### 8.1 Phased Rollout

**Phase 1: Foundation (Week 1)**
- Create sailorskills-settings repository
- Set up Vite + Supabase structure
- Run database migrations
- Deploy to Vercel: `sailorskills-settings.vercel.app`
- Configure admin authentication

**Phase 2: Email Management (Week 2-3)**
- Build email-manager.html with editor
- Populate email_templates table
- Build preview component
- Implement test email sending
- Build email-logs.html with filtering
- Deploy Resend webhook
- Test engagement tracking end-to-end

**Phase 3: Pricing Configuration (Week 4)**
- Populate business_pricing_config from hardcoded values
- Build system-config.html pricing tab
- Build impact preview calculator
- Update Estimator to use database pricing
- Update Billing to use database pricing
- Test quote generation with dynamic pricing

**Phase 4: Users & Integrations (Week 5)**
- Build users.html with role management
- Implement RLS policies
- Build integrations.html
- Migrate API keys to integration_credentials
- Add connection testing

**Phase 5: Polish & Analytics (Week 6)**
- Build email engagement analytics
- Add insights and recommendations
- Build Settings dashboard
- Add navigation from other services
- Full integration testing
- Production deployment

### 8.2 Migration Strategy

**Estimator/Billing Updates**:
1. Add dependency: `@sailorskills/shared` (already exists)
2. Import `getPricingConfig()` function
3. Replace hardcoded values with database lookups
4. Keep old values commented for emergency rollback
5. Deploy with feature flag (can disable if issues)

**Rollback Plan**:
- Old hardcoded values remain in code (commented)
- Feature flag to switch back to hardcoded pricing
- Email templates fall back to files if database unavailable
- Database triggers to revert pricing changes if needed

### 8.3 Testing Strategy

**Unit Tests**: Each component tested independently
**Integration Tests**: Cross-service pricing updates
**E2E Tests**: Playwright tests for critical workflows
  - Edit email template → Preview → Send test
  - Change pricing → Preview impact → Save → Verify Estimator uses new price
  - View email logs → Filter by status → View engagement

**Monitoring**:
- Email send failures > 5% → Alert
- Pricing config read errors → Alert
- Webhook processing delays > 5 min → Alert
- Settings service downtime → Alert

---

## 9. Success Metrics

**Immediate Benefits**:
- ✅ Single source of truth for pricing (0 duplicates vs. 20+ currently)
- ✅ Update email content in < 5 minutes (vs. code deployment)
- ✅ Full visibility into email engagement (currently none)
- ✅ Centralized credential management (vs. scattered across services)

**Measurable Outcomes** (30 days post-launch):
- Pricing changes: Target < 10 minutes from decision to live (vs. code deployment cycle)
- Email engagement: Establish baseline open/click rates for optimization
- Admin efficiency: Reduce time spent on pricing/email updates by 80%
- Security: All API keys in encrypted storage (vs. environment variables)

---

## 10. Future Enhancements

**Not in MVP, but planned**:
- Customer email preferences (opt-in/opt-out by type)
- A/B testing for email subject lines
- Email scheduling (send at optimal times)
- Bulk email capabilities (newsletters, announcements)
- Advanced role customization (custom permission sets)
- Pricing rules engine (seasonal pricing, volume discounts)
- Integration health dashboard
- Webhook retry logic for failed events

---

## Appendix A: Current Pricing Variables Inventory

**Service Base Rates (6)**:
- recurring_cleaning_rate: $4.50/ft
- onetime_cleaning_rate: $6.00/ft
- underwater_inspection_rate: $4.00/ft
- item_recovery_rate: $199 flat
- propeller_service_rate: $349 flat
- anodes_only_rate: $150 minimum

**Anode Pricing (3)**:
- anode_installation_rate: $15.00/anode
- anode_markup_percentage: 50%
- anode_minimum_markup: $2.00/anode

**Hull Type Surcharges (4)**:
- surcharge_powerboat: 25%
- surcharge_catamaran: 25%
- surcharge_trimaran: 50%
- surcharge_additional_propeller: 10%

**Paint Condition Surcharges (2)**:
- surcharge_paint_poor: 10%
- surcharge_paint_missing: 15%

**Growth/Fouling Surcharges (5)**:
- surcharge_moderate_heavy_growth: 10%
- surcharge_heavy_growth: 50%
- surcharge_heavy_severe_growth: 100%
- surcharge_severe_growth: 200%
- surcharge_extreme_growth: 250%

**Minimums (1)**:
- minimum_service_charge: $150

**Total**: 21 pricing variables currently duplicated across Estimator and Billing

---

## Appendix B: Email Templates Inventory

**Customer-Facing (6)**:
1. order_confirmation - Order placed confirmation
2. order_declined - Order request declined
3. service_completion - Service marked complete
4. new_invoice - Invoice generated
5. upcoming_service - Service reminder (24-48 hours before)
6. new_message - Admin sent customer a message

**Internal (1)**:
7. new_order_alert - Notify operations team of new order

**Auth (2 - Future)**:
8. password_reset - Password reset link
9. magic_link - Passwordless login link

**Total**: 9 templates (7 active, 2 planned)

---

**End of Design Document**