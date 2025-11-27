# Sailorskills Local Development Guide

Complete guide for setting up and running the entire Sailorskills suite locally for testing and development.

**Last Updated:** 2025-11-03

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Prerequisites](#prerequisites)
4. [Initial Setup](#initial-setup)
5. [Running Services](#running-services)
6. [Development Workflow](#development-workflow)
7. [Environment Configuration](#environment-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Advanced Topics](#advanced-topics)

---

## Quick Start

**For experienced developers who want to get started immediately:**

```bash
# 1. Install dependencies
npm install
npm run install:all

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your API keys

# 3. Validate configuration
./scripts/validate-env.sh

# 4. Start all services
./scripts/start-dev.sh all

# 5. View service status
./scripts/service-status.sh
```

All services will be available at their respective ports (see [Service Ports](#service-ports)).

---

## Architecture Overview

### The Sailorskills Suite

Sailorskills consists of **11 independent services** that work together:

#### Frontend Services (Vite)
- **Portal** (5174) - Customer self-service portal
- **Billing** (5173) - Financial management and invoicing
- **Operations** (5176) - Admin operations hub
- **Dashboard/Insight** (8080) - Business intelligence
- **Estimator** (5175) - Customer-facing cost estimation
- **Inventory** (5177) - Parts and supplies tracking
- **Booking** (5178) - Training session booking
- **Site** (5179) - Main marketing website
- **Marketing** (5180) - Alternative marketing site

#### Backend Services
- **Booking API** (3001) - Express.js server for booking
- **Video/BOATY** (5000) - Flask app for video management

#### Infrastructure
- **Supabase** (54321/54323) - Database, Auth, Storage (optional local)
- **Shared Package** - Git submodule with common utilities

### Data Flow

```
Estimator → Operations → Billing → Portal
             ↓                        ↑
          Inventory              (Customer View)
             ↓
        Dashboard (Analytics from all services)
```

### Technology Stack

- **Frontend**: Vite + Vanilla JS/React
- **Backend**: Node.js (Express) + Python (Flask)
- **Database**: Supabase (PostgreSQL)
- **Payments**: Stripe
- **Calendar**: Google Calendar API
- **AI**: Google Gemini API
- **Video**: YouTube Data API v3

---

## Prerequisites

### Required Software

| Software | Version | Installation | Check Version |
|----------|---------|--------------|---------------|
| **Node.js** | 18+ | [nodejs.org](https://nodejs.org) | `node --version` |
| **npm** | 9+ | (Comes with Node.js) | `npm --version` |
| **Git** | 2.0+ | [git-scm.com](https://git-scm.com) | `git --version` |

### Optional Software

| Software | Purpose | Installation | Check Version |
|----------|---------|--------------|---------------|
| **Python** | Video service | [python.org](https://python.org) | `python3 --version` |
| **Supabase CLI** | Local database | `brew install supabase/tap/supabase` | `supabase --version` |

### Required Accounts & API Keys

- **Supabase Account** - [supabase.com](https://supabase.com)
- **Stripe Account** (Test mode) - [stripe.com](https://stripe.com)
- **Google Cloud Project** - [console.cloud.google.com](https://console.cloud.google.com)
  - Calendar API enabled
  - YouTube Data API v3 enabled (for video service)
- **Gemini API Key** - [makersuite.google.com](https://makersuite.google.com)
- **GitHub Token** (for marketing) - [github.com/settings/tokens](https://github.com/settings/tokens)

---

## Initial Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/your-org/sailorskills-repos.git
cd sailorskills-repos
```

### Step 2: Initialize Shared Package

```bash
# Sync the shared package submodule
./scripts/sync-shared.sh
```

This initializes and updates the `sailorskills-shared` git submodule.

### Step 3: Install Dependencies

```bash
# Install root dependencies
npm install

# Install dependencies for all services
npm run install:all
```

This will:
- Install concurrently, npm-run-all, and other root dependencies
- Install dependencies for all 9 Node.js services via npm workspaces
- Sync the shared package

### Step 4: Configure Environment

```bash
# Copy environment template
cp .env.example .env.local

# Edit with your API keys
nano .env.local  # or use your preferred editor
```

**Minimum required variables:**

```env
# Supabase (remote or local)
VITE_SUPABASE_URL=https://fzygakldvvzxmahkdylq.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Stripe (test mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

See `.env.example` for all available options.

### Step 5: Validate Configuration

```bash
# Run environment validation
./scripts/validate-env.sh
```

This checks that all required environment variables are set.

### Step 6: (Optional) Setup Local Supabase

**If you want to test database changes locally:**

```bash
# Install Supabase CLI (macOS)
brew install supabase/tap/supabase

# Initialize local Supabase
supabase init

# Pull production schema
supabase db pull

# Start local Supabase
supabase start
```

Your local Supabase will be available at:
- **API**: `http://localhost:54321`
- **Studio**: `http://localhost:54323`

Update `.env.local`:

```env
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=[get from: supabase status]
```

---

## Running Services

### Using Helper Scripts (Recommended)

#### Start All Services

```bash
./scripts/start-dev.sh all
```

This runs all 11 services simultaneously with colorized output.

#### Start Specific Service Groups

```bash
# Core services only (Portal, Billing, Operations, Dashboard)
./scripts/start-dev.sh core

# All frontend services
./scripts/start-dev.sh frontend

# Admin services only
./scripts/start-dev.sh admin

# Customer-facing services only
./scripts/start-dev.sh customer

# Local Supabase only
./scripts/start-dev.sh db
```

#### Stop All Services

```bash
./scripts/stop-all.sh
```

#### Check Service Status

```bash
./scripts/service-status.sh
```

### Using npm Scripts

You can also run individual services or groups using npm:

```bash
# Start all services
npm run dev:all

# Start core services
npm run dev:core

# Start individual service
npm run dev:portal
npm run dev:billing
npm run dev:operations
# etc.

# Start local Supabase
npm run dev:db

# Check Supabase status
npm run db:status

# Stop Supabase
npm run db:stop
```

### Manual Service Startup

If you prefer to run services individually:

```bash
# Frontend services (Vite)
cd sailorskills-portal && npm run dev
cd sailorskills-billing && npm run dev
# etc.

# Booking API (Express)
cd sailorskills-booking && node server.js

# Video service (Flask)
cd sailorskills-video && python app.py
```

---

## Service Ports

All port conflicts have been resolved. Here's the complete port allocation:

| Service | Port | URL | Type |
|---------|------|-----|------|
| **Portal** | 5174 | http://localhost:5174 | Vite |
| **Billing** | 5173 | http://localhost:5173 | Vite |
| **Operations** | 5176 | http://localhost:5176 | Vite |
| **Dashboard** | 8080 | http://localhost:8080 | Vite |
| **Estimator** | 5175 | http://localhost:5175 | Vite |
| **Inventory** | 5177 | http://localhost:5177 | Vite |
| **Booking (Frontend)** | 5178 | http://localhost:5178 | Vite |
| **Booking (API)** | 3001 | http://localhost:3001 | Express |
| **Site** | 5179 | http://localhost:5179 | Vite |
| **Marketing** | 5180 | http://localhost:5180 | Vite |
| **Video** | 5000 | http://localhost:5000 | Flask |
| **Supabase (API)** | 54321 | http://localhost:54321 | Docker |
| **Supabase Studio** | 54323 | http://localhost:54323 | Docker |

---

## Development Workflow

### Typical Workflow

1. **Start services**
   ```bash
   ./scripts/start-dev.sh core
   ```

2. **Make changes** in your editor
   - Hot reload is enabled for all Vite services
   - Flask/Express require manual restart

3. **Test changes**
   - Navigate to service URL in browser
   - Use Playwright for automated testing

4. **Stop services when done**
   ```bash
   ./scripts/stop-all.sh
   ```

### Testing Changes

```bash
# Run integration tests
npm run test:integration

# Run all tests
npm test
```

### Updating Shared Package

When the shared package is updated:

```bash
# Pull latest shared package
./scripts/sync-shared.sh

# Restart services to pick up changes
./scripts/stop-all.sh
./scripts/start-dev.sh all
```

### Working with the Database

#### Using Remote Supabase

```bash
# Query database directly (requires DATABASE_URL in .env.local)
source .env.local
psql "$DATABASE_URL" -c "SELECT * FROM customers LIMIT 5"
```

#### Using Local Supabase

```bash
# Start local Supabase
npm run dev:db

# View in Studio
open http://localhost:54323

# Run migrations
supabase db push

# Reset local database
supabase db reset
```

---

## Environment Configuration

### Environment File Locations

- **Root**: `.env.local` - Shared variables for all services
- **Per-service**: Each service reads from root `.env.local`

### Loading Environment

```bash
# Load environment into current shell
source scripts/load-env.sh

# Or load directly
source .env.local
```

### Environment Modes

#### Remote Development (Default)

```env
VITE_SUPABASE_URL=https://fzygakldvvzxmahkdylq.supabase.co
```

- Uses production Supabase
- Changes affect real data (be careful!)
- No local database needed

#### Local Development

```env
VITE_SUPABASE_URL=http://localhost:54321
```

- Uses local Supabase instance
- Changes are isolated
- Requires Supabase CLI

---

## Troubleshooting

### Port Already in Use

**Problem:** Service fails to start with "Port already in use" error

**Solution:**

```bash
# Check what's using the port
lsof -ti:5173  # Replace with your port

# Kill the process
lsof -ti:5173 | xargs kill

# Or use the stop script
./scripts/stop-all.sh
```

### Environment Variables Not Loading

**Problem:** Service can't connect to Supabase/Stripe/etc.

**Solution:**

```bash
# Validate environment
./scripts/validate-env.sh

# Check if .env.local exists
ls -la .env.local

# Load environment manually
source .env.local
```

### Shared Package Not Found

**Problem:** Services fail with "Cannot find module '/shared/...'"

**Solution:**

```bash
# Re-sync shared package
./scripts/sync-shared.sh

# Verify it exists
ls -la sailorskills-shared/
```

### Supabase Connection Failed

**Problem:** "fetch failed" or "network error" when connecting to Supabase

**Solutions:**

1. **Check if using local Supabase**
   ```bash
   supabase status
   # If not running: supabase start
   ```

2. **Check remote Supabase**
   - Verify project is active in [Supabase Dashboard](https://supabase.com/dashboard)
   - Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correct

3. **Check RLS policies**
   - Some queries may be blocked by Row-Level Security
   - Use SERVICE_KEY for admin operations

### Video Service Won't Start

**Problem:** Python/Flask errors when starting video service

**Solution:**

```bash
# Check Python is installed
python3 --version

# Install Python dependencies
cd sailorskills-video
pip3 install -r requirements.txt

# Activate virtual environment (if using one)
source boaty_venv/bin/activate
```

### Build Errors

**Problem:** Vite build fails

**Solution:**

```bash
# Clear Vite cache
rm -rf sailorskills-[service]/node_modules/.vite

# Reinstall dependencies
cd sailorskills-[service]
rm -rf node_modules
npm install
```

---

## Advanced Topics

### Running Services in Production Mode

```bash
# Build all services
for service in sailorskills-*/; do
    if [ -f "$service/package.json" ]; then
        cd "$service" && npm run build && cd ..
    fi
done

# Preview production builds
npm run preview --prefix sailorskills-portal
```

### Setting Up Webhooks for Local Development

Use [ngrok](https://ngrok.com) or similar to expose local services:

```bash
# Install ngrok
brew install ngrok

# Expose booking API
ngrok http 3001

# Use the ngrok URL in Stripe/Google webhooks
```

### Docker Alternative (Future)

While this guide uses native macOS processes for maximum performance, Docker configurations may be added in the future. The hybrid approach (Supabase CLI + native processes) provides 2-5x faster development than Docker on Apple Silicon.

### Integration Testing

```bash
# Run integration tests across services
npm run test:integration

# Test specific flow
npx playwright test tests/integration/estimator-to-operations.spec.js
```

### Database Migrations

```bash
# Create new migration (local Supabase)
supabase migration new migration_name

# Apply migrations
supabase db push

# Reset database (destructive!)
supabase db reset
```

---

## Additional Resources

- **Architecture Diagrams**: See `docs/architecture/`
- **Service Documentation**: Each service has its own `CLAUDE.md`
- **Shared Package**: `sailorskills-shared/README.md`
- **Integration Points**: See `CLAUDE.md` in root
- **Roadmap**: See `docs/roadmap/`

---

## Getting Help

### Common Commands Reference

```bash
# Setup
npm run install:all              # Install all dependencies
./scripts/sync-shared.sh         # Sync shared package

# Running
./scripts/start-dev.sh [mode]    # Start services
./scripts/stop-all.sh            # Stop all services
./scripts/service-status.sh      # Check service status

# Environment
./scripts/validate-env.sh        # Validate configuration
source scripts/load-env.sh       # Load environment

# Database
npm run dev:db                   # Start local Supabase
npm run db:status                # Check Supabase status
supabase db pull                 # Pull production schema

# Testing
npm test                         # Run all tests
npm run test:integration         # Run integration tests
```

### Quick Debugging

```bash
# 1. Check service status
./scripts/service-status.sh

# 2. Validate environment
./scripts/validate-env.sh

# 3. Check logs in terminal where services are running

# 4. Check browser console for frontend errors

# 5. Check database connectivity
psql "$DATABASE_URL" -c "SELECT 1"
```

---

## Contributing

When making changes to the local development setup:

1. Update this documentation
2. Update `.env.example` if adding new variables
3. Update `services.json` if changing ports/services
4. Test the setup from scratch on a clean machine if possible
5. Update the "Last Updated" date at the top of this file

---

**Happy coding! 🚀**
