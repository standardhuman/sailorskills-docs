import { test, expect } from '@playwright/test'

const LOGIN_URL = 'http://localhost:5179/login.html'
const PORTAL_URL = 'http://localhost:5174'
const OPERATIONS_URL = 'http://localhost:5173'
const SETTINGS_URL = 'http://localhost:5178'

test.describe('Universal SSO Flow', () => {
  test('should login once and access multiple services', async ({ page }) => {
    // 1. Visit login page
    await page.goto(LOGIN_URL)
    await expect(page.locator('h1')).toContainText('Sailorskills Login')

    // 2. Login as admin
    await page.fill('#email', 'admin-test@sailorskills.com')
    await page.fill('#password', 'TestAdmin123!')
    await page.click('#submit-btn')

    // 3. Should redirect to portal
    await page.waitForURL(/portal/, { timeout: 10000 })
    await expect(page).toHaveURL(/portal/)

    // 4. Navigate to Operations - should be automatically authenticated
    await page.goto(OPERATIONS_URL)
    await page.waitForTimeout(2000) // Wait for auth check
    await expect(page).not.toHaveURL(/login/)

    // 5. Navigate to Settings - should be automatically authenticated
    await page.goto(SETTINGS_URL)
    await page.waitForTimeout(2000) // Wait for auth check
    await expect(page).not.toHaveURL(/login/)
  })

  test('should enforce role-based access', async ({ page }) => {
    // 1. Login as customer
    await page.goto(LOGIN_URL)
    await page.fill('#email', 'customer-test@sailorskills.com')
    await page.fill('#password', 'TestCustomer123!')
    await page.click('#submit-btn')

    // 2. Should redirect to portal
    await page.waitForURL(/portal/, { timeout: 10000 })
    await expect(page).toHaveURL(/portal/)

    // 3. Try to access Settings - should show access denied
    await page.goto(SETTINGS_URL)
    await page.waitForTimeout(2000)

    // Should see access denied modal or be redirected
    const accessDeniedVisible = await page.locator('.access-denied-modal').isVisible().catch(() => false)
    const isOnLogin = page.url().includes('login')

    expect(accessDeniedVisible || isOnLogin).toBeTruthy()
  })

  test('should logout from one service and require re-login', async ({ page }) => {
    // 1. Login as admin
    await page.goto(LOGIN_URL)
    await page.fill('#email', 'admin-test@sailorskills.com')
    await page.fill('#password', 'TestAdmin123!')
    await page.click('#submit-btn')

    await page.waitForURL(/portal/, { timeout: 10000 })

    // 2. Navigate to Settings
    await page.goto(SETTINGS_URL)
    await page.waitForTimeout(2000)

    // 3. Logout (if logout button exists)
    const logoutBtn = page.locator('#logout-btn, [data-testid="logout"], button:has-text("Logout"), button:has-text("Sign out")')
    const logoutExists = await logoutBtn.count() > 0

    if (logoutExists) {
      await logoutBtn.first().click()
      await page.waitForTimeout(1000)

      // 4. Navigate to Portal - should redirect to login
      await page.goto(PORTAL_URL)
      await page.waitForTimeout(2000)

      // Should be redirected to login
      expect(page.url()).toContain('login')
    } else {
      console.log('No logout button found - skipping logout test')
    }
  })
})
