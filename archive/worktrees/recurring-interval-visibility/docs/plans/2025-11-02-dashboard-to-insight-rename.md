# Dashboard → Insight Service Rename Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rename sailorskills-dashboard service to sailorskills-insight across all infrastructure, code, and documentation

**Architecture:** Multi-service rename affecting GitHub repository, Vercel deployment, shared navigation package, and documentation references across 9+ Sailorskills services

**Tech Stack:** GitHub CLI, Vercel CLI, JavaScript (navigation updates), Git submodules

**Rationale:** "Insight" differentiates strategic Business Intelligence service from operational dashboards in other services (Operations, Inventory, Billing). Avoids confusion when referring to "dashboard" generically. Provides clean slate for Q1 2026 Strategic BI transformation.

**Estimated Time:** 2-3 hours total

---

## Phase 1: Foundation & Verification (Sequential - 20 minutes)

**These tasks MUST run sequentially before parallel execution**

### Task 1.1: Verify Current State & Create Backup Plan

**Files:**
- Read: `sailorskills-dashboard/package.json`
- Read: `sailorskills-dashboard/.vercel/project.json`
- Read: `sailorskills-shared/src/ui/navigation.js`

**Step 1: Verify GitHub repository exists**

```bash
cd /Users/brian/app-development/sailorskills-repos
gh repo view sailorskills-dashboard --json name,owner,url,defaultBranchRef
```

Expected output:
```json
{
  "name": "sailorskills-dashboard",
  "owner": {"login": "standardhuman"},
  "url": "https://github.com/standardhuman/sailorskills-dashboard",
  "defaultBranchRef": {"name": "main"}
}
```

**Step 2: Verify Vercel project**

```bash
cd sailorskills-dashboard
vercel project ls | grep -E "(dashboard|admin-dashboard)"
```

Expected: Show Vercel project name (might be "admin-dashboard" or "sailorskills-dashboard")

**Step 3: Check for uncommitted changes**

```bash
cd sailorskills-dashboard
git status
```

Expected: "nothing to commit, working tree clean"

**Step 4: Document current URLs for rollback reference**

```bash
echo "=== BACKUP - Current Configuration ===" > /tmp/dashboard-rename-backup.txt
echo "GitHub: https://github.com/standardhuman/sailorskills-dashboard" >> /tmp/dashboard-rename-backup.txt
echo "Vercel Project ID: $(cat .vercel/project.json | grep projectId)" >> /tmp/dashboard-rename-backup.txt
echo "Current Production URL: https://sailorskills-dashboard.vercel.app" >> /tmp/dashboard-rename-backup.txt
echo "Package Name: $(grep '"name"' package.json)" >> /tmp/dashboard-rename-backup.txt
cat /tmp/dashboard-rename-backup.txt
```

**Step 5: Commit**

No commit needed - verification only. Save backup file for reference.

**Success Criteria:**
- ✅ GitHub repo confirmed accessible
- ✅ Vercel project identified
- ✅ No uncommitted changes blocking rename
- ✅ Backup reference created

---

### Task 1.2: Create Testing Checklist

**Files:**
- Create: `/tmp/insight-rename-testing-checklist.md`

**Step 1: Create testing checklist document**

