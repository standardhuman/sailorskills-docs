# BCC Email Configuration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add database-backed, per-service BCC email configuration with admin UI in Settings service and immediate effect (hot-reload).

**Architecture:** Hybrid approach with database as primary source and ENV variable fallback. New tables store per-service BCC addresses. Shared utility function (`getBccAddress`) queries database first, falls back to ENV. Settings service provides admin UI for management with validation, testing, and audit logging.

**Tech Stack:** Supabase (PostgreSQL + Edge Functions), Resend (email API), Vite (Settings UI), vanilla JavaScript

**Key Files:**
- Database: `migrations/2025-11-14-bcc-settings.sql`
- Shared utility: `sailorskills-shared/src/lib/bcc-lookup.js`
- Settings UI: `sailorskills-settings/src/views/system-config.html`, `sailorskills-settings/src/views/system-config.js`
- Test function: `sailorskills-settings/supabase/functions/send-test-bcc/index.ts`
- Edge functions: 9 functions across Operations, Billing, Shared, Settings

---

## Task 1: Create Database Migration

**Files:**
- Create: `migrations/2025-11-14-bcc-settings.sql`

**Step 1: Write migration SQL**

Create the migration file with tables, indexes, RLS policies, and initial data:

```sql
-- Create email_bcc_settings table
CREATE TABLE IF NOT EXISTS email_bcc_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT UNIQUE NOT NULL,
  bcc_address TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create email_bcc_audit_log table
CREATE TABLE IF NOT EXISTS email_bcc_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT NOT NULL,
  old_address TEXT,
  new_address TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bcc_service ON email_bcc_settings(service_name);
CREATE INDEX IF NOT EXISTS idx_bcc_active ON email_bcc_settings(is_active);
CREATE INDEX IF NOT EXISTS idx_bcc_audit_service ON email_bcc_audit_log(service_name);
CREATE INDEX IF NOT EXISTS idx_bcc_audit_date ON email_bcc_audit_log(changed_at DESC);

-- RLS Policies
ALTER TABLE email_bcc_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_bcc_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin only: email_bcc_settings"
  ON email_bcc_settings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admin view: email_bcc_audit_log"
  ON email_bcc_audit_log FOR SELECT
  USING (is_admin());

-- Initial data
INSERT INTO email_bcc_settings (service_name, bcc_address, is_active, description) VALUES
  ('operations', 'standardhuman@gmail.com', true, 'Service notifications, completions, invoices'),
  ('billing', 'standardhuman@gmail.com', true, 'Invoice and payment emails'),
  ('booking', 'standardhuman@gmail.com', true, 'Booking confirmations and reminders'),
  ('portal', 'standardhuman@gmail.com', true, 'Customer portal notifications'),
  ('settings', 'standardhuman@gmail.com', true, 'Auth emails (magic links, password resets)'),
  ('shared', 'standardhuman@gmail.com', true, 'Payment receipts and shared notifications')
ON CONFLICT (service_name) DO NOTHING;

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_bcc_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_bcc_settings_timestamp
  BEFORE UPDATE ON email_bcc_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_bcc_settings_updated_at();

COMMENT ON TABLE email_bcc_settings IS 'Per-service BCC email configuration with fallback to ENV variable';
COMMENT ON TABLE email_bcc_audit_log IS 'Audit trail for all BCC address changes';
```

**Step 2: Test migration locally**

Run: `source db-env.sh && psql "$DATABASE_URL" -f migrations/2025-11-14-bcc-settings.sql`

Expected output: CREATE TABLE, CREATE INDEX, ALTER TABLE, INSERT statements succeed

**Step 3: Verify tables created**

Run: `source db-env.sh && psql "$DATABASE_URL" -c "\d email_bcc_settings"`

Expected: Table structure displayed with 8 columns

Run: `source db-env.sh && psql "$DATABASE_URL" -c "SELECT * FROM email_bcc_settings;"`

Expected: 6 rows returned (operations, billing, booking, portal, settings, shared)

**Step 4: Commit migration**

```bash
git add migrations/2025-11-14-bcc-settings.sql
git commit -m "feat(database): add BCC email configuration tables and initial data"
```

---

## Task 2: Create Shared BCC Lookup Utility

