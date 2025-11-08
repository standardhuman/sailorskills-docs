import { test, chromium } from '@playwright/test';

test('Test production login with cache disabled', async () => {
  // Launch browser with cache disabled
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });

  // Disable cache
  await context.addInitScript(() => {
    delete window.caches;
  });

  const page = await context.newPage();

  page.on('console', msg => {
    console.log(`[${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.error('[Page Error]:', error.message);
  });

  console.log('\n🌐 Testing production with NO CACHE...');

  // Add cache-busting parameter
  const timestamp = Date.now();
  await page.goto(`https://sailorskills-settings.vercel.app/login.html?v=${timestamp}`, {
    waitUntil: 'networkidle'
  });

  console.log('✅ Page loaded\n');

  await page.fill('input[type="email"]', 'standardhuman@gmail.com');
  await page.fill('input[type="password"]', 'KLRss!650');

  console.log('🔐 Submitting login...\n');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(5000);

  const url = page.url();
  console.log(`📍 Final URL: ${url}\n`);

  if (url.includes('dashboard')) {
    console.log('✅✅✅ LOGIN SUCCESSFUL! ✅✅✅');
  } else {
    const errorText = await page.locator('#error').textContent().catch(() => 'No error');
    console.log(`❌ Login failed: ${errorText}`);
  }

  await browser.close();
});
