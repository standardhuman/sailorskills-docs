# Backlog  Completed Items

**Status:** Reference
**Last Updated:** 2025-11-02

This file contains items not yet scheduled and historical completed items for reference.

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

### Data Quality & Migration
- [ ] **Manual Review of Service Log-Invoice Missing Links**
  - **Rationale:** After automated Zoho billing migration, 337 service logs (23.1%) remain unlinked to invoices. Manual review can link an additional 40-80 logs where automated matching failed, improving data integrity and billing accuracy. Remaining unlinked logs are structural (pre-Zoho services, customers not in Zoho).
  - **Current State:**
    - Total service logs: ~1,460
    - Currently linked: 1,123 (76.9%)
    - Unlinked remaining: 337 (23.1%)
    - Automated matching complete, manual review needed for edge cases
  - **Breakdown of Unlinked Logs:**
    - 163 logs (48.4%): Services before first Zoho invoice → Skip, no invoice exists
    - 82 logs (24.3%): Customer has no Zoho invoices → Skip, not in Zoho
    - 37 logs (11.0%): Recent services (post-Zoho migration) → **High priority to link**
    - 24 logs (7.1%): Gap >30 days from nearest invoice → **Medium priority review**
    - 19 logs (5.6%): Service after last invoice → Review (customer left?)
    - 12 logs (3.6%): Unknown customer → Skip, cannot identify
  - **Review Process:**
    - Use CLI helper tool: `npm run manual-link -- <service_log_id>`
    - Tool shows service details, customer's invoices, closest matches by date
    - Actions: Link to invoice, mark as reviewed/skipped, or flag for later
    - Prioritize recent services (Sept-Oct 2025) - likely modern invoices exist
    - Review wide gaps (>30 days) - may be legitimate linkages
    - Skip pre-Zoho services and customers with no Zoho history
  - **Key Files:**
    - `scripts/zoho-migration/MANUAL_REVIEW_GUIDE.md` - Complete review guide with SQL queries
    - `scripts/zoho-migration/unlinked-service-logs-remaining.csv` - 337 logs to review
    - `scripts/zoho-migration/manual-link-helper.mjs` - CLI tool (via `npm run manual-link`)
  - **Expected Outcomes:**
    - **Best case:** Link 60-80 additional logs (recent services + wide gaps)
    - **Realistic:** Link 40-50 logs (mostly recent services)
    - **Final linkage rate:** 79-80% (up from current 76.9%)
    - Remaining ~250-280 unlinked logs are structural limitations and should remain unlinked
  - **Implementation:**
    - Use existing CLI tool and helper scripts
    - Review in priority order: recent services (37) → wide gaps (24) → others
    - Document decisions and rationale
    - Update database directly via SQL or helper tool
    - Track progress with SQL queries (linkage percentage)
  - **Impact:**
    - Improved billing accuracy and data integrity
    - Better understanding of customer service history
    - Foundation for accurate revenue reporting in Dashboard
    - Clean historical data for future analytics
  - **Dependencies:** Zoho migration complete (already done)
  - **Priority:** Low (data quality improvement, not urgent)
  - **Estimated Effort:** 4-8 hours (depends on review thoroughness)
    - Recent services review (37 logs): 1-2 hours
    - Wide gap review (24 logs): 1-2 hours
    - Other cases investigation: 2-4 hours

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