**Files:**
- Create: `sailorskills-shared/src/lib/bcc-lookup.js`

**Step 1: Write the utility function**

```javascript
/**
 * BCC Lookup Utility
 *
 * Gets BCC email address for a service with fallback to ENV variable.
 * Used by edge functions across all services.
 */

import { createClient } from '@supabase/supabase-js';

/**
 * Get BCC address for a service with fallback
 * @param {string} serviceName - 'operations', 'billing', 'booking', 'portal', 'settings', 'shared'
 * @returns {Promise<string|null>} BCC email address or null
 */
export async function getBccAddress(serviceName) {
  try {
    // Create Supabase client (for Deno edge functions)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    // 1. Check database for service-specific BCC
    const { data, error } = await supabase
      .from('email_bcc_settings')
      .select('bcc_address, is_active')
      .eq('service_name', serviceName)
      .eq('is_active', true)
      .single();

    // If found and active, use service-specific BCC
    if (data && !error) {
      console.log(`[BCC] ${serviceName}: ${data.bcc_address} (from database)`);
      return data.bcc_address;
    }

    // 2. Fall back to global ENV variable
    const globalBcc = Deno.env.get('EMAIL_BCC_ADDRESS');
    if (globalBcc) {
      console.log(`[BCC] ${serviceName}: ${globalBcc} (from ENV fallback)`);
      return globalBcc;
    }

    console.log(`[BCC] ${serviceName}: no BCC configured`);
    return null;

  } catch (error) {
    console.error(`[BCC] Lookup failed for ${serviceName}:`, error);

    // 3. On error, still try ENV fallback (safe degradation)
    const fallback = Deno.env.get('EMAIL_BCC_ADDRESS');
    if (fallback) {
      console.warn(`[BCC] ${serviceName}: using ENV fallback due to error: ${fallback}`);
    }
    return fallback || null;
  }
}
```

**Step 2: Verify file structure**

Run: `ls -la sailorskills-shared/src/lib/bcc-lookup.js`

Expected: File exists with 644 permissions

**Step 3: Commit shared utility**

```bash
cd sailorskills-shared
git add src/lib/bcc-lookup.js
git commit -m "feat(shared): add BCC lookup utility with database and ENV fallback"
cd ..
```

---

## Task 3: Create Test Email Edge Function

**Files:**
- Create: `sailorskills-settings/supabase/functions/send-test-bcc/index.ts`

**Step 1: Write edge function**

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Resend } from 'npm:resend';

const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

