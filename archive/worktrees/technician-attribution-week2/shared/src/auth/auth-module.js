/**
 * Vanilla JS Auth Module
 * Provides user authentication and permission checking for non-React services
 *
 * Usage:
 *   import { authModule } from '../../shared/src/auth/auth-module.js';
 *
 *   // Initialize on page load
 *   await authModule.init(supabaseClient);
 *
 *   // Get current user
 *   const user = authModule.getCurrentUser();
 *
 *   // Check permissions
 *   if (authModule.can('MODIFY_PRICING')) {
 *     // Show pricing controls
 *   }
 */

import { canUserAccess } from './permissions.js';

class AuthModule {
  constructor() {
    this.currentUser = null;
    this.loading = true;
    this.error = null;
    this.supabase = null;
    this.authSubscription = null;
    this.listeners = [];
  }

  /**
   * Initialize auth module with Supabase client
   * @param {import('@supabase/supabase-js').SupabaseClient} supabaseClient
   * @returns {Promise<void>}
   */
  async init(supabaseClient) {
    this.supabase = supabaseClient;
    await this.loadUser();
    this.setupAuthListener();
  }

  /**
   * Load current user from Supabase
   * @private
   */
  async loadUser() {
    try {
      this.loading = true;
      this.error = null;

      // Get current auth user
      const { data: { user }, error: authError } = await this.supabase.auth.getUser();

      if (authError) throw authError;

      // Check if staff user
      if (user && user.user_metadata?.user_type === 'staff') {
        // Fetch full user record with role
        const { data: userData, error: userError } = await this.supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;

        this.currentUser = userData;
      } else {
        // Not a staff user, clear current user
        this.currentUser = null;
      }

      this.notifyListeners();
    } catch (err) {
      console.error('Error loading user:', err);
      this.error = err;
      this.currentUser = null;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Setup listener for auth state changes
   * @private
   */
  setupAuthListener() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }

    const { data: { subscription } } = this.supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          await this.loadUser();
        } else if (event === 'SIGNED_OUT') {
          this.currentUser = null;
          this.notifyListeners();
        }
      }
    );

    this.authSubscription = subscription;
  }

  /**
   * Add listener for auth state changes
   * @param {Function} callback - Called when auth state changes
   * @returns {Function} Unsubscribe function
   */
  onAuthChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  /**
   * Notify all listeners of auth state change
   * @private
   */
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentUser);
      } catch (err) {
        console.error('Error in auth listener:', err);
      }
    });
  }

  /**
   * Get current user
   * @returns {object|null} Current user object or null if not authenticated
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * Check if currently loading
   * @returns {boolean}
   */
  isLoading() {
    return this.loading;
  }

  /**
   * Get any error that occurred
   * @returns {Error|null}
   */
  getError() {
    return this.error;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean}
   */
  isAuthenticated() {
    return !!this.currentUser;
  }

  /**
   * Get current user's role
   * @returns {string|null} Role name or null
   */
  getRole() {
    return this.currentUser?.role || null;
  }

  /**
   * Get current user's ID
   * @returns {string|null} User ID or null
   */
  getUserId() {
    return this.currentUser?.id || null;
  }

  /**
   * Check if current user has permission
   * @param {string} permission - Permission key from PERMISSIONS
   * @returns {boolean}
   */
  can(permission) {
    if (!this.currentUser) return false;
    return canUserAccess(permission, this.currentUser.role);
  }

  /**
   * Show/hide element based on permission
   * Adds/removes 'hidden' class based on permission check
   *
   * @param {string} selector - CSS selector for element
   * @param {string} permission - Permission key
   * @param {boolean} hideIfNoPermission - If true, hide when no permission (default: true)
   */
  toggleElement(selector, permission, hideIfNoPermission = true) {
    const element = document.querySelector(selector);
    if (!element) return;

    const hasPermission = this.can(permission);
    const shouldHide = hideIfNoPermission ? !hasPermission : hasPermission;

    if (shouldHide) {
      element.classList.add('hidden');
      element.style.display = 'none';
    } else {
      element.classList.remove('hidden');
      element.style.display = '';
    }
  }

  /**
   * Wait for auth to initialize
   * Useful for blocking UI until auth is ready
   *
   * @returns {Promise<object|null>} Resolves with current user when ready
   */
  async waitForAuth() {
    if (!this.loading) {
      return this.currentUser;
    }

    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.loading) {
          clearInterval(checkInterval);
          resolve(this.currentUser);
        }
      }, 50);
    });
  }

  /**
   * Cleanup subscriptions
   */
  destroy() {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    this.listeners = [];
  }
}

// Export singleton instance
export const authModule = new AuthModule();

// Export class for testing
export { AuthModule };
