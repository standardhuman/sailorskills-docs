# Sailorskills Suite - Roadmap

Last updated: 2025-11-06

## Overview
This roadmap tracks major cross-service initiatives, architectural changes, and strategic priorities for the Sailorskills suite.

**Navigation:**
- **Current Quarter:** Q4 2025 (below)
- **Next Quarter:** Q1 2026 (below)
- **[Detailed Q4 2025 Tasks](docs/roadmap/2025-Q4-ACTIVE.md)** - Full specifications and implementation details
- **[Detailed Q1 2026 Tasks](docs/roadmap/2026-Q1-ACTIVE.md)** - Full specifications and implementation details
- **[Q2 2026 & Beyond Planning](docs/roadmap/2026-Q2-PLANNED.md)** - Future quarter initiatives
- **[Backlog & Completed](docs/roadmap/archive/BACKLOG_AND_COMPLETED.md)** - Reference archive

---

## Progress Dashboard

### Q4 2025 Status
- ✅ **Portal Separation:** Complete
- ✅ **Testing Platform:** Complete
- ✅ **Notion Roadmap Integration:** Complete
- ✅ **Dashboard → Insight Rename:** Complete (2025-11-02)
- ✅ **Settings Service Design:** Complete (2025-11-06) - Design doc + 30-task implementation plan
- ✅ **Admin Customer Impersonation Design:** Complete (2025-11-06) - Design doc + 10-task implementation plan
- 🚧 **Settings Service Implementation:** In Progress (2025-11-06) - Executing in parallel session
- 🚧 **Admin Customer Impersonation:** Ready for Implementation (2025-11-06) - Worktree created
- ⏳ **Billing → Completion Rename:** Pending (Medium Priority)
- ⏳ **Dashboard Navigation Fix:** Pending (Medium Priority)
- ⏳ **Operations Navigation Optimization:** Pending (Medium Priority)
- ⏳ **React Roadmap Visualization:** Pending (Medium Priority)

### Q1 2026 Priorities
1. **Mobile Apps:** Complete Video (87% done), Start Billing PWA/Native
2. **User Accounts:** Multi-user foundation with audit logging
3. **Strategic Insight:** Transform Insight service into comprehensive BI platform
4. **Referral Tracking:** Customer acquisition analytics
5. **Service Notifications:** Safety check-in system

---

## Q4 2025 - Current Quarter

**Focus:** Service architecture cleanup, navigation improvements, testing infrastructure
**[View Detailed Tasks](docs/roadmap/2025-Q4-ACTIVE.md)**

### Top Priorities

#### 1. Rename Dashboard → Insight (2-3 hours) ✅ COMPLETE
- **Completed:** 2025-11-02
- **Why:** Differentiate strategic BI from operational dashboards
- **Impact:** Clarity across all services, clean slate for Q1 transformation
- **Tasks:** GitHub repo rename, Vercel project update, navigation updates

#### 2. Dashboard Navigation Fix (1-2 hours)
- **Issue:** Breadcrumb showing instead of second-tier navigation
- **Fix:** Remove breadcrumb remnants, use shared nav component

#### 3. Operations Navigation Optimization (8-14 hours)
- **Goal:** Reduce navigation items by 30-50% with dropdowns/grouping
- **Phases:** Audit (2-3h) → Design (2-3h) → Implementation (4-6h) → Testing (1-2h)

#### 4. React Roadmap Visualization (4-6 hours)
- **Build:** Interactive Gantt chart using SVAR library
- **Features:** Timeline + Kanban views, filter by quarter/service/priority

#### 5. Settings Service (4 weeks) 🚧 IN PROGRESS
- **Goal:** Centralized configuration management for entire suite
- **Completed:** Design document (747 lines), Implementation plan (30 tasks), Git worktree setup
- **In Progress:** Foundation tasks (service structure, database migrations, email management)
- **Features:**
  - Email template management with engagement tracking (opens, clicks, replies)
  - Business pricing configuration (21 variables from Estimator/Billing)
  - User/team management with role-based access
  - Integration/API key management (Resend, Stripe, YouTube, etc.)
- **Impact:** Eliminates 21 hardcoded pricing duplicates, enables email content updates without deployments
- **Timeline:** Started 2025-11-06, targeting completion 2025-12-06

### Recently Completed ✅
- **Portal Separation** (2025-10-25): Customer portal now separate service
- **Testing Platform** (2025-10-29): Comprehensive test infrastructure
- **Notion Integration** (2025-11-02): Automated roadmap sync to Notion
- **Pending Orders Queue** (2025-10-30): Order intake workflow
- **Needs Scheduling Queue** (2025-10-30): Ad-hoc service capture

---

## Q1 2026 - Next Quarter

**Focus:** Mobile apps, user accounts, business intelligence transformation
**[View Detailed Tasks](docs/roadmap/2026-Q1-ACTIVE.md)**

### Critical Initiatives

#### 1. Mobile-First Platform (5-6 weeks)
**Phase 1:** Complete Video Mobile (5-7 days) - 87% done, final testing & deployment
**Phase 2:** Billing PWA Quick Fix (3-5 days) - Session persistence during dives
**Phase 3:** Billing Native App (3-4 weeks) - Leverage Video mobile codebase

