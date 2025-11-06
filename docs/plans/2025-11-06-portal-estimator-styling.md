# Portal-Estimator Styling Alignment

**Date:** 2025-11-06
**Status:** Approved
**Type:** Design + Implementation

## Problem Statement

The Customer Portal (portal.sailorskills.com) uses **outdated CSS variable names** that no longer exist in the shared `design-tokens.css` file, causing the portal to fall back to browser defaults:

- Font displays as Times New Roman instead of Montserrat
- Colors don't match the Estimator's professional design
- Overall appearance is inconsistent with the Estimator (sailorskills.com/estimate)

### Root Cause

Portal HTML files reference CSS variables like:
- `var(--ss-font-family)` ❌ Does not exist
- `var(--ss-neutral-600)` ❌ Does not exist
- `var(--ss-primary-600)` ❌ Does not exist

But the actual shared design-tokens.css uses:
- `var(--ss-font-primary)` ✅ Correct
- `var(--ss-text-medium)` ✅ Correct
- `var(--ss-primary)` ✅ Correct

## Goals

1. **Visual Consistency:** Portal matches Estimator's clean, professional design
2. **CSS Consolidation:** Extract common styles into reusable portal-styles.css
3. **Navigation Alignment:** Portal header/nav matches Estimator structure
4. **Testing:** Playwright visual regression tests prevent future regressions
5. **Zero Downtime:** Safe deployment with rollback plan

## Design Decisions

### Approach: CSS-First Migration

**Why CSS-first:**
- Build complete `portal-styles.css` with all correct variables and components
- HTML files can then reference a single source of truth
- Easier to maintain consistency across 10 Portal pages
- Reusable component library for future Portal development

**Alternatives considered:**
- ❌ Page-by-page migration: Harder to maintain consistency
- ❌ Template-first: Bigger initial change, harder to test incrementally

### Navigation Strategy: Match Estimator

**Decision:** Replace Portal's custom navigation with Estimator-style header/nav

**Rationale:**
- Consistent customer experience (Estimator → Portal flow)
- Proven responsive design (hamburger menu on mobile)
- Clean, minimal aesthetic matches brand
- Easier to maintain one navigation pattern

**Adaptation for Portal:**
- Keep Portal-specific links (Dashboard, Services, Invoices, Messages, Account)
- Add user email + Sign Out button in header
- Maintain authentication context

## Architecture

### File Structure

```
sailorskills-portal/
├── src/
│   └── ui/
│       └── portal-styles.css          [NEW - Consolidated styles]
├── login.html                          [UPDATE - Add portal-styles.css]
├── signup.html                         [UPDATE]
├── reset-password.html                 [UPDATE]
├── portal.html                         [UPDATE - Dashboard]
├── portal-services.html                [UPDATE]
├── portal-invoices.html                [UPDATE]
├── portal-messages.html                [UPDATE]
├── portal-account.html                 [UPDATE]
├── portal-request-service.html         [UPDATE]
└── portal-request-history.html         [UPDATE]
```

### portal-styles.css Structure

```css
/* 1. Import shared design tokens */
@import url('../shared/src/ui/design-tokens.css');

/* 2. Global base styles */
body { font-family: var(--ss-font-primary); }

/* 3. Layout containers */
.portal-container { ... }

/* 4. Navigation components */
.portal-header { ... }
.nav-links { ... }
.hamburger { ... }

/* 5. Reusable UI components */
.btn-primary { ... }
.btn-secondary { ... }
.form-input { ... }
.card { ... }
.status-badge { ... }

/* 6. Page-specific utilities */
.dashboard-grid { ... }
.invoice-list { ... }
```

## CSS Variable Migration

### Mapping Table

| Old (Portal - BROKEN) | New (Design Tokens - CORRECT) | Value |
|----------------------|-------------------------------|-------|
| `--ss-font-family` | `--ss-font-primary` | Montserrat, Arial, sans-serif |
| `--ss-neutral-100` | `--ss-bg-light` | #fafafa |
| `--ss-neutral-200` | `--ss-border-subtle` | #e0e0e0 |
| `--ss-neutral-300` | `--ss-border` | #d0d0d0 |
| `--ss-neutral-600` | `--ss-text-medium` | #6d7b89 |
| `--ss-neutral-700` | `--ss-text-dark` | #181818 |
| `--ss-neutral-900` | `--ss-text-dark` | #181818 |
| `--ss-primary-600` | `--ss-primary` | #345475 |
| `--ss-primary-700` | `--ss-primary-hover` | #2a3f5f |
| `--ss-font-size-xs` | `--ss-text-xs` | 0.8125rem (13px) |
| `--ss-font-size-sm` | `--ss-text-sm` | 0.875rem (14px) |
| `--ss-font-size-md` | `--ss-text-base` | 1rem (16px) |
| `--ss-font-size-lg` | `--ss-text-lg` | 1.25rem (20px) |
| `--ss-font-size-xl` | `--ss-text-xl` | 1.5rem (24px) |
| `--ss-font-size-2xl` | `--ss-text-2xl` | 2.5rem (40px) |

