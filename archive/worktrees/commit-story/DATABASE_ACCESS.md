# Database Access for Sailorskills Repos

Quick reference for accessing the Supabase database from any Sailorskills project.

## 🚀 Quick Start

### From any directory under `sailorskills-repos/`:

```bash
# Source the database environment
source /Users/brian/app-development/sailorskills-repos/db-env.sh

# Now you can use psql
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM customers"
```

Or use a relative path:
```bash
cd sailorskills-portal
source ../db-env.sh
psql "$DATABASE_URL" -c "SELECT * FROM boats LIMIT 5"
```

## 📁 Files Created

- **`.env`** - Contains DATABASE_URL (ignored by git)
- **`db-env.sh`** - Script to load DATABASE_URL into your shell
- **`sailorskills-portal/scripts/test-helpers/`** - Node.js query utilities

## 🛠️ Two Ways to Query the Database

### 1. psql (Interactive SQL)

**One-time queries:**
```bash
source db-env.sh
psql "$DATABASE_URL" -c "SELECT * FROM customers LIMIT 5"
```

**Interactive session:**
```bash
source db-env.sh
psql "$DATABASE_URL"

postgres=> SELECT COUNT(*) FROM boats;
postgres=> \dt  -- list tables
postgres=> \d customers  -- describe table
postgres=> \q  -- quit
```

### 2. Node.js Scripts (Programmatic)

**Quick query from anywhere:**
```bash
node sailorskills-portal/scripts/test-helpers/example-quick-query.mjs "SELECT COUNT(*) FROM customers"
```

**Verify customer:**
```bash
node sailorskills-portal/scripts/test-helpers/example-verify-customer.mjs standardhuman@gmail.com
```

**Check schema:**
```bash
node sailorskills-portal/scripts/test-helpers/example-check-schema.mjs
```

**In your own code:**
```javascript
import { queryOne, queryAll, queryValue } from './sailorskills-portal/scripts/test-helpers/db-query.mjs';

const customer = await queryOne('SELECT * FROM customers WHERE email = $1', ['test@example.com']);
const boatCount = await queryValue('SELECT COUNT(*) FROM boats WHERE customer_id = $1', [customer.id]);
```

## 🔄 Making it Permanent (Optional)

To have DATABASE_URL available in every new terminal session, add this to your `~/.zshrc`:

```bash
# Sailorskills Database Access
if [ -f "/Users/brian/app-development/sailorskills-repos/db-env.sh" ]; then
  source "/Users/brian/app-development/sailorskills-repos/db-env.sh"
fi
```

Then reload:
```bash
source ~/.zshrc
```

## 📊 Database Info

- **Database:** postgres
- **Region:** East US (North Virginia)
- **Connection:** Pooler (port 6543)
- **Tables:** customers, boats, service_logs, invoices, etc.

## 🔒 Security

- ✅ `.env` is in `.gitignore` - won't be committed
- ✅ DATABASE_URL contains password - keep it secret
- ✅ Connection uses SSL encryption
- ✅ For development/testing only

## 📚 Full Documentation

- **Node.js utilities:** `sailorskills-portal/scripts/test-helpers/README.md`
- **Portal testing:** `sailorskills-portal/CLAUDE.md` (Database Testing section)

## 🎯 Common Commands

```bash
# Count customers
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM customers"

# List all tables
psql "$DATABASE_URL" -c "\dt"

# Show customer boats
psql "$DATABASE_URL" -c "SELECT c.name, b.name as boat FROM customers c JOIN boats b ON c.id = b.customer_id LIMIT 10"

# Get specific customer
psql "$DATABASE_URL" -c "SELECT * FROM customers WHERE email = 'standardhuman@gmail.com'"
```

---

**All set! Database access is available throughout the sailorskills-repos directory.** 🎉
