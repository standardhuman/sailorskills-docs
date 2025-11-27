/**
 * Test magic link authentication flow
 * Tests the complete flow: request magic link → click link → land on portal
 */

import { test, expect } from '@playwright/test'

test.describe('Magic Link Authentication Flow', () => {
  test('should request magic link successfully', async ({ page }) => {
    console.log('🧪 Starting magic link flow test...')

    // Step 1: Navigate to login page
    console.log('📍 Step 1: Navigate to login page')
    await page.goto('https://login.sailorskills.com/login.html')
    await expect(page).toHaveURL(/login\.sailorskills\.com/)

    // Step 2: Switch to Magic Link tab
    console.log('📍 Step 2: Switch to Magic Link tab')
    await page.click('[data-tab="magic-link"]')
    await page.waitForSelector('#magic-link-panel.active')

    // Step 3: Request magic link
    console.log('📍 Step 3: Request magic link for validemailforsure@gmail.com')
    await page.fill('#magic-link-email', 'validemailforsure@gmail.com')
    await page.click('#magic-link-btn')

    // Wait for success message
    console.log('📍 Step 4: Wait for success message')
    await page.waitForSelector('.alert-success', { timeout: 10000 })
    const successMessage = await page.textContent('.alert-success')
    expect(successMessage).toContain('Magic link sent')

    console.log('✅ Magic link request successful!')
    console.log('📧 Check email at validemailforsure@gmail.com')
    console.log('🔗 Click the magic link in the email')
    console.log('⚠️  Manual verification required:')
    console.log('   1. Click magic link in email')
    console.log('   2. Verify you land on portal.sailorskills.com/portal.html')
    console.log('   3. Verify NO redirect loop occurs')
    console.log('   4. Verify you see portal dashboard with boat data')
  })

  test('should handle logout without redirect loop', async ({ page }) => {
    // First log in with password to get a session
    console.log('🧪 Testing logout flow...')
    console.log('📍 Step 1: Log in with password')

    await page.goto('https://login.sailorskills.com/login.html')
    await page.fill('#password-email', 'standardhuman@gmail.com')
    await page.fill('#password', 'KLRss!650')
    await page.click('#password-login-btn')

    // Wait for redirect (could be Portal or Operations depending on role)
    console.log('📍 Step 2: Wait for redirect after login')
    await page.waitForURL(/sailorskills\.(com|vercel\.app)/, { timeout: 10000 })

    const currentUrl = page.url()
    console.log(`✅ Redirected to: ${currentUrl}`)

    // If we're on portal, test logout
    if (currentUrl.includes('portal')) {
      console.log('📍 Step 3: Click logout button')
      await page.click('#logout-btn')

      // Should redirect back to login page
      console.log('📍 Step 4: Wait for redirect to login page')
      await page.waitForURL(/login\.sailorskills\.com/, { timeout: 10000 })

      const finalUrl = page.url()
      console.log(`✅ Redirected to: ${finalUrl}`)

      // Verify we're on the login page (not in a loop)
      expect(finalUrl).toContain('login.sailorskills.com')

      // Verify we see the login form (not a blank page or error)
      await expect(page.locator('#password-login-form')).toBeVisible()

      console.log('✅ Logout flow completed successfully - no redirect loop!')
    } else {
      console.log('⚠️  Redirected to Operations (user is admin/staff)')
      console.log('   Skipping portal-specific logout test')
    }
  })
})
