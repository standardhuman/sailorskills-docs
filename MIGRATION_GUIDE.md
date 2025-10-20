# Service Architecture Migration Guide

**Status**: ✅ **COMPLETED** (2025-10-12)

This guide provided step-by-step instructions for the service reorganization. All steps have been successfully completed.

---

## ✅ Completion Summary

All migration steps have been completed:

1. ✅ Update shared package (COMPLETED)
2. ✅ Rename GitHub repositories (COMPLETED)
3. ✅ Update Vercel projects (COMPLETED)
4. ✅ Update local directory names (COMPLETED)
5. ✅ Test deployments (COMPLETED)
6. ✅ Update DNS/custom domains (portal.sailorskills.com maintained)

**See `SERVICE_REORGANIZATION_PROGRESS.md` for detailed completion report.**

---

## Original Guide (For Reference)

---

## Step 1: Rename GitHub Repositories

### 1.1 Rename sailorskills-admin → sailorskills-dashboard

**Via GitHub Web Interface:**
1. Go to https://github.com/standardhuman/sailorskills-admin
2. Click **Settings** tab
3. Scroll to **Repository name** section
4. Change name to: `sailorskills-dashboard`
5. Click **Rename**
6. GitHub will automatically redirect old URLs

**Via GitHub CLI:**
```bash
gh repo rename sailorskills-dashboard --repo standardhuman/sailorskills-admin
```

### 1.2 Rename sailorskills-portal → sailorskills-operations

**Via GitHub Web Interface:**
1. Go to https://github.com/standardhuman/sailorskills-portal
2. Click **Settings** tab
3. Scroll to **Repository name** section
4. Change name to: `sailorskills-operations`
5. Click **Rename**

**Via GitHub CLI:**
```bash
gh repo rename sailorskills-operations --repo standardhuman/sailorskills-portal
```

### 1.3 Archive sailorskills-schedule (Optional - if merging into operations)

**Via GitHub Web Interface:**
1. Go to https://github.com/standardhuman/sailorskills-schedule
2. Click **Settings** tab
3. Scroll to **Danger Zone** section
4. Click **Archive this repository**
5. Confirm the action

**Note:** Add a README note explaining it's been merged into sailorskills-operations

---

## Step 2: Update Vercel Projects

### 2.1 Rename Vercel Project: admin → dashboard

**Via Vercel Dashboard:**
1. Go to https://vercel.com/brians-projects-bc2d3592/sailorskills-admin
2. Click **Settings** tab
3. Click **General** in left sidebar
4. Under **Project Name**, change to: `sailorskills-dashboard`
5. Click **Save**
6. Vercel will automatically update deployment URL to: `sailorskills-dashboard.vercel.app`

**Via Vercel CLI:**
```bash
cd sailorskills-admin
vercel link --project=sailorskills-dashboard
```

### 2.2 Rename Vercel Project: portal → operations

**Via Vercel Dashboard:**
1. Go to https://vercel.com/brians-projects-bc2d3592/sailorskills-portal
2. Click **Settings** tab
3. Click **General** in left sidebar
4. Under **Project Name**, change to: `sailorskills-operations`
5. Click **Save**
6. Vercel will automatically update deployment URL to: `sailorskills-operations.vercel.app`

**Via Vercel CLI:**
```bash
cd sailorskills-portal
vercel link --project=sailorskills-operations
```

### 2.3 Update GitHub Integration

After renaming GitHub repositories, update Vercel's GitHub connection:

1. In Vercel project settings, go to **Git**
2. Click **Disconnect** (if needed)
3. Click **Connect Git Repository**
4. Select the newly renamed repository
5. Vercel will automatically deploy from the renamed repo

---

## Step 3: Update Local Directory Names

### 3.1 Rename Local Directories

**Option A: Rename in place (keeps git history)**
```bash
cd /Users/brian/app-development/sailorskills-repos

# Rename admin → dashboard
mv sailorskills-admin sailorskills-dashboard
cd sailorskills-dashboard
git remote set-url origin https://github.com/standardhuman/sailorskills-dashboard.git
git fetch
cd ..

# Rename portal → operations
mv sailorskills-portal sailorskills-operations
cd sailorskills-operations
git remote set-url origin https://github.com/standardhuman/sailorskills-operations.git
git fetch
cd ..
```

