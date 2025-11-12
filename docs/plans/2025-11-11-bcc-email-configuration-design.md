# BCC Email Configuration - Design Document

**Date**: November 11, 2025
**Author**: Brian (with Claude)
**Status**: Approved for Implementation

## Executive Summary

This design adds database-backed BCC email configuration to the Settings service, enabling per-service BCC addresses with immediate effect. The hybrid approach (database + ENV fallback) ensures zero-downtime migration and backward compatibility.

**Current State:**
- Global `EMAIL_BCC_ADDRESS` environment variable set in Supabase secrets
- All emails BCC to `standardhuman@gmail.com`
- Changes require Vercel redeployment (slow, manual)

**Desired State:**
- Per-service BCC addresses (Operations, Billing, Booking, Portal, Settings, Shared)
- Admin UI in Settings service for easy management
- Immediate effect (no redeployment required)
- Email validation, test sending, and audit logging
- Graceful fallback to ENV variable

---

## 1. Requirements Summary

### Functional Requirements
- ✅ Per-service BCC configuration (6 services)
- ✅ Admin-only access to modify
- ✅ Immediate effect (hot-reload via database query)
- ✅ Email format validation
- ✅ Send test email functionality
- ✅ Change history/audit log
- ✅ Active/inactive toggle per service

### Non-Functional Requirements
- ✅ Zero-downtime deployment
- ✅ Backward compatible (ENV fallback)
- ✅ Graceful degradation (if DB fails, use ENV)
- ✅ Minimal edge function changes (one-line swap)
- ✅ Fast lookups (< 50ms added latency per email)

---

## 2. Database Schema

### 2.1 New Table: `email_bcc_settings`

Stores per-service BCC configuration.

```sql
CREATE TABLE email_bcc_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT UNIQUE NOT NULL,  -- 'operations', 'billing', 'booking', 'portal', 'settings', 'shared'
  bcc_address TEXT NOT NULL,          -- 'ops@sailorskills.com'
  is_active BOOLEAN DEFAULT TRUE,     -- Allow temporary disable without deleting
  description TEXT,                   -- Human-readable note (e.g., "Forwarded to accounting")
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Indexes for fast lookups
CREATE INDEX idx_bcc_service ON email_bcc_settings(service_name);
CREATE INDEX idx_bcc_active ON email_bcc_settings(is_active);

-- RLS Policy: Admin only
CREATE POLICY "Admin only: email_bcc_settings"
  ON email_bcc_settings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
```

### 2.2 New Table: `email_bcc_audit_log`

Tracks all BCC address changes for compliance and debugging.

```sql
CREATE TABLE email_bcc_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_name TEXT NOT NULL,
  old_address TEXT,
  new_address TEXT,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMP DEFAULT NOW(),
  reason TEXT
);

-- Index for audit queries
CREATE INDEX idx_bcc_audit_service ON email_bcc_audit_log(service_name);
CREATE INDEX idx_bcc_audit_date ON email_bcc_audit_log(changed_at DESC);
```

### 2.3 Initial Data

Pre-populate with current global BCC address for smooth migration:

```sql
INSERT INTO email_bcc_settings (service_name, bcc_address, is_active, description) VALUES
  ('operations', 'standardhuman@gmail.com', true, 'Service notifications, completions, invoices'),
  ('billing', 'standardhuman@gmail.com', true, 'Invoice and payment emails'),
  ('booking', 'standardhuman@gmail.com', true, 'Booking confirmations and reminders'),
  ('portal', 'standardhuman@gmail.com', true, 'Customer portal notifications'),
  ('settings', 'standardhuman@gmail.com', true, 'Auth emails (magic links, password resets)'),
  ('shared', 'standardhuman@gmail.com', true, 'Payment receipts and shared notifications');
```

---

## 3. BCC Lookup Logic

### 3.1 Shared Utility

**File**: `sailorskills-shared/src/lib/bcc-lookup.js`

```javascript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
);

/**
 * Get BCC address for a service with fallback
 * @param {string} serviceName - 'operations', 'billing', 'booking', 'portal', 'settings', 'shared'
 * @returns {string|null} BCC email address or null
 */
export async function getBccAddress(serviceName) {
  try {
    // 1. Check database for service-specific BCC
    const { data, error } = await supabase
      .from('email_bcc_settings')
      .select('bcc_address, is_active')
      .eq('service_name', serviceName)
      .eq('is_active', true)
      .single();

    // If found and active, use service-specific BCC
    if (data && !error) {
      console.log(`BCC for ${serviceName}: ${data.bcc_address} (from database)`);
      return data.bcc_address;
    }

    // 2. Fall back to global ENV variable
    const globalBcc = Deno.env.get('EMAIL_BCC_ADDRESS');
    if (globalBcc) {
      console.log(`BCC for ${serviceName}: ${globalBcc} (from ENV fallback)`);
    }
    return globalBcc || null;

  } catch (error) {
    console.error(`BCC lookup failed for ${serviceName}:`, error);

    // 3. On error, still try ENV fallback (safe degradation)
    const fallback = Deno.env.get('EMAIL_BCC_ADDRESS');
    console.warn(`Using ENV fallback due to error: ${fallback}`);
    return fallback || null;
  }
}
```

