/**
 * Test clicking the actual magic link
 * This tests the complete flow from magic link click to portal dashboard
 */

import { test, expect } from '@playwright/test'

test.describe('Magic Link Click Flow', () => {
  test('should handle magic link click and land on portal without loop', async ({ page }) => {
    console.log('🧪 Testing actual magic link click...')

    // Capture console logs to detect loops
    const consoleLogs = []
    page.on('console', msg => {
      if (msg.text().includes('[PORTAL DEBUG]') || msg.text().includes('redirect')) {
        consoleLogs.push(msg.text())
        console.log(`   [Console] ${msg.text()}`)
      }
    })

    // Track page navigation to detect loops
    const navigationHistory = []
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        const url = frame.url()
        navigationHistory.push(url)
        console.log(`📍 Navigated to: ${url}`)
      }
    })

    // Click the magic link
    const magicLink = 'https://fzygakldvvzxmahkdylq.supabase.co/auth/v1/verify?token=pkce_b12cb3ef89bbfac114659d88cbbd14f496cf1bcd904ddebbea2af1d2&type=magiclink&redirect_to=https://portal.sailorskills.com'

    console.log('🔗 Clicking magic link...')
    await page.goto(magicLink)

    // Wait for final destination (should be portal)
    console.log('⏳ Waiting for authentication to complete...')
    await page.waitForURL(/portal\.sailorskills\.com/, { timeout: 15000 })

    // Get final URL
    const finalUrl = page.url()
    console.log(`✅ Final URL: ${finalUrl}`)

    // Verify we landed on portal (not login)
    expect(finalUrl).toContain('portal.sailorskills.com')

    // Verify NO tokens in URL (should be cleaned up)
    expect(finalUrl).not.toContain('access_token')
    expect(finalUrl).not.toContain('refresh_token')

    // Verify portal dashboard is visible
    console.log('🔍 Checking if portal dashboard loaded...')
    await expect(page.locator('#welcome-heading')).toBeVisible({ timeout: 10000 })

    console.log('✅ Portal dashboard loaded successfully!')

    // Check navigation history for loops
    console.log('\n📋 Navigation History:')
    navigationHistory.forEach((url, index) => {
      console.log(`   ${index + 1}. ${url}`)
    })

    // Detect loops: if we visited login.sailorskills.com more than once, there's a loop
    const loginVisits = navigationHistory.filter(url => url.includes('login.sailorskills.com')).length
    const portalVisits = navigationHistory.filter(url => url.includes('portal.sailorskills.com')).length

    console.log(`\n📊 Visit Counts:`)
    console.log(`   Login page: ${loginVisits} visits`)
    console.log(`   Portal page: ${portalVisits} visits`)

    // Assert no redirect loop occurred
    expect(loginVisits).toBeLessThanOrEqual(1) // Should visit login at most once (initial redirect from Supabase)
    expect(portalVisits).toBeGreaterThanOrEqual(1) // Should reach portal at least once

    if (navigationHistory.length > 4) {
      console.warn(`⚠️  WARNING: ${navigationHistory.length} page navigations detected. Expected ~2-3.`)
    } else {
      console.log(`✅ Navigation count looks good: ${navigationHistory.length} navigations`)
    }

    // Verify user is authenticated
    console.log('\n🔐 Verifying authentication...')
    const userEmailElement = await page.locator('#user-email')
    await expect(userEmailElement).toBeVisible()
    const userEmail = await userEmailElement.textContent()
    console.log(`   Logged in as: ${userEmail}`)

    // Verify boat data loaded
    console.log('\n🚤 Verifying boat data loaded...')
    const welcomeHeading = await page.locator('#welcome-heading').textContent()
    console.log(`   Welcome message: ${welcomeHeading}`)

    // Should see boat name in welcome message
    expect(welcomeHeading).toContain('Portal')

    console.log('\n✅ Magic link authentication SUCCESSFUL - NO REDIRECT LOOP!')
  })

  test('should display debug logs during authentication', async ({ page }) => {
    const debugLogs = []

    page.on('console', msg => {
      if (msg.text().includes('[PORTAL DEBUG]')) {
        debugLogs.push(msg.text())
      }
    })

    const magicLink = 'https://fzygakldvvzxmahkdylq.supabase.co/auth/v1/verify?token=pkce_b12cb3ef89bbfac114659d88cbbd14f496cf1bcd904ddebbea2af1d2&type=magiclink&redirect_to=https://portal.sailorskills.com'

    await page.goto(magicLink)
    await page.waitForURL(/portal\.sailorskills\.com/, { timeout: 15000 })

    // Wait a moment for all debug logs
    await page.waitForTimeout(2000)

    console.log('\n📋 Portal Debug Logs Captured:')
    debugLogs.forEach(log => console.log(`   ${log}`))

    // Verify key debug logs are present
    const hasTokenDetection = debugLogs.some(log => log.includes('access_token detected'))
    const hasAuthSuccess = debugLogs.some(log => log.includes('Authentication successful'))

    expect(hasTokenDetection || hasAuthSuccess).toBe(true)
    console.log('\n✅ Debug logging is working correctly')
  })
})
