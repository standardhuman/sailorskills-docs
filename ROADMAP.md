# Sailorskills Suite - Roadmap

Last updated: 2025-10-19

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

---

## Q1 2026

### Dashboard & Analytics
- [ ] Complete core analytics widgets for sailorskills-dashboard
- [ ] Implement revenue tracking across all services
- [ ] Add booking conversion rate metrics
- [ ] Customer lifetime value calculations

### Operations Improvements
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
- [ ] Unified customer portal across all services
- [ ] Mobile-responsive design system updates
- [ ] Customer notification preferences

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
