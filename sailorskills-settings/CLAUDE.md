# Sailorskills Settings

**Tagline:** "System configuration and email management"

**Admin Dashboard - Internal Team Only**

---

## Product Overview

The **Settings** service is the centralized configuration hub for the Sailorskills suite. It manages email templates, pricing configuration, BCC email settings, and system-wide preferences.

**Role in Suite:** Houses configuration that affects all other services - email templates used by Operations/Billing/Booking, pricing tiers used by Estimator, and BCC email routing for audit trails.

---

## Production Deployment

- **URL:** https://settings.sailorskills.com
- **Platform:** Vercel (static deployment)
- **Auto-deploy:** Pushes to `main` branch trigger production deployment
- **Access:** Admin team only

---

## Tech Stack

- **Framework:** Vite (ES modules, dev server, build system)
- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Database:** Supabase (PostgreSQL)
- **Build:** `vite build` → outputs to `dist/`
- **Port:** 5180 (local dev)

---

## Key Features

### BCC Email Configuration
**Location:** System Configuration → BCC Email Configuration

- Per-service BCC addresses (Operations, Billing, Booking, Portal, Settings, Shared)
- Immediate effect (queries database on each email send - no redeploy required)
- ENV fallback for reliability (EMAIL_BCC_ADDRESS)
- Email validation (format, disposable domains, length checks)
- Test email functionality with dedicated edge function
- Full audit trail of all BCC changes

**Database Tables:**
- `email_bcc_settings`: Current BCC configuration per service
- `email_bcc_audit_log`: Change history for compliance

**Shared Library:**
All services use `getBccAddress(serviceName)` from `sailorskills-shared/src/lib/bcc-lookup.js`

### Email Template Management
- View and edit email templates used across all services
- Preview templates with sample data
- Track email engagement metrics

### Pricing Configuration
- Manage pricing tiers for Estimator
- Configure service types and rates

---

## Development

```bash
# Navigate to service
cd /Users/brian/app-development/sailorskills-repos/sailorskills-settings

# Install dependencies
npm install

# Start dev server
npm run dev
# → http://localhost:5180
```

---

## Views

| View | Path | Purpose |
|------|------|---------|
| Dashboard | `/` | Main settings overview |
| Email Templates | `/email-templates.html` | Manage email templates |
| System Config | `/system-config.html` | BCC settings, system preferences |
| Pricing | `/pricing.html` | Service pricing configuration |
| Users | `/users.html` | User management |

---

## Database Tables

| Table | Purpose |
|-------|---------|
| `email_bcc_settings` | Per-service BCC addresses |
| `email_bcc_audit_log` | BCC change audit trail |
| `email_templates` | Email template content |
| `pricing_config` | Service pricing tiers |

---

## Related Services

- **Operations, Billing, Booking**: Use email templates from Settings
- **Estimator**: Uses pricing configuration from Settings
- **All services**: Use BCC email configuration from Settings

---

## Testing

```bash
# Run Playwright tests
npx playwright test

# Test BCC email
# Use the 📧 button in System Config to send test email
```
