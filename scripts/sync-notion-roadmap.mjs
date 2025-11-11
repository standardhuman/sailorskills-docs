#!/usr/bin/env node

/**
 * Notion Roadmap Sync Script
 *
 * Syncs quarterly roadmap files to Notion database
 * - Parses all quarterly markdown files (Q4 2025, Q1 2026, Q2 2026, Backlog)
 * - Updates Notion database via API
 * - Creates new tasks, updates existing ones
 *
 * Roadmap Structure:
 *   ROADMAP.md - High-level summary (current + next quarter)
 *   docs/roadmap/2025-Q4-ACTIVE.md - Detailed Q4 2025 tasks
 *   docs/roadmap/2026-Q1-ACTIVE.md - Detailed Q1 2026 tasks
 *   docs/roadmap/2026-Q2-PLANNED.md - Detailed Q2+ planning
 *   docs/roadmap/archive/ - Completed and backlog items
 *
 * Usage:
 *   npm run sync-roadmap
 *   node scripts/sync-notion-roadmap.mjs
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env') });

// Configuration
const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID || '29fb82b7eacc80458c43c5949ef300c7';

// Roadmap files to parse (in order)
const ROADMAP_FILES = [
  join(__dirname, '../docs/roadmap/2025-Q4-ACTIVE.md'),
  join(__dirname, '../docs/roadmap/2026-Q1-ACTIVE.md'),
  join(__dirname, '../docs/roadmap/2026-Q2-PLANNED.md'),
  join(__dirname, '../docs/roadmap/archive/BACKLOG_AND_COMPLETED.md')
];

const NOTION_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';

// Validation
if (!NOTION_TOKEN) {
  console.error('❌ Error: NOTION_TOKEN environment variable not set');
  console.error('Please set it in .env file or export it:');
  console.error('  export NOTION_TOKEN=your_token_here');
  process.exit(1);
}

/**
 * Parse roadmap files into structured task objects
 */
async function parseRoadmap() {
  const tasks = [];

  // Parse each roadmap file
  for (const filePath of ROADMAP_FILES) {
    try {
      const content = await readFile(filePath, 'utf-8');
      const fileTasks = parseRoadmapContent(content);
      tasks.push(...fileTasks);
    } catch (error) {
      console.warn(`⚠️  Warning: Could not read ${filePath}: ${error.message}`);
    }
  }

  return tasks;
}

/**
 * Parse a single roadmap file content
 */
