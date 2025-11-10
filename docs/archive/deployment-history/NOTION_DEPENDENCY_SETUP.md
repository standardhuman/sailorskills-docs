# Notion Dependency & Timeline Setup Guide

This guide walks you through setting up dependency tracking and timeline visualization in your Notion roadmap database.

## Step 1: Add "Blocks" Property to Notion Database

1. **Open your Notion roadmap database:**
   https://notion.so/29fb82b7eacc80458c43c5949ef300c7

2. **Add new property:**
   - Click the "+" button in the property bar (or click on any column header → "+")
   - Name: `Blocks`
   - Type: `Text` (or `Rich text`)

Your database should now have these properties:
- Title
- Status
- Quarter
- Priority
- Service
- Start Date
- Due Date
- Dependencies (existing)
- **Blocks** (NEW)
- Completion %
- Notes

## Step 2: Understand Dependency vs. Blocks

**Dependencies** = What this task needs before it can start
- Example: "User Accounts & Audit Logging" depends on "None" (no prerequisites)

**Blocks** = What this task prevents from starting until complete
- Example: "User Accounts & Audit Logging" blocks "Strategic BI Dashboard, Referral Tracking, Service Start Notifications"

These are **inverse relationships**:
- If Task A blocks Task B → Task B depends on Task A
- They're two ways of viewing the same relationship

## Step 3: Run Dependency Sync

Once you've added the "Blocks" column:

```bash
npm run sync-roadmap
```

The script will:
- ✅ Parse dependency information from ROADMAP.md
- ✅ Extract "Blocks" relationships
- ✅ Auto-calculate Start/Due dates based on quarter (if not specified)
- ✅ Sync everything to Notion

## Step 4: Visualize in Timeline View

### Enable Timeline View

1. In your Notion database, click "+ Add a view"
2. Select "Timeline"
3. Name it "Timeline by Dependencies"

### Configure Timeline Settings

1. **Timeline by:** Start & End dates
   - Start date property: `Start Date`
   - End date property: `Due Date`

2. **Group by:** Quarter (to see quarterly layout)
   - Or don't group for continuous timeline

3. **Sort by:** Start Date (ascending)

4. **Color by:** Priority or Status
   - Priority: See critical tasks in red/orange
   - Status: See completed vs. pending

### What You'll See

- Task bars spanning from Start Date to Due Date
- Tasks grouped by Quarter
- Color-coded by Priority/Status
- Dependencies and Blocks shown in task details

## Step 5: Using the Timeline

### Reading Dependencies

Click any task to see:
- **Dependencies**: Tasks that must complete before this starts
- **Blocks**: Tasks that cannot start until this completes

### Identifying the Critical Path

Look for tasks with:
- Many items in "Blocks" field = bottleneck tasks
- Priority = "Critical" = must complete first
- Quarter = "Q1 2026" + many blocks = foundation tasks

**Example Critical Path (from analysis):**
```
Q1 2026:
User Accounts (4 weeks)
  ↓ blocks
├─ Strategic BI Dashboard
├─ Referral Tracking
├─ Service Start Notifications
└─ Ownership & Attribution (Q2)

Video Mobile (2 weeks)
  ↓ blocks
Billing Native Mobile (4 weeks)
  ↓ blocks
Operations Mobile (Q2, 5 weeks)
```

### Scheduling Tasks

1. **Tasks with no dependencies** can start immediately
   - Example: Dashboard rename, Billing PWA, Design System

2. **Tasks with dependencies** must wait
   - Check "Dependencies" field
   - Ensure prerequisite tasks complete first
   - Adjust Start Date based on dependency completion

3. **Blocked tasks** prevent others from starting
   - Check "Blocks" field
   - Prioritize if many tasks depend on it
   - Consider parallel work where possible

## Step 6: Filtering and Views

### Create Filtered Views

**View 1: "Ready to Start"**
- Filter: Status = "Not Started"
- Filter: Dependencies = "None" OR Dependencies = empty
- Shows tasks that can begin immediately

**View 2: "Blocked Tasks"**
- Filter: Status = "Not Started"
- Filter: Dependencies ≠ empty
- Shows tasks waiting on prerequisites

**View 3: "Critical Path"**
- Filter: Priority = "Critical"
- Sort: Start Date
- Shows must-complete-first tasks

**View 4: "Q1 2026 Foundation"**
- Filter: Quarter = "Q1 2026"
- Filter: Blocks ≠ empty
- Shows Q1 tasks that unlock future work

### Timeline View Options

1. **Zoom levels:**
   - Months: Best for quarterly planning
   - Weeks: Best for sprint planning
   - Days: Best for daily dispatch

2. **Color coding:**
   - By Priority: Highlights critical tasks
   - By Status: Shows progress
   - By Service: Groups by affected service

3. **Grouping:**
   - By Quarter: See quarterly milestones
   - By Priority: Focus on critical items first
   - By Status: Track in-progress vs. pending

## Step 7: Maintaining Dependencies

### When adding new tasks to ROADMAP.md:

