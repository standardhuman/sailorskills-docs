# Sailorskills Suite - Stabilization & Growth Plan

**Created:** 2025-10-27
**Status:** ✅ Phase 1 Complete | 🟡 Phase 2 Ready to Start
**Last Updated:** 2025-10-27
**Phase 1 Completed:** 2025-10-27

---

## Executive Summary

This plan addresses critical security, compliance, and stability issues identified in the October 2025 State of the Project audit. The work is organized into 4 phases spanning 6 weeks, focusing on security, consistency, testing, and roadmap completion.

**Total Effort:** 80-100 hours (~2-2.5 months at 10 hours/week, or 3-4 weeks full-time)

---

## PHASE 1: CRITICAL SECURITY & COMPLIANCE ✅ COMPLETE
**Goal:** Fix security vulnerabilities and establish governance compliance
**Duration:** Week 1 (5-7 days)
**Effort:** 20-25 hours (Actual: ~8-10 hours)
**Priority:** 🔴 CRITICAL
**Completed:** 2025-10-27

### Task 1.1: Verify & Fix Operations Authentication 🔴 URGENT
**Status:** ✅ Complete
**Owner:** Engineering Team
**Effort:** 1-2 hours (if needs fixing)
**Dependencies:** None

**Problem:**
- October 24 security audit found Operations dashboard publicly accessible
- Customer data, service schedules, business data exposed
- Auth code exists in `src/auth/auth.js` but not called on page load

**Steps:**
1. Test Operations dashboard at ops.sailorskills.com without credentials
2. If publicly accessible, add auth enforcement to `index.html` or `main.js`
3. Deploy to production immediately
4. Verify auth is working with Playwright test
5. Document auth implementation pattern

**Success Criteria:**
- ✅ Operations requires authentication before showing any customer data
- ✅ Playwright test confirms auth enforcement
- ✅ Documentation updated

**Files to Modify:**
- `sailorskills-operations/index.html` or `src/main.js`
- `sailorskills-operations/CLAUDE.md` (document auth pattern)

---

### Task 1.2: Create MIGRATION_SUMMARY.md 🟠 HIGH
**Status:** ✅ Complete
**Owner:** Engineering Team
**Effort:** 3-4 hours
**Dependencies:** Database access tools (already available)

**Problem:**
- CLAUDE.md governance requires MIGRATION_SUMMARY.md - currently missing
- 14+ migrations in billing repo alone, no central tracking
- No documented migration history across services

**Steps:**
1. Review all migration files across services
   - `sailorskills-billing/supabase/migrations/*.sql` (14+ files)
   - Other services' migration directories
2. Query database for actual schema state using `db-env.sh`
3. Document each migration with:
   - Timestamp
   - Tables affected
   - Services impacted
   - Purpose/rationale
4. Create ongoing update process (add to PR template)

**Success Criteria:**
- ✅ Complete migration history documented
- ✅ CLAUDE.md governance requirement met
- ✅ Process established for future migrations

**Files to Create:**
- `/Users/brian/app-development/sailorskills-repos/MIGRATION_SUMMARY.md`

**Reference Migrations:**
- `sailorskills-billing/supabase/migrations/001_customer_services.sql`
- `sailorskills-billing/supabase/migrations/014_fix_foreign_keys_and_table_names.sql`
- And 12 others

---

### Task 1.3: Create INTEGRATIONS.md 🟠 HIGH
**Status:** ✅ Complete
**Owner:** Engineering Team
**Effort:** 2-3 hours
**Dependencies:** None

**Problem:**
- CLAUDE.md governance requires INTEGRATIONS.md - currently missing
- External API integrations scattered across service documentation
- No central inventory of API keys, webhooks, rate limits

**Steps:**
1. Audit all external API integrations:
   - **Stripe** (payment processing, webhooks)
   - **Resend** (email notifications)
   - **YouTube API** (video management)
   - **Google Calendar API** (booking)
   - **Gemini AI** (inventory recommendations)
2. Document for each:
   - Purpose and which services use it
   - API keys/secrets required (env var names)
   - Webhook endpoints and events
   - Rate limits and quotas
   - Error handling patterns
3. Create secret rotation schedule

**Success Criteria:**
- ✅ All integrations documented
- ✅ CLAUDE.md governance requirement met
- ✅ Secret rotation schedule established

**Files to Create:**
- `/Users/brian/app-development/sailorskills-repos/INTEGRATIONS.md`