function parseRoadmapContent(content) {
  const tasks = [];

  let currentQuarter = 'Backlog';
  let currentSection = '';
  let currentTask = null;

  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Extract quarter from headers like "## Q4 2025 - Current Quarter"
    const quarterMatch = line.match(/^##\s+(Q\d\s+\d{4})/i);
    if (quarterMatch) {
      currentQuarter = quarterMatch[1];
      continue;
    }

    // Extract section from headers like "### Service Architecture & Portal Separation"
    const sectionMatch = line.match(/^###\s+(.+?)(?:\s+✅)?$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Extract tasks from checkbox lines like "- [ ] **Task Name**"
    const taskMatch = line.match(/^-\s+\[([ x])\]\s+\*\*(.+?)\*\*/);
    if (taskMatch) {
      const isCompleted = taskMatch[1] === 'x';
      const title = taskMatch[2];

      // Save previous task if exists
      if (currentTask) {
        tasks.push(currentTask);
      }

      // Start new task
      currentTask = {
        title,
        status: isCompleted ? 'Completed' : 'Not Started',
        quarter: currentQuarter,
        section: currentSection,
        priority: 'Medium',
        services: [],
        startDate: null,
        dueDate: null,
        dependencies: '',
        blocks: '',
        notes: '',
        completion: isCompleted ? 100 : 0
      };
      continue;
    }

    // Parse task details if we're in a task
    if (currentTask) {
      // Completed date: "  - **Completed:** 2025-10-25"
      const completedMatch = line.match(/\*\*Completed:\*\*\s+(\d{4}-\d{2}-\d{2})/);
      if (completedMatch) {
        currentTask.dueDate = completedMatch[1];
        currentTask.status = 'Completed';
        currentTask.completion = 100;
      }

      // Priority: "  - **Priority:** High"
      const priorityMatch = line.match(/\*\*Priority:\*\*\s+(Critical|High|Medium|Low)/);
      if (priorityMatch) {
        currentTask.priority = priorityMatch[1];
      }

      // Estimated effort to due date: "  - **Estimated Effort:** 2-3 hours"
      const effortMatch = line.match(/\*\*Estimated Effort:\*\*\s+(.+)/);
      if (effortMatch && !currentTask.dueDate) {
        // Use as notes
        currentTask.notes += `Estimated Effort: ${effortMatch[1]}\n`;
      }

      // Services from Impact: "  - **Impact:** Repository, Vercel, services"
      const impactMatch = line.match(/\*\*Impact:\*\*\s+(.+)/);
      if (impactMatch) {
        const impact = impactMatch[1].toLowerCase();
        const serviceKeywords = {
          'billing': 'Billing',
          'portal': 'Portal',
          'dashboard': 'Dashboard',
          'operations': 'Operations',
          'estimator': 'Estimator',
          'inventory': 'Inventory',
          'booking': 'Booking',
          'video': 'Video',
          'shared': 'Shared',
          'all services': 'All Services',
          'cross-service': 'All Services'
        };

        Object.entries(serviceKeywords).forEach(([keyword, service]) => {
          if (impact.includes(keyword) && !currentTask.services.includes(service)) {
            currentTask.services.push(service);
          }
        });
      }

      // Dependencies: "  - **Dependencies:** Task X, Task Y"
      const depsMatch = line.match(/\*\*Dependencies:\*\*\s+(.+)/);
      if (depsMatch) {
        currentTask.dependencies = depsMatch[1];
      }

      // Blocks: "  - **Blocks:** Task X, Task Y"
      const blocksMatch = line.match(/\*\*Blocks:\*\*\s+(.+)/);
      if (blocksMatch) {
        currentTask.blocks = blocksMatch[1];
      }

      // Rationale, features, etc. as notes
      const rationaleMatch = line.match(/\*\*Rationale:\*\*\s+(.+)/);
      if (rationaleMatch) {
        currentTask.notes += `${rationaleMatch[1]}\n`;
      }
    }

    // End task when we hit a new section or quarter
    if ((line.startsWith('##') || line.startsWith('###')) && currentTask) {
      tasks.push(currentTask);
      currentTask = null;
    }
  }

  // Don't forget last task
  if (currentTask) {
    tasks.push(currentTask);
  }

  // Default to "All Services" if no services detected
  // Calculate dates based on quarter if not specified
  tasks.forEach(task => {
    if (task.services.length === 0) {
      task.services.push('All Services');
    }
    task.notes = task.notes.trim();

    // Auto-calculate dates based on quarter if not already set
    if (!task.startDate && !task.dueDate && task.status !== 'Completed') {
      const quarterDates = getQuarterDates(task.quarter);
      if (quarterDates) {
        task.startDate = quarterDates.start;
        task.dueDate = quarterDates.end;
      }
    }
  });

  return tasks;
}

/**
 * Get start/end dates for a quarter
 */
function getQuarterDates(quarter) {
  const quarterMap = {
    'Q4 2025': { start: '2025-10-01', end: '2025-12-31' },
    'Q1 2026': { start: '2026-01-01', end: '2026-03-31' },
    'Q2 2026': { start: '2026-04-01', end: '2026-06-30' },
    'Q3 2026': { start: '2026-07-01', end: '2026-09-30' },
    'Q4 2026': { start: '2026-10-01', end: '2026-12-31' },
    'Backlog': { start: null, end: null }
  };

  return quarterMap[quarter] || null;
}

/**
 * Make API request to Notion
 */
async function notionRequest(endpoint, method = 'GET', body = null) {
  const url = `${NOTION_API_BASE}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Notion API error: ${response.status} ${error}`);
  }

  return response.json();
}

/**
 * Get all existing pages in the database
 */
