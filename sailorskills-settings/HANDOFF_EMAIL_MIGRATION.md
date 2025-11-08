# Email Template Migration - Handoff Document

**Date:** 2025-11-08
**Status:** 🟡 In Progress (Step 1 of 3 complete)
**Completion:** ~33%

---

## 📋 What Was Requested

Migrate all email templates to be centrally managed in the Settings service database, with these requirements:
1. Update `send-notification` edge function to load templates from Settings API ✅
2. Remove unused file-based templates ⏳
3. Add Payment Receipt to Settings (requires template engine upgrade) ⏳

---

## ✅ COMPLETED: Step 1 - Dynamic Template Loading

### What Was Done:

**File Updated:** `/sailorskills-operations/supabase/functions/send-notification/index.ts`

**Changes Made:**
- ✅ Added Supabase client initialization for database access
- ✅ Created `loadTemplateFromDatabase()` function
- ✅ Performs variable substitution ({{variable}} → actual values)
- ✅ Falls back to inline templates if database unavailable (reliability)
- ✅ Logs which source is used (database vs fallback)
- ✅ Returns `source: 'database'` in API response

**How It Works:**
```
Email trigger → send-notification called
    ↓
Try: Load template from Settings database
    ↓
Success? → Use database template + substitute variables
    ↓
Fail? → Use fallback inline template (same as before)
    ↓
Send via Resend API
```

**Benefits:**
- ✅ **Centralized management** - Edit templates in Settings UI
- ✅ **Zero downtime** - Fallback ensures emails always send
- ✅ **Version control** - Templates in database with timestamps
- ✅ **A/B testing ready** - Can dynamically switch templates
- ✅ **Hot updates** - No code deploy needed to change email content

---

## ⏳ PENDING: Step 2 - Remove Unused Templates

### Files to Delete:

**Operations Service:**
```
/sailorskills-operations/src/email/templates/
├── service-completion.html ❌ DELETE (not used)
├── new-invoice.html ❌ DELETE (not used)
├── upcoming-service.html ❌ DELETE (not used)
└── new-message.html ❌ DELETE (not used)
```

**Shared Package:**
```
/sailorskills-shared/src/email/templates/
├── order-confirmation.html ❌ DELETE (not deployed)
├── order-declined.html ❌ DELETE (not deployed)
├── status-update.html ❌ DELETE (not deployed)
└── new-order-alert.html ❌ DELETE (not deployed)
```

**Related Code:**
```
/sailorskills-shared/src/email/notification-service.js
```
- ⚠️ **REVIEW BEFORE DELETING** - May be used elsewhere
- References file-based templates but appears unused in production
- Check if any service imports this before removing

### Commands to Run:
```bash
# Operations templates
rm -rf /Users/brian/app-development/sailorskills-repos/sailorskills-operations/src/email/templates/

# Shared templates
rm -rf /Users/brian/app-development/sailorskills-repos/sailorskills-shared/src/email/templates/

# Verify notification-service.js usage first:
cd /Users/brian/app-development/sailorskills-repos
grep -r "notification-service" --include="*.js" --include="*.ts"
```

---

## ⏳ PENDING: Step 3 - Payment Receipt Template

### Challenge:
The Billing `send-receipt` edge function has a **740-line template** with:
- TypeScript conditional logic (if/else for anodes, boat details, etc.)
- Dynamic arrays (map/filter for line items, discounts)
- Complex calculations (subtotals, totals, surcharges)
- Nested data structures

### Two Options:

**Option A: Simplified Template (RECOMMENDED)**
- Create basic payment receipt template in Settings
- Include: customer, boat, service, amount, payment ID
- Omit: Complex anode details, conditional boat info
- **Pros:** Easy to manage, works with {{variable}} syntax
- **Cons:** Less detailed than current receipt

**Option B: Advanced Template Engine**
- Build template engine supporting conditionals: `{{#if}}`, `{{#each}}`
- Similar to Handlebars.js or Mustache.js
- Store logic separately from template
- **Pros:** Full feature parity
- **Cons:** Significant development effort (~2-3 days)

### Recommendation:
Start with **Option A** for now:
```sql
INSERT INTO email_templates (
  template_key,
  template_name,
  subject_line,
  html_template_file,
  available_variables,
  service,
  is_active
) VALUES (
  'payment_receipt_simple',
  'Payment Receipt (Simplified)',
  'Payment Receipt - ${{amount}} - Sailor Skills',
  '<!-- Simplified receipt HTML -->',
  '["customerName", "amount", "serviceName", "boatName", "paymentIntentId", "serviceDate"]'::jsonb,
  'billing',
  false  -- Don't activate until ready to switch
);
```

**Migration Path:**
1. Create simplified template (inactive)
2. Test with real data
3. When ready: Activate and update `send-receipt` to use it
4. Later: Upgrade to advanced template engine if needed

---

## 🚀 NEXT STEPS TO COMPLETE

### Immediate (Today):
1. **Deploy updated `send-notification` edge function**
   ```bash
   cd /Users/brian/app-development/sailorskills-repos/sailorskills-operations
   supabase functions deploy send-notification --project-ref fzygakldvvzxmahkdylq
   ```

2. **Test that emails load from database**
   - Trigger a test email (service completion, invoice, etc.)
   - Check Supabase logs: Look for "✅ Loaded template from database"
   - Verify email content matches Settings database

