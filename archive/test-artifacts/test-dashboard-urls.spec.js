import { test, expect } from '@playwright/test';

test.describe('Dashboard URL Comparison', () => {
  test('Compare sailorskills-insight vs sailorskills-dashboard', async ({ page, context }) => {
    // Test sailorskills-insight.vercel.app
    console.log('\n=== Testing sailorskills-insight.vercel.app/dashboard ===');
    await page.goto('https://sailorskills-insight.vercel.app/dashboard', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Get page title
    const insightTitle = await page.title();
    console.log('Insight page title:', insightTitle);

    // Check for specific widgets
    const insightWidgets = {
      revenue: await page.locator('#revenue-widget').count(),
      bookings: await page.locator('#bookings-widget').count(),
      customers: await page.locator('#customers-widget').count(),
      inventory: await page.locator('#inventory-widget').count(),
      efficiency: await page.locator('#efficiency-widget').count(),
      'efficiency-metrics': await page.locator('.efficiency-metrics').count()
    };
    console.log('Insight widgets found:', insightWidgets);

    // Take screenshot
    await page.screenshot({
      path: '/Users/brian/app-development/sailorskills-repos/screenshot-insight.png',
      fullPage: true
    });
    console.log('Screenshot saved: screenshot-insight.png');

    // Check console errors
    const insightErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        insightErrors.push(msg.text());
      }
    });

    // Get HTML source snippet
    const insightHTML = await page.content();
    console.log('\nInsight HTML preview (first 500 chars):');
    console.log(insightHTML.substring(0, 500));

    // Now test sailorskills-dashboard.vercel.app
    console.log('\n\n=== Testing sailorskills-dashboard.vercel.app/dashboard ===');
    await page.goto('https://sailorskills-dashboard.vercel.app/dashboard', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    // Wait for page to load
    await page.waitForTimeout(3000);

    // Get page title
    const dashboardTitle = await page.title();
    console.log('Dashboard page title:', dashboardTitle);

    // Check for specific widgets
    const dashboardWidgets = {
      revenue: await page.locator('#revenue-widget').count(),
      bookings: await page.locator('#bookings-widget').count(),
      customers: await page.locator('#customers-widget').count(),
      inventory: await page.locator('#inventory-widget').count(),
      efficiency: await page.locator('#efficiency-widget').count(),
      'efficiency-metrics': await page.locator('.efficiency-metrics').count()
    };
    console.log('Dashboard widgets found:', dashboardWidgets);

    // Take screenshot
    await page.screenshot({
      path: '/Users/brian/app-development/sailorskills-repos/screenshot-dashboard.png',
      fullPage: true
    });
    console.log('Screenshot saved: screenshot-dashboard.png');

    // Check console errors
    const dashboardErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        dashboardErrors.push(msg.text());
      }
    });

    // Get HTML source snippet
    const dashboardHTML = await page.content();
    console.log('\nDashboard HTML preview (first 500 chars):');
    console.log(dashboardHTML.substring(0, 500));

    // Summary comparison
    console.log('\n\n=== COMPARISON SUMMARY ===');
    console.log('Insight Title:', insightTitle);
    console.log('Dashboard Title:', dashboardTitle);
    console.log('\nInsight Widgets:', insightWidgets);
    console.log('Dashboard Widgets:', dashboardWidgets);
    console.log('\nInsight has efficiency metrics:', insightWidgets.efficiency > 0 || insightWidgets['efficiency-metrics'] > 0);
    console.log('Dashboard has efficiency metrics:', dashboardWidgets.efficiency > 0 || dashboardWidgets['efficiency-metrics'] > 0);
  });
});
