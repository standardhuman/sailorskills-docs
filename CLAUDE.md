# Sailorskills Suite - AI Agent Instructions

- **Test Credentials**: See 1Password (search: 'Sailorskills Login')

## Quick Navigation

| I want to... | Go to |
|--------------|-------|
| Understand the architecture | `README.md` |
| Navigate as an AI agent | `docs/AI_AGENT_GUIDE.md` |
| Develop a service | `docs/guides/DEVELOPMENT_WORKFLOW.md` |
| Query the database | `docs/guides/DATABASE_ACCESS.md` |
| Set up local dev | `docs/guides/LOCAL_DEVELOPMENT.md` |
| Run tests | `docs/guides/TESTING_PLATFORM_GUIDE.md` |
| Deploy | `docs/setup/VERCEL_CONFIG_CHECKLIST.md` |

---

## Key Rules

1. **Develop in service directories** - Each `sailorskills-*` folder is its own git repo
2. **Worktrees are deprecated** - Do not use `.worktrees/`
3. **Shared database** - All services connect to the same Supabase instance
4. **Vercel deploys from service repos** - Not from this parent directory

---

## Project Governance

### Architecture & Information Flow
- Before changes affecting multiple services, document the data flow impact (Estimator → Operations → Billing → Insight)
- All database schema changes must be documented in `MIGRATION_SUMMARY.md`
- Services communicate via shared Supabase database - no direct service-to-service API calls
- Changes to shared tables require cross-service impact analysis

### Shared Package Governance
- Changes to sailorskills-shared must be tested across ALL dependent services
- Navigation updates require updating all service nav implementations
- Design system changes must maintain backward compatibility

### Database Standards
- Use snake_case naming conventions
- Use JSONB for flexible fields
- Maintain Row-Level Security (RLS) policies
- Never delete columns - mark as deprecated and create migration path
- See `docs/guides/DATABASE_ACCESS.md` for query instructions

### Testing & Deployment
- Test with Playwright before marking features complete
- Verify Vercel preview deployments before merging
- Run cross-service integration tests when changing shared tables
- Always push to git after completing changes

---

## Service Responsibilities

| Service | Responsibility | Key Considerations |
|---------|---------------|-------------------|
| **Estimator** | Customer acquisition | Pricing changes affect revenue projections |
| **Operations** | Service delivery hub | Changes affect field team workflows |
| **Billing** | Payment processing | Must be Stripe-compliant |
| **Inventory** | Parts management | Coordinate with Operations for supplies |
| **Insight** | Business intelligence | Queries must not impact production |
| **Booking** | Training scheduling | Maintain Google Calendar sync |
| **Video** | Video workflows | Coordinate YouTube structure with Operations |
| **Settings** | System configuration | Houses BCC email config, templates, pricing |
| **Portal** | Customer portal | Service history, invoices |
| **Login** | SSO authentication | Centralized auth across services |
| **Shared** | Foundation package | Breaking changes require coordinated rollout |

---

## Cross-Service Coordination

- Use database views or edge functions for cross-service data
- Webhook implementations must include retry logic
- New integrations must be documented in `docs/architecture/INTEGRATIONS.md`
- Customer-facing changes require UX consistency review

---

## BCC Email Configuration

**Location**: https://settings.sailorskills.com → System Configuration

All services use `getBccAddress(serviceName)` from `sailorskills-shared/src/lib/bcc-lookup.js` for email BCC functionality.

**Tables**: `email_bcc_settings`, `email_bcc_audit_log`

See Settings service CLAUDE.md for detailed configuration.