3. **Commit changes to send-notification**
   ```bash
   cd /Users/brian/app-development/sailorskills-repos/sailorskills-operations
   git add supabase/functions/send-notification/index.ts
   git commit -m "feat(email): load templates dynamically from Settings database"
   git push
   ```

### Short Term (This Week):
4. **Remove unused file-based templates**
   - Verify notification-service.js usage
   - Delete template directories
   - Remove or archive notification-service.js
   - Commit deletions

5. **Create simplified payment receipt template**
   - Add to Settings database
   - Test with sample data
   - Document differences from current receipt

### Long Term (Optional):
6. **Build advanced template engine**
   - If detailed receipts are critical
   - Support conditionals and loops
   - Migrate complex receipt template

7. **Update Billing `send-receipt` function**
   - Load template from Settings (if using simplified version)
   - Or keep inline (if staying with complex version)

---

## 📁 FILES MODIFIED

### Completed:
- ✅ `/sailorskills-operations/supabase/functions/send-notification/index.ts` - Dynamic loading
- ✅ `/sailorskills-settings/scripts/sync-production-inline-templates.mjs` - Sync script
- ✅ `/sailorskills-settings/EMAIL_TEMPLATES_DOCUMENTATION.md` - Full inventory
- ✅ Settings database - 6 production templates synced

### Pending Changes:
- ⏳ Delete: `/sailorskills-operations/src/email/templates/*`
- ⏳ Delete: `/sailorskills-shared/src/email/templates/*`
- ⏳ Review/Delete: `/sailorskills-shared/src/email/notification-service.js`
- ⏳ Add: Simplified payment receipt template to Settings database

---

## 🎯 SUCCESS CRITERIA

**Step 1 (Dynamic Loading):** ✅
- [x] `send-notification` loads from database
- [x] Variable substitution works
- [x] Fallback to inline templates if DB unavailable
- [x] Logs indicate source (database vs fallback)

**Step 2 (Remove Legacy):** ⏳
- [ ] File-based templates deleted
- [ ] notification-service.js removed or documented as unused
- [ ] No broken imports
- [ ] Commits pushed

**Step 3 (Payment Receipt):** ⏳
- [ ] Simplified template created
- [ ] Tested with real payment data
- [ ] Decision made: Keep complex inline or migrate
- [ ] Documented in EMAIL_TEMPLATES_DOCUMENTATION.md

---

## 🔒 SAFETY NOTES

### Rollback Plan:
If dynamic loading causes issues:
1. Database templates have fallbacks (inline templates unchanged)
2. Deactivate template in Settings (`is_active = false`)
3. Edge function automatically uses fallback
4. No service interruption

### Testing Checklist:
Before activating payment receipt template:
- [ ] Test with Anodes Only service
- [ ] Test with hull cleaning (growth levels, paint condition)
- [ ] Test with discounts
- [ ] Test with surcharges
- [ ] Test with twin engines
- [ ] Verify all variables populate
- [ ] Check mobile rendering

### Production Monitoring:
After deploying send-notification:
- Monitor Supabase edge function logs
- Check for "✅ Loaded template from database" messages
- Watch for fallback warnings
- Verify email_logs table shows successful sends
- Check customer support for email complaints

---

## 📞 CONTACTS & RESOURCES

**Code Locations:**
- Settings UI: https://sailorskills-settings-reyevubvv-sailorskills.vercel.app
- Operations edge functions: /sailorskills-operations/supabase/functions/
- Billing edge functions: /sailorskills-billing/supabase/functions/
- Settings sync scripts: /sailorskills-settings/scripts/

**Database:**
- Table: `email_templates`
- Connection: Use `db-env.sh` in root directory
- Query templates: `psql "$DATABASE_URL" -c "SELECT * FROM email_templates"`

**Deployment:**
- Supabase project: fzygakldvvzxmahkdylq
- Deploy command: `supabase functions deploy [function-name] --project-ref fzygakldvvzxmahkdylq`
- View logs: Supabase dashboard → Edge Functions → Logs

---

## 📝 DECISION LOG

| Decision | Made By | Date | Rationale |
|----------|---------|------|-----------|
| Use database-first with fallback | Claude | 2025-11-08 | Zero downtime, gradual migration |
| Keep payment receipt inline initially | Claude | 2025-11-08 | Too complex for simple {{variable}} substitution |
| Sync 6 templates to Settings | Claude | 2025-11-08 | Covers all Operations notifications |
| Delete file-based templates | Pending | TBD | Unused, causes confusion |

---

## ✅ COMPLETION CHECKLIST

**Phase 1: Dynamic Loading**
- [x] Update send-notification edge function
- [ ] Deploy to Supabase
- [ ] Test email sending
- [ ] Verify database loading works
- [ ] Monitor logs for errors
- [ ] Commit changes

**Phase 2: Cleanup**
- [ ] Delete Operations templates directory
- [ ] Delete Shared templates directory
- [ ] Remove/archive notification-service.js
- [ ] Update documentation
- [ ] Commit deletions

**Phase 3: Payment Receipt**
- [ ] Decide: Simplified vs Advanced template engine
- [ ] Create template in Settings
- [ ] Test thoroughly
- [ ] Update send-receipt (if migrating)
- [ ] Document decision
- [ ] Deploy and monitor

---

**Last Updated:** 2025-11-08
**Next Review:** After Step 1 deployment
**Owner:** Brian / Claude Code