serve(async (req) => {
  try {
    const { service_name, bcc_address } = await req.json();

    if (!service_name || !bcc_address) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing service_name or bcc_address' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Send test email
    const { data, error } = await resend.emails.send({
      from: 'settings@sailorskills.com',
      to: 'noreply@sailorskills.com', // Dummy recipient
      bcc: bcc_address,
      subject: `[TEST] BCC Configuration Test - ${service_name}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">BCC Test Email</h2>
          <p>This is a test email to verify BCC configuration for the <strong>${service_name}</strong> service.</p>
          <div style="background: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Service:</strong> ${service_name}</p>
            <p style="margin: 5px 0;"><strong>BCC Address:</strong> ${bcc_address}</p>
            <p style="margin: 5px 0;"><strong>Sent at:</strong> ${new Date().toISOString()}</p>
          </div>
          <p style="color: #16a34a; font-weight: bold;">✅ If you received this as a BCC, your configuration is working correctly!</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
          <p style="font-size: 12px; color: #6b7280;">
            This is an automated test email from Sailorskills Settings.<br />
            To: noreply@sailorskills.com (dummy recipient)<br />
            BCC: ${bcc_address}
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Resend error:', error);
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

**Step 2: Deploy edge function**

Run: `cd sailorskills-settings && supabase functions deploy send-test-bcc`

Expected: "Deployed Function send-test-bcc"

**Step 3: Test edge function manually**

Run:
```bash
curl -X POST https://fzygakldvvzxmahkdylq.supabase.co/functions/v1/send-test-bcc \
  -H "Authorization: Bearer YOUR_SERVICE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"service_name":"operations","bcc_address":"standardhuman@gmail.com"}'
```

Expected: `{"success":true,"messageId":"re_..."}`

**Step 4: Commit edge function**

```bash
git add sailorskills-settings/supabase/functions/send-test-bcc/index.ts
git commit -m "feat(settings): add test BCC email edge function"
```

---

## Task 4: Add BCC Configuration UI - HTML Structure

**Files:**
- Modify: `sailorskills-settings/src/views/system-config.html` (after line 285, before closing `</main>`)

**Step 1: Add BCC configuration section**

Insert after the cleaning frequency section (around line 285):

```html
      <!-- BCC Email Configuration -->
      <section class="pricing-section bcc-config-section">
        <h2>📧 Email BCC Configuration</h2>
        <p class="section-description">Configure BCC recipients for email monitoring and auditing. Changes take effect immediately (no redeploy required).</p>

        <!-- BCC Settings Table -->
        <div class="bcc-settings-table">
          <table>
            <thead>
              <tr>
                <th>Service</th>
                <th>BCC Address</th>
                <th>Active</th>
                <th>Test</th>
              </tr>
            </thead>
            <tbody id="bcc-settings-tbody">
              <!-- Populated by JavaScript -->
            </tbody>
          </table>
        </div>

        <!-- Global Fallback Info -->
        <div class="bcc-fallback-info">
          <p><strong>🌐 Global Fallback (ENV):</strong> <span id="global-bcc-fallback">Loading...</span></p>
          <p class="info-text">ⓘ Services without specific BCC use the global fallback</p>
        </div>

        <!-- Actions -->
        <div class="bcc-actions">
          <button id="save-bcc-btn" class="btn btn-primary">💾 Save BCC Changes</button>
          <button id="reset-bcc-btn" class="btn btn-secondary">↺ Reset to Database Values</button>
          <span id="bcc-save-status" class="save-status"></span>
        </div>

        <!-- Change History -->
        <div class="bcc-change-history">
          <h3>📋 Recent BCC Changes</h3>
          <div id="bcc-change-history"></div>
        </div>
      </section>
```

**Step 2: Add CSS for BCC section**

Create: `sailorskills-settings/src/styles/bcc-config.css`

```css
.bcc-config-section {
  margin-top: 30px;
}

.bcc-settings-table {
  margin: 20px 0;
  overflow-x: auto;
}

.bcc-settings-table table {
  width: 100%;
  border-collapse: collapse;
}

.bcc-settings-table th {
  background: #f3f4f6;
  padding: 12px;
  text-align: left;
  font-weight: 600;
  border-bottom: 2px solid #e5e7eb;
}

.bcc-settings-table td {
  padding: 12px;
  border-bottom: 1px solid #e5e7eb;
}

.bcc-address-input {
  width: 100%;
  padding: 8px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-family: monospace;
}

.bcc-address-input:focus {
  outline: none;
  border-color: #2563eb;
}

.bcc-address-input.invalid {
  border-color: #ef4444;
}

.bcc-active-toggle {
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.btn-test-bcc {
  padding: 6px 12px;
  background: #2563eb;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.btn-test-bcc:hover {
  background: #1d4ed8;
}

.bcc-fallback-info {
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 15px;
  margin: 20px 0;
}

.bcc-fallback-info p {
  margin: 5px 0;
}

.bcc-fallback-info .info-text {
  font-size: 14px;
  color: #64748b;
}

.bcc-actions {
  margin: 20px 0;
  display: flex;
  gap: 10px;
  align-items: center;
}

.bcc-save-status {
  margin-left: 10px;
  font-weight: 600;
}

.bcc-save-status.success {
  color: #16a34a;
}

.bcc-save-status.error {
  color: #ef4444;
}

.bcc-change-history {
  margin-top: 30px;
}

.bcc-change-history h3 {
  font-size: 18px;
  margin-bottom: 15px;
}

.bcc-history-item {
  padding: 12px;
  background: #f9fafb;
  border-left: 4px solid #2563eb;
  margin-bottom: 10px;
  border-radius: 4px;
}

.bcc-history-item .timestamp {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 5px;
}

.bcc-history-item .change-detail {
  font-size: 14px;
  margin: 3px 0;
}
```

**Step 3: Link CSS in HTML**

Add to `<head>` section of `system-config.html`:

```html
  <link rel="stylesheet" href="../styles/bcc-config.css">
```

**Step 4: Verify HTML structure**

Run: `grep -n "bcc-config-section" sailorskills-settings/src/views/system-config.html`

Expected: Line number showing section was added

**Step 5: Commit HTML and CSS**

```bash
git add sailorskills-settings/src/views/system-config.html
git add sailorskills-settings/src/styles/bcc-config.css
git commit -m "feat(settings): add BCC configuration UI structure and styles"
```

---

## Task 5: Add BCC Configuration UI - JavaScript Logic

**Files:**
- Modify: `sailorskills-settings/src/views/system-config.js` (add at end before `init()`)

**Step 1: Add BCC state variables**

Add after line 17 (after `cleaningOverrides = {};`):

```javascript
// BCC Configuration State
let bccSettings = {};
let originalBccSettings = {};
```

**Step 2: Add BCC loading function**

Add before the final `init()` call:

```javascript
// ========================================
// BCC Configuration
// ========================================

// Load BCC settings from database
async function loadBccSettings() {
  try {
    const { data, error } = await supabase
      .from('email_bcc_settings')
      .select('*')
      .order('service_name');

    if (error) throw error;

    bccSettings = {};
    (data || []).forEach(setting => {
      bccSettings[setting.service_name] = {
        bcc_address: setting.bcc_address,
        is_active: setting.is_active,
        description: setting.description
      };
    });

    originalBccSettings = JSON.parse(JSON.stringify(bccSettings));
    renderBccForm();
    loadGlobalBccFallback();
  } catch (error) {
    console.error('Failed to load BCC settings:', error);
    alert('Failed to load BCC configuration. Please refresh the page.');
  }
}

// Load global BCC fallback from ENV (display only)
function loadGlobalBccFallback() {
  // Note: We can't directly read Deno.env from client
  // Display placeholder - actual value used by edge functions
  const fallbackEl = document.getElementById('global-bcc-fallback');
  fallbackEl.textContent = 'standardhuman@gmail.com (from Supabase secrets)';
}

// Render BCC form
function renderBccForm() {
  const services = ['operations', 'billing', 'booking', 'portal', 'settings', 'shared'];
  const tbody = document.getElementById('bcc-settings-tbody');

  tbody.innerHTML = services.map(service => {
    const setting = bccSettings[service] || { bcc_address: '', is_active: true };
    return `
      <tr data-service="${service}">
        <td><strong>${service.charAt(0).toUpperCase() + service.slice(1)}</strong></td>
        <td>
          <input type="email"
                 class="bcc-address-input"
                 data-service="${service}"
                 value="${setting.bcc_address || ''}"
                 placeholder="email@example.com" />
        </td>
        <td style="text-align: center;">
          <input type="checkbox"
                 class="bcc-active-toggle"
                 data-service="${service}"
                 ${setting.is_active ? 'checked' : ''} />
        </td>
        <td>
          <button class="btn-test-bcc" data-service="${service}">📧</button>
        </td>
      </tr>
    `;
  }).join('');

  attachBccEventListeners();
}

// Validate email address
function validateBccAddress(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!email || email.trim() === '') {
    return { valid: true }; // Empty is valid (will use fallback)
  }

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  const disposableDomains = ['tempmail.com', 'guerrillamail.com', '10minutemail.com'];
  const domain = email.split('@')[1];
  if (disposableDomains.includes(domain)) {
    return { valid: false, error: 'Disposable email domains not allowed' };
  }

  if (email.length > 254) {
    return { valid: false, error: 'Email address too long' };
  }

  return { valid: true };
}

// Save BCC settings
async function saveBccSettings() {
  const user = await supabase.auth.getUser();
  const userId = user.data.user?.id;

  const saveBtn = document.getElementById('save-bcc-btn');
  const statusEl = document.getElementById('bcc-save-status');

  saveBtn.disabled = true;
  saveBtn.textContent = '💾 Saving...';
  statusEl.style.display = 'none';

  try {
    const services = ['operations', 'billing', 'booking', 'portal', 'settings', 'shared'];

    for (const service of services) {
      const addressInput = document.querySelector(`input.bcc-address-input[data-service="${service}"]`);
      const activeToggle = document.querySelector(`input.bcc-active-toggle[data-service="${service}"]`);

      const newAddress = addressInput.value.trim();
      const isActive = activeToggle.checked;

      // Validate
      const validation = validateBccAddress(newAddress);
      if (!validation.valid) {
        alert(`${service}: ${validation.error}`);
        return;
      }

      // Skip if no address provided
      if (!newAddress) continue;

      // Get old value for audit
      const oldAddress = originalBccSettings[service]?.bcc_address || null;

      // Upsert setting
      const { error: upsertError } = await supabase
        .from('email_bcc_settings')
        .upsert({
          service_name: service,
          bcc_address: newAddress,
          is_active: isActive,
          updated_by: userId,
          updated_at: new Date().toISOString()
        });

      if (upsertError) throw upsertError;

      // Log to audit if changed
      if (oldAddress !== newAddress) {
        await supabase.from('email_bcc_audit_log').insert({
          service_name: service,
          old_address: oldAddress,
          new_address: newAddress,
          changed_by: userId,
          changed_at: new Date().toISOString(),
          reason: 'Updated via Settings UI'
        });
      }
    }

    statusEl.textContent = '✓ BCC settings saved successfully! Changes are effective immediately.';
    statusEl.className = 'save-status success';
    statusEl.style.display = 'inline';

    // Reload
    await loadBccSettings();
    await loadBccChangeHistory();

    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 5000);

  } catch (error) {
    console.error('Failed to save BCC settings:', error);
    statusEl.textContent = `✗ Failed to save: ${error.message}`;
    statusEl.className = 'save-status error';
    statusEl.style.display = 'inline';

    setTimeout(() => {
      statusEl.style.display = 'none';
    }, 8000);
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save BCC Changes';
  }
}

// Send test BCC email
async function sendTestBccEmail(service) {
  const addressInput = document.querySelector(`input.bcc-address-input[data-service="${service}"]`);
  const bccAddress = addressInput.value.trim();

  if (!bccAddress) {
    alert('Please enter a BCC address first');
    return;
  }

  const validation = validateBccAddress(bccAddress);
  if (!validation.valid) {
    alert(validation.error);
    return;
  }

  try {
    const session = await supabase.auth.getSession();
    const accessToken = session.data.session?.access_token;

    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-test-bcc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        service_name: service,
        bcc_address: bccAddress
      })
    });

    const result = await response.json();

    if (result.success) {
      alert(`✅ Test email sent! Check ${bccAddress} inbox for confirmation.`);
    } else {
      alert(`❌ Test email failed: ${result.error}`);
    }
  } catch (error) {
    console.error('Test email error:', error);
    alert('Failed to send test email. Please try again.');
  }
}