```bash
cat > /tmp/insight-rename-testing-checklist.md << 'EOF'
# Dashboard → Insight Rename - Testing Checklist

## Post-Rename Verification

### GitHub Repository
- [ ] Repository renamed to `sailorskills-insight`
- [ ] URL redirects: `github.com/standardhuman/sailorskills-dashboard` → `github.com/standardhuman/sailorskills-insight`
- [ ] Local git remote updated
- [ ] No broken links in README

### Vercel Deployment
- [ ] Project renamed (or new project created)
- [ ] Deployment successful at new URL
- [ ] Environment variables preserved
- [ ] Custom domain configured (if applicable)
- [ ] Previous URL handling (redirect or deprecated notice)

### Navigation Updates
- [ ] Shared package navigation.js updated with "INSIGHT" label
- [ ] Shared package navigation.js updated with new URL
- [ ] All services using updated shared package
- [ ] Navigation displays "INSIGHT" not "DASHBOARD"

### Service Updates (Each service using shared navigation)
- [ ] sailorskills-billing - navigation updated
- [ ] sailorskills-operations - navigation updated
- [ ] sailorskills-portal - navigation updated
- [ ] sailorskills-inventory - navigation updated
- [ ] sailorskills-video - navigation updated
- [ ] sailorskills-estimator - navigation updated

### Documentation
- [ ] Root ROADMAP.md references updated
- [ ] Root CLAUDE.md references updated
- [ ] Service-specific docs updated
- [ ] Architecture diagrams updated (if any)

### Testing
- [ ] Navigate from Operations to Insight - link works
- [ ] Navigate from Billing to Insight - link works
- [ ] Navigate from Portal to Insight - link works
- [ ] Insight service loads correctly
- [ ] Insight service authentication works

## Rollback Plan

If critical issues occur:
1. GitHub: Rename back via `gh repo rename sailorskills-dashboard`
2. Vercel: Revert project name or redeploy to original
3. Shared package: `git revert` navigation changes
4. Services: `cd shared && git pull` to get reverted navigation

EOF
cat /tmp/insight-rename-testing-checklist.md
```

**Step 2: Commit**

No commit needed - testing checklist is a working document.

**Success Criteria:**
- ✅ Testing checklist created with all verification steps
- ✅ Rollback plan documented

---

## Phase 2: Parallel Execution (PARALLEL - 60-90 minutes)

**These tasks CAN run in parallel via subagent-driven-development**

### Task 2.1: Rename GitHub Repository [SUBAGENT A]

**Files:**
- Modify: GitHub repository name via API

**Step 1: Rename GitHub repository**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-dashboard
gh repo rename sailorskills-insight
```

Expected output:
```
✓ Renamed repository standardhuman/sailorskills-dashboard to sailorskills-insight
```

**Step 2: Update local git remote**

```bash
git remote set-url origin https://github.com/standardhuman/sailorskills-insight.git
git remote -v
```

Expected output:
```
origin  https://github.com/standardhuman/sailorskills-insight.git (fetch)
origin  https://github.com/standardhuman/sailorskills-insight.git (push)
```

**Step 3: Verify repository accessible at new URL**

```bash
gh repo view sailorskills-insight --json name,url
```

Expected output:
```json
{
  "name": "sailorskills-insight",
  "url": "https://github.com/standardhuman/sailorskills-insight"
}
```

**Step 4: Verify old URL redirects**

```bash
curl -I https://github.com/standardhuman/sailorskills-dashboard 2>&1 | grep -i location
```

Expected: Shows redirect to sailorskills-insight

**Step 5: Update package.json name**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-dashboard
```

Edit `package.json`:
```json
{
  "name": "@sailorskills/insight",
  "version": "0.1.0",
  "type": "module",
  "description": "Sailor Skills Insight - Strategic business intelligence and analytics hub",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.0.0"
  },
  "devDependencies": {
    "vite": "^7.1.12"
  }
}
```

**Step 6: Commit package.json update**

```bash
git add package.json
git commit -m "chore: rename package to @sailorskills/insight

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Success Criteria:**
- ✅ GitHub repository renamed
- ✅ Local remote updated
- ✅ Old URL redirects to new URL
- ✅ Package.json updated and committed

---

### Task 2.2: Update Vercel Project [SUBAGENT B]

**Files:**
- Modify: Vercel project configuration

**Step 1: Check current Vercel project name**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-dashboard
vercel inspect $(cat .vercel/project.json | grep projectId | cut -d'"' -f4)
```

Note the current project name (might be "admin-dashboard" or "sailorskills-dashboard")

**Step 2: Create new Vercel project with insight name**

**Option A: If project needs renaming via dashboard**
- Open https://vercel.com/sailorskills
- Find the dashboard project (might be named "admin-dashboard")
- Go to Settings → General → Project Name
- Rename to "sailorskills-insight"
- Update production domain to include "insight"

**Option B: Redeploy to new project via CLI**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-dashboard

# Remove old Vercel linking
rm -rf .vercel

# Link to new project (creates if doesn't exist)
vercel link --project-name sailorskills-insight

