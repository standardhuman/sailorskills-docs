# Magic Link Email Setup Guide

**Date:** 2025-11-08
**Status:** ✅ Template created and added to database

---

## Overview

This guide shows how to apply the Sailor Skills branded magic link email template to Supabase Auth.

The magic link email template has been:
1. ✅ Created with Sailor Skills branding (matching service completion, invoice emails, etc.)
2. ✅ Added to the `email_templates` database table
3. ⏳ Needs to be configured in Supabase Auth settings

---

## Template Details

- **File:** `/sailorskills-settings/src/email/templates/magic-link.html`
- **Database Record:** `email_templates.template_key = 'magic_link'`
- **Service:** `shared` (used across all Sailor Skills services)
- **Subject:** "Sign in to Sailor Skills"
- **Variables:** `{{ .ConfirmationURL }}`, `{{ .CurrentYear }}`

### Branding Features

- **Blue gradient header** matching other Sailor Skills emails
- **Lock icon** (🔐) for security context
- **Sailor Skills Marine Services** subtitle in header
- **Security notice** explaining link expiration
- **Branded button** with Sailor Skills blue (#3b82f6)
- **Footer** with contact info and copyright
- **Mobile-responsive** table-based layout

---

## How to Apply to Supabase Auth

### Option 1: Supabase Dashboard (Recommended)

1. **Navigate to Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your Sailor Skills project

2. **Access Email Templates:**
   - Click on **Authentication** in the left sidebar
   - Scroll down to **Email Templates** section
   - Find **Magic Link** template

3. **Copy Template HTML:**
   ```bash
   # Get the template from database
   source db-env.sh
   psql "$DATABASE_URL" -c "SELECT html_template_file FROM email_templates WHERE template_key = 'magic_link'" -t
   ```

4. **Paste into Supabase:**
   - Copy the HTML output from the command above
   - Paste into the **Message (Body)** field in Supabase
   - Update the **Subject** to: `Sign in to Sailor Skills`

5. **Configure Variables:**
   - Supabase uses `{{ .ConfirmationURL }}` format (already in template)
   - The template also uses `{{ .CurrentYear }}` which you may need to replace with a static year (e.g., `2025`) or remove if Supabase doesn't support it

6. **Save Changes:**
   - Click **Save** to apply the template
   - Test by requesting a magic link login

### Option 2: Supabase Management API

```javascript
// Update auth email template via API
const { data, error } = await supabase.auth.admin.updateEmailTemplate({
  type: 'magic_link',
  subject: 'Sign in to Sailor Skills',
  content: `<HTML_CONTENT_FROM_DATABASE>`
});
```

### Option 3: Supabase CLI (Local Development)

If you're using local Supabase development:

1. **Create template file:**
   ```bash
   mkdir -p supabase/templates
   cp sailorskills-settings/src/email/templates/magic-link.html supabase/templates/magic-link.html
   ```

2. **Update `supabase/config.toml`:**
   ```toml
   [auth.email.template.magic_link]
   subject = "Sign in to Sailor Skills"
   content_path = "./supabase/templates/magic-link.html"
   ```

3. **Restart Supabase:**
   ```bash
   supabase stop && supabase start
   ```

---

## Testing the Template

### Test Magic Link Email

1. **Trigger magic link:**
   ```javascript
   const { data, error } = await supabase.auth.signInWithOtp({
     email: 'test@sailorskills.com',
     options: {
       emailRedirectTo: 'https://ops.sailorskills.com'
     }
   });
   ```

2. **Check inbox:** Verify the email has:
   - ✅ Blue gradient header with "Sign In to Your Account"
   - ✅ Lock icon
   - ✅ "Sign In to Sailor Skills" button
   - ✅ Security notice with expiration info
   - ✅ Sailor Skills footer with contact info

3. **Test functionality:**
   - Click the magic link button
   - Verify it redirects to the correct page
   - Confirm successful authentication

---

## Template Variables

Supabase provides these variables for magic link emails:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ .ConfirmationURL }}` | Magic link URL | `https://[project].supabase.co/auth/v1/verify?...` |
| `{{ .Token }}` | Verification token | `abc123...` |
| `{{ .TokenHash }}` | Token hash | `xyz789...` |
| `{{ .SiteURL }}` | Your app URL | `https://ops.sailorskills.com` |
| `{{ .CurrentYear }}` | Current year* | `2025` |

*Note: `{{ .CurrentYear }}` may not be supported by Supabase. If it doesn't render, replace with a static year.

---

## Fallback if CurrentYear Doesn't Work

If Supabase doesn't support `{{ .CurrentYear }}`, update the footer line in the template:

**Change:**
```html
<p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px;">© {{ .CurrentYear }} Sailor Skills Marine Services. All rights reserved.</p>
```

**To:**
```html
<p style="margin: 20px 0 0; color: #9ca3af; font-size: 12px;">© 2025 Sailor Skills Marine Services. All rights reserved.</p>
```

---

## Troubleshooting

### Email Not Sending

1. **Check SMTP settings** in Supabase dashboard
2. **Verify Resend API** is configured (if using Resend)
3. **Check email logs** in Supabase dashboard under Logs > Auth

### Template Not Updating

1. **Clear browser cache**
2. **Wait 1-2 minutes** for Supabase to propagate changes
3. **Re-save the template** in dashboard
4. **Check for HTML syntax errors** in template

### Link Not Working

1. **Verify redirect URLs** are configured in Supabase Auth settings
2. **Check link hasn't expired** (default: 1 hour)
3. **Ensure HTTPS** is used in production

### Styling Issues

1. **Test in multiple email clients** (Gmail, Outlook, Apple Mail)
2. **Use inline styles only** (no `<style>` tags)
3. **Use table-based layout** for email compatibility
4. **Avoid modern CSS** (flexbox, grid) - not supported in email

---

## Related Files

- **Template HTML:** `/sailorskills-settings/src/email/templates/magic-link.html`
- **Database Record:** `email_templates` table, `template_key = 'magic_link'`
- **Insert Script:** `/sailorskills-settings/scripts/insert-magic-link-template.sql`
- **Other Email Templates:** `/sailorskills-operations/supabase/functions/send-notification/`

---

## Next Steps

1. ⏳ Apply template to Supabase Auth (follow Option 1 above)
2. ⏳ Test magic link login with real email
3. ⏳ Update other Supabase auth email templates (signup confirmation, password reset, etc.)
4. ⏳ Consider creating branded templates for:
   - **Signup Confirmation** email
   - **Password Reset** email
   - **Email Change Confirmation**
   - **Invite User** email

---

## Maintenance

**When to Update:**
- Company name/branding changes
- Contact email changes
- Security policy changes (link expiration time)
- Footer copyright year (annually)

**How to Update:**
1. Edit `/sailorskills-settings/src/email/templates/magic-link.html`
2. Run `/sailorskills-settings/scripts/insert-magic-link-template.sql` to update database
3. Copy updated HTML to Supabase dashboard
4. Test the updated template

---

**Last Updated:** 2025-11-08
**Maintained by:** Claude Code
**Contact:** Update when Supabase auth templates are modified