// Load BCC change history
async function loadBccChangeHistory() {
  try {
    const { data, error } = await supabase
      .from('email_bcc_audit_log')
      .select('*')
      .order('changed_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    const historyEl = document.getElementById('bcc-change-history');

    if (!data || data.length === 0) {
      historyEl.innerHTML = '<p style="color: #666;">No recent changes</p>';
      return;
    }

    historyEl.innerHTML = data.map(item => {
      const date = new Date(item.changed_at);

      return `
        <div class="bcc-history-item">
          <div class="timestamp">${date.toLocaleString()}</div>
          <div class="change-detail">
            Updated <strong>${item.service_name}</strong> BCC
          </div>
          <div class="change-detail">
            ${item.old_address || '(none)'} → ${item.new_address}
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Failed to load BCC change history:', error);
  }
}

// Event listeners for BCC section
function attachBccEventListeners() {
  // Input validation on blur
  document.querySelectorAll('.bcc-address-input').forEach(input => {
    input.addEventListener('blur', (e) => {
      const validation = validateBccAddress(e.target.value);
      if (!validation.valid) {
        e.target.classList.add('invalid');
        e.target.title = validation.error;
      } else {
        e.target.classList.remove('invalid');
        e.target.title = '';
      }
    });
  });

  // Test buttons
  document.querySelectorAll('.btn-test-bcc').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const service = e.target.dataset.service;
      sendTestBccEmail(service);
    });
  });
}

// Reset BCC settings
async function resetBccSettings() {
  await loadBccSettings();
  alert('BCC settings reset to current database values');
}
```

**Step 3: Update init() function**

Modify the existing `init()` function to include BCC initialization:

```javascript
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

    // Add BCC initialization
    await loadBccSettings();
    await loadBccChangeHistory();
  } catch (error) {
    console.error('Failed to load configuration:', error);
    alert('Failed to load configuration. Please refresh the page.');
  }
}
```

**Step 4: Add event listeners**

Add at the end of the file (after other event listeners, before `init()`):

```javascript
// BCC event listeners
document.getElementById('save-bcc-btn')?.addEventListener('click', saveBccSettings);
document.getElementById('reset-bcc-btn')?.addEventListener('click', resetBccSettings);
```

**Step 5: Test UI locally**

Run: `cd sailorskills-settings && npm run dev`

Open: http://localhost:5178/src/views/system-config.html

Expected: BCC configuration section renders with 6 services

**Step 6: Commit JavaScript changes**

```bash
git add sailorskills-settings/src/views/system-config.js
git commit -m "feat(settings): add BCC configuration UI logic with validation and testing"
```

---

## Task 6: Update Operations Edge Function

**Files:**
- Modify: `sailorskills-operations/supabase/functions/send-notification/index.ts`

**Step 1: Add import for BCC lookup**

Add after existing imports (around line 3):

```typescript
import { getBccAddress } from '../../../sailorskills-shared/src/lib/bcc-lookup.js';
```

**Step 2: Replace hardcoded BCC with lookup**

Find the line (around line 50-60):

```typescript
const bcc = Deno.env.get('EMAIL_BCC_ADDRESS');
```

Replace with:

```typescript
const bcc = await getBccAddress('operations');
```

**Step 3: Deploy updated function**

Run: `cd sailorskills-operations && supabase functions deploy send-notification`

Expected: "Deployed Function send-notification"

**Step 4: Test function**

Trigger a service completion or notification in Operations UI and verify:
1. Email sends successfully
2. BCC received at standardhuman@gmail.com
3. Function logs show: "[BCC] operations: standardhuman@gmail.com (from database)"

**Step 5: Commit changes**

```bash
git add sailorskills-operations/supabase/functions/send-notification/index.ts
git commit -m "feat(operations): use database BCC lookup with ENV fallback"
```

---

## Task 7: Update Billing Edge Function

**Files:**
- Modify: `sailorskills-billing/supabase/functions/send-email/index.ts`

**Step 1: Add import for BCC lookup**

```typescript
import { getBccAddress } from '../../../sailorskills-shared/src/lib/bcc-lookup.js';
```

**Step 2: Replace hardcoded BCC**

Find and replace:

```typescript
const bcc = Deno.env.get('EMAIL_BCC_ADDRESS');
```

With:

```typescript
const bcc = await getBccAddress('billing');
```

**Step 3: Deploy updated function**

Run: `cd sailorskills-billing && supabase functions deploy send-email`

Expected: "Deployed Function send-email"

**Step 4: Test function**

Generate an invoice or payment email and verify BCC delivery.

**Step 5: Commit changes**

```bash
git add sailorskills-billing/supabase/functions/send-email/index.ts
git commit -m "feat(billing): use database BCC lookup with ENV fallback"
```

---

## Task 8: Update Shared Receipt Function

**Files:**
- Modify: `sailorskills-shared/supabase/functions/send-receipt/index.ts`

**Step 1: Add import for BCC lookup**

```typescript
import { getBccAddress } from '../../src/lib/bcc-lookup.js';
```

**Step 2: Replace hardcoded BCC**

```typescript
const bcc = await getBccAddress('shared');
```

**Step 3: Deploy updated function**

Run: `cd sailorskills-shared && supabase functions deploy send-receipt`

**Step 4: Test function**

Process a payment and verify receipt BCC delivery.

**Step 5: Commit changes**

```bash
git add sailorskills-shared/supabase/functions/send-receipt/index.ts
git commit -m "feat(shared): use database BCC lookup with ENV fallback"
```

---

## Task 9: Update Settings Auth Edge Functions (6 functions)

**Files:**
- Modify: `sailorskills-settings/supabase/functions/auth-send-magic-link/index.ts`
- Modify: `sailorskills-settings/supabase/functions/auth-send-password-reset/index.ts`
- Modify: `sailorskills-settings/supabase/functions/auth-send-signup-confirmation/index.ts`
- Modify: `sailorskills-settings/supabase/functions/auth-send-email-change/index.ts`
- Modify: `sailorskills-settings/supabase/functions/auth-send-invite/index.ts`
- Modify: `sailorskills-settings/supabase/functions/auth-send-reauthentication/index.ts`

**Step 1: Update all 6 auth functions**

For each function, add import:

```typescript
import { getBccAddress } from '../../../sailorskills-shared/src/lib/bcc-lookup.js';
```

Replace:

```typescript
const bcc = Deno.env.get('EMAIL_BCC_ADDRESS');
```

With:

```typescript
const bcc = await getBccAddress('settings');
```

**Step 2: Deploy all 6 functions**

```bash
cd sailorskills-settings
supabase functions deploy auth-send-magic-link
supabase functions deploy auth-send-password-reset
supabase functions deploy auth-send-signup-confirmation
supabase functions deploy auth-send-email-change
supabase functions deploy auth-send-invite
supabase functions deploy auth-send-reauthentication
```

**Step 3: Test auth emails**

Trigger password reset or magic link and verify BCC delivery.

**Step 4: Commit changes**

```bash
git add sailorskills-settings/supabase/functions/auth-send-*/index.ts
git commit -m "feat(settings): use database BCC lookup for all auth emails"
```

---

## Task 10: End-to-End Testing

**Step 1: Test BCC changes via UI**

1. Open Settings UI: https://settings.sailorskills.com/src/views/system-config.html
2. Change Operations BCC to different email (e.g., test@example.com)
3. Click "Save BCC Changes"
4. Verify success message appears
5. Check change history shows update

**Step 2: Test email with new BCC**

1. Complete a service in Operations
2. Verify email sent successfully
3. Check test@example.com inbox for BCC copy
4. Verify old BCC (standardhuman@gmail.com) does NOT receive copy

**Step 3: Test BCC test button**

1. In Settings UI, click 📧 Test button for Operations
2. Check test@example.com inbox
3. Verify test email received with correct details

**Step 4: Test ENV fallback**

1. In database, set Operations is_active = false:
   ```sql
   UPDATE email_bcc_settings SET is_active = false WHERE service_name = 'operations';
   ```
2. Complete a service in Operations
3. Verify email still sends with standardhuman@gmail.com BCC (from ENV)
4. Check function logs: should show "from ENV fallback"
5. Re-enable: `UPDATE email_bcc_settings SET is_active = true WHERE service_name = 'operations';`

**Step 5: Test audit log**

Query audit log:

```sql
SELECT * FROM email_bcc_audit_log ORDER BY changed_at DESC LIMIT 10;
```

Expected: All BCC changes recorded with timestamps and user IDs

**Step 6: Document test results**

Create: `docs/TEST_RESULTS_BCC_CONFIG.md`

Document:
- Date tested
- All 6 services tested (which emails triggered)
- BCC delivery confirmed for each
- Fallback behavior verified
- Audit log verified
- Any issues encountered

---

## Task 11: Deploy to Production

**Step 1: Merge feature branch to main**

```bash
# From worktree
git push origin feature/bcc-email-config

# From main repo
cd /Users/brian/app-development/sailorskills-repos
git checkout main
git merge feature/bcc-email-config
git push origin main
```

**Step 2: Verify Vercel auto-deployment**

Check Vercel dashboard for:
- sailorskills-settings deployment (should auto-trigger)
- Deployment status: Success

**Step 3: Run database migration in production**

```bash
source db-env.sh
psql "$DATABASE_URL" -f migrations/2025-11-14-bcc-settings.sql
```

Verify:

```bash
psql "$DATABASE_URL" -c "SELECT * FROM email_bcc_settings;"
```

Expected: 6 rows with all services

**Step 4: Deploy all edge functions to production**

```bash
# Operations
cd sailorskills-operations
supabase functions deploy send-notification

# Billing
cd ../sailorskills-billing
supabase functions deploy send-email

# Shared
cd ../sailorskills-shared
supabase functions deploy send-receipt

# Settings
cd ../sailorskills-settings
supabase functions deploy auth-send-magic-link
supabase functions deploy auth-send-password-reset
supabase functions deploy auth-send-signup-confirmation
supabase functions deploy auth-send-email-change
supabase functions deploy auth-send-invite
supabase functions deploy auth-send-reauthentication
supabase functions deploy send-test-bcc
```

**Step 5: Verify production**

1. Open production Settings UI: https://settings.sailorskills.com
2. Navigate to System Configuration → BCC Configuration
3. Verify all 6 services show correct BCC addresses
4. Send test email for one service
5. Verify production email delivery

**Step 6: Monitor for 24 hours**

Check:
- Email logs table for BCC delivery
- Function logs for errors
- No customer complaints about missing emails

**Step 7: Create deployment summary**

Create: `docs/DEPLOYMENT_SUMMARY_BCC_CONFIG.md`

Include:
- Deployment date/time
- Services deployed
- Migration status
- Verification results
- Any rollback procedures if needed

---

## Task 12: Update Documentation

**Step 1: Update root README**

Add to service features list in README.md:

```markdown
- **Settings**: Email BCC configuration with per-service addresses, validation, test sending, and audit logging
```

**Step 2: Update CLAUDE.md**

Add to Settings service section:

```markdown
### Settings Service - BCC Email Configuration

**Location**: https://settings.sailorskills.com/src/views/system-config.html

**Features**:
- Per-service BCC addresses (Operations, Billing, Booking, Portal, Settings, Shared)
- Immediate effect (queries database on each email send)
- ENV fallback for reliability
- Email validation and test sending
- Full audit trail

**Database Tables**:
- `email_bcc_settings`: Current BCC configuration per service
- `email_bcc_audit_log`: Change history for compliance

**Usage**:
All edge functions use `getBccAddress(serviceName)` from sailorskills-shared/src/lib/bcc-lookup.js
```

**Step 3: Update handoff document**

Update `HANDOFF_2025-11-11_EMAIL_BCC_IMPLEMENTATION.md`:

Add section:

```markdown
## ✅ Phase 2 Complete: Database-Backed BCC Configuration

**Date**: November 14, 2025

**What Was Added**:
- Per-service BCC configuration in Settings UI
- Database tables: email_bcc_settings, email_bcc_audit_log
- Shared BCC lookup utility with ENV fallback
- Test email functionality
- All 9 edge functions updated to use database lookup

**How to Use**:
1. Open Settings → System Configuration → BCC Configuration
2. Enter/modify BCC addresses for each service
3. Click "Save BCC Changes"
4. Test with 📧 button
5. Changes effective immediately (no redeploy)

**Fallback Behavior**:
- Database primary source
- Falls back to EMAIL_BCC_ADDRESS ENV if no database entry or inactive
- Graceful degradation on database errors
```

**Step 4: Commit documentation updates**

```bash
git add README.md CLAUDE.md HANDOFF_2025-11-11_EMAIL_BCC_IMPLEMENTATION.md
git commit -m "docs: update documentation for BCC configuration feature"
git push origin main
```

---

## Completion Checklist

Before considering this feature complete, verify:

- ✅ Database migration applied to production
- ✅ All 6 services have BCC addresses in database
- ✅ Settings UI loads and saves BCC settings correctly
- ✅ Test email functionality works for all services
- ✅ All 9 edge functions deployed with BCC lookup
- ✅ At least one production email tested per service with BCC delivery confirmed
- ✅ ENV fallback behavior tested and verified
- ✅ Audit log recording changes correctly
- ✅ Documentation updated (README, CLAUDE.md, handoff)
- ✅ No errors in production logs
- ✅ Feature merged to main branch

---

## Rollback Procedure (If Needed)

If issues are discovered:

**Option 1: Disable database lookup**

```sql
UPDATE email_bcc_settings SET is_active = false;
```

This forces all edge functions to use ENV fallback.

**Option 2: Redeploy old edge function versions**

```bash
# Get previous deployment ID
supabase functions list

# Redeploy specific version
supabase functions deploy send-notification --version-id <previous-id>
```

**Option 3: Revert git commits**

```bash
git revert <commit-hash>
git push origin main
```

All options are non-destructive. Audit log preserves all changes.

---

**End of Implementation Plan**