### 3.2 Usage in Edge Functions

**Before:**
```typescript
const bcc = Deno.env.get('EMAIL_BCC_ADDRESS');
```

**After:**
```typescript
import { getBccAddress } from '../../../sailorskills-shared/src/lib/bcc-lookup.js';

const bcc = await getBccAddress('operations'); // or 'billing', 'booking', etc.

await resend.emails.send({
  from: 'orders@sailorskills.com',
  to: customerEmail,
  bcc: bcc || undefined, // Only add if BCC configured
  subject: subject,
  html: htmlContent
});
```

### 3.3 Edge Functions to Update

| Service | Function | Service Name Parameter |
|---------|----------|----------------------|
| Operations | `send-notification` | `'operations'` |
| Billing | `send-email` | `'billing'` |
| Shared | `send-receipt` | `'shared'` |
| Settings | `auth-send-magic-link` | `'settings'` |
| Settings | `auth-send-password-reset` | `'settings'` |
| Settings | `auth-send-signup-confirmation` | `'settings'` |
| Settings | `auth-send-email-change` | `'settings'` |
| Settings | `auth-send-invite` | `'settings'` |
| Settings | `auth-send-reauthentication` | `'settings'` |

**Note**: Booking service (`src/email-utils.js`) currently uses Resend directly from client. Future refactor: migrate to edge function for consistency.

---

## 4. Settings UI Implementation

### 4.1 UI Location

Add new section to `sailorskills-settings/src/views/system-config.html` after pricing configuration.

### 4.2 UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ 📧 Email BCC Configuration                                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Configure BCC recipients for email monitoring and auditing  │
│  ⓘ Changes take effect immediately (no redeploy required)   │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Service     BCC Address               Active   Test  │   │
│  ├─────────────────────────────────────────────────────┤   │
│  │ Operations  [standardhuman@gmail.com] [✓]     [📧]  │   │
│  │ Billing     [standardhuman@gmail.com] [✓]     [📧]  │   │
│  │ Booking     [standardhuman@gmail.com] [✓]     [📧]  │   │
│  │ Portal      [standardhuman@gmail.com] [✓]     [📧]  │   │
│  │ Settings    [standardhuman@gmail.com] [✓]     [📧]  │   │
│  │ Shared      [standardhuman@gmail.com] [✓]     [📧]  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
│  🌐 Global Fallback (ENV): standardhuman@gmail.com          │
│  ⓘ Services without specific BCC use the global fallback    │
│                                                               │
│  [💾 Save Changes]  [↺ Reset to Database Values]           │
│                                                               │
│  ──────────────────────────────────────────────────────────  │
│                                                               │
│  📋 Recent Changes                                           │
│  • Nov 11, 2025 10:30 AM - Brian updated Operations BCC     │
│    old@example.com → standardhuman@gmail.com                 │
│  • Nov 11, 2025 09:15 AM - Brian added Billing BCC          │
│    (none) → standardhuman@gmail.com                          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 4.3 UI Features

**Input Fields:**
- Text input for BCC email address (with validation)
- Checkbox for active/inactive toggle
- Test button (📧) to send test email

**Validation:**
- Email format regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- No disposable email domains (tempmail.com, guerrillamail.com, etc.)
- Max length: 254 characters
- Real-time validation (red border on invalid)

**Test Email Functionality:**
- Clicking 📧 sends test email to configured BCC address
- Test email includes service name, timestamp, and confirmation message
- Shows success/failure toast notification

**Change History:**
- Last 10 changes displayed
- Format: "Date - User updated Service BCC: old → new"
- Link to full audit log (separate modal or page)

### 4.4 JavaScript Implementation

**File**: `sailorskills-settings/src/views/system-config.js`

Add to existing file:

