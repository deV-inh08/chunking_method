import { useState, useEffect } from 'react';
import {
  authSignIn,
  authSignUp,
  authSignOut,
  authResend,
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

    let isMounted = true;

    // Restore existing session on mount
    authGetSession()
      .then(session => {
        if (isMounted) {
          setUser(session?.user || null);
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('Session restore error:', err);
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      });

    // Listen for login/logout events
    const unsub = authOnChange((_event, session) => {
      if (isMounted) {
        setUser(session?.user || null);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
      if (typeof unsub === 'function') unsub();
    };
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
    // Clear local cache so we don't show stale data when another user logs in
    localStorage.removeItem('toeic_transcripts');
    localStorage.removeItem('toeic_chunks');
    localStorage.removeItem('toeic_situations');
    localStorage.removeItem('toeic_progress');
    localStorage.removeItem('toeic_vocab_cache'); // vocab cache
  };

  const resendConfirm = async (email) => {
    await authResend(email);
  };

  return { user, loading, signIn, signUp, signOut, resendConfirm };
}
