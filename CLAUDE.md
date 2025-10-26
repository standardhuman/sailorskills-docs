- use login standardhuman@gmail.com and pw KLRss!650 for any authentication needs

## Database Access - Use This First!

**IMPORTANT: You can now run SQL queries directly from Claude Code!**

### When to Use Database Queries
- ✅ Verifying data exists before testing
- ✅ Debugging data issues
- ✅ Checking database state during development
- ✅ Running migrations and schema changes
- ✅ Validating data after changes
- ✅ Setting up test data
- ✅ Investigating issues

### Quick Usage
```bash
# Load database connection
source db-env.sh

# Run any SQL query
psql "$DATABASE_URL" -c "SELECT * FROM customers LIMIT 5"

# Or use Node.js utility from anywhere
node sailorskills-portal/scripts/test-helpers/example-quick-query.mjs "SELECT COUNT(*) FROM customers"
```

### Key Benefits
- No need to open Supabase dashboard
- Faster debugging and verification
- Can automate testing workflows
- Run migrations directly from Claude Code

**Full documentation:** See `DATABASE_ACCESS.md` in this directory

## Project Manager Role - Sailorskills Suite

### Architecture & Information Flow
- Before making changes that affect multiple services, document the data flow impact across the suite (Estimator → Operations → Billing → Dashboard)
- All database schema changes must be documented in MIGRATION_SUMMARY.md with timestamp and affected services
- Services communicate via shared Supabase database - never introduce direct service-to-service API calls without architectural review
- Changes to shared tables (customers, boats, bookings, invoices, service_logs, inventory, anodes) require cross-service impact analysis

### Shared Package Governance
- Changes to sailorskills-shared must be tested across ALL dependent services before merging
- Navigation updates in shared package require updating all service nav implementations
- Design system changes (tokens, CSS variables, components) must maintain backward compatibility
- Document shared package version updates in each service's changelog

### Database & Integration Standards
- All new tables/columns must follow existing naming conventions (snake_case)
- Use JSONB for flexible/extensible fields (see propeller tracking in service_logs as reference)
- Maintain Row-Level Security (RLS) policies when adding tables
- Never delete database columns - mark as deprecated and create migration path
- **Always use database query tools to verify schema and run migrations** (see Database Access section above)
- Test migrations with `psql "$DATABASE_URL" -f migration.sql` before deploying
- Use migration utilities in `sailorskills-portal/scripts/test-helpers/` for automated migrations

### Roadmap & Planning
- Maintain roadmap in root-level ROADMAP.md file with quarterly objectives
- Track cross-service features using todo lists with service dependencies clearly marked
- Before implementing new features, verify they don't duplicate existing functionality in other services
- Priority order: Critical bugs → Estimator/Operations improvements → Dashboard analytics → New features

### Documentation Standards
- Update service-specific READMEs when changing functionality
- Maintain architecture diagrams in root-level docs/ directory
- Document API integrations (Stripe, YouTube, Google Calendar, Gemini) in INTEGRATIONS.md
- Keep deployment URLs updated in service READMEs

### Testing & Deployment
- Always test in Playwright MCP before marking features complete
- Verify changes in Vercel preview deployments before merging to main
- Run cross-service integration tests when changing shared database tables
- Always push to git after completing changes

### Service-Specific Responsibilities
- **Estimator**: Customer acquisition - pricing changes affect revenue projections
- **Operations**: Service delivery hub - changes affect field team workflows
- **Billing**: Payment processing - changes must be Stripe-compliant
- **Inventory**: Parts management - coordinate with Operations for anode/supply needs
- **Dashboard**: Read-only analytics - ensure queries don't impact production performance
- **Booking**: Training scheduling - maintain Google Calendar sync integrity
- **Video**: Video workflows - coordinate YouTube playlist structure with Operations
- **Shared**: Foundation package - breaking changes require coordinated rollout plan

### Cross-Service Coordination
- When adding features to one service that require data from another, use database views or edge functions
- Webhook implementations must include retry logic and error handling
- New service integrations must be documented in the data flow diagram
- Customer-facing changes (Estimator, Operations client portal, Booking) require UX consistency review