```javascript
// BCC Configuration State
let bccSettings = {};
let originalBccSettings = {};

// Load BCC settings from database
async function loadBccSettings() {
  try {
    const { data, error } = await supabase
      .from('email_bcc_settings')
      .select('*')
      .order('service_name');

    if (error) throw error;

    bccSettings = {};
    data.forEach(setting => {
      bccSettings[setting.service_name] = {
        bcc_address: setting.bcc_address,
        is_active: setting.is_active,
        description: setting.description
      };
    });

    originalBccSettings = JSON.parse(JSON.stringify(bccSettings));
    renderBccForm();
  } catch (error) {
    console.error('Failed to load BCC settings:', error);
    alert('Failed to load BCC configuration. Please refresh the page.');
  }
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
                 value="${setting.bcc_address}"
                 placeholder="email@example.com" />
        </td>
        <td>
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

  // Attach event listeners
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
  saveBtn.disabled = true;
  saveBtn.textContent = '💾 Saving...';

  try {
    // Collect all settings from form
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

    alert('BCC settings saved successfully! Changes are effective immediately.');

    // Reload
    await loadBccSettings();
    await loadBccChangeHistory();

  } catch (error) {
    console.error('Failed to save BCC settings:', error);
    alert('Failed to save BCC settings. Please try again.');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = '💾 Save Changes';
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
    // Call test email edge function
    const response = await fetch(`${supabase.supabaseUrl}/functions/v1/send-test-bcc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabase.auth.session()?.access_token}`
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
      .select(`
        *,
        changed_by_user:changed_by(email)
      `)
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
      const userName = item.changed_by_user?.email?.split('@')[0] || 'Unknown';

      return `
        <div class="history-item">
          <div class="timestamp">${date.toLocaleString()}</div>
          <div class="change-detail">
            <strong>${userName}</strong> updated <strong>${item.service_name}</strong> BCC
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

