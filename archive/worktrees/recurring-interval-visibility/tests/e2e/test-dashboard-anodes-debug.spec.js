/**
 * Test: Debug Anode/Propeller Display on Dashboard
 * Checks raw data structure from database
 */

import { test } from '@playwright/test';

const TEST_EMAIL = 'standardhuman@gmail.com';
const TEST_PASSWORD = 'KLRss!650';
const BASE_URL = 'http://localhost:5174';

test('Debug anode/propeller data structure', async ({ page }) => {
  // Intercept API calls to see raw data
  page.on('response', async (response) => {
    const url = response.url();
    if (url.includes('service_logs') && response.status() === 200) {
      try {
        const data = await response.json();
        console.log('\n📊 RAW SERVICE LOG DATA:');
        console.log('='.repeat(80));

        if (Array.isArray(data)) {
          data.forEach((log, index) => {
            console.log(`\nService Log #${index + 1}:`);
            console.log(`  service_date: ${log.service_date}`);
            console.log(`  anode_conditions type: ${typeof log.anode_conditions}`);
            console.log(`  anode_conditions:`, JSON.stringify(log.anode_conditions, null, 2));
            console.log(`  propellers type: ${typeof log.propellers}`);
            console.log(`  propellers:`, JSON.stringify(log.propellers, null, 2));
          });
        } else if (data.data) {
          console.log('Service Log:');
          console.log(`  service_date: ${data.data.service_date}`);
          console.log(`  anode_conditions type: ${typeof data.data.anode_conditions}`);
          console.log(`  anode_conditions:`, JSON.stringify(data.data.anode_conditions, null, 2));
          console.log(`  propellers type: ${typeof data.data.propellers}`);
          console.log(`  propellers:`, JSON.stringify(data.data.propellers, null, 2));
        }

        console.log('='.repeat(80));
      } catch (e) {
        // Not JSON or error parsing
      }
    }
  });

  // Navigate and login
  await page.goto(`${BASE_URL}/login.html`);
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(`${BASE_URL}/portal.html`, { timeout: 10000 });

  // Wait for data to load
  await page.waitForTimeout(5000);

  console.log('\n✓ Check console output above for raw data structure');
});
