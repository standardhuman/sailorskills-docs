# Shared Documentation Sections for Sailor Skills Projects

This file contains common documentation sections referenced by individual project CLAUDE.md files to reduce redundancy.

---

## Shared Package Setup {#shared-package-setup}

This repo includes the shared package as a git submodule:

```bash
# Initialize submodule (first time)
git submodule update --init --recursive

# Update to latest shared package
cd shared
git pull origin main
cd ..
git add shared
git commit -m "chore: update shared package"
```

**Import from shared:**
```javascript
import { createSupabaseClient, initStripe } from './shared/src/index.js';
```

**Common imports:**
- `createSupabaseClient` - Supabase client factory
- `SimpleAuth` - Basic authentication utilities
- `showToast` - Toast notification helper
- `createModal` - Modal dialog helper
- `initNavigation` - Global navigation setup

---

## Development Workflow {#development-workflow}

**IMPORTANT**: Always follow these steps after making code changes:

1. **Test Locally**: Run `npm run dev` (or appropriate command) and manually test changes
2. **Test with Playwright**: Run Playwright MCP tests to verify functionality
3. **Build** (if applicable): Run `npm run build` to ensure production build works
4. **Commit**: Commit changes with clear message following global standards
5. **Push to GitHub**: Push to `main` branch (triggers Vercel deployment)

See `~/.claude/CLAUDE.md` for commit message format and testing standards.

---

## Environment Variables {#environment-variables}

### Vercel Configuration

Required in Vercel project settings:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Local Development

Create `.env` file in project root:

```env
# Copy from .env.example
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

**Never commit `.env` files to git!**

---

## Deployment Process {#deployment}

### Vercel Deployment

- **URL**: See project-specific CLAUDE.md for production URL
- **Platform**: Vercel (static or SSR deployment)
- **Auto-deploy**: Pushes to `main` branch trigger production deployment
- **Preview**: All PRs get preview deployment URLs

### Deployment Checklist

- [ ] All tests passing locally
- [ ] Environment variables set in Vercel dashboard
- [ ] Build completes without errors
- [ ] Preview deployment tested
- [ ] Production deployment verified

---

## Supabase Database {#supabase}

### Connection

All Sailor Skills services share a single Supabase instance:
- Project ID: `fzygakldvvzxmahkdylq`
- Connection managed via `createSupabaseClient()` from shared package

### Row-Level Security (RLS)

- All tables have RLS policies enabled
- Customer-facing apps filter by `auth.uid()`
- Admin apps use service role (server-side only)
- Test RLS policies before deploying

### Common Tables

- `customers` - Customer accounts
- `boats` - Boat information
- `bookings` - Service bookings
- `invoices` - Billing invoices
- `service_logs` - Service history
- `inventory` - Parts and supplies
- `anodes` - Anode tracking

---

## Shared Resources & Design System {#design-system}

**⚠️ MANDATORY:** All services MUST comply with the official Sailor Skills Shared Resources & Design System Directive.

📖 **Full Directive:** `./shared/SHARED_RESOURCES_DIRECTIVE.md`

### Quick Integration Checklist

- [ ] `/shared/src/ui/design-tokens.css` imported
- [ ] `/shared/src/ui/styles.css` imported
- [ ] Montserrat font loaded
- [ ] `initNavigation()` called with correct `currentPage`
- [ ] Navigation tests passing
- [ ] No hardcoded colors (using CSS variables)
- [ ] Sharp corners enforced (no border-radius)

### Navigation Setup

```javascript
import { initNavigation } from '/shared/src/ui/navigation.js';

