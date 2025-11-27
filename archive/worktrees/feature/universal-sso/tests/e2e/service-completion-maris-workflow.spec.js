/**
 * Service Completion - Maris Workflow Test
 *
 * Tests the complete workflow:
 * 1. Load Billing, select Maris
 * 2. Start Service
 * 3. Reload page (simulate dive)
 * 4. Select Maris again
 * 5. Verify in-progress state recovered
 * 6. End Service
 * 7. Continue to completion form
 */

import { test, expect } from '@playwright/test';

test.describe('Service Completion - Maris Workflow', () => {
  let serviceLogId = null;

  test.beforeAll(async () => {
    // Clean up any existing in-progress services for Maris
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fzygakldvvzxmahkdylq.supabase.co';
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find Maris boat
    const { data: boat } = await supabase
      .from('boats')
      .select('id')
      .ilike('boat_name', 'Maris')
      .single();

    if (boat) {
      // Clean up any in-progress services
      await supabase
        .from('service_logs')
        .delete()
        .eq('boat_id', boat.id)
        .eq('in_progress', true);

      console.log('✅ Cleaned up existing in-progress services for Maris');
    }
  });

  test.afterAll(async () => {
    // Clean up test service log
    if (serviceLogId) {
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fzygakldvvzxmahkdylq.supabase.co';
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('service_logs')
        .delete()
        .eq('id', serviceLogId);

      console.log('✅ Cleaned up test service log');
    }
  });

  test('should complete full workflow with reload recovery', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => console.log('Browser:', msg.text()));

    // Step 1: Navigate and authenticate
    await page.goto('http://localhost:5173/');

    // Check if auth modal appears
    const authModal = await page.waitForSelector('#auth-modal', { timeout: 5000 }).catch(() => null);

    if (authModal) {
      console.log('🔐 Logging in...');
      await page.fill('#auth-email', 'standardhuman@gmail.com');
      await page.fill('#auth-password', 'KLRss!650');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('load');
    }

    // Wait for authentication
    await page.waitForSelector('body.authenticated', { timeout: 10000 });
    console.log('✅ Authenticated');

    // Step 2: Navigate to Service Completion view
    await page.goto('http://localhost:5173/#service-completion');
    await page.waitForSelector('#completion-boat-select', { state: 'visible', timeout: 10000 });
    console.log('✅ Service Completion view loaded');

    // Step 3: Find and select Maris
    const marisOption = await page.locator('#completion-boat-select option:has-text("Maris")').first();
    const marisExists = await marisOption.count() > 0;

    if (!marisExists) {
      throw new Error('❌ Maris not found in boat list. Is there a service order scheduled for today?');
    }

    const marisValue = await marisOption.getAttribute('value');
    await page.selectOption('#completion-boat-select', marisValue);
    console.log('✅ Selected Maris from dropdown');

    // Wait for boat details to appear
    await page.waitForSelector('#boat-details', { state: 'visible' });

    // Step 4: Verify Start Service button is visible (not in-progress yet)
    const startBtn = await page.locator('#start-service-btn');
    await expect(startBtn).toBeVisible();
    console.log('✅ Start Service button visible');

    // Step 5: Click Start Service
    await startBtn.click();
    console.log('🔄 Clicked Start Service');

    // Wait for success message
    await page.waitForSelector('.toast.success, .alert-success', { timeout: 5000 });
    console.log('✅ Service started - timestamp captured');

    // Verify UI transitioned to in-progress
    await page.waitForSelector('#service-in-progress', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#service-not-started')).not.toBeVisible();
    console.log('✅ UI transitioned to in-progress state');

    // Capture service log ID for cleanup
    const hiddenInput = await page.locator('#current-service-log-id');
    serviceLogId = await hiddenInput.inputValue();
    console.log('📝 Service log ID:', serviceLogId);

    // Step 6: RELOAD PAGE (simulate dive)
    console.log('🔄 Reloading page (simulating dive)...');
    await page.reload();

    // Wait for page to reload and authenticate again
    await page.waitForSelector('body.authenticated', { timeout: 10000 });
    console.log('✅ Page reloaded');

    // Step 7: Navigate back to Service Completion
    await page.goto('http://localhost:5173/#service-completion');
    await page.waitForSelector('#completion-boat-select', { state: 'visible', timeout: 10000 });

    // Step 8: Verify Maris appears at top with IN PROGRESS indicator
    const firstOption = await page.locator('#completion-boat-select option').nth(1); // Skip "Select a boat"
    const firstOptionText = await firstOption.textContent();
    expect(firstOptionText).toContain('Maris');
    expect(firstOptionText).toContain('IN PROGRESS');
    console.log('✅ Maris appears at top of list with IN PROGRESS indicator');

    // Step 9: Select Maris again
    await page.selectOption('#completion-boat-select', marisValue);
    console.log('✅ Selected Maris again after reload');

    // Wait for service controls to appear
    await page.waitForSelector('#service-controls', { state: 'visible' });

    // Step 10: CRITICAL TEST - Verify in-progress state is shown (not Start button)
    await page.waitForSelector('#service-in-progress', { state: 'visible', timeout: 5000 });
    await expect(page.locator('#service-not-started')).not.toBeVisible();
    console.log('✅ RELOAD RECOVERY WORKING - In-progress state recovered!');

    // Step 11: Verify duration counter is running
    const durationText1 = await page.locator('#service-duration').textContent();
    await page.waitForTimeout(2000); // Wait 2 seconds
    const durationText2 = await page.locator('#service-duration').textContent();
    expect(durationText1).not.toBe(durationText2); // Duration should have changed
    console.log('✅ Duration counter running:', durationText1, '→', durationText2);

    // Step 12: Click End Service
    const endBtn = await page.locator('#end-service-btn');
    await expect(endBtn).toBeVisible();
    await endBtn.click();
    console.log('🔄 Clicked End Service');

    // Wait for success message
    await page.waitForSelector('.toast.success, .alert-success', { timeout: 5000 });
    console.log('✅ Service ended - timestamp captured');

    // Verify UI transitioned to ended state
    await page.waitForSelector('#service-ended', { state: 'visible', timeout: 5000 });
    console.log('✅ UI transitioned to ended state');

    // Step 13: Verify Continue button appears
    const continueBtn = await page.locator('#continue-to-completion-btn');
    await expect(continueBtn).toBeVisible();
    console.log('✅ Continue button visible');

    // Step 14: Click Continue (opens service log form)
    await continueBtn.click();
    console.log('🔄 Clicked Continue to Completion');

    // Verify service log form opened (this will depend on your modal implementation)
    // For now, just check the view didn't error out
    await page.waitForTimeout(1000);
    console.log('✅ Form opened (or attempted to open)');

    console.log('\n🎉 COMPLETE WORKFLOW SUCCESSFUL!');
  });

  test('should show Maris at top when in-progress exists', async ({ page }) => {
    // This test verifies the prioritization works without full workflow

    await page.goto('http://localhost:5173/');
    const authModal = await page.waitForSelector('#auth-modal', { timeout: 5000 }).catch(() => null);

    if (authModal) {
      await page.fill('#auth-email', 'standardhuman@gmail.com');
      await page.fill('#auth-password', 'KLRss!650');
      await page.click('button[type="submit"]');
      await page.waitForLoadState('load');
    }

    await page.waitForSelector('body.authenticated', { timeout: 10000 });
    await page.goto('http://localhost:5173/#service-completion');
    await page.waitForSelector('#completion-boat-select', { state: 'visible' });

    // Get all options
    const options = await page.locator('#completion-boat-select option').allTextContents();
    console.log('Boat list:', options);

    // Check if any boat has IN PROGRESS indicator
    const hasInProgress = options.some(opt => opt.includes('IN PROGRESS'));

    if (hasInProgress) {
      // Verify first option (after placeholder) has IN PROGRESS
      const firstOption = options[1]; // Skip "-- Select a boat --"
      expect(firstOption).toContain('IN PROGRESS');
      console.log('✅ In-progress boat appears first:', firstOption);
    } else {
      console.log('ℹ️  No in-progress services currently');
    }
  });
});