# Deploy to production
vercel --prod
```

**Step 3: Configure environment variables**

```bash
# Copy env vars from old project to new (if creating new project)
vercel env pull .env.production
vercel env add VITE_SUPABASE_URL production < .env.production
vercel env add VITE_SUPABASE_ANON_KEY production < .env.production
```

**Step 4: Verify deployment successful**

```bash
vercel ls sailorskills-insight --prod
```

Expected: Shows production deployment URL

**Step 5: Test new URL**

```bash
curl -I https://sailorskills-insight.vercel.app
```

Expected: HTTP 200 OK

**Step 6: Commit Vercel configuration**

```bash
git add .vercel/project.json
git commit -m "chore: update Vercel project to sailorskills-insight

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Success Criteria:**
- ✅ Vercel project renamed or recreated as "sailorskills-insight"
- ✅ Deployment successful at new URL
- ✅ Environment variables configured
- ✅ Service loads correctly

**Notes:**
- Old sailorskills-dashboard.vercel.app URL may still work temporarily
- Consider adding redirect or deprecation notice if needed
- Custom domain configuration happens in Phase 3

---

### Task 2.3: Update Shared Package Navigation [SUBAGENT C]

**Files:**
- Modify: `sailorskills-shared/src/ui/navigation.js:76,82`

**Step 1: Update navigation.js - Change label and URL**

Edit `/Users/brian/app-development/sailorskills-repos/sailorskills-shared/src/ui/navigation.js`:

**OLD (lines 74-83):**
```javascript
    } else {
        // Internal navigation for Dashboard, Billing, Operations, Portal, Inventory, Video, Estimator
        navItems = [
            { id: 'dashboard', label: 'DASHBOARD', url: 'https://sailorskills-dashboard.vercel.app' },
            { id: 'billing', label: 'BILLING', url: 'https://sailorskills-billing.vercel.app' },
            { id: 'operations', label: 'OPERATIONS', url: 'https://sailorskills-operations.vercel.app' },
            { id: 'portal', label: 'PORTAL', url: 'https://sailorskills-portal.vercel.app' },
            { id: 'inventory', label: 'INVENTORY', url: 'https://sailorskills-inventory.vercel.app' },
            { id: 'video', label: 'VIDEO', url: 'https://sailorskills-video.vercel.app' },
            { id: 'estimator', label: 'ESTIMATOR', url: 'https://sailorskills-estimator.vercel.app' }
        ];
    }
```

**NEW (lines 74-83):**
```javascript
    } else {
        // Internal navigation for Insight, Billing, Operations, Portal, Inventory, Video, Estimator
        navItems = [
            { id: 'insight', label: 'INSIGHT', url: 'https://sailorskills-insight.vercel.app' },
            { id: 'billing', label: 'BILLING', url: 'https://sailorskills-billing.vercel.app' },
            { id: 'operations', label: 'OPERATIONS', url: 'https://sailorskills-operations.vercel.app' },
            { id: 'portal', label: 'PORTAL', url: 'https://sailorskills-portal.vercel.app' },
            { id: 'inventory', label: 'INVENTORY', url: 'https://sailorskills-inventory.vercel.app' },
            { id: 'video', label: 'VIDEO', url: 'https://sailorskills-video.vercel.app' },
            { id: 'estimator', label: 'ESTIMATOR', url: 'https://sailorskills-estimator.vercel.app' }
        ];
    }
```

**Step 2: Update comment in createGlobalNav function (line 42)**

**OLD (line 42):**
```javascript
 * @param {string} options.currentPage - Current active page ('dashboard'|'billing'|'operations'|'portal'|'customers'|'inventory'|'video'|'estimator')
```

**NEW (line 42):**
```javascript
 * @param {string} options.currentPage - Current active page ('insight'|'billing'|'operations'|'portal'|'customers'|'inventory'|'video'|'estimator')
```

**Step 3: Update comment describing nav items (line 41)**

**OLD (line 41):**
```javascript
 * Displays main service links: DASHBOARD | BILLING | OPERATIONS | INVENTORY | VIDEO | ESTIMATOR
```

**NEW (line 41):**
```javascript
 * Displays main service links: INSIGHT | BILLING | OPERATIONS | INVENTORY | VIDEO | ESTIMATOR
```