// Initialize with current page identifier
initNavigation({ currentPage: 'inventory' });
```

### Testing Compliance

```bash
cd shared
npx playwright test tests/navigation-compliance.spec.js -g "YourService"
```

---

## Playwright Testing {#playwright-testing}

### Running Tests

All Sailor Skills projects use Playwright MCP for end-to-end testing.

**Via Claude Code:**
1. Ask Claude to "test with Playwright MCP"
2. Claude will execute tests in the browser
3. Review results and fix any failures

**Manual execution:**
```bash
npx playwright test
npx playwright test --ui  # Interactive mode
```

### Test Patterns

```javascript
// Basic flow test
test('customer can view service history', async ({ page }) => {
  await page.goto('https://portal.sailorskills.com');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.click('[data-testid="login-button"]');
  await expect(page.locator('[data-testid="service-list"]')).toBeVisible();
});
```

### Test Credentials

Production test account:
- **Location**: 1Password → "Sailor Skills Test Account"
- **Usage**: For testing authentication flows only
- **Never hardcode** credentials in test files

---

## Troubleshooting Common Issues {#troubleshooting}

### Supabase Connection Errors

**Symptoms:** "Failed to connect to Supabase" or 401/403 errors

**Solutions:**
1. Verify environment variables are set correctly
2. Check Supabase project is active (not paused)
3. Verify anon key hasn't expired
4. Test connection in Supabase SQL editor
5. Check RLS policies aren't blocking access

### Build Failures

**Symptoms:** Vercel build fails or `npm run build` errors

**Solutions:**
1. Clear Vite cache: `rm -rf node_modules/.vite`
2. Delete and reinstall: `rm -rf node_modules && npm install`
3. Check for TypeScript errors: `npx tsc --noEmit`
4. Verify all imports use correct paths
5. Check for missing environment variables

### Shared Package Issues

**Symptoms:** "Cannot find module" errors for shared imports

**Solutions:**
1. Initialize submodule: `git submodule update --init --recursive`
2. Check submodule is on correct commit
3. Verify import paths use `/shared/` (absolute)
4. Update submodule: `cd shared && git pull origin main`

### Navigation Not Appearing

**Symptoms:** Global nav doesn't render

**Solutions:**
1. Verify `initNavigation()` is called in main.js
2. Check design-tokens.css is imported before styles.css
3. Verify HTML has `<nav id="global-nav"></nav>` element
4. Run navigation compliance tests
5. Check console for JavaScript errors

---

## Integration Points {#integration-points}

### Cross-Service Data Flow

```
Estimator (Customer Intake)
    ↓ creates customer/boat
Operations (Service Execution)
    ↓ creates service logs
Billing (Payment Processing)
    ↓ creates invoices
Dashboard (Analytics)
    → reads all data
```

### Shared Data Principles

- **Single Source of Truth**: Estimator owns customer/boat data
- **Event-Driven**: Services react to state changes
- **No Direct APIs**: Services communicate via shared database
- **RLS Enforcement**: Data access controlled at database level

### Service-Specific Integration Notes

See individual project CLAUDE.md files for:
- Specific tables each service reads/writes
- Data validation requirements
- Expected data formats
- Integration testing procedures

---

## Development Guidelines Summary {#guidelines}

### Code Quality
- TypeScript for all new code
- ESLint + Prettier for formatting
- Meaningful variable names
- Functions ≤50 lines
- Files ≤300 lines

### Testing
- Test before committing (mandatory)
- Use Playwright for E2E tests
- Test happy path + edge cases
- Write regression tests for bugs

### Security
- Never commit secrets
- Use environment variables
- Implement RLS properly
- Validate user input
- Sanitize outputs

### Performance
- Lazy load heavy components
- Optimize images
- Cache expensive queries
- Monitor bundle size
- Index database queries

---

## Related Documentation

- **Global Standards**: `~/.claude/CLAUDE.md`
- **Design System**: `./shared/SHARED_RESOURCES_DIRECTIVE.md`
- **Architecture**: `./ARCHITECTURE.md` (if exists)
- **Project Manager Notes**: `./CLAUDE.md`

---

**Last Updated:** 2025-10-29
**Maintained By:** Brian
**Review**: Update when patterns change across multiple services
