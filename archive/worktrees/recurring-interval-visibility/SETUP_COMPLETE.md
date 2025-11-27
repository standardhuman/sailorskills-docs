# 🎉 Local Development Setup - COMPLETE!

**Sailorskills Hybrid Local Development Environment**

---

## ✅ What's Been Set Up

### Phase 1: Port Resolution ✓
- ✅ All 11 services have unique ports (no conflicts)
- ✅ `services.json` registry created with full service documentation
- ✅ All `vite.config.js` files updated
- ✅ Backend servers (Booking API, Video Flask) updated

### Phase 2: Orchestration ✓
- ✅ Root `package.json` with npm workspaces
- ✅ Concurrently for parallel service execution
- ✅ 15+ npm scripts for different service combinations
- ✅ Colorized output for easy log reading

### Phase 3: Local Supabase ✓
- ✅ Supabase setup script (`setup-local-supabase.sh`)
- ✅ Schema pull from production
- ✅ Local credentials management
- ✅ Seed data script for test users/boats/invoices

### Phase 4: Environment Management ✓
- ✅ Comprehensive `.env.example` with all variables
- ✅ Environment validation script
- ✅ Environment loader for shell sessions
- ✅ Support for local and remote Supabase modes

### Phase 5: Shared Package ✓
- ✅ Sync script for git submodule
- ✅ Automatic initialization and updates
- ✅ Pre-start checks

### Phase 6: Developer Tools ✓
- ✅ `start-dev.sh` - All-in-one development starter
- ✅ `stop-all.sh` - Graceful shutdown
- ✅ `service-status.sh` - Real-time service dashboard
- ✅ Multiple start modes (all, core, admin, customer)

### Phase 7: Integration Tests ✓
- ✅ Playwright config for local testing
- ✅ 3 integration test suites:
  - Estimator → Operations
  - Operations → Billing
  - Billing → Portal
- ✅ Test documentation and README

### Phase 8: Documentation ✓
- ✅ `LOCAL_DEVELOPMENT.md` - Complete setup guide
- ✅ Service registry documentation
- ✅ Integration test documentation
- ✅ This completion summary

---

## 🚀 Quick Start Commands

### First Time Setup

```bash
# 1. Install dependencies
npm install
npm run install:all

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. (Optional) Setup local Supabase
./scripts/setup-local-supabase.sh
./scripts/seed-local-data.sh

# 4. Start services
./scripts/start-dev.sh all
```

### Daily Development

```bash
# Start core services (Portal, Billing, Operations, Dashboard)
./scripts/start-dev.sh core

# Check status
./scripts/service-status.sh

# Stop when done
./scripts/stop-all.sh
```

### Testing

```bash
# Run integration tests
npm run test:local:integration

# Run specific test
npx playwright test tests/integration/estimator-to-operations.spec.js --config=playwright.config.local.js

# Debug mode
npm run test:debug
```

---

## 📋 Service Port Reference

| Service | Port | URL |
|---------|------|-----|
| **Portal** | 5174 | http://localhost:5174 |
| **Billing** | 5173 | http://localhost:5173 |
| **Operations** | 5176 | http://localhost:5176 |
| **Dashboard** | 8080 | http://localhost:8080 |
| **Estimator** | 5175 | http://localhost:5175 |
| **Inventory** | 5177 | http://localhost:5177 |
| **Booking (Frontend)** | 5178 | http://localhost:5178 |
| **Booking (API)** | 3001 | http://localhost:3001 |
| **Site** | 5179 | http://localhost:5179 |
| **Marketing** | 5180 | http://localhost:5180 |
| **Video** | 5000 | http://localhost:5000 |
| **Supabase API** | 54321 | http://localhost:54321 |
| **Supabase Studio** | 54323 | http://localhost:54323 |

---

## 📦 Available Scripts

### Service Management
```bash
npm run dev:all              # Start all 11 services
npm run dev:core             # Portal + Billing + Operations + Dashboard
npm run dev:admin            # Billing + Operations + Dashboard + Inventory
npm run dev:customer-facing  # Portal + Estimator + Booking + Sites
npm run dev:frontend         # All frontend services
npm run dev:portal           # Just Portal
npm run dev:billing          # Just Billing
# ... (individual scripts for each service)
```

### Database
```bash
npm run dev:db               # Start local Supabase
npm run db:status            # Check Supabase status
npm run db:stop              # Stop Supabase
supabase start               # Direct Supabase CLI
supabase stop                # Stop Supabase
```

### Testing
```bash
npm run test                 # All tests
npm run test:integration     # Integration tests (remote URLs)
npm run test:local           # All tests (local URLs)
npm run test:local:integration # Integration tests (local URLs)
npm run test:debug           # Debug mode with Playwright inspector
```

### Utilities
```bash
npm run sync:shared          # Update shared package
npm run install:all          # Install all service dependencies
npm run clean                # Clean node_modules
```

### Helper Scripts
```bash
./scripts/start-dev.sh [mode]      # Start services with pre-flight checks
./scripts/stop-all.sh              # Stop all running services
./scripts/service-status.sh        # Check what's running
./scripts/validate-env.sh          # Validate environment variables
./scripts/sync-shared.sh           # Sync shared package
./scripts/setup-local-supabase.sh  # Setup local Supabase
./scripts/seed-local-data.sh       # Seed test data
source scripts/load-env.sh         # Load environment into shell
```

