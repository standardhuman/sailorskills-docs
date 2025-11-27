# AI Agent Guide for Sailorskills

This guide helps AI agents navigate the Sailorskills codebase efficiently.

## Architecture Overview

**Type**: Loose monorepo - 13 independent git repos in one directory

**Structure**:
- Each `sailorskills-*` directory is its own git repo
- All services share one Supabase database
- Vercel deploys each service independently from its repo
- This parent directory is for documentation and cross-service coordination

## Where to Find What

### I want to...

| Task | Go to |
|------|-------|
| **Understand the project** | `README.md` |
| **Develop a service** | `docs/guides/DEVELOPMENT_WORKFLOW.md` |
| **Query the database** | `docs/guides/DATABASE_ACCESS.md` |
| **Set up local dev** | `docs/guides/LOCAL_DEVELOPMENT.md` |
| **Run tests** | `docs/guides/TESTING_PLATFORM_GUIDE.md` |
| **Deploy to Vercel** | `docs/setup/VERCEL_CONFIG_CHECKLIST.md` |
| **Understand integrations** | `docs/architecture/INTEGRATIONS.md` |
| **Check the roadmap** | `ROADMAP.md` |
| **Check schema changes** | `MIGRATION_SUMMARY.md` |

### Service-Specific Documentation

Each service has its own `CLAUDE.md` with service-specific context:
- `sailorskills-operations/CLAUDE.md` - Best documented, use as reference
- `sailorskills-billing/CLAUDE.md` - Stripe integration details
- `sailorskills-portal/CLAUDE.md` - Customer-facing RLS policies

## Common Patterns

### Starting Work on a Service

```bash
# 1. Navigate to service directory
cd sailorskills-operations

# 2. Install dependencies
npm install

# 3. Start dev server
npm run dev
```

### Running Database Queries

```bash
# 1. Load connection (from parent directory)
source db-env.sh

# 2. Run query
psql "$DATABASE_URL" -c "SELECT * FROM customers LIMIT 5"
```

### Making Changes

1. Work in the service directory (e.g., `sailorskills-operations/`)
2. Commit and push from within that service directory
3. Vercel auto-deploys from the service repo's main branch

## What NOT to Do

| Don't | Why | Do Instead |
|-------|-----|------------|
| Use `.worktrees/` | Deprecated - causes deployment sync issues | Develop directly in service directories |
| Commit from parent directory | Changes won't deploy | Commit from within service repo |
| Create service-to-service API calls | Breaks loose coupling | Use shared database or edge functions |
| Delete database columns | Breaking change | Mark as deprecated, create migration path |

## Service Quick Reference

| Service | Port | Primary Purpose |
|---------|------|-----------------|
| operations | 5173 | Admin hub, scheduling |
| portal | 5174 | Customer-facing portal |
| billing | 5175 | Stripe payments |
| estimator | 5176 | Pricing calculator |
| booking | 5177 | Training scheduling |
| inventory | 5178 | Parts management |
| insight | 5179 | Analytics |
| settings | 5180 | System configuration |
| login | 5181 | SSO authentication |
| marketing | 5182 | Marketing site |

## Database Tables

Key shared tables across services:
- `customers` - Customer records
- `boats` - Boat information
- `bookings` - Service appointments
- `invoices` - Billing records
- `service_logs` - Service history
- `inventory` - Parts inventory
- `anodes` - Anode tracking

See `docs/architecture/TABLE_OWNERSHIP_MATRIX.md` for ownership details.

## Documentation Structure

```
docs/
├── AI_AGENT_GUIDE.md      # This file
├── guides/                # How-to guides
│   ├── DEVELOPMENT_WORKFLOW.md
│   ├── DATABASE_ACCESS.md
│   ├── LOCAL_DEVELOPMENT.md
│   └── TESTING_PLATFORM_GUIDE.md
├── architecture/          # System design
│   ├── INTEGRATIONS.md
│   ├── TABLE_OWNERSHIP_MATRIX.md
│   └── service-relationship-diagram.md
├── setup/                 # Deployment & config
│   ├── VERCEL_CONFIG_CHECKLIST.md
│   ├── DNS_CONFIGURATION.md
│   └── GITHUB_SECRETS_SETUP.md
├── plans/                 # Implementation plans
├── handoffs/              # Current session handoffs
└── archive/               # Historical documents
    ├── sessions/          # Old session summaries
    ├── handoffs/          # Old handoffs
    └── completed/         # Completed task docs
```

## Getting Help

- **Governance & responsibilities**: `CLAUDE.md`
- **Current priorities**: `ROADMAP.md`
- **Schema changes**: `MIGRATION_SUMMARY.md`
- **Test credentials**: 1Password (search: 'Sailorskills Login')
