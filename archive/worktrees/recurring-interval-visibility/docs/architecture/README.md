# Sailorskills Suite - Architecture Documentation

**Created:** 2025-10-28
**Last Updated:** 2025-10-28
**Purpose:** Central hub for all Sailorskills architecture documentation

This directory contains comprehensive architecture documentation for the Sailorskills suite, created as part of Phase 3: Testing & Architecture (Task 3.2).

---

## Table of Contents

1. [Quick Links](#quick-links)
2. [Architecture Overview](#architecture-overview)
3. [Documentation Index](#documentation-index)
4. [Related Documentation](#related-documentation)

---

## Quick Links

### Core Architecture Diagrams

- **[Service Relationship Diagram](./service-relationship-diagram.md)** - How services communicate and data flows
- **[Database Schema ERD](./database-schema-erd.md)** - Complete database schema with relationships
- **[Edge Functions & Webhooks](./edge-functions-webhooks.md)** - API endpoints, webhooks, external integrations

### Governance Documentation

- **[Table Ownership Matrix](../../TABLE_OWNERSHIP_MATRIX.md)** - Database table ownership and coordination
- **[Migration Summary](../../MIGRATION_SUMMARY.md)** - Schema change history and process
- **[Integrations](../../INTEGRATIONS.md)** - External API credentials and setup

---

## Architecture Overview

### System Summary

The Sailorskills suite is a collection of **8 independent services** that communicate via a shared Supabase PostgreSQL database:

| Service | Type | URL | Purpose |
|---------|------|-----|---------|
| **Estimator** | Customer-Facing | sailorskills.com | Quote generation, order intake |
| **Site** | Customer-Facing | sailorskills.com | Marketing website |
| **Portal** | Customer-Facing | portal.sailorskills.com | Customer self-service |
| **Booking** | Customer-Facing | sailorskills-booking.vercel.app | Training scheduling |
| **Operations** | Admin | ops.sailorskills.com | Service delivery, field operations |
| **Billing** | Admin | sailorskills-billing.vercel.app | Payment processing, invoicing |
| **Inventory** | Admin | sailorskills-inventory.vercel.app | Stock management, anode catalog |
| **Video** | Admin | sailorskills-video.vercel.app | YouTube video management |
| **Dashboard** | Admin | sailorskills-dashboard.vercel.app | Business analytics (read-only) |

### Key Architectural Principles

1. **Database-Mediated Communication**
   - Services communicate via shared Supabase database
   - No direct service-to-service API calls
   - RLS policies enforce data isolation for customer data

2. **Single Ownership, Multiple Readers**
   - Each table has ONE owner who controls schema
   - 78% of tables have single owner (safe to modify)
   - 22% of tables are shared (require coordination)

3. **Stateless Serverless**
   - All services deployed on Vercel (stateless)
   - Scales horizontally automatically
   - No server-side sessions

4. **Event-Driven via Webhooks**
   - Stripe webhooks for payment events
   - Internal webhooks for service coordination
   - Supabase edge functions for serverless compute

---

## Documentation Index

### 1. Service Relationship Diagram

**File:** [service-relationship-diagram.md](./service-relationship-diagram.md)

**Contents:**
- Data flow visualization (Mermaid diagram)
- 6-stage business flow (acquisition → delivery → billing → portal → inventory → analytics)
- Service dependencies and communication patterns
- External API integrations
- Security boundaries
- Scalability considerations

**Use Cases:**
- Understanding how data flows through the system
- Identifying integration points between services
- Planning new features that span multiple services
- Onboarding new developers

---

### 2. Database Schema ERD

**File:** [database-schema-erd.md](./database-schema-erd.md)

**Contents:**
- Core business flow ERD (high-level)
- Complete schema by service (54 tables + 4 views)
- Shared tables detail (12 shared tables)
- Foreign key relationships
- Views and computed tables

**Use Cases:**
- Understanding database structure
- Planning schema changes
- Identifying table relationships
- Writing complex queries
- Migration planning

**Key Sections:**
- **Core Business Flow ERD:** Primary tables in acquisition → delivery → billing flow
- **Complete Schema by Service:** All 54 tables organized by owning service
- **Shared Tables Detail:** 12 tables requiring cross-service coordination

---

### 3. Edge Functions & Webhooks

**File:** [edge-functions-webhooks.md](./edge-functions-webhooks.md)

**Contents:**
- Supabase edge function inventory (18+ functions)
- Webhook endpoints (Stripe, internal)
- External API calls (Stripe, YouTube, Calendar, Resend, etc.)
- Request/response flows (sequence diagrams)
- Security & authentication patterns
- Rate limits and quotas

**Use Cases:**
- Implementing new edge functions
- Troubleshooting webhook failures
- Understanding payment flows
- Planning external API integrations
- Security audits

**Key Sections:**
- **Shared Edge Functions:** 5 functions used across services
- **Service-Specific Functions:** 15 Billing functions, 2 Operations functions
- **Webhook Endpoints:** Stripe webhook configuration and handlers
- **External API Calls:** Integration patterns for Stripe, Resend, YouTube, etc.

---

## Related Documentation

### Project Root Documentation

Located in `/Users/brian/app-development/sailorskills-repos/`:

- **[TABLE_OWNERSHIP_MATRIX.md](../../TABLE_OWNERSHIP_MATRIX.md)**
  - Complete ownership rules for all 54 tables
  - Cross-service coordination process
  - Quick reference table

- **[MIGRATION_SUMMARY.md](../../MIGRATION_SUMMARY.md)**
  - Database schema migration history
  - Migration process and templates
  - Rollback procedures
  - Upcoming planned migrations

- **[INTEGRATIONS.md](../../INTEGRATIONS.md)**
  - External API credentials and setup
  - Stripe configuration
  - Resend email templates
  - YouTube API setup
  - Google Calendar integration
  - Rate limits and quotas
  - Secret rotation schedule

- **[ROADMAP.md](../../ROADMAP.md)**
  - Quarterly objectives
  - Cross-service features
  - Planned improvements

- **[PROJECT_STABILIZATION_PLAN.md](../../PROJECT_STABILIZATION_PLAN.md)**
  - Current project plan (Phase 3 in progress)
  - Task tracking and completion
  - Progress metrics

### Service-Specific Documentation

Each service has its own `CLAUDE.md` file with:
- Service overview and purpose
- Tech stack and project structure
- Development commands
- Integration points with other services
- Testing instructions

**Example:** `sailorskills-operations/CLAUDE.md`

---

## How to Use This Documentation

### For New Developers

1. Start with **[Service Relationship Diagram](./service-relationship-diagram.md)** to understand data flow
2. Read **[Database Schema ERD](./database-schema-erd.md)** to learn table structure
3. Review **[Table Ownership Matrix](../../TABLE_OWNERSHIP_MATRIX.md)** to understand governance
4. Check **[Integrations](../../INTEGRATIONS.md)** for external API setup

### For Feature Development

1. **[Service Relationship Diagram](./service-relationship-diagram.md)** - Identify affected services
2. **[Database Schema ERD](./database-schema-erd.md)** - Check required tables
3. **[Table Ownership Matrix](../../TABLE_OWNERSHIP_MATRIX.md)** - Verify table ownership and coordination needs
4. **[Edge Functions & Webhooks](./edge-functions-webhooks.md)** - Plan API calls and webhooks

### For Schema Changes

1. **[Table Ownership Matrix](../../TABLE_OWNERSHIP_MATRIX.md)** - Check if coordination required
2. **[Database Schema ERD](./database-schema-erd.md)** - Understand relationships and impact
3. **[Migration Summary](../../MIGRATION_SUMMARY.md)** - Follow migration process
4. **[Service Relationship Diagram](./service-relationship-diagram.md)** - Identify affected services

### For Debugging

1. **[Edge Functions & Webhooks](./edge-functions-webhooks.md)** - Check webhook configurations
2. **[Service Relationship Diagram](./service-relationship-diagram.md)** - Trace data flow
3. **[Database Schema ERD](./database-schema-erd.md)** - Verify table relationships
4. **[Integrations](../../INTEGRATIONS.md)** - Check external API status

---

## Diagram Formats

All architecture diagrams in this directory use **Mermaid** format:
- Renders natively in GitHub, GitLab, and many markdown viewers
- No separate image files needed
- Version-controllable (plain text)
- Easy to update

**Viewing Diagrams:**
- GitHub/GitLab: Renders automatically
- VS Code: Install "Markdown Preview Mermaid Support" extension
- CLI: Use `mermaid-cli` to generate PNG/SVG exports if needed

---

## Maintenance

### Update Frequency

- **Service Relationship Diagram:** After adding/removing services or major integration changes
- **Database Schema ERD:** After schema migrations affecting core tables
- **Edge Functions & Webhooks:** After adding new edge functions or webhook endpoints
- **Table Ownership Matrix:** After ownership changes or new shared tables

### Review Schedule

- **Quarterly:** Review all architecture documents for accuracy
- **After Major Migrations:** Update ERD and ownership matrix
- **After New Service:** Update service relationship diagram
- **After New Integration:** Update edge functions/webhooks and integrations docs

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2025-10-28 | Initial architecture documentation created (Phase 3, Task 3.2) | Claude Code |

---

**Architecture Version:** 1.0
**Last Updated:** 2025-10-28
**Next Review:** 2026-01-28 (Q1 2026)
