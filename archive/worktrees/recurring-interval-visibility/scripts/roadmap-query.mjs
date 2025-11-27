#!/usr/bin/env node

/**
 * Roadmap Query Script
 *
 * Quick queries for the roadmap across all quarterly files
 *
 * Usage:
 *   npm run roadmap status          # Show current priorities
 *   npm run roadmap search "Billing" # Search for tasks containing "Billing"
 *   npm run roadmap quarter Q1      # Show Q1 2026 tasks
 *   npm run roadmap list            # List all tasks
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROADMAP_FILES = [
  { path: join(__dirname, '../docs/roadmap/2025-Q4-ACTIVE.md'), quarter: 'Q4 2025' },
  { path: join(__dirname, '../docs/roadmap/2026-Q1-ACTIVE.md'), quarter: 'Q1 2026' },
  { path: join(__dirname, '../docs/roadmap/2026-Q2-PLANNED.md'), quarter: 'Q2 2026+' },
  { path: join(__dirname, '../docs/roadmap/archive/BACKLOG_AND_COMPLETED.md'), quarter: 'Archive' }
];

/**
 * Parse tasks from a roadmap file
 */
async function parseTasks(filePath) {
  const content = await readFile(filePath, 'utf-8');
  const tasks = [];
  const lines = content.split('\n');

  let currentSection = '';

  for (const line of lines) {
    // Section headers
    const sectionMatch = line.match(/^###?\s+(.+?)(?:\s+✅)?$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Task checkbox lines
    const taskMatch = line.match(/^-\s+\[([ x])\]\s+\*\*(.+?)\*\*/);
    if (taskMatch) {
      const isCompleted = taskMatch[1] === 'x';
      const title = taskMatch[2];

      tasks.push({
        title,
        completed: isCompleted,
        section: currentSection
      });
    }
  }

  return tasks;
}

/**
 * Command: Show current priorities
 */
async function showStatus() {
  console.log('📊 Current Roadmap Status\n');

  for (const file of ROADMAP_FILES) {
    if (file.quarter === 'Archive') continue; // Skip archive for status

    const tasks = await parseTasks(file.path);
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const pending = total - completed;

    console.log(`${file.quarter}:`);
    console.log(`  ✅ Completed: ${completed}`);
    console.log(`  ⏳ Pending:   ${pending}`);
    console.log(`  📋 Total:     ${total}`);
    console.log();
  }
}

/**
 * Command: Search for tasks containing a keyword
 */
async function searchTasks(keyword) {
  console.log(`🔍 Searching for "${keyword}"...\n`);

  let found = 0;

  for (const file of ROADMAP_FILES) {
    const tasks = await parseTasks(file.path);
    const matches = tasks.filter(t =>
      t.title.toLowerCase().includes(keyword.toLowerCase()) ||
      t.section.toLowerCase().includes(keyword.toLowerCase())
    );

    if (matches.length > 0) {
      console.log(`${file.quarter}:`);
      matches.forEach(task => {
        const status = task.completed ? '✅' : '⏳';
        console.log(`  ${status} ${task.title}`);
        console.log(`     Section: ${task.section}`);
      });
      console.log();
      found += matches.length;
    }
  }

  if (found === 0) {
    console.log('No tasks found.');
  } else {
    console.log(`Found ${found} matching task(s)`);
  }
}

/**
 * Command: Show tasks for a specific quarter
 */
async function showQuarter(quarter) {
  const file = ROADMAP_FILES.find(f => f.quarter.includes(quarter));

  if (!file) {
    console.error(`❌ Quarter "${quarter}" not found`);
    console.error('Available: Q4 2025, Q1 2026, Q2 2026');
    process.exit(1);
  }

  console.log(`📅 ${file.quarter} Tasks\n`);

  const tasks = await parseTasks(file.path);

  if (tasks.length === 0) {
    console.log('No tasks found.');
    return;
  }

  let currentSection = '';
  tasks.forEach(task => {
    if (task.section !== currentSection) {
      console.log(`\n${task.section}:`);
      currentSection = task.section;
    }
    const status = task.completed ? '✅' : '⏳';
    console.log(`  ${status} ${task.title}`);
  });

  const total = tasks.length;
  const completed = tasks.filter(t => t.completed).length;
  console.log(`\n📊 ${completed}/${total} completed`);
}

/**
 * Command: List all tasks
 */
async function listAll() {
  console.log('📋 All Roadmap Tasks\n');

  for (const file of ROADMAP_FILES) {
    console.log(`\n═══ ${file.quarter} ═══\n`);

    const tasks = await parseTasks(file.path);

    if (tasks.length === 0) {
      console.log('  No tasks');
      continue;
    }

    let currentSection = '';
    tasks.forEach(task => {
      if (task.section !== currentSection) {
        console.log(`\n${task.section}:`);
        currentSection = task.section;
      }
      const status = task.completed ? '✅' : '⏳';
      console.log(`  ${status} ${task.title}`);
    });
  }
}

/**
 * Show usage
 */
function showUsage() {
  console.log(`
Roadmap Query Tool

Usage:
  npm run roadmap status              Show current priorities
  npm run roadmap search <keyword>    Search for tasks
  npm run roadmap quarter <Q1|Q2|Q4>  Show specific quarter
  npm run roadmap list                List all tasks
  npm run roadmap help                Show this help

Examples:
  npm run roadmap status
  npm run roadmap search "Billing"
  npm run roadmap quarter Q1
  npm run roadmap list
`);
}

// Main
const command = process.argv[2];
const arg = process.argv[3];

(async () => {
  try {
    switch (command) {
      case 'status':
        await showStatus();
        break;
      case 'search':
        if (!arg) {
          console.error('❌ Please provide a search keyword');
          process.exit(1);
        }
        await searchTasks(arg);
        break;
      case 'quarter':
        if (!arg) {
          console.error('❌ Please provide a quarter (Q1, Q2, Q4)');
          process.exit(1);
        }
        await showQuarter(arg);
        break;
      case 'list':
        await listAll();
        break;
      case 'help':
      default:
        showUsage();
        break;
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();
