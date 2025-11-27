# Shared CSS Bundling Issue

**Date:** 2025-10-27
**Services Affected:** Dashboard, Operations (possibly others)
**Severity:** HIGH - Styling partially broken in production

---

## Problem

Shared CSS files (design-tokens.css, styles.css) are referenced via `<link>` tags in HTML but are NOT being bundled or served in production.

### Current State

**HTML References:**
```html
<link rel="stylesheet" href="/shared/src/ui/design-tokens.css">
<link rel="stylesheet" href="/shared/src/ui/styles.css">
```

**Production Result:**
- `/shared/src/ui/` path doesn't exist in dist folder
- CSS files return 404
- CSS variables like `--ss-font-primary` are undefined
- Fonts don't load (using browser defaults like "Times")

### Evidence

**Operations:**
-  Montserrat fonts loaded (20 instances)
- ❌ Body font: "Times" (not applied)
- ❌ `--ss-primary`: empty string
- ✅ CSS using `var(--ss-font-primary)` but variable undefined

**Dashboard:**
- Same issue likely present (not fully tested)

---

## Root Cause

Vite's `resolve.alias` configuration only affects imports in JavaScript/CSS files, NOT static `<link>` tags in HTML.

```javascript
// This only helps with JS imports, not HTML <link> tags
resolve: {
  alias: {
    '/shared': resolve(__dirname, 'shared')
  }
}
```

---

## Solution Options

### Option A: Import CSS in JavaScript (RECOMMENDED)

**Pros:**
- Vite will bundle CSS automatically
- Single bundled CSS file
- Proper build optimization

**Cons:**
- Requires changing main.js in each service

**Implementation:**
```javascript
// In src/main.js or equivalent
import '../shared/src/ui/design-tokens.css';
import '../shared/src/ui/styles.css';
```

Remove `<link>` tags from HTML.

---

### Option B: Copy Plugin

**Pros:**
- Keeps HTML structure unchanged
- Simple configuration

**Cons:**
- Extra build step
- Files not optimized/bundled

**Implementation:**
```javascript
// vite.config.js
import { copyFileSync } from 'fs';

export default defineConfig({
  plugins: [
    {
      name: 'copy-shared',
      closeBundle() {
        // Copy shared folder to dist
      }
    }
  ]
});
```

---

### Option C: Public Directory

**Pros:**
- Vite serves public/ as-is
- No build configuration needed

**Cons:**
- Files not processed/optimized
- Need to copy shared to public/

---

## Recommended Fix (Option A)

### For Operations:

1. **Create or update `src/main.js`:**
```javascript
// Import shared CSS (Vite will bundle these)
import '../shared/src/ui/design-tokens.css';
import '../shared/src/ui/styles.css';

// Rest of app initialization
// ...
```

2. **Update `index.html`:**
```html
<!-- Remove these -->
<!--
<link rel="stylesheet" href="/shared/src/ui/design-tokens.css">
<link rel="stylesheet" href="/shared/src/ui/styles.css">
-->

<!-- Vite will inject bundled CSS automatically -->
<script type="module" src="/src/main.js"></script>
```

3. **Update `vite.config.js`:**
```javascript
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        settings: resolve(__dirname, 'settings.html')
      }
    }
  }
});
```

4. **Rebuild and deploy**

### For Dashboard:

Same approach - import CSS in entry JavaScript file.

---

## Testing Checklist

After implementing fix:

- [ ] Build succeeds
- [ ] Montserrat font loads
- [ ] CSS variables defined (`--ss-font-primary`, `--ss-primary-600`, etc.)
- [ ] Body font is "Montserrat"
- [ ] No 404 errors for CSS files
- [ ] Styling matches design system
- [ ] Production deployment works

---

## Related Files

**Operations:**
- `sailorskills-operations/index.html`
- `sailorskills-operations/src/main.js`
- `sailorskills-operations/vite.config.js`

**Dashboard:**
- `sailorskills-dashboard/dashboard.html`
- `sailorskills-dashboard/js/dashboard.js`
- `sailorskills-dashboard/vite.config.js`

**Shared:**
- `shared/src/ui/design-tokens.css`
- `shared/src/ui/styles.css`

---

## Priority

**HIGH** - Affects visual consistency across all services using shared package.

Should be fixed before continuing with Task 2.2 Batch 2-4.

---

**Status:** IDENTIFIED - Ready for implementation
**Next:** Implement Option A for both Dashboard and Operations