```markdown
- [ ] **New Task Name**
  - **Priority:** High
  - **Dependencies:** User Accounts, Video Mobile
  - **Blocks:** Future Feature X, Settings Dashboard
  - **Estimated Effort:** 2 weeks
```

Then run:
```bash
npm run sync-roadmap
```

### Notion will automatically update:
- Dependencies field
- Blocks field
- Start/Due dates (if not specified)
- All other properties

## Understanding Limitations

### Notion API Limitations

❌ **Cannot create:** Visual dependency arrows between tasks
❌ **Cannot create:** Native "Dependency" property via API
❌ **Cannot auto-calculate:** Task start dates based on dependencies

✅ **Can create:** Text fields listing dependencies/blocks
✅ **Can create:** Start/End dates for timeline visualization
✅ **Can filter:** By dependency status
✅ **Can manually:** Adjust dates based on dependency completion

### Workaround: Manual Date Adjustment

When a dependency completes:
1. Find tasks that were blocked by it (check "Blocks" field on completed task)
2. Update their Start Date to begin after dependency
3. Or use formulas to auto-calculate (advanced)

### Future Enhancement: Notion Formulas

You could create a formula property:
```
Can Start =
  if(empty(prop("Dependencies")), "✅ Ready",
  "⏸️ Blocked")
```

This would show visual status without manual updates.

## Example Workflows

### Workflow 1: Starting Q1 2026

1. **Filter timeline:** Quarter = "Q1 2026"
2. **Identify foundation tasks:**
   - User Accounts (blocks 4 tasks)
   - Video Mobile (blocks 2 tasks)
   - Dev Branch Strategy (blocks 1 task)
3. **Start immediately:**
   - User Accounts (Week 1)
   - Video Mobile (Week 1)
   - Dev Branch Strategy (Week 1)
4. **Schedule dependent tasks:**
   - BI Dashboard starts Week 5 (after User Accounts)
   - Billing Mobile starts Week 3 (after Video Mobile)
   - Responsive Testing starts Week 3 (after Dev Branch)

### Workflow 2: Planning Q2 2026

1. **Check Q1 completion status**
2. **Find Q2 tasks blocked by Q1:**
   - Operations Mobile (blocked by Video & Billing Mobile)
   - Ownership Tracking (blocked by User Accounts + Referral Tracking)
   - Settings Dashboard (blocked by Ownership Tracking)
3. **Calculate earliest start dates:**
   - Operations Mobile: After Billing Mobile complete (late Q1)
   - Ownership Tracking: After User Accounts + Referral (early Q2)
   - Settings Dashboard: After Ownership Tracking (mid Q2)

### Workflow 3: Daily Planning

1. **View: "Ready to Start"** - Pick next task with no blockers
2. **Check "Blocks" field** - Prioritize tasks that unlock others
3. **Update Status** when starting/completing
4. **Sync to Notion** regularly with `npm run sync-roadmap`

## Troubleshooting

### Issue: Timeline shows all tasks at once

**Solution:** Group by Quarter or filter to current quarter

### Issue: Task bars overlap

**Solution:**
- Adjust Start/Due dates to be more specific
- Use Week or Day zoom level
- Tasks in same quarter with no dependencies can overlap (parallel work)

### Issue: Can't see dependencies visually

**Solution:**
- Notion API doesn't support visual dependency arrows
- Use Dependencies/Blocks text fields
- Color-code by Priority to highlight critical path
- Create multiple views (Blocked, Ready, Critical Path)

### Issue: Dates don't auto-update when dependency completes

**Solution:**
- This is expected (API limitation)
- Manually adjust dates or use Notion formulas
- Alternative: Use dedicated PM tool (Jira, Linear) for auto-calculated timelines

## Advanced: Notion Formulas for Smart Status

### Add "Can Start?" Formula Property

1. Add property: `Can Start?` (type: Formula)
2. Formula:
```
if(
  prop("Status") == "Completed",
  "✅ Done",
  if(
    empty(prop("Dependencies")) or prop("Dependencies") == "None",
    "🟢 Ready",
    "🔴 Blocked"
  )
)
```

3. This auto-calculates based on Dependencies field

### Add "Blocking Count" Formula

1. Add property: `Blocking Count` (type: Formula)
2. Formula:
```
if(
  empty(prop("Blocks")),
  0,
  length(split(prop("Blocks"), ","))
)
```

3. Shows how many tasks this blocks (higher = more critical)

### Add "Priority Score" Rollup

Combine Priority + Blocking Count for ultimate prioritization:

1. Create Number property: `Priority Score`
2. Formula:
```
if(prop("Priority") == "Critical", 10, 0) +
if(prop("Priority") == "High", 5, 0) +
if(prop("Priority") == "Medium", 2, 0) +
prop("Blocking Count") * 2
```

3. Sort by Priority Score descending = optimal task order

## Resources

- **Dependency Analysis:** See `ROADMAP_DEPENDENCY_ANALYSIS.md`
- **Sync Script:** `scripts/sync-notion-roadmap.mjs`
- **Sync Docs:** `NOTION_SYNC_README.md`

---

**Last Updated:** 2025-11-02
