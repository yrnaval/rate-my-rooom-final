import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { checkAdminEmail } from '../admin/useAdmin';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: (redirectTo?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function syncProfile(user: User) {
      const name = (user.user_metadata?.full_name as string)
        || (user.user_metadata?.name as string)
        || user.email?.split('@')[0]
        || null;
      const avatar = (user.user_metadata?.avatar_url as string) || null;

      const isWhitelisted = await checkAdminEmail(user.email);

      await supabase.from('profiles').upsert(
        {
          id: user.id,
          email: user.email || '',
          name,
          avatar_url: avatar,
          ...(isWhitelisted ? { role: 'admin' } : {}),
        },
        { onConflict: 'id' },
      );

      const { data } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (!cancelled) {
        setIsAdmin(isWhitelisted || data?.role === 'admin');
      }
    }

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (cancelled) return;
      if (error) console.error('getSession error:', error);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) await syncProfile(session.user);
      else setIsAdmin(false);
      if (!cancelled) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        void syncProfile(session.user);
      } else {
        setIsAdmin(false);
      }
      setLoading(false);

      if (event === 'SIGNED_IN' && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (redirectTo?: string) => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTo || window.location.origin,
      },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
