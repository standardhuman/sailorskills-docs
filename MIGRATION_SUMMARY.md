# Sailorskills Suite - Database Migration Summary

**Last Updated:** 2025-10-27
**Database:** Supabase PostgreSQL (fzygakldvvzxmahkdylq)
**Current Schema:** 55 tables (see Table Inventory section)

This document tracks all database schema migrations across the Sailorskills suite, as required by CLAUDE.md governance.

---

## Table of Contents

1. [Current Schema State](#current-schema-state)
2. [Table Ownership Matrix](#table-ownership-matrix)
3. [Migration History](#migration-history)
4. [Recent Critical Fixes](#recent-critical-fixes)
5. [Migration Process](#migration-process)

---

## Current Schema State

**Total Tables:** 55

### Core Business Tables
- `customers` - Customer account information
- `customer_accounts` - Customer portal authentication (separate from admin)
- `boats` - Boat details and ownership
- `service_orders` - Service bookings from Estimator
- `service_logs` - Service completion records
- `invoices` - Billing and payment records
- `payments` - Payment transactions

### Service-Specific Tables
- `boat_anodes` - Per-location anode tracking (Operations)
- `service_conditions` - Granular condition tracking (Operations)
- `paint_repaint_schedule` - Auto-calculated urgency (Operations)
- `youtube_playlists` - Boat video playlists (Video)
- `booking_settings` - Training scheduling config (Booking)
- `customer_messages` - Portal messaging system (Portal)

### Inventory Tables
- `anodes_catalog` - Anode products and specifications
- `inventory_items` - General inventory items
- `inventory_transactions` - Stock movements
- `purchase_orders` - Ordering system
- `replenishment_list` - Reorder queue (renamed from replenishment_queue)

### Support Tables
- `marinas` - Marina locations
- `addresses` - Customer addresses
- `admin_users` - Admin authentication
- `notification_log` - System notifications

**Full Table List (55 tables):**
```
addresses, admin_users, all_items_needing_reorder, anode_inventory,
anode_price_history, anode_sync_logs, anode_tool_requirements, anodes_catalog,
availability_rules, blackout_dates, blocked_dates, boat_anode_types,
boat_anodes, boat_owners, boat_service_flags, boat_service_schedules, boats,
booking_history, booking_settings, bookings, business_hours, customer_accounts,
customer_boat_access, customer_messages, customer_services, customers,
inventory_items, inventory_suppliers, inventory_transactions,
inventory_value_report, invoice_line_items, invoices, invoices_legacy,
item_categories, item_suppliers, marinas, notification_log,
paint_repaint_schedule, payments, pricing_settings, purchase_order_items,
purchase_orders, replenishment_list, replenishment_queue, scheduled_services,
service_conditions, service_conditions_log, service_history, service_logs,
service_orders, service_requests, service_schedules, service_types,
v_boat_anodes_with_stock, youtube_playlists
```

---

## Table Ownership Matrix

This section defines which service "owns" each table (can modify schema) and which services read from it.

### Estimator-Owned Tables
| Table | Writer | Readers | Notes |
|-------|--------|---------|-------|
| `service_orders` | Estimator | Operations, Dashboard | Customer orders/bookings |
| `customers` | Estimator | All services | Initial customer creation |
| `boats` | Estimator | All services | Initial boat creation |

### Operations-Owned Tables
| Table | Writer | Readers | Notes |
|-------|--------|---------|-------|
| `service_logs` | Operations, Billing | Portal, Dashboard | Service completion records |
| `service_conditions` | Operations | Portal, Dashboard | Granular condition tracking |
| `boat_anodes` | Operations | Portal, Inventory | Per-location anode tracking |
| `paint_repaint_schedule` | Operations (auto) | Operations, Portal | Auto-calculated from conditions |
| `youtube_playlists` | Operations, Video | Portal | Video playlist URLs per boat |

### Billing-Owned Tables
| Table | Writer | Readers | Notes |
|-------|--------|---------|-------|
| `invoices` | Billing | Portal, Dashboard | Invoice records |
| `invoice_line_items` | Billing | Portal, Dashboard | Invoice details |
| `payments` | Billing (via Stripe) | Portal, Dashboard | Payment transactions |

### Portal-Owned Tables
| Table | Writer | Readers | Notes |
|-------|--------|---------|-------|
| `customer_accounts` | Portal | Portal only (RLS) | Customer authentication |
| `customer_boat_access` | Portal | Portal only (RLS) | Multi-boat customer access |
| `customer_messages` | Portal, Operations | Portal (RLS) | Customer-admin messaging |
| `service_requests` | Portal | Operations | Customer service requests |

### Inventory-Owned Tables
| Table | Writer | Readers | Notes |
|-------|--------|---------|-------|
| `anodes_catalog` | Inventory | Operations, Billing | Anode products |
| `inventory_items` | Inventory | Operations | General inventory |
| `inventory_transactions` | Inventory | Dashboard | Stock movements |
| `replenishment_list` | Inventory, Operations | Inventory | Reorder queue |
| `purchase_orders` | Inventory | Dashboard | PO management |

### Booking-Owned Tables
| Table | Writer | Readers | Notes |
|-------|--------|---------|-------|
| `bookings` | Booking | Dashboard | Training bookings |
| `booking_settings` | Booking | Booking | Configuration |
| `availability_rules` | Booking | Booking | Scheduling rules |

### Shared Tables (Multiple Writers - Requires Coordination)
| Table | Writers | Coordination Required | Notes |
|-------|---------|----------------------|-------|
| `customers` | Estimator, Portal, Billing | ✅ Yes | Customer data updates |
| `boats` | Estimator, Operations | ✅ Yes | Boat details, last_service |
| `service_logs` | Operations, Billing | ✅ Yes | Created by either service |

**⚠️ IMPORTANT:** Changes to shared tables MUST follow cross-service impact analysis process.

---

## Migration History

### Phase 1: Initial Schema (2024-2025)
**File:** `sailorskills-site/supabase/migrations/001_initial_schema.sql`
**Date:** Early 2024 (exact date unknown)
**Services Affected:** All (foundation)
**Tables Created:**
- `customers` - Core customer data
- `addresses` - Customer addresses
- `boats` - Boat information
- `marinas` - Marina locations
- `service_orders` - Service bookings
- `service_history` - Service records
- `service_schedules` - Recurring services

**Purpose:** Establish foundational database schema for entire suite

---

### Phase 2: Authentication & Portal (2024-2025)
**Files:**
- `sailorskills-site/supabase/migrations/002_admin_setup.sql`
- Various auth-related migrations

**Tables Created:**
- `admin_users` - Admin authentication
- `customer_accounts` - Customer portal auth
- `customer_boat_access` - Multi-boat customer access

**Purpose:** Separate admin and customer authentication systems

---

### Phase 3: Billing System (2024-2025)
**Location:** `sailorskills-billing/supabase/migrations/`
**Files:** 001-014 (14 migrations)

#### Migration 001: Customer Services
**File:** `001_customer_services.sql`
**Tables Created:** `customer_services`
**Purpose:** Link customers to service types

#### Migration 002: Service Conditions Log
**File:** `002_service_conditions_log.sql`
**Tables Created:** `service_conditions_log` → later renamed to `service_logs`
**Purpose:** Track service completion and conditions

#### Migration 003: Email Logs
**File:** `003_email_logs.sql`
**Tables Created:** Email tracking system
**Purpose:** Track sent emails (receipts, invoices)

#### Migration 004: Email Tracking on Service Logs
**File:** `004_add_email_tracking_to_service_logs.sql`
**Tables Modified:** `service_logs`
**Columns Added:** Email tracking fields
**Purpose:** Link service logs to email notifications

#### Migration 005: Enhanced Condition Tracking
**File:** `005_enhance_condition_tracking.sql`
**Date:** 2025-10 (estimated)
**Tables Modified:** `service_conditions`, `service_logs`
**Purpose:** Add granular paint tracking (keel, waterline, boot stripe), propeller tracking

#### Migration 006: Boat Anodes
**File:** `006_add_boat_anodes.sql`
**Tables Created:** `boat_anodes`
**Purpose:** Per-location anode tracking (shaft, rudder, trim tabs, etc.)

#### Migration 007: Fix Boat Anodes RLS
**File:** `007_fix_boat_anodes_rls.sql`
**Tables Modified:** `boat_anodes`
**Purpose:** Fix Row-Level Security policies for customer access

#### Migration 008: Add Last Service to Boats
**File:** `008_add_last_service_to_boats.sql`
**Tables Modified:** `boats`
**Columns Added:** `last_service_date`
**Purpose:** Denormalize for performance (Operations dashboard)

#### Migration 009: Add Propeller Count
**File:** `009_add_propeller_count.sql`
**Tables Modified:** `boats`
**Columns Added:** `propeller_count`
**Purpose:** Support multi-propeller tracking

#### Migration 010: Invoices
**File:** `010_invoices.sql`
**Tables Created:** `invoices`, `invoice_line_items`
**Purpose:** Invoice generation system

#### Migration 011: Fix Inventory Integration
**File:** `011_fix_inventory_integration.sql`
**Tables Modified:** Various inventory tables
**Purpose:** Fix integration between Billing and Inventory

#### Migration 012: Boat Service Flags
**File:** `012_boat_service_flags.sql`
**Tables Created:** `boat_service_flags`
**Purpose:** Track service-specific boat configurations

#### Migration 013: Fix Integration Bugs
**File:** `013_fix_integration_bugs.sql`
**Date:** 2025-10-26 (estimated)
**Tables Modified:** Various
**Purpose:** Fix bugs in service integrations

#### Migration 014: Fix Foreign Keys and Table Names
**File:** `014_fix_foreign_keys_and_table_names.sql`
**Date:** 2025-10-26
**Tables Modified:**
- `service_orders` - Added FK to `boats.id`
- `replenishment_queue` → renamed to `replenishment_list`
- `replenishment_list` - Added FK to `anodes_catalog.id`

**Purpose:**
- Clean up orphaned `service_orders` records (pre-requisite for FK)
- Establish proper foreign key relationships
- Align table naming with Inventory schema
- Update RLS policies for renamed table

**Impact:** Improved data integrity, prevented orphaned records

---

### Phase 4: Inventory System (2025)
**Location:** `sailorskills-inventory/database/migrations/`

#### Migration: Anode System
**File:** `003_anode_system.sql`
**Tables Created:** `anodes_catalog`, `anode_inventory`, `anode_tool_requirements`
**Purpose:** Comprehensive anode catalog and tool mapping

#### Migration: Inventory System
**File:** `004_inventory_system.sql`
**Tables Created:** `inventory_items`, `inventory_transactions`, `inventory_suppliers`
**Purpose:** General inventory management beyond anodes

#### Migration: Amazon Integration
**File:** `005_amazon_integration.sql`
**Tables Modified:** Add Amazon product links to inventory
**Purpose:** Enable direct reordering from Amazon

#### Migration: Order Management
**File:** `006_order_management.sql`
**Tables Created:** `purchase_orders`, `purchase_order_items`
**Purpose:** Purchase order tracking system

---

### Phase 5: Operations Enhancements (2025)
**Location:** `sailorskills-operations/database/migrations/`

#### Migration: Add Missing Columns
**File:** `migration-add-missing-columns.sql`
**Date:** 2025-10 (estimated)
**Purpose:** Add columns expected by Operations code

#### Migration: Pricing Settings
**File:** `add-pricing-settings.sql`
**Tables Created:** `pricing_settings`
**Purpose:** Configurable pricing variables

---

### Phase 6: Booking System (2025)
**Location:** `sailorskills-site/supabase/migrations/`

#### Migration: Booking System
**File:** `002_booking_system.sql`
**Tables Created:** `bookings`, `booking_settings`, `availability_rules`, `blackout_dates`
**Purpose:** Training session scheduling and availability management

---

### Phase 7: Site/Estimator Enhancements (2025)
**Location:** `sailorskills-site/supabase/migrations/`

#### Migration 002: Anode Tables
**File:** `002_anode_tables.sql`
**Purpose:** Anode-related tables for Estimator

#### Migration 003: Add Service Details
**File:** `003_add_service_details.sql`
**Tables Modified:** `service_orders`
**Purpose:** Add detailed service information fields

#### Migration 011: Add Boat Location Fields
**File:** `011_add_boat_location_fields.sql`
**Tables Modified:** `boats`
**Columns Added:** Marina, dock, slip information
**Purpose:** Better service location tracking

#### Migration 012: Denormalize Boats - Add Propeller Count
**File:** `012_denormalize_boats_add_propeller_count.sql`
**Tables Modified:** `boats`
**Columns Added:** `propeller_count`
**Purpose:** Performance optimization

#### Migration 013: Backfill Boat Length
**File:** `013_backfill_boat_length_from_service_details.sql`
**Purpose:** Data cleanup - populate missing boat lengths

#### Migration 014: Backfill Boat Type and Hull
**File:** `014_backfill_boat_type_and_hull.sql`
**Purpose:** Data cleanup - populate missing boat type/hull data

#### Migration: Add Customer ID to Boats
**File:** `20251009_add_customer_id_to_boats.sql`
**Date:** 2025-10-09
**Tables Modified:** `boats`
**Columns Added:** `customer_id` (if missing)
**Purpose:** Ensure all boats linked to customers

---

## Recent Critical Fixes

### October 26, 2025: Data Integrity Fixes

#### Fix 1: Orphaned Service Logs
**Issue:** 116 service logs had `boat_id = NULL`
**Impact:** Operations showing "Never" for last service
**Fix:** Updated orphaned records with correct boat_id
**Documentation:** `/ORPHANED_LOGS_FIX_SUMMARY.md`

#### Fix 2: RLS Policy Blocking Admin Access
**Issue:** Admin user in `customer_accounts` table triggered RLS restriction
**Impact:** Admin couldn't see service logs (treated as customer)
**Fix:** Removed admin email from `customer_accounts`
**Documentation:** `/RLS_FIX_SUMMARY.md`

#### Fix 3: Foreign Key Relationships (Migration 014)
**Issue:** Missing foreign keys allowed orphaned records
**Impact:** Data integrity issues, broken relationships
**Fix:** Added FKs, cleaned orphaned data, renamed tables
**Migration:** `014_fix_foreign_keys_and_table_names.sql`

---

## Migration Process

### Creating New Migrations

**1. File Naming Convention:**
```
[sequence]_[descriptive_name].sql

Examples:
- 015_add_notifications_system.sql
- 016_add_customer_preferences.sql
- 20251027_emergency_fix_description.sql (date prefix for hotfixes)
```

**2. Migration Template:**
```sql
-- Migration: [Brief description]
-- Date: YYYY-MM-DD
-- Service: [Primary service affected]
-- Tables: [Tables created/modified]
--
-- Purpose:
-- [Detailed explanation]
--
-- Impact:
-- [Services affected, breaking changes, etc.]

-- Pre-flight checks (optional but recommended)
DO $$
BEGIN
  -- Check prerequisites
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'prerequisite_table') THEN
    RAISE EXCEPTION 'Prerequisite table missing';
  END IF;
END $$;

-- Main migration
ALTER TABLE example ADD COLUMN IF NOT EXISTS new_column TEXT;

-- Post-migration verification
DO $$
BEGIN
  RAISE NOTICE 'Migration complete. Affected tables: example';
END $$;
```

**3. Testing Migrations:**
```bash
# Test migration (dry-run)
node sailorskills-portal/scripts/test-helpers/run-migration.mjs migrations/015_example.sql --dry-run

# Run migration
node sailorskills-portal/scripts/test-helpers/run-migration.mjs migrations/015_example.sql

# Verify with direct SQL
source db-env.sh
psql "$DATABASE_URL" -c "\d table_name"
```

**4. Update This Document:**
After running a migration, add an entry to this file:
- Migration number and file name
- Date executed
- Tables created/modified
- Services affected
- Purpose and impact

**5. Cross-Service Coordination:**
For migrations affecting shared tables:
1. Create GitHub issue describing the change
2. Tag affected service repositories
3. Wait for approval from service owners
4. Run migration during maintenance window
5. Update all service documentation

---

## Upcoming Migrations

### Planned (Q4 2025)

#### Migration 015: Messages Table (Portal)
**Status:** Planned
**Tables to Create:** `messages` (if doesn't exist - currently expected by Portal)
**Purpose:** Customer-admin messaging system
**Impact:** Portal service requests

#### Migration 016: Service Requests Cleanup
**Status:** Planned
**Tables to Modify:** `service_requests`
**Columns to Add:** `customer_id` (currently missing, expected by Portal)
**Purpose:** Fix schema validation error

#### Migration 017: Service Logs Technician Field
**Status:** Planned
**Tables to Modify:** `service_logs`
**Columns to Add:** `technician` (currently missing, expected by validation)
**Purpose:** Track which technician performed service

#### Migration 018: Invoices Total Field
**Status:** Planned
**Tables to Modify:** `invoices`
**Columns to Add:** `total` (currently missing, expected by validation)
**Purpose:** Denormalize total for performance

---

## Schema Validation

**Last Validation:** 2025-10-27
**Tool:** `sailorskills-portal/scripts/test-helpers/example-check-schema.mjs`

**Current Issues:**
- ⚠️ `service_logs.technician` - Missing (expected by Portal)
- ⚠️ `invoices.total` - Missing (expected by Portal)
- ⚠️ `service_requests.customer_id` - Missing (expected by Portal)
- ⚠️ `messages` table - Doesn't exist (expected by Portal)

**Run Validation:**
```bash
node sailorskills-portal/scripts/test-helpers/example-check-schema.mjs
```

---

## Migration Approval Process

### For Shared Tables (customers, boats, service_logs, etc.)

1. **Propose Migration**
   - Create migration SQL file
   - Document purpose and impact
   - List affected services

2. **Impact Analysis**
   - Identify all services reading/writing the table
   - Check for breaking changes
   - Estimate downtime (if any)

3. **Service Owner Review**
   - Tag repository owners in GitHub issue
   - Wait for approval (48 hours)
   - Address feedback

4. **Execute Migration**
   - Schedule maintenance window (if needed)
   - Run migration with transaction support
   - Verify success across all services

5. **Document**
   - Update MIGRATION_SUMMARY.md
   - Update affected service READMEs
   - Close GitHub issue

### For Service-Owned Tables

1. Create migration file
2. Test with dry-run
3. Run migration
4. Update this document
5. Commit and deploy

---

## Rollback Strategy

### Automatic Rollback (Transaction Support)
Most migrations use PostgreSQL transactions:
```sql
BEGIN;
  -- Migration statements
  ALTER TABLE example ADD COLUMN new_col TEXT;
COMMIT; -- Only commits if all statements succeed
```

If any statement fails, entire migration rolls back automatically.

### Manual Rollback
For migrations without automatic rollback:

1. **Identify Problem**
   - Check Supabase logs
   - Run schema validation
   - Test affected services

2. **Create Rollback Migration**
   ```sql
   -- Rollback Migration 015
   ALTER TABLE example DROP COLUMN IF EXISTS new_col;
   ```

3. **Execute Rollback**
   - Run rollback migration
   - Verify services working
   - Document in this file

4. **Investigate Root Cause**
   - Identify why migration failed
   - Fix issues
   - Re-attempt migration

---

## Migration Statistics

**Total Migrations:** 50+ (exact count varies by service)
**Services with Migrations:**
- Billing: 14 migrations
- Site/Estimator: 14 migrations
- Inventory: 6 migrations
- Operations: 2 migrations
- Dashboard: 7 migrations (some shared with Billing)

**Most Recent Migration:** 014 (2025-10-26)
**Last Schema Validation:** 2025-10-27
**Total Database Tables:** 55

---

## Maintenance Notes

### Database Backup
**Frequency:** Daily (Supabase automatic)
**Retention:** 7 days (Supabase free tier)
**Manual Backups:** Before major migrations

### Performance Monitoring
**Tools:** Supabase Dashboard
**Metrics:** Query performance, table sizes, index usage
**Review:** Monthly

### Cleanup Schedule
**Orphaned Records:** Check quarterly
**Unused Tables:** Review annually
**Old Indexes:** Review quarterly

---

## Contact & Support

**Questions about migrations?**
- Check this document first
- Review migration file comments
- Check service-specific CLAUDE.md files
- Create GitHub issue for clarification

**Emergency Schema Issues:**
- Contact: Database team
- Backup: Supabase dashboard access
- Rollback: Follow rollback strategy above

---

**Document Version:** 1.0
**Last Updated:** 2025-10-27
**Next Review:** After each migration

