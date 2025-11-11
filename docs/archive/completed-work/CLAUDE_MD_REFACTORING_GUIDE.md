# CLAUDE.md Refactoring Guide

This document tracks the refactoring of all CLAUDE.md files across projects to reduce redundancy and improve maintainability.

## Completed Tasks ✅

### Week 1 - Critical Fixes
1. ✅ **Removed credentials** from sailorskills-billing/CLAUDE.md
   - Replaced hardcoded credentials with 1Password reference
   - Added security-focused guidance

2. ✅ **Refactored mcp-googledocs-server/claude.md**
   - Reduced from 1041 lines to 151 lines
   - Moved full implementation code to `docs/implementation-guide.md`
   - Kept project-specific guidance only

3. ✅ **Deleted redundant sailorskills-site/CLAUDE.md**
   - File contained only 2 lines duplicated from global
   - Content now covered by global standards

### Week 2 - Infrastructure
4. ✅ **Expanded global ~/.claude/CLAUDE.md**
   - Grew from 2 lines to 289 lines
   - Comprehensive standards for all projects
   - Testing, security, git workflows, code quality

5. ✅ **Created SHARED_CLAUDE_SECTIONS.md**
   - Central reference for common patterns
   - Reduces duplication across 10+ project files
   - Covers: shared package, deployment, testing, troubleshooting

6. ✅ **Demonstrated deduplication pattern**
   - Refactored sailorskills-estimator as example
   - Reduced from 410 to 332 lines
   - Maintained all unique content, referenced common sections

---

## Remaining Tasks 📋

### Apply Deduplication Pattern to Remaining Files

Use the sailorskills-estimator pattern for these files:

| File | Current Lines | Target Lines | Priority |
|------|---------------|--------------|----------|
| sailorskills-inventory | 505 | ~350 | High |
| sailorskills-operations | 435 | ~300 | High |
| sailorskills-booking | 429 | ~300 | Medium |
| sailorskills-dashboard | 434 | ~250 | Medium |
| sailorskills-video | 203 | ~180 | Low |
| sailorskills-portal | 262 | ~220 | Medium |

### Deduplication Template

For each file, add this at the top (after tagline):

```markdown
> **Common Sections**: See [SHARED_CLAUDE_SECTIONS.md](../SHARED_CLAUDE_SECTIONS.md) for:
> - [Development Workflow](#development-workflow)
> - [Shared Package Setup](#shared-package-setup)
> - [Environment Variables](#environment-variables)
> - [Deployment Process](#deployment)
> - [Playwright Testing](#playwright-testing)
> - [Troubleshooting](#troubleshooting)
```

Then remove/replace these sections with references:
- **Development Workflow** → Reference shared doc
- **Shared Package** (git submodule commands) → Reference shared doc
- **Environment Variables** (generic Supabase/Stripe) → Reference shared doc, keep project-specific
- **Testing** (generic Playwright) → Reference shared doc, keep project-specific test cases
- **Troubleshooting** (generic Supabase/build errors) → Reference shared doc, keep project-specific issues

**Keep these sections** (project-unique):
- Product Overview
- Production URL
- Tech Stack (if unique)
- Key Features
- Project Structure
- Key Implementation Details
- Integration Points (what makes this service special)
- Project-Specific Testing (actual test scenarios)
- Project-Specific Troubleshooting (unique to this codebase)

---

## Content Review Checklist

For each file, verify:

- [ ] **URLs are current** (production, staging, demo)
- [ ] **Tech stack accurate** (versions, frameworks)
- [ ] **Commands work** (npm scripts, deployment)
- [ ] **Integration points valid** (other services still exist?)
- [ ] **Status indicators current** (compliance percentages, progress tracking)
- [ ] **No stale TODOs** (planned features that shipped)
- [ ] **No obsolete features** (deprecated functionality)

### Files with Likely Stale Information

1. **sailorskills-booking** - Line 29: "Progress: 5/10 phases complete (50%)" - Check if still accurate
2. **sailorskills-dashboard** - Lots of "Planned" content - Update with actuals
3. **sailorskills-operations** - "Notion Migration" section - Is this complete?
4. **sailorskills-portal** - Database testing examples - Verify paths/commands work