**Option B: Fresh clone (recommended for clean slate)**
```bash
cd /Users/brian/app-development/sailorskills-repos

# Backup old directories
mv sailorskills-admin sailorskills-admin.old
mv sailorskills-portal sailorskills-portal.old

# Clone with new names
git clone https://github.com/standardhuman/sailorskills-dashboard.git
git clone https://github.com/standardhuman/sailorskills-operations.git

# Copy any uncommitted changes if needed
# Then delete old directories
rm -rf sailorskills-admin.old
rm -rf sailorskills-portal.old
```

---

## Step 4: Update Git Remote URLs in All Repos

If you kept the old directories and just renamed them, update remotes:

```bash
# Dashboard (was admin)
cd /Users/brian/app-development/sailorskills-repos/sailorskills-dashboard
git remote set-url origin https://github.com/standardhuman/sailorskills-dashboard.git

# Operations (was portal)
cd /Users/brian/app-development/sailorskills-repos/sailorskills-operations
git remote set-url origin https://github.com/standardhuman/sailorskills-operations.git

# Verify changes
git remote -v
```

---

## Step 5: Test Deployments

### 5.1 Test Dashboard Deployment

```bash
cd sailorskills-dashboard
git pull origin main
# Make a small change to trigger deploy
echo "# Test deployment" >> README.md
git add README.md
git commit -m "Test: Verify deployment after rename"
git push origin main
```

Then check:
- https://sailorskills-dashboard.vercel.app - should show updated README
- Old URL (sailorskills-admin.vercel.app) - should redirect or show 404

### 5.2 Test Operations Deployment

```bash
cd sailorskills-operations
git pull origin main
# Make a small change to trigger deploy
echo "# Test deployment" >> README.md
git add README.md
git commit -m "Test: Verify deployment after rename"
git push origin main
```

Then check:
- https://sailorskills-operations.vercel.app - should show updated README
- Old URL (sailorskills-portal.vercel.app) - should redirect or show 404

---

## Step 6: Update Shared Package References

The shared package has already been updated with new service URLs. Now push those changes:

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-shared

# Verify changes
git status
git diff

# Commit changes
git add src/config/constants.js src/ui/navigation.js
git commit -m "Update service URLs and navigation for renamed services

- Rename Admin → Dashboard
- Rename Portal → Operations
- Add Customers service
- Update internal navigation
- Add legacy aliases for backwards compatibility"

# Push to GitHub
git push origin main
```

---

## Step 7: Update Submodules in All Services

Each service that uses the shared package as a submodule needs to pull the latest:

```bash
# Dashboard
cd sailorskills-dashboard
git submodule update --remote shared
git add shared
git commit -m "Update shared package with new service URLs"
git push origin main

# Billing
cd ../sailorskills-billing
git submodule update --remote shared
git add shared
git commit -m "Update shared package with new service URLs"
git push origin main

# Operations
cd ../sailorskills-operations
git submodule update --remote shared
git add shared
git commit -m "Update shared package with new service URLs"
git push origin main

# Inventory
cd ../sailorskills-inventory
git submodule update --remote shared
git add shared
git commit -m "Update shared package with new service URLs"
git push origin main

# Estimator
cd ../sailorskills-estimator
git submodule update --remote shared
git add shared
git commit -m "Update shared package with new service URLs"
git push origin main

# Video
cd ../sailorskills-video
git submodule update --remote shared
git add shared
git commit -m "Update shared package with new service URLs"
git push origin main

