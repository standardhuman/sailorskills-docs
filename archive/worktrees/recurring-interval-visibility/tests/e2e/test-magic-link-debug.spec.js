/**
 * Debug magic link flow - capture all console logs and navigation
 */

import { test, expect } from '@playwright/test'

test.describe('Magic Link Debug', () => {
  test('should capture all console logs during magic link flow', async ({ page }) => {
    const logs = []
    const errors = []
    const navigation = []

    // Capture ALL console messages
    page.on('console', msg => {
      const text = msg.text()
      logs.push({ type: msg.type(), text })
      console.log(`[${msg.type().toUpperCase()}] ${text}`)
    })

    // Capture errors
    page.on('pageerror', err => {
      errors.push(err.message)
      console.error(`[PAGE ERROR] ${err.message}`)
    })

    // Capture navigation
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        const url = frame.url()
        navigation.push({ timestamp: new Date().toISOString(), url })
        console.log(`[NAV ${navigation.length}] ${url}`)
      }
    })

    // Request a fresh magic link
    console.log('🧪 Requesting magic link...')
    await page.goto('https://login.sailorskills.com/login.html')
    await page.click('[data-tab="magic-link"]')
    await page.fill('#magic-link-email', 'validemailforsure@gmail.com')
    await page.click('#magic-link-btn')

    await page.waitForSelector('.alert-success', { timeout: 10000 })
    console.log('✅ Magic link sent!')

    console.log('\n📋 CONSOLE LOGS SUMMARY:')
    console.log(`   Total logs: ${logs.length}`)
    console.log(`   Errors: ${errors.length}`)
    console.log(`   Navigations: ${navigation.length}`)

    console.log('\n⚠️  CHECK EMAIL for new magic link and test manually')
    console.log('   Previous link may be expired')
  })

  test('should debug portal page directly', async ({ page }) => {
    const logs = []

    page.on('console', msg => {
      const text = msg.text()
      logs.push({ type: msg.type(), text })
      console.log(`[${msg.type().toUpperCase()}] ${text}`)
    })

    page.on('pageerror', err => {
      console.error(`[PAGE ERROR] ${err.message}`)
      console.error(err.stack)
    })

    console.log('🧪 Testing portal page load directly (no auth)...')
    await page.goto('https://portal.sailorskills.com/portal.html')

    // Wait a few seconds to capture all logs
    await page.waitForTimeout(5000)

    console.log('\n📋 Portal Debug Logs:')
    logs.filter(l => l.text.includes('[PORTAL DEBUG]')).forEach(log => {
      console.log(`   ${log.text}`)
    })

    const finalUrl = page.url()
    console.log(`\n✅ Final URL: ${finalUrl}`)
    console.log(`   Expected: Should redirect to login if not authenticated`)
    console.log(`   Actual: ${finalUrl.includes('login') ? '✅ Redirected to login' : '❌ Still on portal'}`)
  })
})
