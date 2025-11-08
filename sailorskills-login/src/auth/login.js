import { login, enableAuthDebug } from '@sailorskills/shared/auth'

// Enable auth debugging in development
if (import.meta.env.DEV) {
  enableAuthDebug()
}

// Get redirect URL from query params or default to portal
const urlParams = new URLSearchParams(window.location.search)
const redirectUrl = urlParams.get('redirect') || 'https://portal.sailorskills.com'

// Store redirect for after login
sessionStorage.setItem('redirectAfterLogin', redirectUrl)

// Handle login form submission
document.getElementById('login-form')?.addEventListener('submit', async (e) => {
  e.preventDefault()

  const email = document.getElementById('email').value
  const password = document.getElementById('password').value
  const errorDiv = document.getElementById('error-message')
  const submitBtn = document.getElementById('submit-btn')

  // Clear previous errors
  errorDiv.style.display = 'none'
  submitBtn.disabled = true
  submitBtn.textContent = 'Logging in...'

  try {
    const result = await login(email, password)

    if (result.success) {
      // Login successful - redirect to intended destination
      const redirect = sessionStorage.getItem('redirectAfterLogin') || 'https://portal.sailorskills.com'
      sessionStorage.removeItem('redirectAfterLogin')
      window.location.href = redirect
    } else {
      // Login failed - show error
      errorDiv.textContent = result.error || 'Login failed. Please check your credentials.'
      errorDiv.style.display = 'block'
      submitBtn.disabled = false
      submitBtn.textContent = 'Log In'
    }
  } catch (error) {
    console.error('Login error:', error)
    errorDiv.textContent = 'An unexpected error occurred. Please try again.'
    errorDiv.style.display = 'block'
    submitBtn.disabled = false
    submitBtn.textContent = 'Log In'
  }
})

// Handle "Forgot Password" link
document.getElementById('forgot-password')?.addEventListener('click', (e) => {
  e.preventDefault()
  window.location.href = '/reset-password.html'
})

// Handle "Sign Up" link (for customers)
document.getElementById('signup-link')?.addEventListener('click', (e) => {
  e.preventDefault()
  window.location.href = '/signup.html'
})
