# Notion Roadmap Sync

Automatically sync your ROADMAP.md to Notion for visual project management.

## Quick Start

```bash
npm run sync-roadmap
```

## What It Does

The sync script:
- ✅ Parses ROADMAP.md and extracts all tasks
- ✅ Creates new tasks in Notion database
- ✅ Updates existing tasks (based on title matching)
- ✅ Syncs all properties: Status, Quarter, Priority, Service, Dates, Dependencies, Notes
- ✅ Preserves completed dates and task status
- ✅ Rate-limited to respect Notion API limits

## Configuration

Environment variables are stored in `.env`:

```bash
NOTION_TOKEN=ntn_your_token_here
NOTION_DATABASE_ID=your_database_id_here
```

## Workflow

### 1. Edit Roadmap
Make changes to `ROADMAP.md` as usual:

```markdown
## Q1 2026

### New Feature
- [ ] **Implement User Dashboard**
  - **Priority:** High
  - **Impact:** Portal, Dashboard
  - **Estimated Effort:** 2 weeks
```

### 2. Sync to Notion
Run the sync script:

```bash
npm run sync-roadmap
```

### 3. View in Notion
Your database will be updated with:
- Timeline view (Gantt-style calendar)
- Kanban boards (by Status or Quarter)
- All task properties synced

## Sync Behavior

### Creates New Tasks
If a task title doesn't exist in Notion, it creates a new page.

### Updates Existing Tasks
If a task title matches an existing page, it updates all properties:
- Status
- Quarter
- Priority
- Service
- Start Date / Due Date
- Dependencies
- Completion %
- Notes

### What Gets Synced

**From ROADMAP.md:**
```markdown
- [x] **Task Title**
  - **Completed:** 2025-10-25
  - **Priority:** High
  - **Impact:** Billing, Portal
  - **Dependencies:** Task A, Task B
  - **Rationale:** Why this matters
```

**To Notion properties:**
- Title: "Task Title"
- Status: "Completed"
- Quarter: (extracted from section)
- Priority: "High"
- Service: "Billing, Portal"
- Due Date: 2025-10-25
- Dependencies: "Task A, Task B"
- Completion %: 100
- Notes: "Why this matters"

## Parsing Rules

### Quarters
Extracted from headers:
```markdown
## Q4 2025 - Current Quarter  → "Q4 2025"
## Q1 2026                      → "Q1 2026"
```

### Status
- `[ ]` → "Not Started"
- `[x]` → "Completed"
- If **Completed:** date exists → "Completed"

### Priority
Default: "Medium"
Override with: `**Priority:** High`

### Services
Auto-detected from **Impact:** line:
```markdown
**Impact:** Portal, Billing → Service: "Portal, Billing"
```

Keywords recognized:
- billing, portal, dashboard, operations
- estimator, inventory, booking, video
- shared, all services, cross-service

### Dates
- **Completed:** date → Due Date
- **Estimated Effort:** text → Added to Notes

## Example Sync Output

```
🚀 Starting Notion roadmap sync...

📖 Parsing ROADMAP.md...
   Found 25 tasks

🔍 Fetching existing Notion pages...
   Found 36 existing pages

🔄 Syncing tasks...

   ➕ Created: New Feature Implementation
   ✏️  Updated: Existing Task Name
   ✏️  Updated: Another Task

✅ Sync complete!

Summary:
  Created: 15
  Updated: 10
  Skipped: 0
  Total:   25

🔗 View your roadmap:
   https://notion.so/29fb82b7eacc80458c43c5949ef300c7
```

## Troubleshooting

### "NOTION_TOKEN not set"
Make sure `.env` file exists in the root directory with your Notion token.

### "Validation error"
Property type mismatch. Check that your Notion database has the correct property types:
- Title: Title field
- Status: Select (Not Started, In Progress, Completed, Blocked)
- Quarter: Select (Q4 2025, Q1 2026, Q2 2026, etc.)
- Priority: Select (Critical, High, Medium, Low)
- Service: Rich text
- Start Date: Date
- Due Date: Date
- Dependencies: Rich text
- Completion %: Number
- Notes: Rich text

### Tasks Not Updating
The script matches tasks by **exact title**. Make sure titles in ROADMAP.md match existing Notion page titles.

### Rate Limiting
The script includes a 350ms delay between API calls to respect Notion's rate limit (3 requests/second).

## Database Setup

Your Notion database should have these properties:

| Property | Type | Options |
|----------|------|---------|
| Title | Title | - |
| Status | Select | Not Started, In Progress, Completed, Blocked |
| Quarter | Select | Q4 2025, Q1 2026, Q2 2026, Q3 2026, Future, Backlog |
| Priority | Select | Critical, High, Medium, Low |
| Service | Rich text | - |
| Start Date | Date | - |
| Due Date | Date | - |
| Dependencies | Rich text | - |
| Completion % | Number | - |
| Notes | Rich text | - |

## Best Practices

### 1. Keep ROADMAP.md as Source of Truth
Always edit the roadmap in ROADMAP.md, then sync to Notion. Don't edit in Notion (changes will be overwritten).

### 2. Sync Regularly
Run sync after any roadmap changes:
```bash
npm run sync-roadmap
```

### 3. Use Consistent Task Titles
Task titles are used for matching. Don't rename tasks in Notion or ROADMAP.md unless you want to create a duplicate.

### 4. Leverage Notion Views
After syncing, use Notion's views:
- **Timeline view**: See task scheduling across quarters
- **Kanban by Status**: Track workflow progress
- **Kanban by Quarter**: Plan quarterly objectives
- **Table view**: Bulk edit properties

## Script Location

`scripts/sync-notion-roadmap.mjs`

## Integration Token Setup

If you need to regenerate the integration:

1. Go to https://www.notion.so/my-integrations
2. Create new integration: "Sailorskills Roadmap Sync"
3. Copy the Internal Integration Token
4. Update `.env` file with new token
5. Share your roadmap database with the integration:
   - Open database in Notion
   - Click "..." menu → "Connections"
   - Add your integration

## Future Enhancements

Potential improvements:
- Bi-directional sync (Notion → ROADMAP.md)
- Archive completed tasks
- Slack notifications on roadmap changes
- Automated sync via GitHub Actions
- Task dependency validation
- Gantt chart PDF export

---

**Created:** 2025-11-02
**Last Updated:** 2025-11-02