### Status Badge Colors

| Old | New | Background | Text |
|-----|-----|------------|------|
| `--ss-success-100` | `--ss-status-success-bg` | #D1FAE5 | #065F46 |
| `--ss-success-700` | `--ss-status-success-text` | | |
| `--ss-warning-100` | `--ss-status-warning-bg` | #FEF3C7 | #92400E |
| `--ss-warning-700` | `--ss-status-warning-text` | | |
| `--ss-error-100` | `--ss-status-danger-bg` | #FEE2E2 | #991B1B |
| `--ss-error-700` | `--ss-status-danger-text` | | |

## Component Library

### Navigation (Estimator-Style)

```html
<header class="portal-header">
  <div class="header-container">
    <!-- Brand -->
    <div class="brand">
      SAILOR SKILLS
      <span class="brand-divider">─────────────</span>
      PORTAL
    </div>

    <!-- Desktop Navigation -->
    <nav class="nav-links">
      <a href="portal.html" class="active">Dashboard</a>
      <a href="portal-services.html">Services</a>
      <a href="portal-invoices.html">Invoices</a>
      <a href="portal-messages.html">Messages</a>
      <a href="portal-account.html">Account</a>
    </nav>

    <!-- User Menu -->
    <div class="user-menu">
      <span class="user-email">user@example.com</span>
      <button class="btn-signout">Sign Out</button>
    </div>

    <!-- Mobile Hamburger -->
    <button class="hamburger" aria-label="Menu">☰</button>
  </div>
</header>
```

**Styling:**
- White background (`var(--ss-white)`)
- Centered horizontal links (desktop)
- Hamburger menu slides in (mobile ≤768px)
- Active page: blue underline (`var(--ss-accent-blue)`)
- Montserrat font

### Buttons

```html
<button class="btn-primary">Primary Action</button>
<button class="btn-secondary">Secondary Action</button>
```

**Styling:**
- Primary: `background: var(--ss-primary)`, hover: `var(--ss-primary-hover)`
- Secondary: `background: var(--ss-bg-medium)`, hover: darken 5%
- Height: 48px minimum
- Border radius: 0px (sharp corners - brand standard)
- Font weight: 600 (semibold)

### Form Inputs

```html
<input type="text" class="form-input" placeholder="Enter text">
<select class="form-input">...</select>
<textarea class="form-input">...</textarea>
```

**Styling:**
- Height: 48px minimum (textarea: auto)
- Border: 1px solid `var(--ss-border)`
- Focus: border color `var(--ss-primary)`
- Font: `var(--ss-font-primary)`
- Padding: 12px 16px

### Cards

```html
<div class="card">
  <h3>Card Title</h3>
  <p>Card content...</p>
</div>
```

**Styling:**
- Background: `var(--ss-white)`
- Border: 1px solid `var(--ss-border-subtle)`
- Border radius: 0px (sharp corners)
- Box shadow: `var(--ss-shadow-sm)` (0 2px 4px rgba(0,0,0,0.05))
- Padding: 24px

### Status Badges

```html
<span class="status-badge status-success">Completed</span>
<span class="status-badge status-warning">Pending</span>
<span class="status-badge status-danger">Failed</span>
```

**Styling:**
- Success: `background: var(--ss-status-success-bg)`, `color: var(--ss-status-success-text)`
- Warning: `background: var(--ss-status-warning-bg)`, `color: var(--ss-status-warning-text)`
- Danger: `background: var(--ss-status-danger-bg)`, `color: var(--ss-status-danger-text)`
- Padding: 4px 12px
- Font size: `var(--ss-text-sm)`
- Font weight: 600

## Implementation Plan

### Phase 1: Foundation (portal-styles.css)

**Tasks:**
1. Create `/sailorskills-portal/src/ui/` directory
2. Create `portal-styles.css` with:
   - Import design-tokens.css
   - Global base styles
   - Navigation components
   - Reusable UI components (buttons, forms, cards, badges)
   - Responsive breakpoints (mobile ≤768px)

