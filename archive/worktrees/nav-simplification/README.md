# Sailorskills Repositories

Monorepo containing all Sailorskills services and migration scripts.

## Zoho Billing Migration

Historical billing data is being migrated from Zoho Billing to Sailor Skills.

**Status:** Implementation complete, ready for execution

**Documentation:**
- Migration Plan: [ZOHO_MIGRATION_HANDOFF.md](./ZOHO_MIGRATION_HANDOFF.md)
- Implementation Plan: [docs/plans/2025-10-28-zoho-billing-migration.md](./docs/plans/2025-10-28-zoho-billing-migration.md)
- Execution Guide: [scripts/zoho-migration/EXECUTION.md](./scripts/zoho-migration/EXECUTION.md)

**Quick Start:**
```bash
cd scripts/zoho-migration
npm install
cp .env.example .env
# Add SUPABASE_SERVICE_KEY to .env
npm run analyze
```

**Migration Phases:**
1. Customer Mapping (30 min)
2. Invoice Import (2-3 hours)
3. Payments Import (1-2 hours)
4. Service Log Linking (1-2 hours)
5. Validation (30 min)

**Total Estimate:** 6-9 hours execution time

**Data to Migrate:**
- 174 customers (153 matched, 21 require review)
- 1,633 invoices ($237,436.23 total)
- 1,552 payments (1,346 Stripe, 283 Zoho)
- 1,456 service logs to link

## Services

- **sailorskills-billing** - Billing and invoicing service
- **sailorskills-operations** - Field operations management
- **sailorskills-dashboard** - Analytics dashboard
- **sailorskills-portal** - Customer portal
- **sailorskills-inventory** - Inventory management
- **sailorskills-estimator** - Service estimation tool
- **sailorskills-booking** - Training scheduling
- **sailorskills-video** - Video management
- **sailorskills-site** - Marketing website

## Database Access

See [DATABASE_ACCESS.md](./DATABASE_ACCESS.md) for direct database query access from Claude Code.