**Step 4: Search for any other "dashboard" references**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-shared
grep -rn "dashboard" src/ui/navigation.js
```

Expected: Only references in comments/documentation, all functional code updated

**Step 5: Commit navigation changes**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-shared
git add src/ui/navigation.js
git commit -m "feat: rename Dashboard → Insight in navigation

- Update navigation label: DASHBOARD → INSIGHT
- Update navigation URL to sailorskills-insight.vercel.app
- Update currentPage parameter documentation
- Update service description comments

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

**Step 6: Verify commit successful**

```bash
git log -1 --oneline
```

Expected: Shows commit with "rename Dashboard → Insight"

**Success Criteria:**
- ✅ Navigation label changed to "INSIGHT"
- ✅ Navigation URL updated to new Vercel URL
- ✅ JSDoc comments updated
- ✅ Changes committed and pushed to shared package

**Note:** All services using the shared package will need to update their submodule reference (handled in Phase 3)

---

### Task 2.4: Update Documentation References [SUBAGENT D]

**Files:**
- Modify: `ROADMAP.md`
- Modify: `CLAUDE.md`
- Modify: `sailorskills-dashboard/README.md`
- Modify: `sailorskills-dashboard/CLAUDE.md`
- Modify: `docs/roadmap/2025-Q4-ACTIVE.md`
- Modify: `docs/roadmap/2026-Q1-ACTIVE.md`

**Step 1: Update root ROADMAP.md**

Edit `/Users/brian/app-development/sailorskills-repos/ROADMAP.md`:

Find and replace all instances:
- `sailorskills-dashboard` → `sailorskills-insight`
- `Dashboard` → `Insight` (context-sensitive - keep "dashboard" when referring to generic concept)
- `https://sailorskills-dashboard.vercel.app` → `https://sailorskills-insight.vercel.app`

**Specific changes:**

Line 24:
```markdown
- ⏳ **Dashboard → Insight Rename:** Pending (High Priority)
```
→
```markdown
- ✅ **Dashboard → Insight Rename:** Complete (2025-11-02)
```

Line 154:
```markdown
- **Dashboard:** https://sailorskills-dashboard.vercel.app (→ Insight)
```
→
```markdown
- **Insight:** https://sailorskills-insight.vercel.app
```

Line 165-166:
```markdown
Customer Acquisition → Service Delivery → Completion → Analytics
    Estimator      →    Operations    →   Billing    → Dashboard/Insight
```
→
```markdown
Customer Acquisition → Service Delivery → Completion → Analytics
    Estimator      →    Operations    →   Billing    →   Insight
```

**Step 2: Update root CLAUDE.md**

Edit `/Users/brian/app-development/sailorskills-repos/CLAUDE.md`:

Search for "Dashboard" and update contextually (preserve generic "dashboard" references):

Update service list references to use "Insight"

**Step 3: Update sailorskills-dashboard/README.md**

Rename file path in commit (will be in sailorskills-insight after repo rename)

Edit `/Users/brian/app-development/sailorskills-repos/sailorskills-dashboard/README.md`:

Update title, description, URLs to reflect "Insight" branding:

```markdown
# Sailor Skills Insight

**Tagline:** "Strategic business intelligence and analytics"

[Update all dashboard references to insight throughout]
```

**Step 4: Update sailorskills-dashboard/CLAUDE.md**

Edit `/Users/brian/app-development/sailorskills-repos/sailorskills-dashboard/CLAUDE.md`:

```markdown
# Sailor Skills Insight

**Tagline:** "Strategic business intelligence and analytics"

This file provides guidance to Claude Code when working with the Insight service.

## Product Overview

The **Insight** service is the strategic business intelligence hub...

[Update throughout - change dashboard → insight contextually]
```

Update production URL:
```markdown
## Production Deployment

- **URL:** https://sailorskills-insight.vercel.app
```

**Step 5: Update docs/roadmap/2025-Q4-ACTIVE.md**

Edit `/Users/brian/app-development/sailorskills-repos/docs/roadmap/2025-Q4-ACTIVE.md`:

Line 47-58, mark task complete:
```markdown
- [x] **Rename sailorskills-dashboard → sailorskills-insight**
  - **Completed:** 2025-11-02
  - **Rationale:** "Insight" differentiates strategic BI service from operational dashboards
```