**Validation:**
- Load portal-styles.css in browser dev tools
- Verify all CSS variables resolve correctly (no undefined)
- Check component classes render as expected

### Phase 2: HTML Migration - Authentication Pages

**Files:**
- `login.html`
- `signup.html`
- `reset-password.html`

**Changes per file:**
1. Add `<link rel="stylesheet" href="/src/ui/portal-styles.css">` in `<head>`
2. Replace header/nav with Estimator-style navigation
3. Remove inline `<style>` blocks (keep page-specific styles if needed)
4. Add semantic classes: `.btn-primary`, `.form-input`, `.card`
5. Test authentication flow end-to-end

**Validation:**
- Fonts load correctly (Montserrat)
- Login/signup forms function
- Magic link flow works
- Password reset works
- No console errors

### Phase 3: HTML Migration - Dashboard

**Files:**
- `portal.html`

**Changes:**
1. Add portal-styles.css link
2. Replace navigation
3. Update dashboard grid layout classes
4. Update service status badges
5. Test all dashboard widgets

**Validation:**
- Dashboard loads correctly
- Service list displays
- Invoice summary shows
- Quick actions work
- Responsive on mobile

### Phase 4: HTML Migration - Core Pages

**Files:**
- `portal-services.html`
- `portal-invoices.html`

**Changes:**
1. Add portal-styles.css link
2. Replace navigation
3. Update table styling
4. Update status badges
5. Test pagination, filtering, sorting

**Validation:**
- Service history displays correctly
- Invoice list displays correctly
- Filters/search work
- Detail modals function
- PDF downloads work (invoices)

### Phase 5: HTML Migration - Remaining Pages

**Files:**
- `portal-messages.html`
- `portal-account.html`
- `portal-request-service.html`
- `portal-request-history.html`

**Changes:**
1. Add portal-styles.css link
2. Replace navigation
3. Update page-specific components
4. Test functionality

**Validation:**
- Messages load and send
- Account settings update
- Service requests submit
- Request history displays

### Phase 6: Playwright Visual Regression Tests

**Create:** `tests/e2e/portal-styling.spec.js`

**Test Coverage:**

1. **Font Loading**
```javascript
test('Portal pages use Montserrat font', async ({ page }) => {
  await page.goto('portal.html');
  const bodyFont = await page.evaluate(() =>
    getComputedStyle(document.body).fontFamily
  );
  expect(bodyFont).toContain('Montserrat');
});
```

2. **Color Consistency**
```javascript
test('Portal uses correct primary color', async ({ page }) => {
  await page.goto('portal.html');
  const btn = page.locator('.btn-primary').first();
  const bgColor = await btn.evaluate(el =>
    getComputedStyle(el).backgroundColor
  );
  expect(bgColor).toBe('rgb(52, 84, 117)'); // #345475
});
```

3. **Navigation Functionality**
```javascript
test('Navigation links work and highlight active page', async ({ page }) => {
  await page.goto('portal.html');
  await page.click('nav a[href="portal-services.html"]');
  await expect(page).toHaveURL(/portal-services/);
  const activeLink = page.locator('nav a.active');
  await expect(activeLink).toHaveText('Services');
});
```

4. **Responsive Behavior**
```javascript
test('Mobile hamburger menu functions', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('portal.html');
  const hamburger = page.locator('.hamburger');
  await expect(hamburger).toBeVisible();
  await hamburger.click();
  const nav = page.locator('.nav-links');
  await expect(nav).toBeVisible();
});
```

5. **Screenshot Comparison**
```javascript
test('Portal dashboard visual regression', async ({ page }) => {
  await page.goto('portal.html');
  await expect(page).toHaveScreenshot('portal-dashboard.png');
});
```

**Test Execution:**
```bash
# Generate baseline screenshots (first run)
npx playwright test tests/e2e/portal-styling.spec.js

# Compare against baseline (subsequent runs)
npx playwright test tests/e2e/portal-styling.spec.js

# Update baseline when intentional changes made
npx playwright test tests/e2e/portal-styling.spec.js --update-snapshots
```

### Phase 7: Deployment

