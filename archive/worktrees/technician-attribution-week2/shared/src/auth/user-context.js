import { createContext, useContext, useEffect, useState } from 'react';

const UserContext = createContext(null);

/**
 * Provider for current user context
 * Must wrap app to provide user info to all components
 */
export function UserProvider({ children, supabase }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadUser() {
      try {
        // Get current auth user
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) throw authError;

        // Check if staff user
        if (user && user.user_metadata?.user_type === 'staff') {
          // Fetch full user record with role
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (userError) throw userError;

          setCurrentUser(userData);
        } else {
          // Not a staff user, clear current user
          setCurrentUser(null);
        }
      } catch (err) {
        console.error('Error loading user:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadUser();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        loadUser();
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [supabase]);

  return (
    <UserContext.Provider value={{ currentUser, loading, error }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to access current user context
 * @returns {{ currentUser: object|null, loading: boolean, error: Error|null }}
 */
export function useCurrentUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within UserProvider');
  }
  return context;
}

/**
 * Check if current user has permission
 * @param {string} permission - Permission key
 * @returns {boolean}
 */
export function useHasPermission(permission) {
  const { currentUser } = useCurrentUser();
  if (!currentUser) return false;

  const { canUserAccess } = require('./permissions');
  return canUserAccess(permission, currentUser.role);
}