---

## Standardization Patterns

### File Structure Standard

```markdown
# [Service Name]

**Tagline:** "[one-liner]"

> **Common Sections**: [References to shared docs]

---

## Product Overview
[Unique purpose and role in suite]

## Production Deployment
- URL, platform, auto-deploy info

## Tech Stack
[Only if unique/different from standard]

## Key Features
[Bullet list of unique features]

## Project Structure
[Directory tree with annotations]

## Development Commands
[Only project-specific commands]

## Key Implementation Details
[Architecture, patterns, gotchas]

## [Service]-Specific Integration Details
[Unique APIs, webhooks, data flows]

## Integration Points
[Connections to other services]

## Project-Specific Testing
[Actual test scenarios and critical paths]

## Troubleshooting (Project-Specific)
[Unique problems and solutions]

## Design System Compliance
[Status and next steps if applicable]

## Related Services
[Links to related projects]

## Development Guidelines
[Project-specific best practices]

---

**Last Updated:** [Date]
**Part of the Sailor Skills suite**
```

---

## Size Guidelines

After refactoring:

- **Simple services**: 150-250 lines (e.g., Dashboard, Site)
- **Medium complexity**: 250-350 lines (e.g., Inventory, Booking)
- **Complex services**: 350-450 lines (e.g., Operations, Estimator)
- **Strategic/Meta**: 100-300 lines (e.g., repos parent, business)
- **MCP/Tools**: 100-200 lines (e.g., mcp-googledocs-server)

Target reduction: **20-30% on average** through deduplication.

---

## Automated Checks

### Check for Redundancy

```bash
# Find files with common sections (candidates for deduplication)
grep -r "## Development Workflow" sailorskills-repos/*/CLAUDE.md
grep -r "## Shared Package" sailorskills-repos/*/CLAUDE.md
grep -r "git submodule update --init" sailorskills-repos/*/CLAUDE.md
grep -r "Always test with Playwright" sailorskills-repos/*/CLAUDE.md
```

### Check for Credentials

```bash
# Ensure no credentials in CLAUDE.md files
grep -r "password" sailorskills-repos/*/CLAUDE.md
grep -r "@gmail.com" sailorskills-repos/*/CLAUDE.md
grep -r "KLR" sailorskills-repos/*/CLAUDE.md
```

### Check File Sizes

```bash
# Find files over 400 lines (deduplication candidates)
find sailorskills-repos -name "CLAUDE.md" -exec wc -l {} \; | sort -rn
```

---

## Metrics

### Before Refactoring
- **Total files**: 13
- **Total lines**: ~4,500
- **Redundant content**: ~40%
- **Security issues**: 1 (credentials in billing)
- **Oversized files**: 1 (mcp-googledocs: 1041 lines)

### After Refactoring (Target)
- **Total files**: 12 (1 deleted)
- **Total lines**: ~3,200 (29% reduction)
- **Redundant content**: <10%
- **Security issues**: 0
- **Oversized files**: 0 (all under 500 lines)
- **Global standards**: 289 lines
- **Shared sections**: 480 lines

---

## Maintenance Schedule

### Monthly
- Review production URLs (ensure accurate)
- Update "Last Updated" dates
- Check for new redundant patterns

### Quarterly
- Review global standards relevance
- Update shared sections based on new patterns
- Audit all files for accuracy
- Update size metrics

### When Needed
- New project: Use template
- Architecture change: Update affected files
- New pattern across 3+ projects: Add to shared sections
- Deprecated feature: Remove from all files

---

## Next Steps (For Future Updates)

1. **Apply pattern to remaining 6 files** (see table above)
2. **Review stale content** (URLs, status, progress indicators)
3. **Run automated checks** (credentials, redundancy, sizes)
4. **Create git commits** for each refactored file
5. **Update this guide** with completion status

---

**Created:** 2025-10-29
**Owner:** Brian
**Status:** Phase 1 Complete (Week 1-2 done, Week 3 documented)
