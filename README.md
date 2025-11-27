# Sailorskills Suite

A comprehensive boat maintenance management platform consisting of 13 interconnected services.

## Quick Start for AI Agents

1. **Understand the architecture**: This is a "loose monorepo" - 13 independent git repos in one directory
2. **Read CLAUDE.md**: Project governance and service responsibilities
3. **Read docs/AI_AGENT_GUIDE.md**: Detailed navigation for common tasks
4. **Develop in service directories**: Each `sailorskills-*` folder is its own repo

## Services Overview

| Service | Purpose | URL |
|---------|---------|-----|
| **operations** | Admin hub - scheduling, service delivery | ops.sailorskills.com |
| **portal** | Customer portal - history, invoices | portal.sailorskills.com |
| **billing** | Payment processing, invoices (Stripe) | billing.sailorskills.com |
| **estimator** | Customer pricing calculator | estimator.sailorskills.com |
| **booking** | Training session scheduling | booking.sailorskills.com |
| **inventory** | Parts & supplies management | inventory.sailorskills.com |
| **insight** | Business analytics dashboard | insight.sailorskills.com |
| **settings** | System configuration, email management | settings.sailorskills.com |
| **login** | Centralized SSO authentication | login.sailorskills.com |
| **video** | Video workflow management (BOATY) | (Flask app, not deployed) |
| **marketing** | Marketing site, partner intake | marketing.sailorskills.com |
| **site** | Documentation site | sailorskills.com |
| **shared** | Design system, shared utilities | (npm package) |

## Data Flow

```
Customer Journey:
  estimator → booking → operations → billing → portal

Admin Flow:
  login → operations → inventory, billing, insight

Infrastructure:
  shared (used by all services)
  settings (config for all services)
```

## Directory Structure

```
sailorskills-repos/
├── sailorskills-*/          # 13 service directories (each is its own git repo)
├── docs/                    # Organized documentation
│   ├── guides/              # Development, database, testing guides
│   ├── architecture/        # System design, integrations
│   ├── setup/               # Deployment, DNS, secrets
│   └── archive/             # Historical handoffs and sessions
├── scripts/                 # Utility scripts
├── tests/                   # Playwright E2E tests
├── migrations/              # Database migrations
├── supabase/                # Supabase configuration
├── CLAUDE.md                # AI agent instructions & governance
├── ROADMAP.md               # Current roadmap
└── db-env.sh                # Database connection script
```

## Development

### Prerequisites
- Node.js 18+
- npm
- Access to Supabase project
- Vercel CLI (for deployment)

### Working on a Service
```bash
# Navigate to service directory
cd sailorskills-operations

# Install dependencies
npm install

# Start dev server
npm run dev
```

### Database Access
```bash
# Load connection
source db-env.sh

# Run queries
psql "$DATABASE_URL" -c "SELECT * FROM customers LIMIT 5"
```

See `docs/guides/DATABASE_ACCESS.md` for full documentation.

## Key Documentation

| Document | Purpose |
|----------|---------|
| `CLAUDE.md` | AI agent instructions, service responsibilities |
| `docs/AI_AGENT_GUIDE.md` | Navigation guide for AI agents |
| `docs/guides/DEVELOPMENT_WORKFLOW.md` | How to develop services |
| `docs/guides/DATABASE_ACCESS.md` | Database query instructions |
| `ROADMAP.md` | Current priorities and roadmap |
| `MIGRATION_SUMMARY.md` | Database schema changes |

## Tech Stack

- **Frontend**: Vite, Vanilla JS (some React)
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions)
- **Payments**: Stripe
- **Deployment**: Vercel
- **Testing**: Playwright

## Important Notes

- **Each service is its own git repo** - commit and push within service directories
- **Vercel deploys from service repos** - not from this parent directory
- **Worktrees are deprecated** - develop directly in service directories
- **Shared database** - all services connect to same Supabase instance