**Step 6: Update docs/roadmap/2026-Q1-ACTIVE.md**

Edit `/Users/brian/app-development/sailorskills-repos/docs/roadmap/2026-Q1-ACTIVE.md`:

Find all "Dashboard" references and update to "Insight":
- Service name: Dashboard → Insight
- URL references
- Dependencies

**Step 7: Commit all documentation changes**

```bash
cd /Users/brian/app-development/sailorskills-repos

# Commit root-level docs
git add ROADMAP.md CLAUDE.md docs/roadmap/*.md
git commit -m "docs: update Dashboard → Insight across roadmap and docs

- Mark Q4 rename task complete
- Update all service references
- Update deployment URLs
- Update architecture diagrams

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push

# Commit Insight service docs (in renamed repo)
cd sailorskills-dashboard
git add README.md CLAUDE.md
git commit -m "docs: rebrand Dashboard → Insight service

- Update service name and tagline
- Update production URL
- Update feature descriptions
- Emphasize strategic BI positioning

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Success Criteria:**
- ✅ Root roadmap updated
- ✅ Root CLAUDE.md updated
- ✅ Insight service README updated
- ✅ Insight service CLAUDE.md updated
- ✅ Quarterly roadmap files updated
- ✅ All commits pushed

---

## Phase 3: Integration & Verification (Sequential - 30-60 minutes)

**These tasks MUST run sequentially after parallel tasks complete**

### Task 3.1: Update Shared Package Reference in All Services

**Files:**
- Modify: Git submodule references in 6+ services

**Step 1: Update shared package in sailorskills-insight**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-dashboard
cd shared
git pull origin main
cd ..
git add shared
git commit -m "chore: update shared package with Insight navigation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Step 2: Update shared package in sailorskills-billing**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-billing
cd shared
git pull origin main
cd ..
git add shared
git commit -m "chore: update shared package - Dashboard → Insight navigation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Step 3: Update shared package in sailorskills-operations**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-operations
cd shared
git pull origin main
cd ..
git add shared
git commit -m "chore: update shared package - Dashboard → Insight navigation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Step 4: Update shared package in sailorskills-portal**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-portal
cd shared
git pull origin main
cd ..
git add shared
git commit -m "chore: update shared package - Dashboard → Insight navigation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Step 5: Update shared package in sailorskills-inventory**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-inventory
cd shared
git pull origin main
cd ..
git add shared
git commit -m "chore: update shared package - Dashboard → Insight navigation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Step 6: Update shared package in sailorskills-video**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-video
cd shared
git pull origin main
cd ..
git add shared
git commit -m "chore: update shared package - Dashboard → Insight navigation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Step 7: Update shared package in sailorskills-estimator**

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-estimator
cd shared
git pull origin main
cd ..
git add shared
git commit -m "chore: update shared package - Dashboard → Insight navigation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Success Criteria:**
- ✅ All 7 services updated with latest shared package
- ✅ All commits pushed successfully
- ✅ Vercel auto-deployments triggered

---

### Task 3.2: Verify Deployments and Navigation

**Files:**
- None (verification only)

**Step 1: Wait for Vercel deployments to complete**

```bash
# Check deployment status for each service
for service in billing operations portal inventory video estimator; do
    echo "=== sailorskills-$service ==="
    vercel ls sailorskills-$service --prod | head -5
    echo ""
done
```

Expected: All show recent deployments with "Ready" status

**Step 2: Test Insight service loads**

```bash
curl -I https://sailorskills-insight.vercel.app
```

Expected: HTTP 200 OK

**Step 3: Test navigation link from Operations**

Open browser:
```
https://sailorskills-operations.vercel.app
```

Verify:
- Navigation shows "INSIGHT" label (not "DASHBOARD")
- Clicking "INSIGHT" navigates to `https://sailorskills-insight.vercel.app`
- Insight service loads correctly

**Step 4: Test navigation link from Billing**

Open browser:
```
https://sailorskills-billing.vercel.app
```

Verify:
- Navigation shows "INSIGHT" label
- Link works correctly

**Step 5: Test navigation link from Portal**

