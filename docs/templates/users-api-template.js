import { supabase } from '../config/supabase.js';

/**
 * Fetch all users (staff only)
 * @returns {Promise<{data: Array, error: Error}>}
 */
export async function getAllUsers() {
  return await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
}

/**
 * Fetch user by ID
 * @param {string} userId
 * @returns {Promise<{data: object, error: Error}>}
 */
export async function getUserById(userId) {
  return await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
}

/**
 * Invite new user (sends Supabase magic link)
 * @param {object} userData - { email, full_name, role, user_type, hire_date, hourly_rate, phone }
 * @returns {Promise<{data: object, error: Error}>}
 */
export async function inviteUser(userData) {
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(
    userData.email,
    {
      data: {
        user_type: 'staff',
        role: userData.role,
        full_name: userData.full_name,
        user_type_detail: userData.user_type || 'employee'
      },
      redirectTo: window.location.origin + '/operations'
    }
  );

  if (error) return { data: null, error };

  // Also create initial users record (will be overwritten by trigger, but sets additional fields)
  const { error: insertError } = await supabase
    .from('users')
    .insert({
      id: data.user.id,
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      user_type: userData.user_type || 'employee',
      hire_date: userData.hire_date,
      hourly_rate: userData.hourly_rate,
      phone: userData.phone,
      active: true
    });

  return { data: data.user, error: insertError };
}

/**
 * Update user
 * @param {string} userId
 * @param {object} updates - Fields to update
 * @returns {Promise<{data: object, error: Error}>}
 */
export async function updateUser(userId, updates) {
  return await supabase
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
}

/**
 * Deactivate user
 * @param {string} userId
 * @returns {Promise<{data: object, error: Error}>}
 */
export async function deactivateUser(userId) {
  return await updateUser(userId, { active: false });
}

/**
 * Reactivate user
 * @param {string} userId
 * @returns {Promise<{data: object, error: Error}>}
 */
export async function reactivateUser(userId) {
  return await updateUser(userId, { active: true });
}
