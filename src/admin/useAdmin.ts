import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Profile } from './types';

export const PRIMARY_ADMIN_EMAIL = 'navalkrish2007@gmail.com';

type AdminState = {
  loading: boolean;
  isAdmin: boolean;
  profile: Profile | null;
  error: string | null;
};

export async function checkAdminEmail(email?: string | null): Promise<boolean> {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();

  // 1. Direct check against the designated primary admin email
  if (normalized === PRIMARY_ADMIN_EMAIL.toLowerCase()) {
    return true;
  }

  // 2. Check against rows in the `admins` table
  try {
    const { data } = await supabase
      .from('admins')
      .select('email')
      .ilike('email', normalized)
      .maybeSingle();

    if (data?.email) return true;
  } catch {
    // If admins table does not exist or network fails, fallback continues
  }

  return false;
}

export function useAdmin() {
  const [state, setState] = useState<AdminState>({
    loading: true,
    isAdmin: false,
    profile: null,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session || !session.user) {
        setState({ loading: false, isAdmin: false, profile: null, error: null });
        return;
      }

      const userEmail = session.user.email?.toLowerCase() || '';

      // Check email against allowed address or admins table
      const isWhitelisted = await checkAdminEmail(userEmail);

      // Query profiles table
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error && !isWhitelisted) {
        setState({ loading: false, isAdmin: false, profile: null, error: 'Failed to verify admin status' });
        return;
      }

      const hasAdminRole = profile?.role === 'admin';
      const userIsAdmin = isWhitelisted || hasAdminRole;

      // If whitelisted but profile role is still 'user', promote in DB if possible
      if (isWhitelisted && profile && profile.role !== 'admin') {
        supabase
          .from('profiles')
          .update({ role: 'admin' })
          .eq('id', session.user.id)
          .then(() => {
            // Updated in background
          })
          .catch(() => {});
      }

      setState({
        loading: false,
        isAdmin: userIsAdmin,
        profile: profile ? { ...profile, role: userIsAdmin ? 'admin' : profile.role } as Profile : null,
        error: null,
      });
    }

    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      check();
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  return state;
}

