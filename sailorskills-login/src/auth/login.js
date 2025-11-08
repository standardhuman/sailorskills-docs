import { login, supabase } from '@sailorskills/shared/auth'

// Tab switching functionality
const tabs = document.querySelectorAll('.auth-tab')
const panels = document.querySelectorAll('.auth-panel')

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active class from all tabs and panels
    tabs.forEach(t => t.classList.remove('active'))
    panels.forEach(p => p.classList.remove('active'))

    // Add active class to clicked tab
    tab.classList.add('active')

    // Show corresponding panel
    const tabName = tab.dataset.tab
    document.getElementById(`${tabName}-panel`).classList.add('active')
  })
})

// Get redirect URL from query params
const urlParams = new URLSearchParams(window.location.search)
const explicitRedirect = urlParams.get('redirect')

/**
 * Get role-based redirect URL
 * @param {string} role - User role (customer, staff, admin)
 * @returns {string} Redirect URL
 */
function getRoleBasedRedirect(role) {
  // If there's an explicit redirect, use it
  if (explicitRedirect) {
    return explicitRedirect
  }

  // Otherwise, redirect based on role
  switch (role) {
    case 'customer':
      return 'https://portal.sailorskills.com'
    case 'staff':
      return 'https://operations.sailorskills.com'
    case 'admin':
      return 'https://operations.sailorskills.com' // Admin goes to Operations by default
    default:
      return 'https://portal.sailorskills.com'
  }
}

/**
 * Show alert message
 * @param {string} message - Message to display
 * @param {string} type - Alert type ('success' or 'error')
 */
function showAlert(message, type = 'error') {
  const container = document.getElementById('alert-container')
  container.innerHTML = `<div class="alert alert-${type}">${message}</div>`
}

/**
 * Clear alert messages
 */
function clearAlert() {
  document.getElementById('alert-container').innerHTML = ''
}

// Handle password login form submission
document.getElementById('password-login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  clearAlert()

  const email = document.getElementById('password-email').value
  const password = document.getElementById('password').value
  const submitBtn = document.getElementById('password-login-btn')

  submitBtn.disabled = true
  submitBtn.textContent = 'Signing in...'

  try {
    const result = await login(email, password)

    if (result.success) {
      // Login successful - redirect based on role
      const redirectUrl = getRoleBasedRedirect(result.role)
      console.log(`Login successful. Redirecting ${result.role} to:`, redirectUrl)
      window.location.href = redirectUrl
    } else {
      // Login failed - show error
      showAlert(result.error || 'Login failed. Please check your credentials.')
      submitBtn.disabled = false
      submitBtn.textContent = 'Sign In'
    }
  } catch (error) {
    console.error('Login error:', error)
    showAlert('An unexpected error occurred. Please try again.')
    submitBtn.disabled = false
    submitBtn.textContent = 'Sign In'
  }
})

// Handle magic link form submission
document.getElementById('magic-link-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()
  clearAlert()

  const email = document.getElementById('magic-link-email').value
  const submitBtn = document.getElementById('magic-link-btn')

  submitBtn.disabled = true
  submitBtn.textContent = 'Sending...'

  try {
    const redirectTo = explicitRedirect || `${window.location.origin}/login.html`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: redirectTo
      }
    })

    if (error) throw error

    // Show success message
    showAlert('Magic link sent! Check your email to sign in.', 'success')
    submitBtn.disabled = false
    submitBtn.textContent = 'Send Magic Link'

    // Clear form
    document.getElementById('magic-link-form').reset()
  } catch (error) {
    console.error('Magic link error:', error)
    showAlert(error.message || 'Failed to send magic link. Please try again.')
    submitBtn.disabled = false
    submitBtn.textContent = 'Send Magic Link'
  }
})
