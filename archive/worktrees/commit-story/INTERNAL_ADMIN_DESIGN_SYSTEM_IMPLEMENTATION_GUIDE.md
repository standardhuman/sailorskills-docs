# Internal Admin Design System Modernization - Implementation Guide

**Version:** 1.0
**Date:** 2025-10-22
**Estimated Effort:** 24-35 hours over 3 weeks
**Status:** Ready for Implementation

---

## Table of Contents

1. [Overview & Scope](#overview--scope)
2. [Design Principles](#design-principles)
3. [Phase 1: Shared Design Tokens Update](#phase-1-shared-design-tokens-update)
4. [Phase 2: Shared Component Styles Update](#phase-2-shared-component-styles-update)
5. [Phase 3: Dashboard Pilot Implementation](#phase-3-dashboard-pilot-implementation)
6. [Phase 4: Service Rollout](#phase-4-service-rollout)
7. [Testing Procedures](#testing-procedures)
8. [Rollback Plan](#rollback-plan)
9. [Appendix: Service-Specific Checklists](#appendix-service-specific-checklists)

---

## Overview & Scope

### Objective
Unify visual design across all internal admin services with a modern, polished aesthetic inspired by the Billing service, while maintaining existing structural patterns (three-tier navigation, layouts, workflows).

### In-Scope Services (6)
- ✅ **Dashboard** (Pilot service)
- ✅ **Operations**
- ✅ **Inventory**
- ✅ **Completion** (Billing)
- ✅ **Video**
- ✅ **Booking**

### Out-of-Scope Services (2)
- ❌ **Estimator** (customer-facing, separate brand identity)
- ❌ **Site** (public marketing)

### Key Visual Changes
| Element | Current | New |
|---------|---------|-----|
| **Border Radius** | 0px (sharp corners) | 4px, 8px, 12px (rounded) |
| **Primary Accent** | #345475 (blue-gray) | #667eea (purple) |
| **Shadows** | Minimal (0 2px 4px rgba(0,0,0,0.05)) | Stronger (0 2px 8px rgba(0,0,0,0.08)) |
| **Card Hover** | Static | Elevated (translateY + shadow) |
| **Gradients** | None | Purple gradient (#667eea → #764ba2) |
| **Nav Active State** | Solid background | Gradient background + rounded |

---

## Design Principles

### 1. Separation of Concerns
- **Internal Admin Tools**: Modern, friendly, polished (new design)
- **Customer-Facing Tools**: Professional, minimal, trustworthy (unchanged)

### 2. Progressive Enhancement
- Changes are opt-in through CSS variables
- Existing code remains functional during migration
- Services can update independently

### 3. Maintain Structure
- Three-tier navigation stays unchanged
- Layouts and component hierarchy preserved
- Only visual layer (colors, shadows, radius) changes

### 4. Accessibility First
- Maintain WCAG AA contrast ratios
- Preserve focus states and keyboard navigation
- Test with screen readers

---

## Phase 1: Shared Design Tokens Update

**Estimated Time:** 2-3 hours
**Risk:** Low
**File:** `sailorskills-shared/src/ui/design-tokens.css`

### Step 1.1: Add Border Radius Scale

**Location:** After line 93 (existing `--ss-radius-md: 8px;`)

**Add:**
```css
/* ===== BORDERS ===== */

/* Border Radius - Modern rounded corners for internal admin */
--ss-radius-none: 0px;           /* Legacy/special cases */
--ss-radius-sm: 4px;             /* Small elements: badges, tags */
--ss-radius-md: 8px;             /* Medium elements: buttons, inputs */
--ss-radius-lg: 12px;            /* Large elements: cards, modals */

/* Border Widths */
--ss-border-width: 1px;
--ss-border-width-thick: 2px;
```

**Notes:**
- Keep `--ss-radius-none` for backward compatibility
- Default most components to `--ss-radius-md`

---

### Step 1.2: Add Purple Accent Colors

**Location:** After line 43 (existing `--ss-info: #667eea;`)

**Replace entire accent colors section with:**
```css
/* Accent Colors - Purple-based for modern internal admin */
--ss-accent-purple: #667eea;       /* Primary action color */
--ss-accent-purple-dark: #764ba2;  /* Gradient end, dark variant */
--ss-accent-purple-light: #8b92f4; /* Hover/light variant */
--ss-accent-blue: #3498db;         /* Info, secondary actions */
--ss-accent-blue-hover: #2980b9;   /* Blue hover state */

/* Keep legacy for compatibility */
--ss-accent-blue-legacy: #116DFF;  /* Original accent blue */
--ss-link-blue: #0000ee;           /* Standard link blue */

/* Status Colors */
--ss-success: #00b894;
--ss-success-hover: #00a383;
--ss-success-vibrant: #4CAF50;     /* Alternative success (Billing style) */
--ss-danger: #d63031;
--ss-danger-hover: #c0281f;
--ss-warning: #fdcb6e;
--ss-info: #667eea;                /* Alias to accent-purple */
```

**Notes:**
- `--ss-info` now aliases to purple for consistency
- Keep legacy blue for gradual migration
- Add `-vibrant` variant for stronger success states

---

### Step 1.3: Update Shadow Definitions

**Location:** After line 104 (existing shadows section)

**Replace with:**
```css
/* ===== SHADOWS ===== */

/* Stronger shadows for modern depth */
--ss-shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.05);
--ss-shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
--ss-shadow-md: 0 4px 12px rgba(0, 0, 0, 0.12);
--ss-shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.3);

/* Hover shadow variants (for elevated cards) */
--ss-shadow-sm-hover: 0 4px 12px rgba(0, 0, 0, 0.12);
--ss-shadow-md-hover: 0 6px 16px rgba(0, 0, 0, 0.15);

/* Specific use cases */
--ss-shadow-card: var(--ss-shadow-sm);
--ss-shadow-card-hover: var(--ss-shadow-sm-hover);
--ss-shadow-modal: var(--ss-shadow-lg);
--ss-shadow-nav: 0 2px 4px rgba(0, 0, 0, 0.05);
```

**Notes:**
- Stronger shadows for better depth perception
- Add hover variants for interactive elements
- Create semantic aliases for common use cases

---

### Step 1.4: Add Gradient Definitions

**Location:** After shadows section (new section)

**Add:**
```css
/* ===== GRADIENTS ===== */

/* Primary gradient - purple for actions/badges */
--ss-gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 100%);

/* Alternative gradients */
--ss-gradient-success: linear-gradient(135deg, #00b894 0%, #4CAF50 100%);
--ss-gradient-info: linear-gradient(135deg, #3498db 0%, #2980b9 100%);
--ss-gradient-danger: linear-gradient(135deg, #d63031 0%, #c0281f 100%);

/* Subtle backgrounds */
--ss-gradient-subtle: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
```

**Notes:**
- Use 135deg for consistent diagonal direction
- Primary gradient is purple theme
- Add utility gradients for various use cases

---

### Step 1.5: Add Transition Utilities

**Location:** After existing transitions (line ~109)

**Add:**
```css
/* ===== TRANSITIONS ===== */

--ss-transition-fast: 0.2s ease;
--ss-transition-normal: 0.3s ease;
--ss-transition-slow: 0.4s ease;

/* Specific transition types */
--ss-transition-shadow: box-shadow 0.3s ease, transform 0.3s ease;
--ss-transition-colors: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
--ss-transition-transform: transform 0.2s ease;
```

**Notes:**
- Standardize animation timing
- Create semantic transition groups
- Use for hover states and interactions

---

### Step 1.6: Final Design Tokens Summary

**After all updates, verify:**
- [ ] Border radius scale added (sm, md, lg)
- [ ] Purple accent colors defined
- [ ] Stronger shadow values set
- [ ] Gradient variables created
- [ ] Transition utilities added
- [ ] No breaking changes to existing variables
- [ ] File still imports correctly

**Test Command:**
```bash
cd sailorskills-shared
npm run build
```

**Expected:** No errors, CSS compiles successfully

---

## Phase 2: Shared Component Styles Update

**Estimated Time:** 4-6 hours
**Risk:** Low-Medium
**File:** `sailorskills-shared/src/ui/styles.css`

### Step 2.1: Update Button Styles

**Location:** Lines 16-92 (button section)

**Current:**
```css
.ss-btn {
  border-radius: var(--ss-radius-none); /* Sharp corners */
}
```

**New:**
```css
.ss-btn {
  font-family: var(--ss-font-primary);
  font-weight: var(--ss-weight-normal);
  border: none;
  border-radius: var(--ss-radius-md); /* NEW: Rounded corners */
  cursor: pointer;
  transition: all var(--ss-transition-fast);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ss-space-sm);
  min-height: 53px;
}

.ss-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Button variants */
.ss-btn-primary {
  background-color: var(--ss-accent-purple); /* NEW: Purple instead of blue-gray */
  color: var(--ss-white);
}

.ss-btn-primary:hover:not(:disabled) {
  filter: brightness(0.9); /* Keep simple hover */
}

.ss-btn-secondary {
  background-color: var(--ss-bg-medium);
  color: var(--ss-accent-purple); /* NEW: Purple text */
  border: var(--ss-border-width) solid var(--ss-accent-purple);
}

.ss-btn-secondary:hover:not(:disabled) {
  background-color: var(--ss-accent-purple);
  color: var(--ss-white);
}
```

**Testing:**
- [ ] Buttons display with rounded corners
- [ ] Purple color applied correctly
- [ ] Hover states work
- [ ] Disabled state visible

---

### Step 2.2: Add Card Component

**Location:** After buttons section (before modals)

**Add:**
```css
/* ===== CARDS ===== */

.ss-card {
  background: var(--ss-white);
  border: var(--ss-border-width) solid var(--ss-border);
  border-radius: var(--ss-radius-lg); /* Large radius for cards */
  padding: var(--ss-space-lg);
  box-shadow: var(--ss-shadow-card);
  transition: var(--ss-transition-shadow);
}

.ss-card:hover {
  box-shadow: var(--ss-shadow-card-hover);
  transform: translateY(-2px); /* Subtle lift on hover */
}

.ss-card-static {
  background: var(--ss-white);
  border: var(--ss-border-width) solid var(--ss-border);
  border-radius: var(--ss-radius-lg);
  padding: var(--ss-space-lg);
  box-shadow: var(--ss-shadow-card);
  /* No hover effect */
}

.ss-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--ss-space-md);
  padding-bottom: var(--ss-space-md);
  border-bottom: var(--ss-border-width) solid var(--ss-border-subtle);
}

.ss-card-title {
  margin: 0;
  font-size: var(--ss-text-xl);
  color: var(--ss-text-dark);
  font-weight: var(--ss-weight-semibold);
}

.ss-card-body {
  color: var(--ss-text-medium);
  line-height: var(--ss-leading-relaxed);
}

.ss-card-footer {
  margin-top: var(--ss-space-md);
  padding-top: var(--ss-space-md);
  border-top: var(--ss-border-width) solid var(--ss-border-subtle);
  display: flex;
  gap: var(--ss-space-sm);
  justify-content: flex-end;
}

/* Card variants with colored left borders (Billing style) */
.ss-card-purple {
  border-left: 4px solid var(--ss-accent-purple);
}

.ss-card-blue {
  border-left: 4px solid var(--ss-accent-blue);
}

.ss-card-success {
  border-left: 4px solid var(--ss-success);
}

.ss-card-danger {
  border-left: 4px solid var(--ss-danger);
}
```

**Testing:**
- [ ] Cards render with rounded corners
- [ ] Hover effect (lift + shadow) works
- [ ] Card header/body/footer layout correct
- [ ] Colored border variants display

---

### Step 2.3: Update Modal Styles

**Location:** Lines 94-192 (modal section)

**Update:**
```css
.ss-modal {
  background: var(--ss-white);
  border-radius: var(--ss-radius-lg); /* NEW: Rounded corners */
  box-shadow: var(--ss-shadow-modal); /* NEW: Stronger shadow */
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transform: scale(0.9);
  transition: transform var(--ss-transition-normal);
}

.ss-modal-close {
  background: none;
  border: none;
  font-size: 28px;
  color: var(--ss-text-medium);
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--ss-radius-sm); /* NEW: Rounded close button */
  transition: all var(--ss-transition-fast);
}

.ss-modal-close:hover {
  background: var(--ss-bg-medium);
  color: var(--ss-text-dark);
}
```

**Testing:**
- [ ] Modals have rounded corners
- [ ] Stronger shadow visible
- [ ] Close button rounded
- [ ] Animation smooth

---

### Step 2.4: Update Form Input Styles

**Location:** Lines 349-401 (forms section)

**Update:**
```css
.ss-form-input {
  width: 100%;
  padding: 14px 16px;
  border: var(--ss-border-width) solid var(--ss-border);
  border-radius: var(--ss-radius-sm); /* NEW: Rounded inputs */
  font-size: var(--ss-text-sm);
  font-family: var(--ss-font-primary);
  transition: border-color var(--ss-transition-fast);
  box-sizing: border-box;
  min-height: 48px;
  color: var(--ss-text-dark);
  background-color: var(--ss-white);
}

.ss-form-input:focus {
  outline: none;
  border-color: var(--ss-accent-purple); /* NEW: Purple focus */
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1); /* NEW: Purple glow */
}
```

**Testing:**
- [ ] Inputs have subtle rounded corners
- [ ] Purple focus border
- [ ] Focus glow effect visible

---

### Step 2.5: Update Badge Styles

**Location:** After forms section

**Add:**
```css
/* ===== BADGES ===== */

.ss-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: var(--ss-radius-sm);
  font-size: var(--ss-text-xs);
  font-weight: var(--ss-weight-semibold);
  line-height: 1;
  white-space: nowrap;
}

.ss-badge-primary {
  background-color: var(--ss-accent-purple);
  color: var(--ss-white);
}

.ss-badge-success {
  background-color: var(--ss-success);
  color: var(--ss-white);
}

.ss-badge-danger {
  background-color: var(--ss-danger);
  color: var(--ss-white);
}

.ss-badge-warning {
  background-color: var(--ss-warning);
  color: var(--ss-text-dark);
}

/* Gradient badge variant (Billing style) */
.ss-badge-gradient {
  background: var(--ss-gradient-primary);
  color: var(--ss-white);
  box-shadow: 0 2px 4px rgba(102, 126, 234, 0.2);
}
```

**Testing:**
- [ ] Badges display with rounded corners
- [ ] Gradient badge shows purple gradient
- [ ] Color variants work correctly

---

### Step 2.6: Update Navigation Styles (Three-Tier System)

**Location:** Lines 403-579 (navigation sections)

#### **Tier 1 - Top Nav** (Logo + Logout)

**Update:**
```css
.top-nav {
  background: var(--ss-white);
  padding: 6px 40px;
  border-bottom: var(--ss-border-width) solid var(--ss-border-subtle);
  box-shadow: var(--ss-shadow-nav); /* NEW: Subtle shadow */
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: var(--ss-max-width-2xl);
  margin: 0 auto;
}
```

#### **Tier 2 - Global Nav** (Service Switcher)

**Update:**
```css
.global-nav a {
  font-family: var(--ss-font-primary);
  font-size: var(--ss-text-base);
  color: var(--ss-primary-light);
  text-decoration: none;
  transition: all var(--ss-transition-fast);
  font-weight: var(--ss-weight-medium);
  letter-spacing: var(--ss-tracking-wide);
  text-transform: uppercase;
  padding: 8px 16px;
  border-radius: var(--ss-radius-sm); /* NEW: Rounded */
  white-space: nowrap;
}

.global-nav a:hover {
  color: var(--ss-primary);
  background: rgba(90, 127, 166, 0.1);
}

.global-nav a.active {
  background: var(--ss-gradient-primary); /* NEW: Gradient background */
  color: var(--ss-white);
  font-weight: var(--ss-weight-semibold);
}
```

#### **Tier 3 - Sub Nav** (Page Tabs)

**Update:**
```css
.sub-nav {
  background-color: var(--ss-accent-purple); /* NEW: Purple instead of blue-gray */
  border-bottom: var(--ss-border-width-thick) solid transparent;
  padding: 0;
}

.sub-nav a {
  font-family: var(--ss-font-primary);
  font-size: var(--ss-text-sm);
  color: var(--ss-white);
  text-decoration: none;
  transition: all var(--ss-transition-fast);
  font-weight: var(--ss-weight-medium);
  padding: 16px 24px;
  display: inline-block;
  border-bottom: 3px solid transparent;
  opacity: 0.85;
  border-radius: var(--ss-radius-sm) var(--ss-radius-sm) 0 0; /* NEW: Rounded top */
}

.sub-nav a:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.sub-nav a.active {
  opacity: 1;
  background: rgba(255, 255, 255, 0.15);
  border-bottom-color: var(--ss-white);
  font-weight: var(--ss-weight-semibold);
}
```

**Testing:**
- [ ] Top nav has subtle shadow
- [ ] Global nav active state shows purple gradient
- [ ] Sub nav is purple background
- [ ] Sub nav tabs have rounded tops
- [ ] All hover states work

---

### Step 2.7: Update Toast Styles

**Location:** Lines 235-347 (toasts section)

**Update:**
```css
.ss-toast {
  position: fixed;
  background: var(--ss-white);
  padding: var(--ss-space-md) var(--ss-space-lg);
  border-radius: var(--ss-radius-md); /* NEW: Rounded */
  box-shadow: var(--ss-shadow-md); /* NEW: Stronger shadow */
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: var(--ss-z-toast);
  opacity: 0;
  transform: translateY(-20px);
  transition: all var(--ss-transition-normal);
  max-width: var(--ss-max-width-sm);
}
```

**Testing:**
- [ ] Toasts have rounded corners
- [ ] Stronger shadow visible
- [ ] Animation smooth

---

### Step 2.8: Build and Test Shared Package

**After all updates:**

```bash
cd sailorskills-shared
npm run build
```

**Verify:**
- [ ] No build errors
- [ ] CSS file generated in `dist/`
- [ ] All imports resolve correctly

**Visual Smoke Test:**
1. Open any service using Shared package
2. Check browser console for errors
3. Verify styles load correctly
4. Confirm no visual breakage

---

## Phase 3: Dashboard Pilot Implementation

**Estimated Time:** 3-4 hours
**Risk:** Medium
**Service:** `sailorskills-dashboard`

### Step 3.1: Update Dashboard to Use New Shared Styles

**File:** `sailorskills-dashboard/index.html`

**Verify imports:**
```html
<head>
  <!-- Ensure latest Shared package is imported -->
  <link rel="stylesheet" href="./shared/src/ui/design-tokens.css">
  <link rel="stylesheet" href="./shared/src/ui/styles.css">
</head>
```

**Update git submodule:**
```bash
cd sailorskills-dashboard
git submodule update --remote --merge
git add shared
git commit -m "Update shared package to latest design system"
```

---

### Step 3.2: Update Dashboard-Specific CSS

**File:** Check for any local CSS files that override Shared styles

**Find overrides:**
```bash
cd sailorskills-dashboard
grep -r "border-radius: 0" ./*.css
grep -r "#345475" ./*.css
```

**Update to use tokens:**
```css
/* BEFORE */
.custom-button {
  background: #345475;
  border-radius: 0;
}

/* AFTER */
.custom-button {
  background: var(--ss-accent-purple);
  border-radius: var(--ss-radius-md);
}
```

---

### Step 3.3: Test Dashboard Navigation

**Open:** `http://localhost:5173` (or dashboard dev URL)

**Checklist:**
- [ ] **Top Nav**: Has subtle shadow, logo visible, logout button works
- [ ] **Global Nav**: Active service shows purple gradient background
- [ ] **Sub Nav**: Purple background, rounded tab tops, active state correct
- [ ] **Navigation structure**: Three tiers clearly separated
- [ ] **Responsive**: Check mobile view (hamburger menu)

**Screenshot for comparison:**
```bash
# Take screenshot for visual regression
npx playwright screenshot http://localhost:5173 dashboard-before.png
```

---

### Step 3.4: Test Dashboard Components

**Cards:**
- [ ] Dashboard cards have rounded corners
- [ ] Hover effect works (lift + shadow)
- [ ] Card headers styled correctly

**Buttons:**
- [ ] Purple primary buttons
- [ ] Rounded corners
- [ ] Hover state works

**Forms:**
- [ ] Input fields rounded
- [ ] Purple focus border
- [ ] Focus glow visible

**Modals:**
- [ ] Rounded corners
- [ ] Stronger shadows
- [ ] Close button rounded

---

### Step 3.5: Playwright Visual Regression Test

**Create test file:** `sailorskills-dashboard/tests/visual-regression.spec.js`

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Dashboard Visual Regression', () => {
  test('homepage snapshot', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');

    // Take full page screenshot
    await expect(page).toHaveScreenshot('dashboard-homepage.png', {
      fullPage: true,
      maxDiffPixels: 100, // Allow small differences
    });
  });

  test('navigation states', async ({ page }) => {
    await page.goto('http://localhost:5173');

    // Screenshot of global nav active state
    await expect(page.locator('.global-nav')).toHaveScreenshot('global-nav.png');

    // Screenshot of sub nav active state
    await expect(page.locator('.sub-nav')).toHaveScreenshot('sub-nav.png');
  });

  test('card hover states', async ({ page }) => {
    await page.goto('http://localhost:5173');

    const card = page.locator('.ss-card').first();

    // Normal state
    await expect(card).toHaveScreenshot('card-normal.png');

    // Hover state
    await card.hover();
    await expect(card).toHaveScreenshot('card-hover.png');
  });
});
```

**Run tests:**
```bash
cd sailorskills-dashboard
npx playwright test tests/visual-regression.spec.js
```

**On first run:** Generates baseline screenshots
**On subsequent runs:** Compares against baseline

---

### Step 3.6: User Acceptance Testing

**Test with actual workflows:**

1. **Dashboard Overview:**
   - [ ] Revenue widgets load correctly
   - [ ] Charts render properly
   - [ ] No layout breakage

2. **Service Metrics:**
   - [ ] Service cards display correctly
   - [ ] Click-through to details works
   - [ ] Filters apply correctly

3. **Reports:**
   - [ ] Report generation works
   - [ ] Export functionality intact
   - [ ] Print view acceptable

4. **Settings:**
   - [ ] Settings forms work
   - [ ] Save/cancel buttons functional
   - [ ] Validation messages display

---

### Step 3.7: Performance Check

**Measure CSS bundle size:**

```bash
cd sailorskills-dashboard
npm run build

# Check bundle size
ls -lh dist/assets/*.css
```

**Before:** ~X KB
**After:** Should be similar (new styles add ~2-3 KB)

**Load time check:**
```bash
# Use Lighthouse
npx lighthouse http://localhost:5173 --view
```

**Targets:**
- Performance: >90
- First Contentful Paint: <1.5s
- Time to Interactive: <3s

---

### Step 3.8: Accessibility Audit

**Use axe DevTools or Lighthouse:**

```bash
npx playwright test tests/accessibility.spec.js
```

**Test file:**
```javascript
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test('Dashboard accessibility', async ({ page }) => {
  await page.goto('http://localhost:5173');

  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

**Manual checks:**
- [ ] Purple/white contrast ratio ≥4.5:1
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly

---

### Step 3.9: Dashboard Pilot Sign-Off

**Before proceeding to other services:**

- [ ] All Dashboard tests passing
- [ ] No console errors
- [ ] Performance acceptable
- [ ] Accessibility compliant
- [ ] User testing complete
- [ ] Visual regression baseline established
- [ ] Rollback plan tested (revert git commit)

**If issues found:**
- Document in GitHub issues
- Fix before proceeding to other services
- Re-test after fixes

---

## Phase 4: Service Rollout

**Estimated Time:** 10-15 hours
**Risk:** Medium
**Services:** Operations → Inventory → Completion → Video → Booking

### Rollout Order Rationale

1. **Operations** (2-3 hours): Most complex, high usage, catches edge cases
2. **Inventory** (2-3 hours): Similar complexity to Operations
3. **Completion** (1-2 hours): Already has Billing styles, minimal work
4. **Video** (2-3 hours): Independent service, lower risk
5. **Booking** (2-3 hours): Lower usage, final polish

---

### Step 4.1: Operations Service

**Files to update:**
- `sailorskills-operations/styles/main.css` (1914 lines)
- `sailorskills-operations/index.html`

**Update submodule:**
```bash
cd sailorskills-operations
git submodule update --remote --merge
```

**Find hardcoded styles:**
```bash
grep -r "border-radius: 0" ./styles/
grep -r "var(--ss-radius-none)" ./styles/
grep -r "#345475" ./styles/
```

**Replace tokens:**
```bash
# Border radius
sed -i '' 's/border-radius: 0px/border-radius: var(--ss-radius-md)/g' ./styles/main.css
sed -i '' 's/var(--ss-radius-none)/var(--ss-radius-md)/g' ./styles/main.css

# Colors
sed -i '' 's/var(--ss-primary)/var(--ss-accent-purple)/g' ./styles/main.css
```

**Manual review required:**
- Card components (lines 41-57)
- Navigation local overrides
- Custom form styles

**Test checklist:**
- [ ] Dashboard view loads
- [ ] Packing lists display
- [ ] Service logs form works
- [ ] Paint alerts render
- [ ] Schedule calendar functional
- [ ] Boats & service history works
- [ ] Modals open/close
- [ ] Three-tier nav correct

**Playwright test:**
```bash
cd sailorskills-operations
npx playwright test
```

---

### Step 4.2: Inventory Service

**Files to update:**
- `sailorskills-inventory/src/styles/` (check for local CSS)
- `sailorskills-inventory/index.html`

**Update submodule:**
```bash
cd sailorskills-inventory
git submodule update --remote --merge
```

**Test checklist:**
- [ ] Inventory list displays
- [ ] Add/edit item forms work
- [ ] Stock alerts visible
- [ ] Storage locations correct
- [ ] Anode catalog loads
- [ ] Search/filter functional

**Playwright test:**
```bash
cd sailorskills-inventory
npx playwright test
```

---

### Step 4.3: Completion Service (Billing)

**Files to update:**
- `sailorskills-billing/src/styles/main.css`
- `sailorskills-billing/src/styles/page-layout.css`
- `sailorskills-billing/src/styles/customer-cards.css`

**Update submodule:**
```bash
cd sailorskills-billing
git submodule update --remote --merge
```

**Integration work:**
Replace hardcoded values with tokens:

```css
/* customer-cards.css - BEFORE */
.edit-card-btn {
  background: #3498db;
  border-radius: 6px;
}

/* customer-cards.css - AFTER */
.edit-card-btn {
  background: var(--ss-accent-blue);
  border-radius: var(--ss-radius-sm);
}
```

**Extract to Shared (optional):**
Consider moving condition sliders to Shared package:
```bash
cp ./src/styles/page-layout.css ../sailorskills-shared/src/ui/components/sliders.css
```

**Test checklist:**
- [ ] Service type selection works
- [ ] Conditions tracking displays
- [ ] Anode assignment functional
- [ ] Customer cards render
- [ ] Search works
- [ ] Payment processing intact

**Playwright test:**
```bash
cd sailorskills-billing
npx playwright test
```

---

### Step 4.4: Video Service

**Files to update:**
- Check for local CSS files
- Update submodule

**Update submodule:**
```bash
cd sailorskills-video
git submodule update --remote --merge
```

**Test checklist:**
- [ ] Video upload works
- [ ] Playlist management functional
- [ ] YouTube integration intact
- [ ] Video player renders
- [ ] Metadata editing works

**Playwright test:**
```bash
cd sailorskills-video
npx playwright test
```

---

### Step 4.5: Booking Service

**Files to update:**
- Check for local CSS files
- Update submodule

**Update submodule:**
```bash
cd sailorskills-booking
git submodule update --remote --merge
```

**Test checklist:**
- [ ] Booking calendar displays
- [ ] New booking form works
- [ ] Google Calendar sync functional
- [ ] Reminder system works
- [ ] Customer notifications sent

**Playwright test:**
```bash
cd sailorskills-booking
npx playwright test
```

---

### Step 4.6: Cross-Service Consistency Check

**After all services updated:**

**Visual comparison:**
Open all services side-by-side and verify:
- [ ] Three-tier nav looks identical
- [ ] Purple accent color consistent
- [ ] Card styles match
- [ ] Button styles uniform
- [ ] Modal styles identical
- [ ] Form input styles consistent

**Navigation flow test:**
1. Start at Dashboard
2. Click through to each service via global nav
3. Verify active states highlight correctly
4. Check sub-nav consistency per service

**Shared components test:**
Use same component (e.g., button) across services:
- [ ] `.ss-btn-primary` looks identical everywhere
- [ ] `.ss-card` renders the same
- [ ] `.ss-modal` consistent
- [ ] `.ss-form-input` uniform

---

## Testing Procedures

### 5.1: Manual Testing Checklist

**Per Service:**

**Visual:**
- [ ] No layout breakage
- [ ] Rounded corners applied correctly
- [ ] Purple accent color visible
- [ ] Shadows display properly
- [ ] Gradients render correctly
- [ ] Three-tier nav styled correctly

**Functional:**
- [ ] All buttons clickable
- [ ] Forms submit correctly
- [ ] Modals open/close
- [ ] Navigation works
- [ ] Search functional
- [ ] Filters apply

**Interactive:**
- [ ] Hover states work (cards lift, buttons darken)
- [ ] Focus states visible (purple border)
- [ ] Active states clear (nav highlights)
- [ ] Loading states display
- [ ] Error states styled

**Cross-browser:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**Responsive:**
- [ ] Desktop (1920px)
- [ ] Laptop (1366px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

---

### 5.2: Automated Testing

**Playwright Test Suite:**

Create `tests/design-system.spec.js` in each service:

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Design System Compliance', () => {
  test('uses purple accent color', async ({ page }) => {
    await page.goto('/');

    const primaryButton = page.locator('.ss-btn-primary').first();
    const bgColor = await primaryButton.evaluate((el) =>
      window.getComputedStyle(el).backgroundColor
    );

    // Should be purple (rgb(102, 126, 234))
    expect(bgColor).toBe('rgb(102, 126, 234)');
  });

  test('buttons have rounded corners', async ({ page }) => {
    await page.goto('/');

    const button = page.locator('.ss-btn').first();
    const borderRadius = await button.evaluate((el) =>
      window.getComputedStyle(el).borderRadius
    );

    // Should be 8px
    expect(borderRadius).toBe('8px');
  });

  test('cards have elevation on hover', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('.ss-card').first();

    // Get initial box shadow
    const initialShadow = await card.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );

    // Hover
    await card.hover();

    // Get hover box shadow
    const hoverShadow = await card.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );

    // Shadow should be stronger on hover
    expect(hoverShadow).not.toBe(initialShadow);
  });

  test('navigation uses gradient for active state', async ({ page }) => {
    await page.goto('/');

    const activeNav = page.locator('.global-nav a.active').first();
    const background = await activeNav.evaluate((el) =>
      window.getComputedStyle(el).backgroundImage
    );

    // Should contain gradient
    expect(background).toContain('linear-gradient');
  });
});
```

**Run across all services:**
```bash
for service in dashboard operations inventory billing video booking; do
  cd sailorskills-$service
  npx playwright test tests/design-system.spec.js
  cd ..
done
```

---

### 5.3: Visual Regression Testing

**Setup Playwright visual comparison:**

```bash
# Install Playwright
npm install -D @playwright/test

# Generate baseline screenshots
npx playwright test --update-snapshots
```

**Test file:** `tests/visual-regression.spec.js`

```javascript
const { test, expect } = require('@playwright/test');

test.describe('Visual Regression', () => {
  test('dashboard homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05, // Allow 5% difference
    });
  });

  test('three-tier navigation', async ({ page }) => {
    await page.goto('/');

    await expect(page.locator('.top-nav')).toHaveScreenshot('top-nav.png');
    await expect(page.locator('.global-nav')).toHaveScreenshot('global-nav.png');
    await expect(page.locator('.sub-nav')).toHaveScreenshot('sub-nav.png');
  });

  test('card components', async ({ page }) => {
    await page.goto('/');

    const card = page.locator('.ss-card').first();

    // Normal
    await expect(card).toHaveScreenshot('card-normal.png');

    // Hover
    await card.hover();
    await page.waitForTimeout(300); // Wait for transition
    await expect(card).toHaveScreenshot('card-hover.png');
  });

  test('button states', async ({ page }) => {
    await page.goto('/');

    const btn = page.locator('.ss-btn-primary').first();

    // Normal
    await expect(btn).toHaveScreenshot('button-normal.png');

    // Hover
    await btn.hover();
    await expect(btn).toHaveScreenshot('button-hover.png');
  });

  test('modal appearance', async ({ page }) => {
    await page.goto('/');

    // Trigger modal
    await page.click('.open-modal-btn');
    await page.waitForSelector('.ss-modal');

    await expect(page.locator('.ss-modal')).toHaveScreenshot('modal.png');
  });
});
```

**Compare before/after:**
```bash
# Take before screenshots
git checkout main
npx playwright test --update-snapshots

# Take after screenshots
git checkout design-system-update
npx playwright test

# Review diff report
npx playwright show-report
```

---

### 5.4: Accessibility Testing

**Use axe-core:**

```javascript
const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

test.describe('Accessibility', () => {
  test('dashboard meets WCAG AA', async ({ page }) => {
    await page.goto('/');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });

  test('purple contrast ratio sufficient', async ({ page }) => {
    await page.goto('/');

    // Check purple button text contrast
    const results = await new AxeBuilder({ page })
      .include('.ss-btn-primary')
      .analyze();

    expect(results.violations.filter(v => v.id === 'color-contrast')).toEqual([]);
  });

  test('focus indicators visible', async ({ page }) => {
    await page.goto('/');

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    const focusedElement = page.locator(':focus');
    const outline = await focusedElement.evaluate((el) =>
      window.getComputedStyle(el).outline
    );

    // Should have visible outline
    expect(outline).not.toBe('none');
  });
});
```

**Manual keyboard navigation test:**
- [ ] Tab through all interactive elements
- [ ] Focus indicators clearly visible (purple glow)
- [ ] Skip links work
- [ ] Escape closes modals
- [ ] Enter activates buttons

---

### 5.5: Performance Testing

**Lighthouse CI:**

```bash
npm install -D @lhci/cli

# Run Lighthouse
lhci autorun
```

**Config:** `.lighthouserc.json`

```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:5173"],
      "numberOfRuns": 3
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", {"minScore": 0.9}],
        "categories:accessibility": ["error", {"minScore": 0.95}],
        "first-contentful-paint": ["error", {"maxNumericValue": 1500}],
        "interactive": ["error", {"maxNumericValue": 3000}]
      }
    }
  }
}
```

**CSS bundle size check:**

```bash
# Before
du -h sailorskills-dashboard/dist/assets/*.css

# After
du -h sailorskills-dashboard/dist/assets/*.css

# Difference should be minimal (<5KB)
```

---

## Rollback Plan

### 6.1: Emergency Rollback (Production Issue)

**If critical bug discovered in production:**

**Step 1: Revert Shared Package**

```bash
cd sailorskills-shared
git log --oneline # Find commit before design system update
git revert <commit-hash>
git push
```

**Step 2: Revert Each Service**

```bash
cd sailorskills-dashboard
git submodule update --remote
git add shared
git commit -m "Rollback: Revert design system updates"
git push

# Repeat for other services
```

**Step 3: Verify Rollback**

- [ ] Services load correctly
- [ ] Old styles applied
- [ ] No console errors
- [ ] Functional testing passes

**Estimated rollback time:** 15-30 minutes

---

### 6.2: Partial Rollback (One Service Issue)

**If issue in specific service:**

**Option A: Revert service git commit**

```bash
cd sailorskills-operations
git log --oneline
git revert <design-system-commit>
git push
```

**Option B: Override Shared styles locally**

```css
/* operations/styles/main.css */

/* TEMPORARY: Override Shared design system */
.ss-btn {
  border-radius: 0 !important; /* Revert to sharp corners */
}

.ss-card {
  border-radius: 0 !important;
}

/* TODO: Remove after Shared fix deployed */
```

**Estimated time:** 5-10 minutes

---

### 6.3: Rollback Testing

**After rollback:**

- [ ] Service loads with old styles
- [ ] No visual breakage
- [ ] Functional testing passes
- [ ] No console errors
- [ ] Performance acceptable

**Document issue:**
Create GitHub issue with:
- Service affected
- Steps to reproduce
- Expected vs actual behavior
- Screenshots
- Browser/device info
- Rollback performed (Y/N)

---

## Appendix: Service-Specific Checklists

### A.1: Dashboard

**Pre-Implementation:**
- [ ] Backup current dashboard screenshot
- [ ] Document any custom CSS overrides
- [ ] Test current functionality (baseline)

**Implementation:**
- [ ] Update git submodule to latest Shared
- [ ] Replace hardcoded colors with tokens
- [ ] Replace hardcoded border-radius with tokens
- [ ] Test three-tier navigation
- [ ] Test dashboard cards
- [ ] Test revenue widgets
- [ ] Test charts/graphs
- [ ] Test filters
- [ ] Test modals

**Post-Implementation:**
- [ ] Playwright tests passing
- [ ] Visual regression baseline created
- [ ] Accessibility audit passed
- [ ] Performance metrics acceptable
- [ ] Cross-browser testing complete

---

### A.2: Operations

**Pre-Implementation:**
- [ ] Backup current operations screenshot
- [ ] Document custom styles in `main.css` (1914 lines)
- [ ] Test packing list generation
- [ ] Test service log entry

**Implementation:**
- [ ] Update git submodule to latest Shared
- [ ] Replace hardcoded colors in main.css
- [ ] Replace border-radius in main.css
- [ ] Test three-tier navigation
- [ ] Test packing lists (monthly/weekly/daily/boat)
- [ ] Test service log forms
- [ ] Test paint alerts dashboard
- [ ] Test schedule calendar
- [ ] Test boats & service history
- [ ] Test boat detail panel (slide-in)
- [ ] Test modals (multiple types)
- [ ] Test toast notifications

**Post-Implementation:**
- [ ] Playwright tests passing
- [ ] Visual regression baseline created
- [ ] Mobile view tested (field use)
- [ ] Cross-browser testing complete

---

### A.3: Inventory

**Pre-Implementation:**
- [ ] Backup current inventory screenshot
- [ ] Document custom CSS files
- [ ] Test inventory list
- [ ] Test add/edit item flows

**Implementation:**
- [ ] Update git submodule to latest Shared
- [ ] Replace hardcoded colors
- [ ] Replace border-radius
- [ ] Test three-tier navigation
- [ ] Test inventory list display
- [ ] Test add item form
- [ ] Test edit item form
- [ ] Test stock alerts
- [ ] Test storage location tracking
- [ ] Test anode catalog
- [ ] Test search/filter functionality

**Post-Implementation:**
- [ ] Playwright tests passing
- [ ] Visual regression baseline created
- [ ] Accessibility audit passed
- [ ] Cross-browser testing complete

---

### A.4: Completion (Billing)

**Pre-Implementation:**
- [ ] Backup current billing screenshot
- [ ] Document Billing-specific styles (main, page-layout, customer-cards)
- [ ] Test service completion flow
- [ ] Test payment processing

**Implementation:**
- [ ] Update git submodule to latest Shared
- [ ] Integrate Billing colors with Shared tokens
- [ ] Replace custom card styles with `.ss-card`
- [ ] Extract condition sliders to Shared (optional)
- [ ] Test three-tier navigation
- [ ] Test service type selection
- [ ] Test conditions tracking
- [ ] Test anode assignment UI
- [ ] Test customer information cards
- [ ] Test search functionality
- [ ] Test payment processing (Stripe)
- [ ] Test condition sliders (all types)

**Post-Implementation:**
- [ ] Playwright tests passing
- [ ] Payment flow verified (test mode)
- [ ] Visual regression baseline created
- [ ] Cross-browser testing complete

---

### A.5: Video

**Pre-Implementation:**
- [ ] Backup current video service screenshot
- [ ] Document custom CSS files
- [ ] Test video upload flow
- [ ] Test YouTube integration

**Implementation:**
- [ ] Update git submodule to latest Shared
- [ ] Replace hardcoded colors
- [ ] Replace border-radius
- [ ] Test three-tier navigation
- [ ] Test video upload
- [ ] Test playlist management
- [ ] Test YouTube integration
- [ ] Test video player
- [ ] Test metadata editing

**Post-Implementation:**
- [ ] Playwright tests passing
- [ ] Video upload verified
- [ ] YouTube API functional
- [ ] Cross-browser testing complete

---

### A.6: Booking

**Pre-Implementation:**
- [ ] Backup current booking screenshot
- [ ] Document custom CSS files
- [ ] Test booking creation
- [ ] Test Google Calendar sync

**Implementation:**
- [ ] Update git submodule to latest Shared
- [ ] Replace hardcoded colors
- [ ] Replace border-radius
- [ ] Test three-tier navigation
- [ ] Test booking calendar display
- [ ] Test new booking form
- [ ] Test Google Calendar sync
- [ ] Test reminder system
- [ ] Test customer notifications

**Post-Implementation:**
- [ ] Playwright tests passing
- [ ] Google Calendar integration verified
- [ ] Email notifications sent
- [ ] Cross-browser testing complete

---

## Implementation Timeline

### Week 1: Shared Package + Dashboard Pilot

**Monday (3-4 hours):**
- Morning: Phase 1 - Update design tokens
- Afternoon: Phase 2 - Update component styles (buttons, cards, modals)

**Tuesday (3-4 hours):**
- Morning: Phase 2 continued - Navigation, forms, badges
- Afternoon: Build Shared package, verify no errors

**Wednesday (2-3 hours):**
- Morning: Phase 3 - Dashboard submodule update
- Afternoon: Dashboard testing (manual + Playwright)

**Thursday (2 hours):**
- Morning: Dashboard visual regression testing
- Afternoon: Dashboard accessibility audit

**Friday (1 hour):**
- Morning: Dashboard pilot sign-off
- Afternoon: Document any issues/learnings

**Week 1 Total:** 11-14 hours

---

### Week 2: Operations, Inventory, Completion

**Monday (2-3 hours):**
- Operations: Submodule update + CSS token replacement
- Operations: Testing (manual)

**Tuesday (2 hours):**
- Operations: Playwright tests + fixes
- Operations: Sign-off

**Wednesday (2-3 hours):**
- Inventory: Submodule update + CSS token replacement
- Inventory: Testing

**Thursday (2 hours):**
- Inventory: Playwright tests + sign-off
- Completion: Submodule update

**Friday (1-2 hours):**
- Completion: CSS integration + testing
- Completion: Sign-off

**Week 2 Total:** 9-12 hours

---

### Week 3: Video, Booking, Final Polish

**Monday (2-3 hours):**
- Video: Submodule update + CSS token replacement
- Video: Testing

**Tuesday (2 hours):**
- Video: Playwright tests + sign-off
- Booking: Submodule update

**Wednesday (2-3 hours):**
- Booking: CSS token replacement + testing
- Booking: Sign-off

**Thursday (2-3 hours):**
- Cross-service consistency check
- Visual comparison across all services
- Final accessibility audit

**Friday (2 hours):**
- Documentation updates
- Final Playwright suite run (all services)
- Project retrospective

**Week 3 Total:** 10-13 hours

---

**Grand Total:** 30-39 hours (within 24-35 hour estimate + buffer)

---

## Success Criteria

### Must-Have (Blockers)
- [ ] All 6 services using updated Shared design system
- [ ] Three-tier navigation consistent across all services
- [ ] No functional regressions (all features work)
- [ ] No accessibility violations (WCAG AA)
- [ ] Playwright tests passing for all services
- [ ] Performance within 10% of baseline

### Should-Have (Important)
- [ ] Visual regression baselines established
- [ ] Cross-browser testing complete (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsive verified
- [ ] Documentation updated
- [ ] Rollback plan tested

### Nice-to-Have (Optional)
- [ ] Condition sliders extracted to Shared
- [ ] Card patterns documented in Shared
- [ ] Design system Storybook created
- [ ] Video tutorials for new design system

---

## Post-Implementation

### Documentation Updates

**Update these files:**
- [ ] `sailorskills-shared/README.md` - Document new design tokens
- [ ] `sailorskills-shared/src/ui/DESIGN_SYSTEM.md` - Create component guide
- [ ] Each service's `CLAUDE.md` - Note design system compliance
- [ ] `ROADMAP.md` - Mark initiative as complete

### Communication

**Announce to team:**
- Summary of changes
- Before/after screenshots
- Benefits (modern UX, consistency)
- Known issues (if any)
- Feedback channel

### Monitoring

**First week after deployment:**
- Monitor error logs (Sentry, console)
- Check performance metrics (Lighthouse CI)
- Gather user feedback
- Track support tickets
- Document any issues

---

## Support & Questions

**Technical Issues:**
- Check this guide first
- Review Playwright test output
- Check browser console for errors
- Verify git submodule is updated

**Design Questions:**
- Refer to Billing service as reference
- Check `design-tokens.css` for available variables
- Review `styles.css` for component patterns

**Rollback Decision:**
- Critical production bug: Immediate rollback
- Minor visual issue: Fix forward
- Performance regression: Investigate, rollback if >20% slower
- Accessibility violation: Fix immediately (don't rollback unless critical)

---

**END OF IMPLEMENTATION GUIDE**

---

**Document Version:** 1.0
**Last Updated:** 2025-10-22
**Next Review:** After Phase 3 (Dashboard pilot complete)