**Why:** Field ops need native apps for session persistence, background uploads, offline support

#### 2. User Accounts & Audit Logging (3-4 weeks) 🔑 FOUNDATIONAL
**Core Features:**
- User roles (Owner, Admin, Technician, Contractor, Viewer)
- Comprehensive audit logging (who, what, when across all services)
- Role-based access control (RBAC with RLS policies)
- Revenue attribution per technician

**Why:** Required for multi-user operations, accountability, performance tracking

#### 3. Strategic Business Intelligence: Insight Service (7-8 weeks)
**Transform Insight into comprehensive BI Platform:**
- Four adaptive perspectives (Executive, Financial, Operations, Customer)
- Interactive what-if scenario modeling (pricing, capacity, hiring)
- Materialized database views for performance
- Critical alerts integration

**Why:** Data-driven decisions about pricing, capacity, customer focus, growth

#### 4. Comprehensive Referral Tracking (3-4 days)
**Track Customer Acquisition:**
- Referral sources (customer, staff, marketing, word-of-mouth)
- Referral rewards/incentives system
- Leaderboards and CAC analytics

**Why:** Identify effective marketing channels, reward referrers

#### 5. Service Start Notifications & Safety Check-In (2-3 days)
**Automatic Notifications:**
- SMS/email when technician starts service
- Safety tracking for long-running services
- Completion notifications

**Why:** Operational awareness, technician safety (especially divers)

### Dependencies
- User Accounts system blocks: Insight BI (technician metrics), Referral Tracking (staff attribution), Service Notifications (user roles)
- Mobile apps independent, can start immediately

---

## Q2 2026 & Beyond

**[View Planning Details](docs/roadmap/2026-Q2-PLANNED.md)**

### Major Initiatives
- Operations Native Mobile App (after Video/Billing proven)
- Ownership & Attribution Tracking System
- Inventory Management System
- Advanced Payment Features (recurring, autopay)
- Customer Portal Enhancements (notifications, preferences)

---

## Metrics & Goals

### Q4 2025 Goals
- [x] Complete all service renames (Dashboard → Insight, Billing → Completion) - Dashboard complete 2025-11-02
- [x] Design Settings service for centralized configuration - Complete 2025-11-06
- [ ] Complete Settings service implementation (4 weeks, targeting 2025-12-06)
- [ ] Fix navigation inconsistencies across services
- [ ] Deploy React roadmap visualization

### Q1 2026 Goals
- [ ] Video mobile app in production (App Store + Play Store)
- [ ] Billing PWA deployed with session persistence
- [ ] 3+ users onboarded with full audit logging
- [ ] Strategic Insight service launched with comprehensive BI features
- [ ] 90%+ new customers with referral source tracked

### Overall Suite Metrics
- **Services:** 10 active (Estimator, Operations, Portal, Billing, Inventory, Insight, Video, Booking, Site, Settings)
- **Database Tables:** 24+ core tables (customers, boats, service_logs, invoices, business_pricing_config, email_templates, etc.)
- **Deployment:** All on Vercel with auto-deploy from main
- **Testing:** Playwright + GitHub Actions CI/CD
- **Integration APIs:** Stripe, YouTube, Google Calendar, Gemini AI, Notion, Resend

---

## Quick Reference

### Service Architecture
```
Customer Acquisition → Service Delivery → Completion → Analytics
    Estimator      →    Operations    →   Billing    →   Insight
                   ↓
                 Portal (customer-facing)
                   ↓
            Inventory (parts management)
```

### Data Flow
```
Estimator quotes → Operations scheduling → Service execution →
Billing/Completion → Invoice generation → Insight analytics
```

### Deployment URLs
- **Estimator:** https://sailorskills.com
- **Operations:** https://ops.sailorskills.com
- **Portal:** https://portal.sailorskills.com
- **Billing:** https://sailorskills-billing.vercel.app
- **Insight:** https://sailorskills-insight.vercel.app
- **Inventory:** https://sailorskills-inventory.vercel.app
- **Video:** https://sailorskills-video.vercel.app
- **Booking:** https://booking.sailorskills.com
- **Site:** https://sailorskills.com
- **Settings:** https://sailorskills-settings.vercel.app (pending deployment)

---

## How to Use This Roadmap

### For Development Work
1. **Current tasks:** See Q4 2025 section above
2. **Detailed specs:** Click links to detailed quarterly files
3. **Dependencies:** Check "Dependencies" and "Blocks" in detailed files
4. **Update progress:** Update detailed files, then sync to Notion

### For Planning
1. **Next quarter:** Review Q1 2026 section
2. **Long-term:** Check Q2 2026 planning file
3. **Add tasks:** Update appropriate quarterly file
4. **Sync to Notion:** Run `npm run sync-roadmap`

### For Status Updates
1. **Mark tasks complete:** Update checkbox in detailed file
2. **Add completion date:** Add "Completed: YYYY-MM-DD" to task
3. **Update summary:** Reflect changes in this file's Progress Dashboard
4. **Sync:** Run `npm run sync-roadmap` to update Notion

---

**Questions or suggestions?** Update the appropriate detailed file or contact the project manager.
