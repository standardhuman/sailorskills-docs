import { describe, it, expect, beforeEach } from 'vitest'
import { getCookie, setCookie, deleteCookie } from './auth-storage.js'

describe('Auth Storage - Cookie Operations', () => {
  beforeEach(() => {
    // Clear all cookies
    document.cookie.split(';').forEach(c => {
      document.cookie = c.replace(/^ +/, '').replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`)
    })
  })

  it('should set cookie with domain', () => {
    setCookie('test-key', 'test-value', { domain: '.sailorskills.com' })
    const value = getCookie('test-key')
    expect(value).toBe('test-value')
  })

  it('should delete cookie', () => {
    setCookie('test-key', 'test-value')
    deleteCookie('test-key')
    const value = getCookie('test-key')
    expect(value).toBeNull()
  })
})
