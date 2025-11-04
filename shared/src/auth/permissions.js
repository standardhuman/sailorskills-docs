/**
 * Permission Matrix for Role-Based Access Control
 * Server-side enforcement via Supabase RLS, client-side guards for UX
 */

export const PERMISSIONS = {
  // ============================================================
  // OPERATIONS SERVICE
  // ============================================================
  VIEW_ALL_SERVICE_LOGS: ['owner', 'admin', 'viewer'],
  CREATE_SERVICE_LOG: ['owner', 'admin', 'technician', 'contractor'],
  MODIFY_ANY_SERVICE_LOG: ['owner', 'admin'],
  MODIFY_OWN_SERVICE_LOG: ['owner', 'admin', 'technician', 'contractor'],
  VIEW_ALL_BOATS: ['owner', 'admin', 'technician', 'viewer'],
  CREATE_BOAT: ['owner', 'admin', 'technician'],
  SCHEDULE_SERVICE: ['owner', 'admin', 'technician'],

  // ============================================================
  // BILLING SERVICE
  // ============================================================
  VIEW_ALL_INVOICES: ['owner', 'admin', 'viewer'],
  PROCESS_PAYMENT: ['owner', 'admin'],
  MODIFY_PRICING: ['owner'],
  COMPLETE_SERVICE: ['owner', 'admin', 'technician', 'contractor'],

  // ============================================================
  // INVENTORY SERVICE
  // ============================================================
  VIEW_INVENTORY: ['owner', 'admin', 'technician', 'contractor', 'viewer'],
  PLACE_ORDER: ['owner', 'admin'],
  MODIFY_INVENTORY: ['owner', 'admin'],

  // ============================================================
  // INSIGHT SERVICE
  // ============================================================
  VIEW_ALL_ANALYTICS: ['owner', 'admin', 'viewer'],
  VIEW_FINANCIALS: ['owner', 'admin', 'viewer'],
  VIEW_OWN_PERFORMANCE: ['owner', 'admin', 'technician', 'contractor'],

  // ============================================================
  // ESTIMATOR SERVICE
  // ============================================================
  CREATE_QUOTE: ['owner', 'admin', 'technician'],
  MODIFY_QUOTE_PRICING: ['owner'],

  // ============================================================
  // USER MANAGEMENT
  // ============================================================
  INVITE_USER: ['owner', 'admin'],
  MANAGE_USERS: ['owner', 'admin'],
  MANAGE_OWNER_ROLES: ['owner'],
  VIEW_AUDIT_LOGS: ['owner', 'admin']
};

/**
 * Check if user role has permission
 * @param {string} permission - Permission key from PERMISSIONS
 * @param {string} userRole - User role (owner, admin, technician, contractor, viewer)
 * @returns {boolean}
 */
export function canUserAccess(permission, userRole) {
  if (!permission || !userRole) return false;
  return PERMISSIONS[permission]?.includes(userRole) || false;
}

/**
 * Get all permissions for a role
 * @param {string} userRole - User role
 * @returns {string[]} Array of permission keys
 */
export function getUserPermissions(userRole) {
  return Object.entries(PERMISSIONS)
    .filter(([_, roles]) => roles.includes(userRole))
    .map(([permission]) => permission);
}

/**
 * Check if user can access feature (allows checking multiple permissions)
 * @param {string|string[]} permissions - Permission key(s)
 * @param {string} userRole - User role
 * @returns {boolean}
 */
export function hasAnyPermission(permissions, userRole) {
  const perms = Array.isArray(permissions) ? permissions : [permissions];
  return perms.some(perm => canUserAccess(perm, userRole));
}
