import { useState, useEffect } from 'react';
import {
  authSignIn,
  authSignUp,
  authSignOut,
  authGetSession,
  authOnChange,
  isSupabaseConfigured,
} from '../services/supabase';

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    // Restore existing session on mount
    authGetSession().then(session => {
      setUser(session?.user || null);
      setLoading(false);
    });

    // Listen for login/logout events
    const unsub = authOnChange((_event, session) => {
      setUser(session?.user || null);
      setLoading(false);
    });

    return unsub;
  }, []);

  const signIn = async (email, password) => {
    const data = await authSignIn(email, password);
    return data;
  };

  const signUp = async (email, password) => {
    const data = await authSignUp(email, password);
    return data;
  };

  const signOut = async () => {
    await authSignOut();
    setUser(null);
    // Clear local cache so we don't show stale data
    localStorage.removeItem('toeic_transcripts');
    localStorage.removeItem('toeic_chunks');
    localStorage.removeItem('toeic_situations');
    localStorage.removeItem('toeic_progress');
  };

  return { user, loading, signIn, signUp, signOut };
}
