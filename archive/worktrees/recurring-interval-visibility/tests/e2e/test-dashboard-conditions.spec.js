/**
 * Test: Dashboard Condition Display
 * Checks what condition data is actually being displayed
 */

import { test } from '@playwright/test';

const TEST_EMAIL = 'standardhuman@gmail.com';
const TEST_PASSWORD = 'KLRss!650';
const BASE_URL = 'http://localhost:5174';

test('Debug dashboard condition display', async ({ page }) => {
  // Navigate and login
  await page.goto(`${BASE_URL}/login.html`);
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/portal.html`, { timeout: 10000 });
  await page.waitForTimeout(2000);

  console.log('\n📊 DASHBOARD CONDITION DATA:');
  console.log('=' .repeat(60));

  // Get Latest Service section content
  const serviceContent = await page.locator('#latest-service-content').textContent();
  console.log('\nFull Latest Service Content:');
  console.log(serviceContent?.substring(0, 500));

  // Check for Vessel Condition section
  const vesselConditionText = await page.locator('#latest-service-content h4:has-text("Vessel Condition")').count();
  console.log(`\n✓ Vessel Condition header: ${vesselConditionText > 0 ? 'FOUND' : 'MISSING'}`);

  if (vesselConditionText > 0) {
    // Check what's inside vessel condition
    const conditionGrid = page.locator('#latest-service-content').locator('div[style*="grid-template-columns"]').first();
    const conditionItems = await conditionGrid.locator('> div').count();
    console.log(`  Condition items displayed: ${conditionItems}`);

    // Check each condition type
    const paintCondition = await page.locator('#latest-service-content:has-text("Paint Condition")').count();
    const growthLevel = await page.locator('#latest-service-content:has-text("Growth Level")').count();
    const thruHulls = await page.locator('#latest-service-content:has-text("Through-Hulls")').count();

    console.log(`  - Paint Condition: ${paintCondition > 0 ? 'SHOWN' : 'HIDDEN'}`);
    console.log(`  - Growth Level: ${growthLevel > 0 ? 'SHOWN' : 'HIDDEN'}`);
    console.log(`  - Through-Hulls: ${thruHulls > 0 ? 'SHOWN' : 'HIDDEN'}`);
  }

  // Check for Anode Inspection
  const anodeSection = await page.locator('#latest-service-content h4:has-text("Anode Inspection")').count();
  console.log(`\n✓ Anode Inspection section: ${anodeSection > 0 ? 'FOUND' : 'MISSING'}`);

  if (anodeSection > 0) {
    const anodeItems = await page.locator('#latest-service-content').locator('h4:has-text("Anode Inspection")').locator('..').locator('> div > div').count();
    console.log(`  Anode items displayed: ${anodeItems}`);
  }

  // Check for Propeller Condition
  const propellerSection = await page.locator('#latest-service-content h4:has-text("Propeller Condition")').count();
  console.log(`\n✓ Propeller Condition section: ${propellerSection > 0 ? 'FOUND' : 'MISSING'}`);

  if (propellerSection > 0) {
    const propellerItems = await page.locator('#latest-service-content').locator('h4:has-text("Propeller Condition")').locator('..').locator('> div > div').count();
    console.log(`  Propeller items displayed: ${propellerItems}`);
  }

  // Check for Service Notes
  const serviceNotes = await page.locator('#latest-service-content h4:has-text("Service Notes")').count();
  console.log(`\n✓ Service Notes section: ${serviceNotes > 0 ? 'FOUND' : 'MISSING'}`);

  // Take detailed screenshot
  await page.screenshot({ path: 'test-dashboard-conditions-debug.png', fullPage: true });
  console.log('\n✓ Screenshot saved: test-dashboard-conditions-debug.png');

  console.log('\n' + '='.repeat(60));
});