# Schedule (if keeping separate)
cd ../sailorskills-schedule
git submodule update --remote shared
git add shared
git commit -m "Update shared package with new service URLs"
git push origin main
```

---

## Step 8: Verify Navigation Works

After all deployments are complete:

1. Visit https://sailorskills-dashboard.vercel.app
2. Check that navigation bar shows: DASHBOARD | BILLING | OPERATIONS | INVENTORY | VIDEO | ESTIMATOR
3. Click each link to verify they go to the correct service
4. Verify "DASHBOARD" is highlighted/active on the dashboard page

Repeat for each service to ensure navigation is consistent.

---

## Step 9: Update DNS/Custom Domains (If Applicable)

If you have custom domains:

1. Go to Vercel project settings
2. Click **Domains** tab
3. Update any custom domain mappings:
   - `admin.sailorskills.com` → redirect to `dashboard.sailorskills.com`
   - `portal.sailorskills.com` → redirect to `operations.sailorskills.com`

---

## Step 10: Create New Customers Service (Later)

When ready to create the customer portal:

```bash
cd /Users/brian/app-development/sailorskills-repos

# Create new repository on GitHub first
gh repo create standardhuman/sailorskills-customers --public --description "Customer-facing service history portal"

# Clone locally
git clone https://github.com/standardhuman/sailorskills-customers.git
cd sailorskills-customers

# Initialize with shared submodule
git submodule add https://github.com/standardhuman/sailorskills-shared.git shared

# Create initial structure
mkdir -p src/{components,views,api} css js
touch index.html README.md .env.example

# Deploy to Vercel
vercel link --project=sailorskills-customers
vercel --prod
```

---

## Rollback Plan (If Needed)

If something goes wrong:

### Rollback GitHub Repository Names
1. Go to repository settings
2. Rename back to original name
3. Update local remotes: `git remote set-url origin <old-url>`

### Rollback Vercel Project Names
1. Go to Vercel project settings
2. Rename back to original name
3. Redeploy if needed

### Rollback Shared Package
```bash
cd sailorskills-shared
git log  # Find commit hash before changes
git revert <commit-hash>
git push origin main
```

---

## ✅ Completed Checklist

All migration tasks have been completed:

- [x] Rename GitHub repo: sailorskills-admin → sailorskills-dashboard
- [x] Rename GitHub repo: sailorskills-portal → sailorskills-operations
- [ ] Archive GitHub repo: sailorskills-schedule (deferred - to be archived after migration)
- [x] Rename Vercel project: admin → dashboard
- [x] Rename Vercel project: portal → operations
- [x] Update local directory: sailorskills-admin → sailorskills-dashboard
- [x] Update local directory: sailorskills-portal → sailorskills-operations
- [x] Update git remote URLs in renamed directories
- [x] Push shared package changes (commit: `f0f36f3`)
- [x] Update shared submodule in all services:
  - [x] sailorskills-dashboard (commit: `d194b7a`)
  - [x] sailorskills-operations (commit: `ba353b2`)
  - [x] sailorskills-inventory (commit: `2fab3ec`)
  - [x] sailorskills-estimator (commit: `052c6ab`)
  - [x] sailorskills-schedule (commit: `2f1bbe2`)
  - [x] sailorskills-billing (no submodule)
  - [x] sailorskills-video (no submodule)
- [x] Test dashboard deployment (https://sailorskills-dashboard.vercel.app)
- [x] Test operations deployment (https://sailorskills-operations.vercel.app)
- [x] Verify navigation works across all services
- [x] Update DNS/custom domains (portal.sailorskills.com maintained)
- [x] Update CLAUDE.md files (Dashboard & Operations)
- [x] Update documentation (SERVICE_REORGANIZATION_PROGRESS.md)

---

## Expected Timeline

- **GitHub renames**: 5 minutes
- **Vercel updates**: 10 minutes
- **Local directory updates**: 5 minutes
- **Shared package push**: 5 minutes
- **Submodule updates**: 15 minutes (7 repos)
- **Testing**: 15 minutes
- **Total**: ~55 minutes

---

## Support

If you encounter issues:

1. Check GitHub repository redirects are working
2. Verify Vercel deployments succeeded
3. Check browser console for navigation errors
4. Verify environment variables are still set in Vercel
5. Check git remote URLs are correct: `git remote -v`

---

**After completing this guide, your service architecture will be fully reorganized and all URLs will be updated.**
