# Week 2 Execution Instructions

**For Claude Code Agent:** Use this document to execute the Week 2 implementation plan.

---

## Current Context

**Working Directory:** `/Users/brian/app-development/sailorskills-repos/.worktrees/technician-attribution-week2`

**Branch:** `feature/technician-attribution-week2`

**Status:** Week 1 complete (database foundation done), ready to execute Week 2 (Billing & Inventory integration)

**Plan Location:** `docs/plans/2025-11-04-user-accounts-week2-billing-inventory.md`

---

## Prerequisites Verification

Before starting, verify Week 1 completion:

```bash
# 1. Check you're in the correct directory
pwd
# Expected: /Users/brian/app-development/sailorskills-repos/.worktrees/technician-attribution-week2

# 2. Check correct branch
git branch --show-current
# Expected: feature/technician-attribution-week2

# 3. Load database credentials
source db-env.sh

# 4. Verify Week 1 database foundation exists
psql "$DATABASE_URL" -c "\dt users"
psql "$DATABASE_URL" -c "\dt audit_logs"

# 5. Verify shared auth utilities exist
ls shared/src/auth/permissions.js
ls shared/src/auth/user-context.js

# 6. Check recent commits
git log --oneline -10
# Expected: Should see Week 1 commits for database, permissions, user context
```

**If any prerequisite fails, STOP and report the issue.**

---

## Execution Command

Execute the Week 2 plan using the executing-plans skill:

```
Execute the Week 2 implementation plan at docs/plans/2025-11-04-user-accounts-week2-billing-inventory.md
```

**REQUIRED SUB-SKILL:** Use `superpowers:executing-plans` skill

---

## Implementation Strategy

**Approach:** Batch execution with review checkpoints

**Batch 1 (Tasks 1-7):** Billing service foundation
- Add UserProvider
- Create auth hook
- Capture technician_id
- Update invoice creation
- Add UI columns

**Batch 2 (Tasks 8-15):** Billing completion
- RLS filtering
- Permission guards
- Audit logging
- Testing
- Documentation

**Batch 3 (Tasks 16-22):** Inventory integration
- Add UserProvider
- RLS policies
- Permission guards
- UI controls
- Audit logging

**Batch 4 (Tasks 23-26):** Inventory testing & completion
- Integration tests
- Documentation
- Summary
- Push to remote

**After each batch:** Report completed tasks and wait for review/approval before proceeding.

---

## Key Files to Work With

### Billing Service
- `sailorskills-billing/src/main.jsx` - Add UserProvider
- `sailorskills-billing/src/hooks/useAuth.js` - Create auth hook
- `sailorskills-billing/src/pages/service-completion.js` - Capture technician
- `sailorskills-billing/src/components/invoice-list.js` - Add technician column
- `sailorskills-billing/src/components/invoice-detail.js` - Show technician name

### Inventory Service
- `sailorskills-inventory/src/main.jsx` - Add UserProvider
- `sailorskills-inventory/src/hooks/useAuth.js` - Create auth hook
- `sailorskills-inventory/src/pages/inventory-list.js` - Permission guards
- `migrations/016_inventory_rls_policies.sql` - RLS policies

### Documentation
- `sailorskills-billing/CLAUDE.md` - Document integration
- `sailorskills-inventory/CLAUDE.md` - Document integration
- `docs/summaries/2025-11-04-week2-complete.md` - Final summary

---

## Testing Requirements

### After Billing Integration (Task 12)
Run integration test checklist:
- Technician completes service → technician_id captured
- Invoice created with service_technician_id
- Technician sees only own invoices
- Owner sees all invoices with technician names
- Permission guards work correctly

### After Inventory Integration (Task 23)
Run integration test checklist:
- All roles can view inventory
- Place Order button hidden correctly
- Edit/Delete buttons hidden correctly
- View-only banner shows for contractors
- RLS policies enforce access

---

## Success Criteria

**Week 2 is complete when:**

✅ Billing service integrated with auth (Tasks 1-15 done)
✅ Inventory service integrated with auth (Tasks 16-25 done)
✅ All integration tests passing
✅ Documentation updated (CLAUDE.md files)
✅ Week 2 summary written
✅ Changes committed and pushed to remote
✅ Week 2 tagged as `week2-complete`

---

## Database Verification Commands

After completion, verify data integrity:

```bash
# Load credentials
source db-env.sh

# Check RLS policies active
psql "$DATABASE_URL" -c "SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;"

# Verify audit triggers
psql "$DATABASE_URL" -c "SELECT tgname, tgrelid::regclass FROM pg_trigger WHERE tgname LIKE 'audit_%';"

# Check technician attribution working
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM service_logs WHERE technician_id IS NOT NULL;"
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM invoices WHERE service_technician_id IS NOT NULL;"

# Verify audit logs capturing actions
psql "$DATABASE_URL" -c "SELECT entity_type, action, COUNT(*) FROM audit_logs GROUP BY entity_type, action ORDER BY entity_type;"
```

---

## Troubleshooting

### If compilation errors occur:
```bash
cd sailorskills-billing  # or sailorskills-inventory
npm install  # Ensure dependencies installed
npm run dev  # Check for errors
```

### If database queries fail:
```bash
source db-env.sh
psql "$DATABASE_URL" -c "\dt"  # List all tables
psql "$DATABASE_URL" -c "\d users"  # Describe users table
```

### If auth context not working:
Check that user_metadata has `user_type: 'staff'` in auth.users table

---

## Commit Convention

Follow these commit message formats (from the plan):

- `feat(billing): <description>` - New billing features
- `feat(inventory): <description>` - New inventory features
- `feat(db): <description>` - Database changes
- `docs(billing): <description>` - Billing documentation
- `docs(inventory): <description>` - Inventory documentation
- `test(billing): <description>` - Billing tests
- `test(inventory): <description>` - Inventory tests

---

## Final Steps

After all 26 tasks complete:

1. **Review all commits:**
   ```bash
   git log --oneline --graph HEAD~26..HEAD
   ```

2. **Push to remote:**
   ```bash
   git push origin feature/technician-attribution-week2
   ```

3. **Tag completion:**
   ```bash
   git tag week2-complete -m "Week 2: Billing & Inventory integration complete"
   git push origin week2-complete
   ```

4. **Report completion with summary from:**
   ```bash
   cat docs/summaries/2025-11-04-week2-complete.md
   ```

---

## Ready to Execute

**Command for new Claude Code agent:**

```
Execute the Week 2 implementation plan at docs/plans/2025-11-04-user-accounts-week2-billing-inventory.md
```

**Expected Duration:** 5 days worth of work (26 tasks, ~40 hours)

**Expected Output:**
- ~26 commits across Billing and Inventory services
- Technician attribution working in production
- Role-based access controls active
- Comprehensive audit logging operational

---

**Good luck! 🚀**
