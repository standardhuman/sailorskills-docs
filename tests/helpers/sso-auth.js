/**
 * SSO Authentication Helper for Playwright Tests
 *
 * Handles authentication through the centralized SSO service at login.sailorskills.com
 *
 * Discovered Selectors:
 * - Email: #password-email
 * - Password: #password
 * - Submit: #password-login-btn
 * - Forms: #password-login-form, #magic-link-form
 *
 * @module tests/helpers/sso-auth
 */

const SSO_URL = 'https://login.sailorskills.com/login.html';

/**
 * Selectors for SSO login page
 */
export const SSO_SELECTORS = {
  email: '#password-email',
  password: '#password',
  submitButton: '#password-login-btn',
  passwordForm: '#password-login-form',
  magicLinkEmail: '#magic-link-email',
  magicLinkButton: '#magic-link-btn',
  magicLinkForm: '#magic-link-form'
};

/**
 * Login via SSO using email/password authentication
 *
 * @param {Page} page - Playwright page object
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} redirectUrl - Optional URL to redirect to after login (will be in hash fragment)
 * @returns {Promise<void>}
 *
 * @example
 * await loginWithSSO(page, 'user@example.com', 'password123');
 */
export async function loginWithSSO(page, email, password, redirectUrl = null) {
  // If redirectUrl is provided, add it as a query parameter
  const loginUrl = redirectUrl
    ? `${SSO_URL}?redirect=${encodeURIComponent(redirectUrl)}`
    : SSO_URL;

  await page.goto(loginUrl);
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.fill(SSO_SELECTORS.email, email);
  await page.fill(SSO_SELECTORS.password, password);

  // Click submit and wait for navigation
  await page.click(SSO_SELECTORS.submitButton);
  await page.waitForLoadState('networkidle');

  // Wait a bit for token to be set in URL hash
  await page.waitForTimeout(1000);
}

/**
 * Login via SSO and navigate to a specific service page
 *
 * @param {Page} page - Playwright page object
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {string} serviceUrl - Full URL of the service page to access
 * @returns {Promise<void>}
 *
 * @example
 * await loginAndNavigateToService(
 *   page,
 *   'user@example.com',
 *   'password123',
 *   'https://sailorskills-portal.vercel.app/billing.html'
 * );
 */
export async function loginAndNavigateToService(page, email, password, serviceUrl) {
  await loginWithSSO(page, email, password, serviceUrl);

  // Give extra time for redirect to complete
  await page.waitForTimeout(1500);

  // If we're not already on the service URL, navigate there
  const currentUrl = page.url();
  const targetUrlBase = serviceUrl.split('#')[0].split('?')[0];

  if (!currentUrl.includes(targetUrlBase)) {
    await page.goto(serviceUrl);
    await page.waitForLoadState('networkidle');
  }

  // Ensure we're fully loaded
  await page.waitForLoadState('networkidle');
}

/**
 * Check if user is currently authenticated
 *
 * @param {Page} page - Playwright page object
 * @returns {Promise<boolean>}
 */
export async function isAuthenticated(page) {
  // Check if we have a session by looking for Supabase auth token in localStorage
  const hasAuthToken = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    return keys.some(key => key.includes('supabase.auth.token'));
  });

  return hasAuthToken;
}

/**
 * Logout from SSO
 *
 * @param {Page} page - Playwright page object
 * @returns {Promise<void>}
 */
export async function logout(page) {
  // Clear Supabase auth from localStorage
  await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
  });

  // Clear session storage as well
  await page.evaluate(() => {
    sessionStorage.clear();
  });
}

/**
 * Wait for authentication to complete after SSO redirect
 *
 * @param {Page} page - Playwright page object
 * @param {number} timeout - Maximum time to wait in ms (default 10000)
 * @returns {Promise<void>}
 */
export async function waitForAuthComplete(page, timeout = 10000) {
  await page.waitForFunction(
    () => {
      const keys = Object.keys(localStorage);
      return keys.some(key => key.includes('supabase.auth.token'));
    },
    { timeout }
  );
}

/**
 * Test credentials for different user types
 */
export const TEST_USERS = {
  owner: {
    email: 'standardhuman@gmail.com',
    password: 'KLRss!650',
    role: 'owner'
  },
  // Add other test users as needed
  // admin: { email: '...', password: '...', role: 'admin' },
  // customer: { email: '...', password: '...', role: 'customer' }
};

/**
 * Login as a specific test user type
 *
 * @param {Page} page - Playwright page object
 * @param {string} userType - Type of user ('owner', 'admin', 'customer')
 * @param {string} redirectUrl - Optional URL to redirect to after login
 * @returns {Promise<void>}
 *
 * @example
 * await loginAsTestUser(page, 'owner');
 */
export async function loginAsTestUser(page, userType = 'owner', redirectUrl = null) {
  const user = TEST_USERS[userType];
  if (!user) {
    throw new Error(`Unknown test user type: ${userType}. Available: ${Object.keys(TEST_USERS).join(', ')}`);
  }

  await loginWithSSO(page, user.email, user.password, redirectUrl);
}
