import { test } from '@playwright/test';

test('Inspect environment variables in production', async ({ page }) => {
  await page.goto('https://sailorskills-settings.vercel.app/login.html');
  await page.waitForLoadState('networkidle');

  // Inject script to inspect environment variables
  const envVars = await page.evaluate(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

    return {
      url: url,
      urlType: typeof url,
      urlLength: url?.length,
      urlHasWhitespace: url !== url?.trim(),
      urlFirstChars: url?.substring(0, 10),
      urlLastChars: url?.substring(url.length - 10),

      key: key?.substring(0, 20) + '...' + key?.substring(key.length - 20),
      keyType: typeof key,
      keyLength: key?.length,
      keyHasWhitespace: key !== key?.trim(),
    };
  });

  console.log('\n📊 ENVIRONMENT VARIABLES INSPECTION:');
  console.log(JSON.stringify(envVars, null, 2));
});
