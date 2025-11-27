import { supabase } from './supabase-client.js';

/**
 * Get all users with their profiles
 */
export async function getUsers() {
  // Get auth users
  const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();

  if (authError) throw authError;

  // Get user profiles
  const { data: profiles, error: profileError } = await supabase
    .from('user_profiles')
    .select('*');

  if (profileError) throw profileError;

  // Merge users with profiles
  return users.map(user => {
    const profile = profiles.find(p => p.user_id === user.id);
    return {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at,
      role: profile?.role || 'viewer',
      service_access: profile?.service_access || [],
      is_active: profile?.is_active !== false,
    };
  });
}

/**
 * Get single user with profile
 */
export async function getUser(userId) {
  const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(userId);

  if (authError) throw authError;

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = not found
    throw profileError;
  }

  return {
    id: user.id,
    email: user.email,
    created_at: user.created_at,
    last_sign_in_at: user.last_sign_in_at,
    role: profile?.role || 'viewer',
    service_access: profile?.service_access || [],
    is_active: profile?.is_active !== false,
  };
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId, updates) {
  // Check if profile exists
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (existing) {
    // Update existing profile
    const { data, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Create new profile
    const { data, error } = await supabase
      .from('user_profiles')
      .insert({
        user_id: userId,
        ...updates,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

/**
 * Invite new user
 */
export async function inviteUser(email, role = 'viewer', serviceAccess = []) {
  // Invite user via Supabase Auth
  const { data, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);

  if (inviteError) throw inviteError;

  // Create profile
  const { error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      user_id: data.user.id,
      role,
      service_access: serviceAccess,
      is_active: true,
    });

  if (profileError) throw profileError;

  return data.user;
}

/**
 * Delete user
 */
export async function deleteUser(userId) {
  // Delete profile (cascade will handle auth.users via RLS)
  const { error: profileError } = await supabase
    .from('user_profiles')
    .delete()
    .eq('user_id', userId);

  if (profileError) throw profileError;

  // Delete from auth
  const { error: authError } = await supabase.auth.admin.deleteUser(userId);

  if (authError) throw authError;
}

/**
 * Get available services for access control
 */
export function getAvailableServices() {
  return [
    { id: 'estimator', name: 'Estimator' },
    { id: 'operations', name: 'Operations' },
    { id: 'billing', name: 'Billing' },
    { id: 'inventory', name: 'Inventory' },
    { id: 'insight', name: 'Insight' },
    { id: 'settings', name: 'Settings' },
  ];
}

/**
 * Get role definitions
 */
export function getRoleDefinitions() {
  return {
    admin: {
      name: 'Admin',
      description: 'Full access to all features and settings',
      permissions: ['read', 'write', 'delete', 'manage_users', 'manage_settings'],
    },
    technician: {
      name: 'Technician',
      description: 'Service completion, inventory, view-only billing',
      permissions: ['read', 'write_services', 'read_billing'],
    },
    viewer: {
      name: 'Viewer',
      description: 'Read-only access to assigned services',
      permissions: ['read'],
    },
  };
}
