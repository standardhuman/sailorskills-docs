const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

test('Run boat location fields migration on Supabase', async ({ page }) => {
  // Read the migration SQL
  const migrationPath = path.join(__dirname, 'sailorskills-site/supabase/migrations/011_add_boat_location_fields.sql');
  const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

  console.log('📄 Migration SQL loaded, length:', migrationSQL.length);

  // Navigate to Supabase SQL Editor
  console.log('🌐 Navigating to Supabase SQL Editor...');
  await page.goto('https://supabase.com/dashboard/project/fzygakldvvzxmahkdylq/sql/new');

  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  console.log('⏳ Waiting for SQL editor to load...');

  // Try multiple selectors for the SQL editor
  const possibleSelectors = [
    'div[role="textbox"]',
    '.monaco-editor textarea',
    'textarea.inputarea',
    '[data-testid="sql-editor"]',
    '.cm-content'
  ];

  let editorFound = false;
  let editorSelector = null;

  for (const selector of possibleSelectors) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      editorSelector = selector;
      editorFound = true;
      console.log(`✅ Found editor with selector: ${selector}`);
      break;
    } catch (e) {
      console.log(`❌ Selector ${selector} not found, trying next...`);
    }
  }

  if (!editorFound) {
    // Take a screenshot for debugging
    await page.screenshot({ path: 'supabase-sql-editor-debug.png', fullPage: true });
    throw new Error('Could not find SQL editor. Screenshot saved to supabase-sql-editor-debug.png');
  }

  // Focus on the editor
  await page.click(editorSelector);
  await page.waitForTimeout(1000);

  // Clear any existing content and paste migration
  console.log('📝 Pasting migration SQL...');

  // Use keyboard shortcuts to select all and delete
  await page.keyboard.press('Meta+a');
  await page.keyboard.press('Backspace');
  await page.waitForTimeout(500);

  // Type the migration SQL
  await page.keyboard.type(migrationSQL, { delay: 10 });
  await page.waitForTimeout(1000);

  console.log('▶️  Looking for Run button...');

  // Try to find and click the Run button
  const runButtonSelectors = [
    'button:has-text("Run")',
    '[data-testid="run-query"]',
    'button[type="submit"]',
    'button >> text=/run/i'
  ];

  let runButtonClicked = false;
  for (const selector of runButtonSelectors) {
    try {
      await page.click(selector, { timeout: 3000 });
      runButtonClicked = true;
      console.log(`✅ Clicked Run button with selector: ${selector}`);
      break;
    } catch (e) {
      console.log(`❌ Run button selector ${selector} not found, trying next...`);
    }
  }

  if (!runButtonClicked) {
    // Try keyboard shortcut
    console.log('🎹 Trying keyboard shortcut Cmd+Enter...');
    await page.keyboard.press('Meta+Enter');
    await page.waitForTimeout(1000);
  }

  // Wait for query to execute
  console.log('⏳ Waiting for query execution...');
  await page.waitForTimeout(3000);

  // Take a screenshot of the result
  await page.screenshot({ path: 'migration-result.png', fullPage: true });
  console.log('📸 Screenshot saved to migration-result.png');

  // Look for success indicators
  const successIndicators = [
    'text=/success/i',
    'text=/complete/i',
    'text=/rows? affected/i',
    '[data-testid="query-success"]'
  ];

  let successFound = false;
  for (const selector of successIndicators) {
    try {
      await page.waitForSelector(selector, { timeout: 2000 });
      successFound = true;
      const text = await page.textContent(selector);
      console.log(`✅ Success indicator found: ${text}`);
      break;
    } catch (e) {
      // Continue checking
    }
  }

  console.log('');
  console.log('============================================');
  console.log('📋 MIGRATION EXECUTION SUMMARY');
  console.log('============================================');
  console.log('Migration file: 011_add_boat_location_fields.sql');
  console.log('SQL pasted: ✅');
  console.log('Run button clicked: ' + (runButtonClicked ? '✅' : '⚠️  (used keyboard shortcut)'));
  console.log('Success detected: ' + (successFound ? '✅' : '⚠️  (check screenshot)'));
  console.log('Screenshot: migration-result.png');
  console.log('============================================');
  console.log('');
  console.log('Please review the screenshot to verify migration success.');
  console.log('Look for: "ALTER TABLE", "CREATE INDEX", "COMMENT ON COLUMN" messages');
});
