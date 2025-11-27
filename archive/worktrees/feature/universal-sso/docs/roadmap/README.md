# Roadmap Documentation Structure

This directory contains the detailed quarterly roadmap files for the Sailorskills suite.

## File Structure

```
ROADMAP.md                                    # High-level summary (current + next quarter)
docs/roadmap/
  ├── README.md                              # This file
  ├── 2025-Q4-ACTIVE.md                      # Detailed Q4 2025 tasks
  ├── 2026-Q1-ACTIVE.md                      # Detailed Q1 2026 tasks
  ├── 2026-Q2-PLANNED.md                     # Q2 2026 and beyond planning
  └── archive/
      └── BACKLOG_AND_COMPLETED.md           # Backlog and historical items
```

## Why This Structure?

The original ROADMAP.md grew to 26,670 tokens (1,609 lines), exceeding Claude's read limit. This hierarchical structure:

- **Keeps summary readable:** ROADMAP.md is now ~300 lines, well under token limits
- **Maintains detail:** Full specifications preserved in quarterly files
- **Improves navigation:** Easy to find current vs. future quarter tasks
- **Archives history:** Completed items don't clutter active roadmap

## How to Use

### For Quick Context
Read `ROADMAP.md` (2-minute read) for:
- Current quarter top priorities
- Next quarter overview
- Progress dashboard
- Quick reference links

### For Detailed Planning
Read quarterly files for:
- Complete task specifications
- Implementation details
- Dependencies and blockers
- Estimated effort and timelines

### For Development Work
1. Check `ROADMAP.md` for current priorities
2. Click link to detailed quarterly file
3. Find your task with full specifications
4. Check dependencies and blockers
5. Update task progress in detailed file

## Updating the Roadmap

### Adding New Tasks
1. **Determine quarter:** Q4 2025 (current), Q1 2026 (next), Q2+ (future)
2. **Add to detailed file:** Edit appropriate quarterly file
3. **Update summary:** Reflect in `ROADMAP.md` if high priority
4. **Sync to Notion:** Run `npm run sync-roadmap`

### Marking Tasks Complete
1. **Update detailed file:** Change `[ ]` to `[x]` and add completion date
2. **Update summary:** Reflect in `ROADMAP.md` Progress Dashboard
3. **Sync to Notion:** Run `npm run sync-roadmap`

### Moving to Next Quarter
1. **Archive current:** Move completed Q4 tasks to archive file
2. **Promote next:** Q1 becomes current quarter in summary
3. **Update dates:** Adjust quarterly date ranges
4. **Sync:** Run `npm run sync-roadmap`

## npm Scripts

### Roadmap Queries
```bash
npm run roadmap status              # Show completion status by quarter
npm run roadmap search "keyword"    # Search all tasks
npm run roadmap quarter Q1          # Show specific quarter tasks
npm run roadmap list                # List all tasks
```

### Notion Sync
```bash
npm run sync-roadmap               # Sync all quarterly files to Notion
```

## File Format

Each quarterly file follows this structure:

```markdown
# Q4 2025 - Current Quarter (Detailed)

**Status:** Active
**Period:** October - December 2025
**Focus:** [One-line summary]

For high-level summary, see [main ROADMAP.md](../../ROADMAP.md)

---

## Section Name
- [ ] **Task Name**
  - **Rationale:** Why this task matters
  - **Priority:** Critical|High|Medium|Low
  - **Estimated Effort:** Time estimate
  - **Dependencies:** What must complete first
  - **Blocks:** What this blocks
  - **Impact:** Services/areas affected
  - **Tasks:**
    - Subtask 1
    - Subtask 2
```

## Best Practices

### DO:
- ✅ Keep `ROADMAP.md` summary concise (under 500 lines)
- ✅ Add full details to quarterly files
- ✅ Link between files for navigation
- ✅ Run `npm run sync-roadmap` after updates
- ✅ Archive completed tasks to keep files manageable

### DON'T:
- ❌ Duplicate content between summary and detailed files
- ❌ Let quarterly files grow beyond 1,000 lines
- ❌ Skip syncing to Notion (loses visualization)
- ❌ Delete old quarterly files (move to archive)

## Token Budget

| File | Lines | Tokens (est) | Status |
|------|-------|--------------|--------|
| ROADMAP.md | ~300 | ~4,000 | ✅ Under limit |
| 2025-Q4-ACTIVE.md | ~350 | ~6,000 | ✅ Under limit |
| 2026-Q1-ACTIVE.md | ~1,000 | ~18,000 | ✅ Under limit |
| 2026-Q2-PLANNED.md | ~250 | ~4,000 | ✅ Under limit |
| Archive | varies | N/A | Rarely read |

**Total:** All files individually readable by Claude Code.

## Questions?

- **Where to add urgent task?** Add to appropriate quarterly file and mark priority "Critical"
- **Quarter is full?** Move lower priority items to next quarter or backlog
- **Need new quarter?** Copy template from existing quarterly file
- **Archive overflow?** Split archive by year (2025-COMPLETED.md, 2026-COMPLETED.md)

---

**Maintained by:** Project Manager (Claude Code)
**Last Updated:** 2025-11-02
**Review Schedule:** At start of each quarter