**Sources:**
- `sailorskills-estimator/CLAUDE.md` (Stripe webhooks documented)
- Service README files (integration points)
- Vercel environment variables

---

### Task 1.4: Database Schema Audit & Validation 🟠 HIGH
**Status:** ✅ Complete
**Owner:** Engineering Team
**Effort:** 4-6 hours
**Dependencies:** Database access tools

**Problem:**
- Schema validation shows missing columns/tables:
  - `service_logs.technician` (missing)
  - `invoices.total` (missing)
  - `service_requests.customer_id` (missing)
  - `messages` table (doesn't exist)
- Suggests drift between code expectations and actual schema

**Steps:**
1. Run schema validation across all services:
   ```bash
   node sailorskills-portal/scripts/test-helpers/example-check-schema.mjs
   ```
2. Document all discrepancies found
3. Determine which are code bugs vs. schema gaps:
   - Check service code to see if columns are actually used
   - Query database to confirm missing elements
4. Create migration plan for genuine schema gaps
5. Update service code for false expectations
6. Run migrations using `run-migration.mjs`
7. Re-run validation to confirm success

**Success Criteria:**
- ✅ Schema matches all service expectations
- ✅ No validation errors
- ✅ Migrations documented in MIGRATION_SUMMARY.md

**Tools:**
- `sailorskills-portal/scripts/test-helpers/example-check-schema.mjs`
- `sailorskills-portal/scripts/test-helpers/run-migration.mjs`
- `db-env.sh` for direct SQL queries

---

## PHASE 2: SHARED PACKAGE ADOPTION ⏳ IN PROGRESS
**Goal:** Establish consistent design system and eliminate code duplication
**Duration:** Week 2 (5-7 days)
**Effort:** 15-20 hours
**Priority:** 🟠 HIGH
**Status:** 1/4 tasks complete (25%)
**Started:** 2025-10-27

### Task 2.1: Add Shared Submodule to Missing Services ✅ COMPLETE
**Affected Services:** billing, dashboard, inventory, operations, video (5 services)
**Effort:** 3-4 hours (Actual: 2 hours)
**Completed:** 2025-10-27

**Problem:**
- Only 50% of services have shared submodule (booking, estimator, portal, site)
- Missing from: billing, dashboard, inventory, operations, video
- Causes design inconsistency, code duplication, breaking change risks

**Steps:**
1. For each service missing shared submodule:
   ```bash
   cd sailorskills-[service]
   git submodule add https://github.com/standardhuman/sailorskills-shared.git shared
   git submodule update --init --recursive
   ```
2. Update each service's HTML to import:
   - `/shared/src/ui/design-tokens.css`
   - `/shared/src/ui/styles.css`
   - Montserrat font (Google Fonts)
3. Test build for each service: `npm run build`
4. Deploy to Vercel: `vercel --prod`
5. Smoke test in production

**Success Criteria:**
- ✅ All 9 services have shared submodule (was 4/9, now 9/9)
- ✅ All builds succeed (Operations, Billing tested)
- ⏳ No visual regressions in production (awaiting verification)

**Commits:**
- Operations: a0d685c
- Dashboard: 0f74001
- Inventory: 0f08c1b
- Billing: d794c55
- Video: No changes needed (no CDN imports)

**Rationale Confirmed:**
Git submodules prevent breaking change risks by allowing controlled rollout of shared package updates per service, versus CDN approach where all services update instantly.

---

### Task 2.2: Migrate to Shared Utilities ⏳ NEXT
**Effort:** 6-8 hours
**Status:** Awaiting Task 2.1 production verification

**Problem:**
- Auth utilities duplicated (SimpleAuth, InventoryAuth)
- Supabase client initialization duplicated
- Stripe helpers duplicated
- UI components duplicated

**Steps:**
1. Audit duplicated code in services without shared pkg
2. Replace with shared package imports:
   - Auth: Use `SimpleAuth` from shared
   - Supabase: Use `createSupabaseClient()` from shared
   - Stripe: Use `initStripe()`, `createCardElement()` from shared
   - UI: Use `createModal()`, `showToast()` from shared
3. Remove duplicated code files
4. Test authentication flows
5. Test payment flows

**Success Criteria:**
- ✅ No duplicated utility code
- ✅ All services use shared exports
- ✅ All tests passing

---

### Task 2.3: Implement Shared Navigation System 🟡 MEDIUM
**Effort:** 4-6 hours

**Problem:**
- Shared navigation system exists but not integrated everywhere
- Inconsistent nav across services
- Navigation compliance tests failing for some services

**Steps:**
1. Add navigation to services missing it:
   - Operations: `initNavigation({ currentPage: 'operations' })`
   - Estimator: `initNavigation({ currentPage: 'estimator' })`
   - Billing: `initNavigation({ currentPage: 'billing' })`
   - Inventory, Video (if applicable)
2. Configure breadcrumbs for each service
3. Run navigation compliance tests:
   ```bash
   cd shared
   npx playwright test tests/navigation-compliance.spec.js -g "[Service]"
   ```
4. Fix any failures

**Success Criteria:**
- ✅ All services pass navigation compliance tests (7/7)
- ✅ Consistent nav UX across suite

---

### Task 2.4: Design Token Audit 🟡 MEDIUM
**Effort:** 2-3 hours

**Problem:**
- Hardcoded colors in services without shared pkg
- Inconsistent border-radius usage
- Design system violations

**Steps:**
1. Search for hardcoded colors:
   ```bash
   grep -r "#[0-9a-fA-F]\{6\}" --include="*.css" --include="*.html" sailorskills-*/
   ```
2. Replace with CSS variables from `design-tokens.css`
3. Search for hardcoded `border-radius` values
4. Replace with `var(--ss-radius-none)` for sharp corners
5. Verify visual consistency across all services

**Success Criteria:**
- ✅ No hardcoded design values
- ✅ Consistent visual style suite-wide

---

## PHASE 3: TESTING & ARCHITECTURE ⏳ UPCOMING
**Goal:** Establish cross-service testing and document architecture
**Duration:** Weeks 3-4 (10-12 days)
**Effort:** 25-30 hours
**Priority:** 🟠 HIGH
**Status:** Not Started

### Task 3.1: Create Table Ownership Matrix 🟠 HIGH
**Effort:** 2-3 hours

**Problem:**
- Unclear which service owns which tables
- No documented coordination process for shared tables
- Risk of conflicting schema changes

**Steps:**
1. List all database tables:
   ```bash
   source db-env.sh
   psql "$DATABASE_URL" -c "\dt"
   ```
2. For each table, document:
   - Which service owns it (can write/modify schema)
   - Which services read from it
   - Whether updates require cross-service coordination
3. Create markdown table with ownership
4. Add to MIGRATION_SUMMARY.md

**Success Criteria:**
- ✅ Clear ownership for every table
- ✅ Coordination process defined
- ✅ Added to governance documentation

---

### Task 3.2: Create Architecture Diagrams 🟠 HIGH
**Effort:** 6-8 hours

**Problem:**
- CLAUDE.md requires architecture diagrams - currently missing
- Only `docs/archive/` folder exists, no current diagrams
- Complex service relationships not visually documented

**Steps:**
1. **Service Relationship Diagram:**
   - Show all 10 services
   - Data flow arrows (Estimator → Operations → Billing → Dashboard)
   - Integration points (Inventory, Video)
2. **Database Schema ERD:**
   - All tables with relationships
   - Foreign keys
   - Table ownership color-coded
3. **Edge Function & Webhook Map:**
   - All Supabase edge functions
   - Stripe webhooks
   - External API calls
4. Create using Mermaid (markdown-embeddable) or LucidChart/Draw.io
5. Save to `docs/architecture/` folder
6. Export as PNG/PDF and markdown

**Success Criteria:**
- ✅ Complete visual documentation of system architecture
- ✅ Diagrams accessible in `docs/architecture/`
- ✅ CLAUDE.md governance requirement met

---

### Task 3.3: Build Cross-Service Integration Test Suite 🟠 HIGH
**Effort:** 10-12 hours

**Problem:**
- No automated cross-service integration tests
- Each service tested in isolation only
- Critical user flows not validated end-to-end

**Steps:**
1. **Test: Estimator → Operations Flow**
   - Create quote in Estimator
   - Verify booking appears in Operations
   - Check customer/boat data synced
2. **Test: Billing → Portal Flow**
   - Create invoice in Billing
   - Verify appears in Portal for customer
   - Check RLS isolation (customer A can't see B's invoices)
3. **Test: Operations → Dashboard Flow**
   - Complete service in Operations
   - Verify metrics update in Dashboard
   - Check revenue calculations
4. **Test: Inventory → Operations Integration**
   - Query anode needs for packing list
   - Verify stock levels shown
   - Test storage location lookups
5. Create test runner script: `tests/integration/run-all.spec.js`
6. Add to CI/CD (GitHub Actions)

**Success Criteria:**
- ✅ 4 major integration flows tested end-to-end
- ✅ Tests automated and passing
- ✅ Added to CI/CD pipeline

---

### Task 3.4: Create RLS Policy Test Suite 🟡 MEDIUM
**Effort:** 4-5 hours

**Problem:**
- Recent RLS bugs found in production (Oct 26)
- No automated RLS policy tests
- Risk of data leakage

**Steps:**
1. Create test script with role switching:
   - Admin role (standardhuman@gmail.com)
   - Customer role A (test customer 1)
   - Customer role B (test customer 2)
2. Test RLS for each major table:
   - `customers` - customer sees only their record
   - `boats` - customer sees only their boats
   - `service_logs` - customer sees only their boats' logs
   - `invoices` - customer sees only their invoices
3. Test admin bypass (admin sees all)
4. Add to test suite: `tests/security/rls-policies.spec.js`

**Success Criteria:**
- ✅ RLS policies verified to prevent data leakage
- ✅ Tests automated
- ✅ No security vulnerabilities found

---

## PHASE 4: ROADMAP & STANDARDIZATION ⏳ UPCOMING
**Goal:** Complete Q4 roadmap items and standardize authentication
**Duration:** Weeks 5-6 (10-12 days)
**Effort:** 20-25 hours
**Priority:** 🟡 MEDIUM
**Status:** Not Started

### Task 4.1: Complete Pending Orders Queue 🟠 HIGH (Roadmap Item)
**Effort:** 8-12 hours (1-2 days per roadmap)

**Problem:**
- Roadmap priority: HIGH (critical workflow gap)
- Currently no dedicated view for incoming orders from Estimator
- Orders go straight to calendar without confirmation step

**Steps:**
1. Create `pending_orders` view in Operations dashboard
2. Query `service_orders` table where `status='pending'`
3. Build order card UI showing:
   - Customer name, boat, service type
   - Estimated amount, order number
   - Order date
4. Add action buttons:
   - "Confirm & Schedule" → calendar picker
   - "Decline" → status update
   - "Contact Customer" → message link
5. Implement status workflow: pending → confirmed → in_progress → completed
6. Test workflow end-to-end

**Success Criteria:**
- ✅ Operations has functional order intake workflow
- ✅ Orders flow: Estimator → Pending → Confirmed → Scheduled
- ✅ No orders missed

---

### Task 4.2: Import Notion Service Log Data 🟠 HIGH (Roadmap Item)
**Effort:** 2-3 hours (~90 min per roadmap)

**Problem:**
- Roadmap priority: HIGH (foundational data for Operations)
- Historical service data (Boat Conditions Log + Admin Log) still in Notion
- Not available in Operations or Portal

**Steps:**
1. Review `/sailorskills-operations/NOTION_SERVICE_LOG_IMPORT_HANDOFF.md`
2. Export Notion data (Boat Conditions Log + Admin Log child databases)
3. Run migration script to transform Notion → Supabase:
   - Map multi-select tags to structured data
   - Normalize boat names, dates
   - Parse service log URLs
4. Validate data integrity (spot check 10-20 records)
5. Add YouTube playlist URLs to boats table
6. Verify service history appears in Operations and Portal

**Success Criteria:**
- ✅ Historical service data successfully migrated
- ✅ Visible in Operations service history
- ✅ Visible in Portal for customers

---

### Task 4.3: Standardize Authentication Across Services 🟡 MEDIUM
**Effort:** 6-8 hours

**Problem:**
- 3 different auth systems (Supabase Auth, SimpleAuth, InventoryAuth)
- Different credentials per service
- Test credential works in some services but not others

**Steps:**
1. **Decision:** Choose Supabase Auth as standard (recommended)
   - Already used by Portal and Operations
   - Supports email/password, magic links, MFA
   - Integrates with RLS policies
2. Migrate SimpleAuth services to Supabase Auth:
   - Dashboard (`sailorskills-dashboard/js/auth.js`)
   - Billing (`sailorskills-billing/src/auth/auth.js`)
3. Migrate InventoryAuth to Supabase Auth:
   - Inventory service (`sailorskills-inventory/auth.js`)
4. Update test credentials to be consistent:
   - All admin services use `standardhuman@gmail.com` / `KLRss!650`
5. Document auth implementation standard in CLAUDE.md
6. Test login flow for all services

**Success Criteria:**
- ✅ Single auth system across all admin services
- ✅ Consistent credentials suite-wide
- ✅ All auth flows tested and working

---

### Task 4.4: Add MFA for Production 🟡 MEDIUM
**Effort:** 2-3 hours

**Problem:**
- Admin services handle sensitive customer data
- No multi-factor authentication currently
- Single-factor auth insufficient for production

**Steps:**
1. Enable MFA in Supabase project settings
2. Update auth flows to support TOTP/SMS
3. Test MFA enrollment and login
4. Document MFA setup process for team members
5. Make MFA required for admin services in production

**Success Criteria:**
- ✅ MFA enabled and tested for all admin users
- ✅ Documentation created
- ✅ Production security improved

---

## PROGRESS TRACKING

### Phase Completion Status:
- Phase 1 (Security & Compliance): ✅ 4/4 tasks complete (100%) - DONE 2025-10-27
- Phase 2 (Shared Package): ⏳ 1/4 tasks complete (25%) - IN PROGRESS
- Phase 3 (Testing & Architecture): ⏳ 0/4 tasks complete (0%)
- Phase 4 (Roadmap & Auth): ⏳ 0/4 tasks complete (0%)

### Overall Progress: 5/16 tasks complete (31%)

---

## EFFORT SUMMARY

| Phase | Tasks | Effort | Duration | Priority |
|-------|-------|--------|----------|----------|
| Phase 1: Security & Compliance | 4 | 20-25 hours (actual: 8-10) | Week 1 ✅ | 🔴 CRITICAL |
| Phase 2: Shared Package | 4 | 15-20 hours | Week 2 | 🟠 HIGH |
| Phase 3: Testing & Architecture | 4 | 25-30 hours | Weeks 3-4 | 🟠 HIGH |
| Phase 4: Roadmap & Auth | 4 | 20-25 hours | Weeks 5-6 | 🟡 MEDIUM |
| **TOTAL** | **16** | **80-100 hours** | **6 weeks** | |

---

## SUCCESS METRICS

### By End of Phase 1:
- ✅ All admin services require authentication
- ✅ All governance-required docs exist (MIGRATION_SUMMARY, INTEGRATIONS)
- ✅ Zero schema validation errors
- ✅ No security vulnerabilities

### By End of Phase 2:
- ✅ 100% of services use shared package
- ✅ Zero duplicated utility code
- ✅ All navigation compliance tests passing

### By End of Phase 3:
- ✅ Cross-service integration tests passing
- ✅ Architecture fully documented with diagrams
- ✅ RLS policies tested and verified

### By End of Phase 4:
- ✅ Q4 roadmap items delivered
- ✅ Single auth system across all services
- ✅ MFA enabled for production

---

## RISKS & MITIGATION

### Risk 1: Operations Auth May Break Existing Workflows
**Mitigation:** Test thoroughly in Playwright before deploying, have rollback plan ready

### Risk 2: Schema Migrations Could Cause Data Loss
**Mitigation:** Use transaction support, dry-run mode, test on staging data first

### Risk 3: Shared Package Changes Could Break Services
**Mitigation:** Test in each service before merging, use semantic versioning

### Risk 4: Time Estimates May Be Optimistic
**Mitigation:** Focus on Phase 1 critical items first, defer optional work

---

## DEPENDENCIES

- Database access tools (✅ Available: `db-env.sh`, `run-migration.mjs`)
- Playwright MCP for testing (✅ Available per CLAUDE.md)
- Supabase database access (✅ Working)
- Vercel deployment access (✅ Working)
- GitHub push access (✅ Working)

---

## COMMUNICATION

### Updates:
- This document updated after each task completion
- Git commits reference this plan: `[PLAN-1.1] Fix Operations auth`
- Weekly summary updates to stakeholders

### Questions/Blockers:
- Document blockers in this file under "BLOCKERS" section (create as needed)
- Ping team for decisions on auth standardization, migration priorities

---

## NEXT ACTIONS (THIS WEEK)

1. ✅ Create this plan document (DONE)
2. ⏳ Verify Operations auth enforcement (30 min)
3. ⏳ Create MIGRATION_SUMMARY.md (3-4 hours)
4. ⏳ Create INTEGRATIONS.md (2-3 hours)
5. ⏳ Run database schema audit (4-6 hours)

**Estimated completion of Phase 1:** End of Week 1

---

**Document Version:** 1.0
**Last Updated:** 2025-10-27
**Next Review:** After Phase 1 completion
