# Sailorskills Suite - Roadmap

Last updated: 2025-10-20

## Overview
This roadmap tracks major cross-service initiatives, architectural changes, and strategic priorities for the Sailorskills suite.

---

## Q4 2025 - Current Quarter

### Service Architecture & Naming
- [ ] **Rename sailorskills-billing → sailorskills-completion**
  - **Rationale:** Current name undersells the service - it's 60% service documentation/condition tracking and 40% payment processing. "Completion" better reflects its role as the final step in the service workflow where technicians document work performed AND process payment.
  - **Impact:** Repository rename, Vercel project, documentation updates, edge function references, hardcoded URLs
  - **Dependencies:** None
  - **Priority:** Medium
  - **Estimated Effort:** 2-3 hours

### Documentation & Governance
- [x] Establish project management documentation repository (sailorskills-docs)
- [x] Define project manager rules and cross-service guidelines in CLAUDE.md
- [ ] Create architecture diagrams in docs/ directory
- [ ] Create INTEGRATIONS.md documenting all external APIs

### Operations - Workflow & Data
- [ ] **Pending Orders Queue & Confirmation Workflow**
  - **Rationale:** Currently no dedicated view for incoming orders from Estimator - orders go straight to calendar without confirmation step. Need proper order intake workflow.
  - **Features:**
    - Dedicated "Pending Orders" inbox showing all `service_orders` with `status='pending'`
    - Order details view (customer, boat, service type, estimated amount, order number)
    - Action buttons: "Confirm & Schedule", "Decline", "Contact Customer"
    - Calendar picker to set actual `scheduled_date`
    - Status update workflow: pending → confirmed → in_progress → completed
    - Notifications when new orders arrive from Estimator
  - **Impact:** Proper order management workflow, prevents missed orders, enables scheduling conflicts detection
  - **Dependencies:** Existing `service_orders` table
  - **Priority:** High (critical workflow gap)
  - **Estimated Effort:** 1-2 days

- [ ] **Import Notion service log data to Supabase**
  - **Rationale:** Migrate historical service data (Boat Conditions Log + Admin Log) from Notion child databases into service_logs table
  - **Details:** See `/sailorskills-operations/NOTION_SERVICE_LOG_IMPORT_HANDOFF.md`
  - **Impact:** Operations service history, YouTube playlist links added to boats table
  - **Dependencies:** Notion API token, existing boats table from customer profile import
  - **Priority:** High (foundational data for Operations)
  - **Estimated Effort:** ~90 minutes

---

## Q1 2026

### Dashboard & Analytics
- [ ] Complete core analytics widgets for sailorskills-dashboard
- [ ] Implement revenue tracking across all services
- [ ] Add booking conversion rate metrics
- [ ] Customer lifetime value calculations

### Operations Improvements
- [ ] **Customer Portal - Full Implementation**
  - **Rationale:** Build comprehensive customer-facing portal for service history, billing, messaging, and account management
  - **Details:** See `/sailorskills-operations/CUSTOMER_PORTAL_IMPLEMENTATION.md`
  - **Key Features:** Multi-boat access, dual auth (magic link + password), billing integration, two-way messaging, service requests, notifications
  - **Impact:** Major customer experience enhancement, reduces support burden, enables self-service
  - **Dependencies:** Notion service log import (historical data), Stripe integration, email service setup
  - **Priority:** High
  - **Estimated Effort:** 8-10 days (10 phases)

- [ ] **Admin Settings & Configuration Panels**
  - **Rationale:** Need centralized control over business operations: email notifications, pricing variables, and customer-facing content. Currently these are hardcoded or require code changes.
  - **Architecture:** Distributed approach - each service manages its own settings panel to maintain service autonomy
  - **Features by Service:**
    - **Estimator Settings:**
      - Pricing variables panel (anode margin %, service base prices, surcharge rates)
      - Labor rate configuration
      - Tax/fee settings
    - **Operations Settings:**
      - Email toggles (service completion notifications, order confirmations)
      - Customer portal format/content settings (branding, welcome text, feature visibility)
      - Default service templates
    - **Completion Settings:**
      - Email toggles (payment receipts, invoice notifications)
      - Email content configuration (footer text, payment terms)
      - Invoice formatting options
    - **Booking Settings:**
      - Email toggles (booking confirmations, reminders, cancellations)
      - Booking policy text customization
  - **Technical Implementation:**
    - New `business_settings` table in Supabase (JSONB for flexibility)
    - Settings structure: `{ service: string, category: string, settings: jsonb }`
    - Edge function for settings validation and defaults
    - React settings panels with form validation
  - **Impact:** Eliminates need for code deployments to adjust pricing, email behavior, or customer-facing content. Enables quick business process changes without developer intervention.
  - **Dependencies:** Customer Portal implementation (portal must exist before format settings can be configured)
  - **Priority:** Medium (Q1 2026 - after customer portal)
  - **Estimated Effort:** 3-4 days (1 day planning/database, 2-3 days implementing panels across services)

- [ ] Enhance packing list automation
- [ ] Improve service history visualization
- [ ] Mobile optimization for field use

---

## Q2 2026

### Booking & Scheduling
- [ ] Complete remaining phases of sailorskills-booking (50% → 100%)
- [ ] Google Calendar sync enhancements
- [ ] Automated reminder system

### Video Management
- [ ] Complete mobile app development (React Native/Expo)
- [ ] GoPro WiFi integration for direct uploads
- [ ] Enhanced YouTube playlist automation

---

## Backlog - Not Yet Scheduled

### Infrastructure
- [ ] Implement centralized logging/monitoring across services
- [ ] Performance optimization for Supabase queries
- [ ] Automated backup and disaster recovery procedures

### Customer Experience
- [ ] Unified customer portal across all services (Operations portal scheduled for Q1 2026 - see Operations Improvements)
- [ ] Mobile-responsive design system updates
- [ ] Customer notification preferences (included in Operations portal - Q1 2026)

### Inventory & Parts
- [ ] Automated reordering system based on usage patterns
- [ ] Enhanced AI product recommendations (Gemini integration)
- [ ] Multi-location inventory support

---

## Completed

### 2025-10-19
- [x] Established sailorskills-docs repository for project management
- [x] Created project manager guidelines in CLAUDE.md

### 2025-10-17
- [x] Consolidated service_conditions_log and service_conditions → service_logs (unified table)
- [x] Enhanced propeller tracking with JSONB array (supports unlimited propellers)
- [x] Added granular paint detail tracking (keel, waterline, boot stripe)

---

## Notes

### Priority Definitions
- **Critical:** Blocks other work or affects production
- **High:** Important for business goals, scheduled for current quarter
- **Medium:** Valuable improvement, scheduled for next 2 quarters
- **Low:** Nice-to-have, in backlog

### Cross-Service Coordination
When planning features that touch multiple services, follow the data flow:
```
Estimator → Operations → Completion (billing) → Dashboard
                ↓
           Inventory
```