---

## 🎯 Key Features

### 🚄 Performance
- **2-5x faster** than Docker on Apple Silicon
- Native macOS processes (no VM overhead)
- Instant hot reload with Vite
- Optional local database for offline development

### 🛠️ Developer Experience
- **One-command startup** for entire suite
- **Color-coded logs** for easy debugging
- **Service status dashboard** shows what's running
- **Environment validation** catches issues early
- **Graceful shutdown** with process cleanup

### 🧪 Testing
- **Integration test suite** for cross-service flows
- **Local Playwright config** for localhost testing
- **Test data seeding** for consistent test environment
- **Debug mode** with Playwright inspector

### 📚 Documentation
- Comprehensive setup guide
- Service architecture overview
- Troubleshooting guides
- Integration test documentation

---

## 🔧 Development Modes

### Local Supabase (Recommended for Testing)

```bash
# Setup (one-time)
./scripts/setup-local-supabase.sh

# Use local database
source .env.local.supabase

# Seed test data
./scripts/seed-local-data.sh

# Start services
./scripts/start-dev.sh all
```

**Pros:**
- ✅ Offline development
- ✅ Test database migrations safely
- ✅ No impact on production data
- ✅ Fast database queries (localhost)

### Remote Supabase (Default)

```bash
# Use production database
source .env.local

# Start services
./scripts/start-dev.sh all
```

**Pros:**
- ✅ No local setup needed
- ✅ Real production data (be careful!)
- ✅ Simpler setup

**Cons:**
- ⚠️ Requires internet connection
- ⚠️ Changes affect production

---

## 🐛 Common Commands

### Check What's Running
```bash
./scripts/service-status.sh
```

### Kill Stuck Process
```bash
lsof -ti:5173 | xargs kill  # Replace 5173 with your port
```

### Restart Everything
```bash
./scripts/stop-all.sh
./scripts/start-dev.sh all
```

### View Logs
Services output to the terminal where `start-dev.sh` was run. Look for color-coded prefixes:
- `[portal]` - Portal service logs
- `[billing]` - Billing service logs
- etc.

### Update Shared Package
```bash
./scripts/sync-shared.sh
# Then restart services
./scripts/stop-all.sh
./scripts/start-dev.sh core
```

---

## 📖 Full Documentation

- **Setup Guide:** `LOCAL_DEVELOPMENT.md`
- **Service Registry:** `services.json`
- **Environment Template:** `.env.example`
- **Integration Tests:** `tests/integration/README.md`
- **Global Standards:** `~/.claude/CLAUDE.md`
- **Project Guide:** `CLAUDE.md`

---

## ✅ Verification Checklist

After setup, verify everything works:

- [ ] All dependencies installed: `npm run install:all`
- [ ] Environment validated: `./scripts/validate-env.sh`
- [ ] Services start: `./scripts/start-dev.sh core`
- [ ] Services visible: `./scripts/service-status.sh`
- [ ] Portal loads: Open http://localhost:5174
- [ ] Billing loads: Open http://localhost:5173
- [ ] Operations loads: Open http://localhost:5176
- [ ] Dashboard loads: Open http://localhost:8080
- [ ] Services stop cleanly: `./scripts/stop-all.sh`

**Optional (Local Supabase):**
- [ ] Supabase CLI installed: `supabase --version`
- [ ] Supabase starts: `supabase start`
- [ ] Supabase Studio accessible: Open http://localhost:54323
- [ ] Test data seeded: `./scripts/seed-local-data.sh`

**Optional (Integration Tests):**
- [ ] Tests run: `npm run test:local:integration`
- [ ] Test data exists in database

---

## 🎓 Learning Path

**New to the project?**

1. Read `LOCAL_DEVELOPMENT.md` for complete setup guide
2. Review `services.json` to understand the architecture
3. Start with `./scripts/start-dev.sh core` (4 core services)
4. Explore the Portal at http://localhost:5174
5. Try the integration tests: `npm run test:local:integration`

**Ready to develop?**

1. Pick a service to work on
2. Start just that service: `npm run dev:portal`
3. Make changes (hot reload enabled)
4. Test locally
5. Run integration tests before committing

---

## 🤝 Contributing

When making changes to local development setup:

1. Update this documentation
2. Update `.env.example` if adding variables
3. Update `services.json` if changing ports/services
4. Test from scratch on clean environment
5. Update "Last Updated" dates

---

## 🆘 Getting Help

### Quick Troubleshooting

1. **Check service status:** `./scripts/service-status.sh`
2. **Validate environment:** `./scripts/validate-env.sh`
3. **View logs:** Check terminal where services are running
4. **Restart services:** `./scripts/stop-all.sh && ./scripts/start-dev.sh all`

### Documentation

- Local setup issues → `LOCAL_DEVELOPMENT.md`
- Service-specific questions → Check service's `CLAUDE.md`
- Integration testing → `tests/integration/README.md`
- Port conflicts → `services.json`

---

**Setup completed on:** 2025-11-03
**Configuration:** Hybrid (Native macOS Processes + Optional Local Supabase)
**Status:** ✅ Ready for Development

**Happy coding! 🚀**