// Event listeners
function attachBccEventListeners() {
  // Input validation on blur
  document.querySelectorAll('.bcc-address-input').forEach(input => {
    input.addEventListener('blur', (e) => {
      const validation = validateBccAddress(e.target.value);
      if (!validation.valid) {
        e.target.style.borderColor = 'red';
        e.target.title = validation.error;
      } else {
        e.target.style.borderColor = '';
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

// Add to existing init()
async function init() {
  // ... existing initialization ...
  await loadBccSettings();
  await loadBccChangeHistory();
}

// Add event listener for save button
document.getElementById('save-bcc-btn')?.addEventListener('click', saveBccSettings);
```

---

## 5. Test Email Edge Function

### 5.1 New Edge Function

**File**: `sailorskills-settings/supabase/functions/send-test-bcc/index.ts`

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

---

## 6. Migration & Deployment

### 6.1 Deployment Steps

**Step 1: Database Migration**
```bash
# Run SQL migration (creates tables, no behavior change)
source db-env.sh
psql "$DATABASE_URL" -f migrations/2025-11-11-bcc-settings.sql
```

**Step 2: Populate Initial Data**
```bash
# Insert current BCC address for all services
psql "$DATABASE_URL" -c "
INSERT INTO email_bcc_settings (service_name, bcc_address, is_active) VALUES
  ('operations', 'standardhuman@gmail.com', true),
  ('billing', 'standardhuman@gmail.com', true),
  ('booking', 'standardhuman@gmail.com', true),
  ('portal', 'standardhuman@gmail.com', true),
  ('settings', 'standardhuman@gmail.com', true),
  ('shared', 'standardhuman@gmail.com', true);
"
```

**Step 3: Deploy Shared BCC Utility**
```bash
cd sailorskills-shared
git add src/lib/bcc-lookup.js
git commit -m "feat(shared): add BCC lookup utility with ENV fallback"
git push
```

**Step 4: Deploy Settings UI**
```bash
cd sailorskills-settings
# Add BCC section to system-config.html and system-config.js
git add src/views/system-config.*
git commit -m "feat(settings): add BCC email configuration UI"
git push
# Vercel auto-deploys
```

**Step 5: Deploy Test Email Function**
```bash
cd sailorskills-settings
supabase functions deploy send-test-bcc
```

**Step 6: Update Edge Functions (Sequential)**

Deploy one at a time, test between each:

```bash
# Settings auth functions (lowest risk)
cd sailorskills-settings
supabase functions deploy auth-send-magic-link
supabase functions deploy auth-send-password-reset
supabase functions deploy auth-send-signup-confirmation
supabase functions deploy auth-send-email-change
supabase functions deploy auth-send-invite
supabase functions deploy auth-send-reauthentication

# Test: Trigger password reset, verify BCC received

# Shared receipt function
cd sailorskills-shared
supabase functions deploy send-receipt

# Test: Process payment, verify BCC received

# Operations notifications
cd sailorskills-operations
supabase functions deploy send-notification

# Test: Complete service, verify BCC received

# Billing emails
cd sailorskills-billing
supabase functions deploy send-email

# Test: Generate invoice, verify BCC received
```

### 6.2 Verification Steps

After each deployment:

1. **Check email_logs table**
   ```sql
   SELECT * FROM email_logs
   WHERE created_at > NOW() - INTERVAL '5 minutes'
   ORDER BY created_at DESC LIMIT 10;
   ```

2. **Check BCC inbox** (standardhuman@gmail.com)
   - Verify BCC copy received
   - Check timestamp matches email_logs

3. **Check edge function logs**
   ```bash
   supabase functions logs send-notification --project-ref fzygakldvvzxmahkdylq
   ```
   - Look for "BCC for {service}: {address}" log messages
   - Verify no errors

4. **Test BCC change in UI**
   - Change Operations BCC to different address
   - Send test email
   - Verify new BCC receives copy

### 6.3 Rollback Plan

If issues detected:

**Option 1: Disable database lookup**
```sql
-- Deactivate all service-specific BCCs
UPDATE email_bcc_settings SET is_active = false;
-- Edge functions will fall back to ENV variable
```

**Option 2: Redeploy old edge function versions**
```bash
# Redeploy previous version without BCC lookup
supabase functions deploy send-notification --legacy-bundle
```

**Option 3: Emergency ENV change**
```bash
# Update ENV variable as temporary fix
supabase secrets set EMAIL_BCC_ADDRESS=backup@sailorskills.com
```

All options are non-destructive - audit log preserves change history.

---

## 7. Success Metrics

### 7.1 Immediate Benefits (Post-Deployment)

- ✅ Per-service BCC configuration (6 services)
- ✅ Admin UI for BCC management (no code changes needed)
- ✅ Immediate effect (< 1 second update propagation)
- ✅ Full audit trail of BCC changes
- ✅ Test email functionality for verification

### 7.2 Measurable Outcomes (7 days post-launch)

**Operational Efficiency:**
- BCC address changes: Target < 2 minutes (vs. Vercel redeployment)
- Test email verification: 100% of BCC changes validated before production use
- Zero email delivery failures due to BCC misconfiguration

**Compliance & Auditing:**
- 100% of BCC changes logged to audit table
- Audit log queryable for compliance reports
- Clear accountability (who changed what, when)

**System Reliability:**
- Zero downtime during migration
- Graceful degradation (ENV fallback working as expected)
- < 50ms latency added per email send (database query overhead)

### 7.3 Monitoring

**Alerts to Configure:**
- BCC lookup failures > 5% → Alert (indicates database issues)
- Test email send failures → Alert (indicates Resend issues)
- Settings UI unauthorized access attempts → Alert (security)

**Metrics to Track:**
- BCC lookup latency (P50, P95, P99)
- BCC change frequency (# changes per week)
- Test email success rate
- ENV fallback usage rate (should be 0% after migration)

---

## 8. Future Enhancements

**Not in MVP, but planned:**

1. **Multiple BCC addresses per service**
   - Support comma-separated list: `accounting@, ops@, audit@`
   - Useful for distributed monitoring

2. **BCC categories/rules**
   - Different BCCs for different email types within a service
   - Example: Receipts → accounting@, Notifications → ops@

3. **BCC scheduling**
   - Enable/disable BCC on schedule (e.g., business hours only)
   - Useful for reducing noise outside work hours

4. **Email type filtering**
   - Per-service toggle: BCC receipts but not confirmations
   - More granular control

5. **BCC analytics**
   - Track which services send most emails
   - Identify BCC inbox overload

---

## Appendix A: Service-to-BCC Mapping

| Service | Edge Functions | Email Types | Recommended BCC |
|---------|---------------|-------------|-----------------|
| Operations | `send-notification` | Service completions, invoices, reminders, messages, order updates | `ops@sailorskills.com` or `standardhuman@gmail.com` |
| Billing | `send-email` | Invoices, payment confirmations | `accounting@sailorskills.com` or `standardhuman@gmail.com` |
| Shared | `send-receipt` | Payment receipts | `accounting@sailorskills.com` or `standardhuman@gmail.com` |
| Booking | `email-utils.js` | Booking confirmations, reminders, cancellations | `bookings@sailorskills.com` or `standardhuman@gmail.com` |
| Settings | `auth-send-*` (6 functions) | Magic links, password resets, signups, email changes | `admin@sailorskills.com` or `standardhuman@gmail.com` |
| Portal | (Future) | Customer portal notifications | `standardhuman@gmail.com` |

**Current State:** All services BCC to `standardhuman@gmail.com`
**Future State:** Can customize per service for better organization

---

## Appendix B: SQL Migration File

**File**: `migrations/2025-11-11-bcc-settings.sql`

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

---

**End of Design Document**
