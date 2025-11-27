# Sailorskills Suite - Table Ownership Matrix

**Created:** 2025-10-28
**Database:** Supabase PostgreSQL (fzygakldvvzxmahkdylq)
**Total Tables:** 54 tables + 4 views = 58 database objects
**Last Updated:** 2025-10-28

This document defines which service "owns" each database table (can modify schema), which services read from it, and whether cross-service coordination is required for changes.

---

## Table of Contents

1. [Overview](#overview)
2. [Ownership by Service](#ownership-by-service)
3. [Shared Tables (Multiple Writers)](#shared-tables-multiple-writers)
4. [Views (Read-Only)](#views-read-only)
5. [Cross-Service Coordination Process](#cross-service-coordination-process)
6. [Quick Reference Table](#quick-reference-table)

---

## Overview

### What is Table Ownership?

**Owner:** The service that controls the table's schema (can add/remove columns, modify structure)
**Writer:** Service(s) that can INSERT/UPDATE/DELETE records
**Reader:** Service(s) that can SELECT records

### Service Data Flow

```
Estimator → Operations → Billing → Dashboard
                ↓
           Inventory
                ↓
            Portal (customer view)
```

### Ownership Principles

1. **Single Owner:** Each table has ONE owner who controls schema changes
2. **Multiple Readers:** Many services can read from a table
3. **Shared Writers:** Some tables have multiple writers (requires coordination)
4. **Coordination Required:** Changes to shared tables must follow approval process

---

## Ownership by Service

### Estimator (Customer Acquisition) - 3 Tables

**Service URL:** https://sailorskills.com
**Primary Role:** Quote generation, order creation

| Table | Owner | Writers | Readers | Purpose | Coordination Required |
|-------|-------|---------|---------|---------|----------------------|
| `service_orders` | Estimator | Estimator (create), Operations (update status) | All | Customer orders/bookings | ⚠️ YES - Operations updates status |
| `service_types` | Estimator | Estimator | Booking, Dashboard | Defines available services | ❌ No |
| `pricing_settings` | Estimator | Estimator | Operations, Dashboard | Pricing configuration (JSON) | ❌ No |

**Key Notes:**
- Estimator creates initial customer and boat records (ownership transfers to Operations after first service)
- `service_orders` status updated by Operations (pending → confirmed → in_progress → completed)

---

### Operations (Service Delivery) - 10 Tables

**Service URL:** https://ops.sailorskills.com
**Primary Role:** Service scheduling, execution, condition tracking

| Table | Owner | Writers | Readers | Purpose | Coordination Required |
|-------|-------|---------|---------|---------|----------------------|
| `service_logs` | Operations | Operations, Billing | Portal, Dashboard, Billing | Service completion records | ⚠️ YES - Billing links invoices |
| `service_conditions` | Operations | Operations | Portal, Dashboard | Granular condition tracking (LEGACY) | ❌ No |
| `service_conditions_log` | Operations | Operations | Dashboard | Service condition history (LEGACY) | ❌ No |
| `service_history` | Operations | Operations | Portal, Dashboard | Service history (LEGACY) | ❌ No |
| `scheduled_services` | Operations | Operations | Dashboard | Scheduled service calendar | ❌ No |
| `boat_service_schedules` | Operations | Operations | Portal, Dashboard | Service schedule patterns | ❌ No |
| `boat_service_flags` | Operations | Operations (auto) | Operations, Portal | Service flags/alerts (auto-generated) | ❌ No |
| `paint_repaint_schedule` | Operations | Operations (auto) | Operations, Portal | Paint urgency tracking (auto-calculated) | ❌ No |
| `service_schedules` | Operations | Operations | Dashboard | Recurring service schedules (LEGACY) | ❌ No |
| `youtube_playlists` | Operations | Operations, Video | Portal | Boat video playlists | ⚠️ YES - Video service also writes |

**Key Notes:**
- `service_logs` is the primary service documentation table (replaced `service_conditions_log`)
- LEGACY tables (`service_conditions`, `service_conditions_log`, `service_history`, `service_schedules`) maintained for historical data
- Auto-generated tables (`boat_service_flags`, `paint_repaint_schedule`) calculated from `service_logs` data

---

### Billing/Completion (Payment Processing) - 5 Tables

**Service URL:** https://sailorskills-billing.vercel.app
**Primary Role:** Invoicing, payment processing, service completion

| Table | Owner | Writers | Readers | Purpose | Coordination Required |
|-------|-------|---------|---------|---------|----------------------|
| `invoices` | Billing | Billing | Portal, Dashboard | Invoice records | ❌ No |
| `invoice_line_items` | Billing | Billing | Portal, Dashboard | Invoice line item details | ❌ No |
| `payments` | Billing | Billing (via Stripe webhook) | Portal, Dashboard | Payment transactions | ❌ No |
| `invoices_legacy` | Billing | Billing (import only) | Dashboard | Zoho-imported invoices | ❌ No |
| `customer_services` | Billing | Billing | Dashboard | Customer subscription management | ❌ No |

**Key Notes:**
- `invoices` has `service_id` referencing `service_logs` (bi-directional linkage)
- `service_logs.invoice_id` added in migration 015 (2025-10-27)
- `payments` written via Stripe webhook integration
- `invoices_legacy` read-only (historical Zoho data, not actively updated)

---

### Inventory (Parts & Stock Management) - 14 Tables

**Service URL:** https://sailorskills-inventory.vercel.app
**Primary Role:** Anode catalog, stock management, purchasing

| Table | Owner | Writers | Readers | Purpose | Coordination Required |
|-------|-------|---------|---------|---------|----------------------|
| `anodes_catalog` | Inventory | Inventory (scraper) | Operations, Billing, Estimator | Anode products from boatzincs.com | ❌ No |
| `anode_inventory` | Inventory | Inventory | Operations, Dashboard | Anode stock levels | ❌ No |
| `anode_price_history` | Inventory | Inventory (scraper) | Dashboard | Anode price tracking over time | ❌ No |
| `anode_sync_logs` | Inventory | Inventory (scraper) | Inventory | Sync logs from boatzincs.com | ❌ No |
| `anode_tool_requirements` | Inventory | Inventory | Operations | Tools needed per anode type | ❌ No |
| `inventory_items` | Inventory | Inventory | Operations, Dashboard | General inventory (non-anode) | ❌ No |
| `inventory_suppliers` | Inventory | Inventory | Dashboard | Supplier management | ❌ No |
| `inventory_transactions` | Inventory | Inventory | Dashboard | Stock movements (in/out/adjust) | ❌ No |
| `item_categories` | Inventory | Inventory | Inventory | Item categorization | ❌ No |
| `item_suppliers` | Inventory | Inventory | Inventory | Supplier-item linkage | ❌ No |
| `purchase_orders` | Inventory | Inventory | Dashboard | Purchase order management | ❌ No |
| `purchase_order_items` | Inventory | Inventory | Dashboard | PO line items | ❌ No |
| `replenishment_list` | Inventory | Inventory, Operations | Inventory | Reorder queue (renamed from replenishment_queue) | ⚠️ YES - Operations can add |
| `replenishment_queue` | Inventory | Inventory | Inventory | Alternate reorder table (LEGACY?) | ❌ No |

**Key Notes:**
- `anodes_catalog` populated by automated scraper from boatzincs.com
- `replenishment_list` receives requests from Operations (packing list → order anodes)
- Most tables are Inventory-exclusive (admin service only)

---

### Portal (Customer Self-Service) - 5 Tables

**Service URL:** https://portal.sailorskills.com
**Primary Role:** Customer authentication, messaging, service requests

| Table | Owner | Writers | Readers | Purpose | Coordination Required |
|-------|-------|---------|---------|---------|----------------------|
| `customer_accounts` | Portal | Portal | Portal (RLS) | Customer authentication (email + password or magic link) | ❌ No |
| `customer_boat_access` | Portal | Portal | Portal (RLS) | Multi-boat customer access control | ❌ No |
| `customer_messages` | Portal | Portal, Operations | Portal (RLS) | Customer-admin messaging | ⚠️ YES - Operations sends messages |
| `service_requests` | Portal | Portal | Operations | Customer service requests | ⚠️ YES - Operations reads |
| `notification_log` | Portal | Portal | Portal | Notification tracking (email, SMS) | ❌ No |

**Key Notes:**
- All Portal tables use Row-Level Security (RLS) for customer data isolation
- `customer_accounts` separate from `customers` (Portal auth vs billing identity)
- `customer_boat_access` enables one customer to see multiple boats
- `service_requests` flows Portal → Operations (customer initiates, admin responds)

---

### Booking (Training Scheduling) - 7 Tables

**Service URL:** https://sailorskills-booking.vercel.app
**Primary Role:** Training session scheduling, Google Calendar sync

| Table | Owner | Writers | Readers | Purpose | Coordination Required |
|-------|-------|---------|---------|---------|----------------------|
| `bookings` | Booking | Booking | Dashboard | Training session bookings | ❌ No |
| `booking_history` | Booking | Booking (auto) | Booking | Audit trail of booking changes | ❌ No |
| `booking_settings` | Booking | Booking | Booking | Booking configuration | ❌ No |
| `availability_rules` | Booking | Booking | Booking | Day/time availability rules | ❌ No |
| `blackout_dates` | Booking | Booking | Booking | Unavailable date ranges | ❌ No |
| `blocked_dates` | Booking | Booking | Booking | Individual blocked dates | ❌ No |
| `business_hours` | Booking | Booking | Booking | Operating hours by day of week | ❌ No |

**Key Notes:**
- All Booking tables are Booking-exclusive (single service)
- `bookings` syncs with Google Calendar via API
- `booking_history` auto-populated on booking changes (audit trail)

---

### Video (Video Management) - 1 Table

**Service URL:** https://sailorskills-video.vercel.app
**Primary Role:** YouTube video upload and playlist management

| Table | Owner | Writers | Readers | Purpose | Coordination Required |
|-------|-------|---------|---------|---------|----------------------|
| `youtube_playlists` | Video | Operations, Video | Portal | Boat-specific YouTube playlists | ⚠️ YES - Operations also writes |

**Key Notes:**
- Single table shared with Operations
- Operations can create playlists, Video manages uploads
- Portal reads for customer video viewing

---

### Dashboard (Analytics) - 0 Tables

**Service URL:** https://sailorskills-dashboard.vercel.app
**Primary Role:** Business analytics, reporting

**Key Notes:**
- Dashboard owns NO tables (read-only service)
- Reads from all other services' tables for analytics
- Uses views (`transaction_details`, `inventory_value_report`, `all_items_needing_reorder`)

---

## Shared Tables (Multiple Writers)

These tables require **cross-service coordination** for schema changes. Multiple services can write to them.

### Core Business Entities

| Table | Primary Owner | Writers | Coordination Process | Notes |
|-------|---------------|---------|---------------------|-------|
| `customers` | Estimator | Estimator (create), Portal (update), Billing (update) | ⚠️ REQUIRED | Customer master data - initial creation by Estimator, updates by Portal/Billing |
| `boats` | Estimator | Estimator (create), Operations (update last_service), Billing (update) | ⚠️ REQUIRED | Boat master data - created by Estimator, maintained by Operations |
| `boat_owners` | Estimator | Estimator, Portal | ⚠️ REQUIRED | Boat-customer linkage (supports multiple owners per boat) |
| `boat_anodes` | Operations | Operations (create/update), Inventory (update stock) | ⚠️ REQUIRED | Per-location anode tracking - Operations manages conditions, Inventory links stock |
| `boat_anode_types` | Operations | Operations, Inventory | ⚠️ REQUIRED | Required anodes per boat - Operations defines, Inventory supplies |

### Support Tables

| Table | Primary Owner | Writers | Coordination Process | Notes |
|-------|---------------|---------|---------------------|-------|
| `addresses` | Estimator | Estimator, Portal | ⚠️ REQUIRED | Customer addresses - created by Estimator, updated by Portal |
| `marinas` | Estimator | Estimator, Operations | ⚠️ REQUIRED | Marina locations - created by Estimator, can be updated by Operations |
| `admin_users` | Portal | Portal (manual) | ❌ No | Admin authentication - rarely changes |

---

## Views (Read-Only)

Database views (not tables) - no write operations allowed.

| View | Created By | Used By | Purpose |
|------|------------|---------|---------|
| `transaction_details` | Billing (migration 015) | Portal, Dashboard | Optimized join of invoices + payments + service_logs |
| `inventory_value_report` | Inventory | Dashboard | Current inventory value summary |
| `all_items_needing_reorder` | Inventory | Inventory | Items below reorder point |
| `v_boat_anodes_with_stock` | Operations | Operations, Portal | Boat anodes with stock availability |

---

## Cross-Service Coordination Process

### When Coordination is Required

Coordination is **REQUIRED** for:
1. Schema changes to shared tables (add/remove/modify columns)
2. Adding foreign keys to shared tables
3. Changing RLS policies on shared tables
4. Renaming shared tables
5. Adding indexes that may impact write performance

Coordination is **NOT required** for:
1. Reading from any table
2. Schema changes to single-owner tables
3. Adding/updating records in tables you have write access to
4. Creating new service-specific tables

### Coordination Steps

1. **Identify Impact**
   - List all services that read/write the table
   - Check for breaking changes
   - Estimate downtime (if any)

2. **Create Migration Proposal**
   - Write migration SQL file
   - Document purpose and impact in MIGRATION_SUMMARY.md
   - Add rollback strategy

3. **Get Approval**
   - Create GitHub issue describing change
   - Tag affected service repositories
   - Wait for approval (48 hours)
   - Address feedback

4. **Execute Migration**
   - Test with dry-run first
   - Schedule maintenance window (if needed)
   - Run migration with transaction support
   - Verify success across all services

5. **Document**
   - Update MIGRATION_SUMMARY.md
   - Update this document (if ownership changes)
   - Update affected service READMEs
   - Close GitHub issue

---

## Quick Reference Table

All 54 tables with ownership at a glance:

| Table | Owner | Shared? | Coordination Required |
|-------|-------|---------|----------------------|
| `addresses` | Estimator | ✅ | ⚠️ YES |
| `admin_users` | Portal | ✅ | ❌ No |
| `anode_inventory` | Inventory | ❌ | ❌ No |
| `anode_price_history` | Inventory | ❌ | ❌ No |
| `anode_sync_logs` | Inventory | ❌ | ❌ No |
| `anode_tool_requirements` | Inventory | ❌ | ❌ No |
| `anodes_catalog` | Inventory | ❌ | ❌ No |
| `availability_rules` | Booking | ❌ | ❌ No |
| `blackout_dates` | Booking | ❌ | ❌ No |
| `blocked_dates` | Booking | ❌ | ❌ No |
| `boat_anode_types` | Operations | ✅ | ⚠️ YES |
| `boat_anodes` | Operations | ✅ | ⚠️ YES |
| `boat_owners` | Estimator | ✅ | ⚠️ YES |
| `boat_service_flags` | Operations | ❌ | ❌ No |
| `boat_service_schedules` | Operations | ❌ | ❌ No |
| `boats` | Estimator | ✅ | ⚠️ YES |
| `booking_history` | Booking | ❌ | ❌ No |
| `booking_settings` | Booking | ❌ | ❌ No |
| `bookings` | Booking | ❌ | ❌ No |
| `business_hours` | Booking | ❌ | ❌ No |
| `customer_accounts` | Portal | ❌ | ❌ No |
| `customer_boat_access` | Portal | ❌ | ❌ No |
| `customer_messages` | Portal | ✅ | ⚠️ YES |
| `customer_services` | Billing | ❌ | ❌ No |
| `customers` | Estimator | ✅ | ⚠️ YES |
| `inventory_items` | Inventory | ❌ | ❌ No |
| `inventory_suppliers` | Inventory | ❌ | ❌ No |
| `inventory_transactions` | Inventory | ❌ | ❌ No |
| `invoice_line_items` | Billing | ❌ | ❌ No |
| `invoices` | Billing | ❌ | ❌ No |
| `invoices_legacy` | Billing | ❌ | ❌ No |
| `item_categories` | Inventory | ❌ | ❌ No |
| `item_suppliers` | Inventory | ❌ | ❌ No |
| `marinas` | Estimator | ✅ | ⚠️ YES |
| `notification_log` | Portal | ❌ | ❌ No |
| `paint_repaint_schedule` | Operations | ❌ | ❌ No |
| `payments` | Billing | ❌ | ❌ No |
| `pricing_settings` | Estimator | ❌ | ❌ No |
| `purchase_order_items` | Inventory | ❌ | ❌ No |
| `purchase_orders` | Inventory | ❌ | ❌ No |
| `replenishment_list` | Inventory | ✅ | ⚠️ YES |
| `replenishment_queue` | Inventory | ❌ | ❌ No |
| `scheduled_services` | Operations | ❌ | ❌ No |
| `service_conditions` | Operations | ❌ | ❌ No |
| `service_conditions_log` | Operations | ❌ | ❌ No |
| `service_history` | Operations | ❌ | ❌ No |
| `service_logs` | Operations | ✅ | ⚠️ YES |
| `service_orders` | Estimator | ✅ | ⚠️ YES |
| `service_requests` | Portal | ✅ | ⚠️ YES |
| `service_schedules` | Operations | ❌ | ❌ No |
| `service_types` | Estimator | ❌ | ❌ No |
| `youtube_playlists` | Video | ✅ | ⚠️ YES |

**Summary:**
- **Total Tables:** 54
- **Single Owner:** 42 tables (78%)
- **Shared (Multiple Writers):** 12 tables (22%)
- **Requires Coordination:** 12 tables

---

## Ownership Summary by Service

| Service | Tables Owned | Shared Tables | Total Influence |
|---------|--------------|---------------|----------------|
| Estimator | 3 | 4 (customers, boats, boat_owners, addresses, marinas, service_orders) | 9 |
| Operations | 10 | 6 (boats, boat_anodes, boat_anode_types, service_logs, youtube_playlists, replenishment_list) | 16 |
| Billing | 5 | 0 | 5 |
| Inventory | 14 | 3 (boat_anodes, boat_anode_types, replenishment_list) | 17 |
| Portal | 5 | 4 (customers, addresses, customer_messages, service_requests) | 9 |
| Booking | 7 | 0 | 7 |
| Video | 1 | 1 (youtube_playlists) | 2 |
| Dashboard | 0 | 0 | 0 (read-only) |

---

## Notes

### Governance Requirements

This document fulfills the governance requirement from CLAUDE.md:
- "Maintain roadmap in root-level ROADMAP.md file with quarterly objectives"
- "Track cross-service features using todo lists with service dependencies clearly marked"
- "Before implementing new features, verify they don't duplicate existing functionality in other services"

### Related Documentation

- **MIGRATION_SUMMARY.md** - Database migration history and process
- **ROADMAP.md** - Quarterly objectives and cross-service features
- **INTEGRATIONS.md** - External API integrations
- **CLAUDE.md** - Project governance rules

### Maintenance

**Update This Document When:**
- Adding new tables to any service
- Changing table ownership
- Adding/removing write access to shared tables
- Creating new services

**Review Frequency:** Quarterly, or after major migrations

---

**Document Version:** 1.0
**Created:** 2025-10-28
**Last Updated:** 2025-10-28
**Next Review:** 2026-01-28 (Q1 2026)