async function getExistingPages() {
  const pages = [];
  let hasMore = true;
  let startCursor = undefined;

  while (hasMore) {
    const response = await notionRequest('/databases/' + DATABASE_ID + '/query', 'POST', {
      start_cursor: startCursor
    });

    pages.push(...response.results);
    hasMore = response.has_more;
    startCursor = response.next_cursor;
  }

  return pages;
}

/**
 * Convert task to Notion page properties
 */
function taskToProperties(task) {
  const properties = {
    'Title': {
      title: [{ text: { content: task.title } }]
    },
    'Status': {
      select: { name: task.status }
    },
    'Quarter': {
      select: { name: task.quarter }
    },
    'Priority': {
      select: { name: task.priority }
    },
    'Service': {
      rich_text: [{ text: { content: task.services.join(', ') } }]
    }
  };

  if (task.startDate) {
    properties['Start Date'] = {
      date: { start: task.startDate }
    };
  }

  if (task.dueDate) {
    properties['Due Date'] = {
      date: { start: task.dueDate }
    };
  }

  if (task.dependencies) {
    properties['Dependencies'] = {
      rich_text: [{ text: { content: task.dependencies } }]
    };
  }

  if (task.blocks) {
    properties['Blocks'] = {
      rich_text: [{ text: { content: task.blocks } }]
    };
  }

  if (task.completion !== undefined) {
    properties['Completion %'] = {
      number: task.completion
    };
  }

  if (task.notes) {
    properties['Notes'] = {
      rich_text: [{ text: { content: task.notes.substring(0, 2000) } }] // Notion limit
    };
  }

  return properties;
}

/**
 * Create a new page in the database
 */
async function createPage(task) {
  return notionRequest('/pages', 'POST', {
    parent: { database_id: DATABASE_ID },
    properties: taskToProperties(task)
  });
}

/**
 * Update an existing page
 */
async function updatePage(pageId, task) {
  return notionRequest(`/pages/${pageId}`, 'PATCH', {
    properties: taskToProperties(task)
  });
}

/**
 * Get page title from Notion page
 */
function getPageTitle(page) {
  return page.properties.Title?.title?.[0]?.text?.content || '';
}

/**
 * Main sync function
 */
async function sync() {
  console.log('🚀 Starting Notion roadmap sync...\n');

  // Parse roadmap files
  console.log('📖 Parsing roadmap files...');
  const tasks = await parseRoadmap();
  console.log(`   Found ${tasks.length} tasks across all quarterly files\n`);

  // Get existing pages
  console.log('🔍 Fetching existing Notion pages...');
  const existingPages = await getExistingPages();
  console.log(`   Found ${existingPages.length} existing pages\n`);

  // Build map of existing pages by title
  const existingByTitle = new Map();
  existingPages.forEach(page => {
    const title = getPageTitle(page);
    if (title) {
      existingByTitle.set(title, page);
    }
  });

  // Sync tasks
  let created = 0;
  let updated = 0;
  let skipped = 0;

  console.log('🔄 Syncing tasks...\n');

  for (const task of tasks) {
    const existingPage = existingByTitle.get(task.title);

    try {
      if (existingPage) {
        // Update existing page
        await updatePage(existingPage.id, task);
        console.log(`   ✏️  Updated: ${task.title}`);
        updated++;
      } else {
        // Create new page
        await createPage(task);
        console.log(`   ➕ Created: ${task.title}`);
        created++;
      }

      // Rate limiting - Notion allows 3 requests per second
      await new Promise(resolve => setTimeout(resolve, 350));

    } catch (error) {
      console.error(`   ❌ Error syncing "${task.title}": ${error.message}`);
      skipped++;
    }
  }

  // Summary
  console.log('\n✅ Sync complete!\n');
  console.log('Summary:');
  console.log(`  Created: ${created}`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Total:   ${tasks.length}`);
  console.log('\n🔗 View your roadmap:');
  console.log(`   https://notion.so/${DATABASE_ID.replace(/-/g, '')}\n`);
}

// Run sync
sync().catch(error => {
  console.error('❌ Sync failed:', error.message);
  process.exit(1);
});