Open browser:
```
https://sailorskills-portal.vercel.app
```

Verify:
- Navigation shows "INSIGHT" label
- Link works correctly

**Step 6: Verify old dashboard URL behavior**

```bash
curl -I https://sailorskills-dashboard.vercel.app
```

Note behavior (might still work, might redirect, or might 404)

**Optional:** If old URL needs explicit redirect/deprecation notice, add task in follow-up

**Success Criteria:**
- ✅ Insight service accessible at new URL
- ✅ All services show "INSIGHT" in navigation
- ✅ Navigation links work across services
- ✅ No broken links or 404 errors

---

### Task 3.3: Update Testing Checklist and Mark Complete

**Files:**
- Modify: `/tmp/insight-rename-testing-checklist.md`

**Step 1: Review testing checklist**

```bash
cat /tmp/insight-rename-testing-checklist.md
```

**Step 2: Mark all items complete**

Edit `/tmp/insight-rename-testing-checklist.md` and check all boxes based on verification results

**Step 3: Document any issues or follow-up items**

Add section at end:
```markdown
## Completion Summary

**Completed:** 2025-11-02
**Duration:** [X] hours

### Issues Encountered
- [List any issues and how they were resolved]

### Follow-up Items
- [ ] Configure custom domain (if applicable)
- [ ] Add redirect from old dashboard URL (if needed)
- [ ] Update any external documentation/bookmarks
- [ ] Notify team of name change
```

**Step 4: Final verification - GitHub redirect**

```bash
# Verify old GitHub URL redirects
curl -I https://github.com/standardhuman/sailorskills-dashboard 2>&1 | grep -i location
```

Expected: Redirects to sailorskills-insight

**Step 5: Save completion report**

```bash
cp /tmp/insight-rename-testing-checklist.md /Users/brian/app-development/sailorskills-repos/docs/session-reports/2025-11-02-insight-rename-completion.md
```

**Step 6: Commit completion report**

```bash
cd /Users/brian/app-development/sailorskills-repos
git add docs/session-reports/2025-11-02-insight-rename-completion.md
git commit -m "docs: add Dashboard → Insight rename completion report

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push
```

**Success Criteria:**
- ✅ All testing checklist items verified
- ✅ Completion report saved
- ✅ Follow-up items documented

---

## Phase 4: Cleanup and Final Steps (Optional - 15 minutes)

### Task 4.1: Rename Local Directory (Optional)

**Note:** This is optional - Git doesn't care about local directory names

**If desired:**

```bash
cd /Users/brian/app-development/sailorskills-repos
mv sailorskills-dashboard sailorskills-insight
cd sailorskills-insight
# Verify git still works
git status
git remote -v
```

### Task 4.2: Update Any External References

**Check for external references:**
- Bookmarks in browser
- Documentation in other repos
- Notion database (if using)
- Team communications
- Customer-facing documentation

---

## Rollback Plan

If critical issues occur during implementation:

### GitHub Rollback
```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-insight
gh repo rename sailorskills-dashboard
git remote set-url origin https://github.com/standardhuman/sailorskills-dashboard.git
```

### Shared Package Rollback
```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-shared
git revert [commit-hash]
git push origin main
```

### Vercel Rollback
- Revert to previous deployment via Vercel dashboard
- Or rename project back to original name

### Service Updates Rollback
```bash
# In each service
cd shared
git checkout [previous-commit-hash]
cd ..
git add shared
git commit -m "revert: rollback shared package"
git push
```

---

## Expected Outcomes

**After completion:**
- ✅ GitHub: `sailorskills-insight` repository with redirect from old URL
- ✅ Vercel: `sailorskills-insight` project deployed at new URL
- ✅ Navigation: All services show "INSIGHT" label and link to new URL
- ✅ Documentation: All references updated across roadmap, README, CLAUDE.md
- ✅ Services: All 7 services using updated shared package with new navigation
- ✅ Testing: All navigation links verified working
- ✅ Clean slate for Q1 2026 Strategic BI transformation

**Estimated Total Time:** 2-3 hours
- Phase 1: 20 minutes
- Phase 2: 60-90 minutes (parallel execution)
- Phase 3: 30-60 minutes
- Phase 4: 15 minutes (optional)
