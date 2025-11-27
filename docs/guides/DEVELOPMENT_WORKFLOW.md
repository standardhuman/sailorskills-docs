# Sailorskills Development Workflow

**Last Updated:** 2025-11-27

---

## Repository Architecture

### Two-Repo System (SIMPLIFIED)

#### 1. Documentation Repo: `sailorskills-docs`
- **GitHub:** https://github.com/standardhuman/sailorskills-docs
- **Local Path:** `/Users/brian/app-development/sailorskills-repos/`
- **Purpose:** Cross-service documentation, planning, handoffs, database scripts
- **Contains:**
  - ROADMAP.md
  - CLAUDE.md
  - Migration scripts
  - Session handoffs
  - Database documentation

#### 2. Service Repos (One per service)
Each service is a separate GitHub repository:

| Service | GitHub Repo | Local Path | Vercel URL |
|---------|-------------|------------|------------|
| Settings | standardhuman/sailorskills-settings | `/sailorskills-repos/sailorskills-settings/` | sailorskills-settings.vercel.app |
| Operations | standardhuman/sailorskills-operations | `/sailorskills-repos/sailorskills-operations/` | sailorskills-operations.vercel.app |
| Billing | standardhuman/sailorskills-billing | `/sailorskills-repos/sailorskills-billing/` | sailorskills-billing.vercel.app |
| Estimator | standardhuman/sailorskills-estimator | `/sailorskills-repos/sailorskills-estimator/` | sailorskills-estimator.vercel.app |
| *(+8 more services)* | | | |

---

## Development Workflow

### For Service Code Changes

**✅ DO THIS:**
```bash
# 1. Navigate to the service directory
cd /Users/brian/app-development/sailorskills-repos/sailorskills-settings

# 2. Make your changes
vim src/views/dashboard.html

# 3. Test locally
npm run dev

# 4. Commit and push
git add .
git commit -m "feat: add navigation"
git push origin main

# 5. Vercel auto-deploys from this push
```

**❌ DON'T DO THIS:**
```bash
# Don't commit from parent directory
cd /Users/brian/app-development/sailorskills-repos
git add sailorskills-settings/  # ❌ This commits to docs repo, not service repo
```

### For Documentation Changes

```bash
# Navigate to docs repo root
cd /Users/brian/app-development/sailorskills-repos/

# Edit documentation
vim ROADMAP.md

# Commit to docs repo
git add ROADMAP.md
git commit -m "docs: update roadmap"
git push origin main
```

---

## Vercel Deployment

Each service deploys from its own GitHub repo:

1. **Git Integration:** Each service repo is linked to a Vercel project
2. **Auto-Deploy:** Pushing to `main` triggers deployment
3. **Configuration:** Each service has `vercel.json` in its root

**Example for Settings:**
- Repo: https://github.com/standardhuman/sailorskills-settings
- Vercel Project: `sailorskills/sailorskills-settings`
- Domain: https://sailorskills-settings.vercel.app

---

## Common Tasks

### Adding a Feature to Settings

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-settings
git checkout -b feature/my-feature
# Make changes
npm run dev  # Test
git add .
git commit -m "feat: add my feature"
git push origin feature/my-feature
# Create PR on GitHub
# Merge to main
# Vercel auto-deploys
```

### Updating Shared Package

The shared package is a submodule in each service:

```bash
cd /Users/brian/app-development/sailorskills-repos/sailorskills-settings
cd shared
git pull origin main
cd ..
git add shared
git commit -m "chore: update shared package"
git push origin main
```

### Cross-Service Changes

If a change affects multiple services:

1. Update each service repo separately
2. Document the cross-service change in sailorskills-docs:
```bash
cd /Users/brian/app-development/sailorskills-repos/
vim MIGRATION_SUMMARY.md
git add MIGRATION_SUMMARY.md
git commit -m "docs: document navigation changes across services"
git push origin main
```

---

## Directory Structure

```
/Users/brian/app-development/sailorskills-repos/
├── .git/                          # sailorskills-docs repo
├── README.md                      # project overview
├── CLAUDE.md                      # AI agent instructions
├── ROADMAP.md                     # current roadmap
├── docs/                          # organized documentation
│   ├── guides/                   # development guides
│   ├── architecture/             # system design
│   ├── setup/                    # deployment config
│   └── archive/                  # historical docs
├── sailorskills-settings/         # separate repo (settings)
│   ├── .git/                     # settings repo
│   ├── src/
│   ├── vercel.json
│   └── package.json
├── sailorskills-billing/          # separate repo (billing)
│   ├── .git/                     # billing repo
│   └── ...
└── (12 more service repos...)
```

---

## Troubleshooting

### "Changes not deploying to Vercel"

**Check:**
1. Did you commit from within the **service directory** (not the parent)?
2. Did you push to GitHub?
3. Check Vercel dashboard for build logs

**Fix:**
```bash
# Make sure you're in the service directory
cd /Users/brian/app-development/sailorskills-repos/sailorskills-settings
git log -1  # Verify your commit is here
git push origin main  # Push to trigger deployment
```

### "Which repo am I in?"

```bash
git remote -v
# Look for the URL:
# - sailorskills-docs = documentation repo
# - sailorskills-settings = Settings service repo
```

---

## Quick Reference

| Task | Command |
|------|---------|
| Develop Settings | `cd /Users/brian/app-development/sailorskills-repos/sailorskills-settings` |
| Update docs | `cd /Users/brian/app-development/sailorskills-repos` |
| Check which repo | `git remote -v` |
| Deploy Settings | `git push origin main` (in Settings dir) |
| Update shared package | `cd shared && git pull && cd .. && git add shared && git commit && git push` |

---

**Remember:** Each service is its own git repo. Develop and deploy from the service directory.
