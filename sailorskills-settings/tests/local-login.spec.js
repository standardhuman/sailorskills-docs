import { test } from '@playwright/test';

test('Test login locally', async ({ page }) => {
  page.on('console', msg => {
    console.log(`[${msg.type()}]: ${msg.text()}`);
  });

  page.on('pageerror', error => {
    console.error('[Page Error]:', error.message);
  });

  console.log('\n🌐 Testing LOCAL login...');
  await page.goto('http://localhost:5178/login.html');
  await page.waitForLoadState('domcontentloaded');

  await page.fill('input[type="email"]', 'standardhuman@gmail.com');
  await page.fill('input[type="password"]', 'KLRss!650');

  console.log('\n🔐 Submitting...');
  await page.click('button[type="submit"]');

  await page.waitForTimeout(3000);

  const url = page.url();
  console.log(`\n📍 Final URL: ${url}`);

  if (url.includes('dashboard')) {
    console.log('✅ Login successful locally!');
  } else {
    const errorText = await page.locator('#error').textContent().catch(() => 'No error displayed');
    console.log(`❌ Login failed: ${errorText}`);
  }
});
