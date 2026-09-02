import { useState, useEffect } from 'react';
import {
  authSignIn,
  authSignUp,
  authSignOut,
  authResend,
  authResetPasswordForEmail,
  authUpdatePassword,
  authGetSession,
  authOnChange,
  isSupabaseConfigured,
} from '../services/supabase';

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery');
  });

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

    // Listen for login/logout and recovery events
    const unsub = authOnChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
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

  const resetPassword = async (email) => {
    return await authResetPasswordForEmail(email);
  };

  const updatePassword = async (newPassword) => {
    const res = await authUpdatePassword(newPassword);
    setIsPasswordRecovery(false);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    return res;
  };

  const clearPasswordRecovery = () => {
    setIsPasswordRecovery(false);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname);
    }
  };

  return {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    resendConfirm,
    resetPassword,
    updatePassword,
    isPasswordRecovery,
    clearPasswordRecovery,
  };
}
