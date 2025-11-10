# Sailorskills Roadmap - Notion Setup Guide

**Date:** 2025-11-02
**Purpose:** Create a visual roadmap in Notion with Timeline and Kanban views

---

## Quick Start - Two Options

### Option A: Automated Setup via Claude Desktop (Recommended)

1. **Open Claude Desktop** (not Claude Code CLI)
2. **Start a new conversation** and say:
   ```
   Connect to my Notion workspace and help me create a roadmap database
   with the data from /Users/brian/app-development/sailorskills-repos/notion-roadmap-import.csv
   ```
3. **Authenticate** when prompted (browser OAuth flow)
4. **Let Claude create** the database and populate it automatically
5. **Claude will set up** Timeline and Kanban views for you

### Option B: Manual Setup (If automated fails)

Follow the detailed steps below to create the database manually.

---

## Manual Setup Instructions

### Step 1: Create New Database in Notion

1. Open Notion (https://notion.so)
2. Log in with: standardhuman@gmail.com / KLRss!650
3. Navigate to your workspace
4. Click **"New page"** in the sidebar
5. Name it: **"Sailorskills Roadmap"**
6. Type `/table` and select **"Table - Full Page"**
7. Click **"New database"**

### Step 2: Configure Database Properties

Your database needs these properties (columns):

| Property Name | Type | Options |
|--------------|------|---------|
| **Title** | Title | (default, already exists) |
| **Status** | Select | Not Started, In Progress, Completed, Blocked |
| **Quarter** | Select | Q4 2025, Q1 2026, Q2 2026, Q3 2026, Backlog |
| **Priority** | Select | Critical, High, Medium, Low |
| **Service** | Multi-select | Billing, Portal, Dashboard, Operations, Estimator, Inventory, Booking, Video, Shared, Site, All Services |
| **Start Date** | Date | (empty for most items) |
| **Due Date** | Date | (empty for most items) |
| **Dependencies** | Text | (track task dependencies) |
| **Completion %** | Number | (0-100) |
| **Notes** | Text | (additional context) |

**How to add each property:**

1. Click the **"+"** button at the right edge of the table header
2. Select the property type from the dropdown
3. Name the property
4. For Select/Multi-select types, add the options listed above

**Color coding recommendations:**
- **Status:**
  - Not Started → Gray
  - In Progress → Blue
  - Completed → Green
  - Blocked → Red
- **Priority:**
  - Critical → Red
  - High → Orange
  - Medium → Yellow
  - Low → Gray
- **Quarter:**
  - Q4 2025 → Purple
  - Q1 2026 → Blue
  - Q2 2026 → Green
  - Q3 2026 → Yellow
  - Backlog → Gray

### Step 3: Import Data from CSV

1. **Download the CSV file:** `/Users/brian/app-development/sailorskills-repos/notion-roadmap-import.csv`
2. In your new Notion database, click the **"⋯"** menu (top right)
3. Select **"Merge with CSV"**
4. Upload the `notion-roadmap-import.csv` file
5. **Map columns:**
   - CSV "Title" → Notion "Title"
   - CSV "Status" → Notion "Status"
   - CSV "Quarter" → Notion "Quarter"
   - (continue for all columns)
6. Click **"Import"**

**Expected result:** 36 roadmap items imported across all quarters

### Step 4: Create Timeline View (Gantt Chart)

1. Click **"+ Add a view"** at the top of your database
2. Select **"Timeline"** view type
3. Name it: **"Timeline by Quarter"**
4. Configure the view:
   - **Layout:** Week or Month (your preference)
   - **Date property:** Use "Start Date" (or "Due Date" if Start Date is empty)
   - **Group by:** Quarter
   - **Sort by:** Due Date (ascending)
   - **Filter:** (optional) Hide Completed items
5. Click **"Create"**

**Timeline View Options:**
- **Show weekends:** Toggle on/off
- **Today line:** Toggle on to see current date
- **Compact mode:** Toggle for more condensed view

### Step 5: Create Kanban View by Status

1. Click **"+ Add a view"**
2. Select **"Board"** view type
3. Name it: **"Kanban by Status"**
4. Configure the view:
   - **Group by:** Status
   - **Sort by:** Priority (Critical → High → Medium → Low)
   - **Sub-group by:** (optional) Service
5. Click **"Create"**

**Board columns will show:**
- Not Started (leftmost)
- In Progress
- Completed
- Blocked (rightmost)

### Step 6: Create Kanban View by Quarter

1. Click **"+ Add a view"**
2. Select **"Board"** view type
3. Name it: **"Kanban by Quarter"**
4. Configure the view:
   - **Group by:** Quarter
   - **Sort by:** Priority
   - **Filter:** (optional) Hide Completed
5. Click **"Create"**

**Board columns will show:**
- Q4 2025 (Current)
- Q1 2026
- Q2 2026
- Q3 2026
- Backlog

### Step 7: Create Table View (Default Editing View)

The initial table view is already created, but you can refine it:

1. Rename the default view to: **"All Tasks - Table View"**
2. Configure:
   - **Group by:** Quarter
   - **Sort by:** Due Date (ascending)
   - **Properties visible:** All (for editing)

---

## Database Schema Reference

### Required Properties Detail

**Title** (Title type)
- The task/initiative name
- Example: "Complete Video Mobile App Phase 8"

**Status** (Select type - Single choice)
- Not Started → Task hasn't begun
- In Progress → Currently being worked on
- Completed → Task finished
- Blocked → Task cannot proceed due to dependency or issue

**Quarter** (Select type - Single choice)
- Q4 2025 → Oct-Dec 2025 (current quarter)
- Q1 2026 → Jan-Mar 2026
- Q2 2026 → Apr-Jun 2026
- Q3 2026 → Jul-Sep 2026
- Backlog → Not yet scheduled

**Priority** (Select type - Single choice)
- Critical → Blocks other work or affects production
- High → Important for business goals, scheduled for current quarter
- Medium → Valuable improvement, next 2 quarters
- Low → Nice-to-have, in backlog

**Service** (Multi-select type - Multiple choices allowed)
- Billing → Payment processing and service documentation
- Portal → Customer-facing portal
- Dashboard → Analytics and business intelligence (to be renamed "Insight")
- Operations → Field operations and service management
- Estimator → Customer acquisition and quoting
- Inventory → Parts and supplies management
- Booking → Training scheduling
- Video → Video management and YouTube integration
- Shared → Shared package used by all services
- Site → Marketing website
- All Services → Cross-cutting initiatives

**Start Date** (Date type)
- When the task begins
- Optional - leave blank for most tasks
- Used for Timeline view positioning

**Due Date** (Date type)
- When the task should be completed
- Optional but recommended for Q4/Q1/Q2 tasks
- Used for Timeline view positioning

**Dependencies** (Text type)
- List prerequisite tasks (e.g., "User Accounts", "Video Mobile")
- Helps understand task sequencing
- Used for planning parallel vs. sequential work

**Completion %** (Number type)
- Progress percentage (0-100)
- Example: Video Mobile is 87% complete
- Shows how far along in-progress tasks are

**Notes** (Text type)
- Additional context, rationale, or implementation details
- Link to detailed planning documents
- Key considerations or blockers

---

## View Configuration Details

### Timeline View Settings

**Best for:** Visualizing task scheduling and dependencies over time

**Recommended settings:**
- **Layout:** Month view (shows 3-4 months at once)
- **Group by:** Quarter (organizes tasks by release cycle)
- **Date property:** Due Date (or Start Date if available)
- **Sort by:** Priority (shows critical tasks first within each quarter)
- **Filter:** Hide Completed (optional - keeps view focused on active work)
- **Show dependencies:** Toggle on (if Notion supports it in your plan)

**Usage:**
- Drag tasks to reschedule them
- See overlapping work across services
- Identify scheduling conflicts

### Kanban by Status Settings

**Best for:** Daily/weekly task management and workflow tracking

**Recommended settings:**
- **Group by:** Status
- **Sort within columns:** Priority (Critical at top)
- **Filter:** None (show all tasks)
- **Card preview:** Show Service tags, Due Date, Completion %

**Usage:**
- Drag tasks between columns to update status
- Quick view of what's in progress vs. blocked
- Identify bottlenecks

### Kanban by Quarter Settings

**Best for:** Long-term planning and quarterly prioritization

**Recommended settings:**
- **Group by:** Quarter
- **Sort within columns:** Priority + Due Date
- **Filter:** Hide Completed (optional)
- **Card preview:** Show Status, Service, Due Date

**Usage:**
- See full scope of each quarter's work
- Plan capacity and resource allocation
- Move tasks between quarters as priorities shift

---

## Data Summary

**Total Tasks:** 36

**By Quarter:**
- Q4 2025: 10 tasks (6 completed, 2 pending, 2 not started)
- Q1 2026: 9 tasks (all critical/high priority - major platform work)
- Q2 2026: 7 tasks (mobile expansion, ownership tracking, settings)
- Backlog: 8 tasks (infrastructure, optimizations, future features)

**By Status:**
- Completed: 6 (all Q4 2025)
- Not Started: 30
- In Progress: 0 (as of import)
- Blocked: 0

**By Priority:**
- Critical: 10 (multi-user, mobile, testing, portal)
- High: 12 (scheduling, design system, responsive testing)
- Medium: 11 (documentation, admin settings, booking)
- Low: 3 (AI recommendations, reordering, manual review)

**By Service:**
- All Services: 13 (cross-cutting initiatives)
- Operations: 6
- Dashboard: 5
- Billing: 3
- Video: 3
- Portal: 2
- (others: 1-2 each)

---

## Troubleshooting

### CSV Import Issues

**Problem:** "Column mapping failed"
- **Solution:** Ensure all property names in Notion exactly match the CSV headers (case-sensitive)

**Problem:** "Select options not found"
- **Solution:** Manually add all Select/Multi-select options BEFORE importing CSV

**Problem:** "Date format error"
- **Solution:** CSV dates are in YYYY-MM-DD format. If import fails, adjust Notion date format settings.

### Timeline View Issues

**Problem:** "Timeline view is empty"
- **Solution:** Timeline requires at least one date property (Start Date or Due Date). Many tasks don't have dates - this is normal. Add dates to tasks you want to see in Timeline view.

**Problem:** "Tasks not grouped by Quarter"
- **Solution:** Ensure "Group by" is set to "Quarter" property, not a date property.

### View Not Showing All Tasks

**Problem:** "Some tasks are missing"
- **Solution:** Check if a Filter is applied. Remove filters to see all tasks.

---

## Next Steps After Setup

1. **Review imported data** - Verify all 36 tasks imported correctly
2. **Adjust dates** - Add Start/Due dates to tasks you want in Timeline view
3. **Set current work** - Move active tasks to "In Progress" status
4. **Share with team** - Click "Share" button to invite collaborators
5. **Set up notifications** - Configure Notion notifications for status changes
6. **Link to planning docs** - Add links in Notes column to detailed planning documents
7. **Create filters** - Add custom filtered views (e.g., "My Tasks", "Critical Only")
8. **Regular updates** - Schedule weekly roadmap review to keep data current

---

## Advanced: Connecting Notion MCP for Automated Updates

If you want Claude Code to automatically update your Notion roadmap:

1. **Complete initial setup** using one of the methods above
2. **Open Claude Desktop** (not CLI)
3. **Authenticate Notion MCP** through browser OAuth
4. **Once authenticated**, you can update the roadmap by:
   - Editing `/Users/brian/app-development/sailorskills-repos/ROADMAP.md`
   - Running Claude Code command: "Update my Notion roadmap from ROADMAP.md"
   - Claude will sync changes to Notion automatically

**Benefits of MCP integration:**
- Keep ROADMAP.md and Notion in sync
- Automated updates from CLI
- Bulk status updates
- Programmatic filtering and reporting

---

## Support

**Notion Documentation:**
- Database guide: https://notion.so/help/intro-to-databases
- Timeline view: https://notion.so/help/timeline-view
- Board view: https://notion.so/help/board-view

**Questions?**
- Check the Notion Help Center
- Contact Brian (standardhuman@gmail.com)

---

**Last Updated:** 2025-11-02
**Version:** 1.0
**Status:** Ready for implementation