**Git Workflow:**
```bash
# Feature branch
git checkout -b feature/portal-estimator-styling

# Commit pattern (one per milestone)
git commit -m "feat(portal): create portal-styles.css with Estimator design"
git commit -m "feat(portal): migrate auth pages to new styling"
git commit -m "feat(portal): migrate dashboard and core pages"
git commit -m "test(portal): add Playwright visual regression tests"

# Push and create PR
git push -u origin feature/portal-estimator-styling
gh pr create --title "Portal-Estimator Styling Alignment" --body "..."
```

**Vercel Preview:**
- Each commit triggers preview deployment
- Test preview URL: `portal-sailorskills-<hash>.vercel.app`
- Verify fonts load from CDN
- Test authentication flow
- Check all pages render correctly

**Production Deployment:**
```bash
# Merge to main
gh pr merge --squash

# Vercel auto-deploys to production
# Monitor: https://portal.sailorskills.com
```

**Rollback Plan:**
If critical issues detected:
```bash
# Revert merge commit
git revert <commit-hash>
git push origin main

# Vercel auto-deploys previous version
```

## Testing Strategy

### Manual Testing Checklist

**Per-Page Validation:**
- ☐ Fonts display as Montserrat (not Times New Roman)
- ☐ Colors match Estimator (#345475 primary)
- ☐ Navigation displays correctly (desktop + mobile)
- ☐ Active page highlights in nav
- ☐ Buttons use correct styling
- ☐ Forms use correct input styling
- ☐ Status badges use correct colors
- ☐ No console errors
- ☐ Page functionality works (no regressions)

**Cross-Browser Testing:**
- Chrome (primary)
- Safari (macOS/iOS)
- Firefox
- Edge

**Responsive Testing:**
- Desktop: 1920x1080
- Tablet: 768x1024
- Mobile: 375x667 (iPhone SE)

### Automated Testing

**Playwright Tests:**
- Font loading verification
- Color consistency checks
- Navigation functionality
- Responsive behavior (hamburger menu)
- Visual regression (screenshot comparison)

**Test Execution Frequency:**
- After each page migration
- Before PR merge
- On CI/CD pipeline (future)

## Success Criteria

**Visual Consistency:**
- ✅ All Portal pages use Montserrat font
- ✅ Colors match Estimator (#345475 primary, #181818 text, etc.)
- ✅ Navigation looks identical to Estimator
- ✅ Buttons, forms, cards match Estimator styling
- ✅ Sharp corners (0px border-radius) throughout

**Functionality:**
- ✅ All Portal features work (no regressions)
- ✅ Authentication flows function (login, signup, reset password)
- ✅ Navigation links work, active states highlight
- ✅ Mobile hamburger menu functions
- ✅ Forms submit correctly
- ✅ Status badges display correctly

**Testing:**
- ✅ All Playwright tests pass
- ✅ No console errors in browser
- ✅ Cross-browser compatible (Chrome, Safari, Firefox, Edge)
- ✅ Responsive on desktop, tablet, mobile

**Deployment:**
- ✅ Vercel preview deployment successful
- ✅ Production deployment successful (https://portal.sailorskills.com)
- ✅ Zero downtime during deployment
- ✅ Rollback plan tested and documented

**Maintenance:**
- ✅ CSS consolidated into portal-styles.css (no inline duplicates)
- ✅ Design documentation complete (this file)
- ✅ Playwright tests prevent future regressions
- ✅ Shared design-tokens.css used correctly

## Cross-Service Impact

**No Impact:**
- No shared database changes required
- No impact to other services (Estimator, Operations, Billing, etc.)
- Portal is independent web app on separate subdomain

**Shared Package:**
- Portal correctly imports existing `design-tokens.css`
- No changes to shared package required
- Future: Could move portal-styles.css to shared package for reuse

## Future Improvements

**Phase 2 (Optional):**
- Extract portal-styles.css to shared package as `portal-components.css`
- Create storybook documentation for component library
- Add dark mode support (Portal night mode)
- Implement CSS variables for Portal-specific theming
- Add animation/transition consistency

**Phase 3 (Long-term):**
- Migrate to React components for Portal (shared with Estimator)
- Implement design system versioning
- Add visual regression tests to CI/CD pipeline
- Create design system documentation site

## References

- Shared Design Tokens: `/sailorskills-shared/src/ui/design-tokens.css`
- Estimator Styles: `/sailorskills-estimator/style.css`
- Portal Pages: `/sailorskills-portal/*.html`
- Playwright Docs: https://playwright.dev
- Vercel Deployments: https://vercel.com/sailorskills

---

**Document Owner:** Brian
**Last Updated:** 2025-11-06
**Status:** Approved - Ready for Implementation
