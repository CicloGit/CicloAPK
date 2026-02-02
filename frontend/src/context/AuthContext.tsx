import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut as fbSignOut } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { firebaseAuth } from '../firebase';
import { apiClient } from '../api/client';

export type Role = 'owner' | 'admin' | 'technician' | 'client_user' | 'supplier';

export interface AuthSession {
  role: Role | null;
  tenantId?: string;
  userId?: string;
  email?: string;
  displayName?: string;
  idToken?: string;
}

interface AuthContextValue {
  session: AuthSession;
  status: 'idle' | 'loading' | 'authenticated';
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshMe: () => Promise<void>;
  devSignInAs?: (role: Role, tenantId?: string) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const DEV_ROLE_SWITCH = __DEV__ && process.env.EXPO_PUBLIC_DEV_ROLE_SWITCH !== 'false';
const TOKEN_KEY = 'ciclo_id_token';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<AuthSession>({ role: null });
  const [status, setStatus] = useState<'idle' | 'loading' | 'authenticated'>('idle');
  const fetchMe = async (idToken: string) => {
    apiClient.defaults.headers.common.Authorization = `Bearer ${idToken}`;
    const { data } = await apiClient.get('/auth/me');
    setSession({
      role: data.role,
      tenantId: data.tenantId,
      userId: data.uid,
      email: data.email,
      displayName: data.displayName,
      idToken,
    });
    setStatus('authenticated');
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        setSession({ role: null });
        setStatus('idle');
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        return;
      }
      setStatus('loading');
      const idToken = await user.getIdToken(true);
      await SecureStore.setItemAsync(TOKEN_KEY, idToken);
      await fetchMe(idToken);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setStatus('loading');
    await signInWithEmailAndPassword(firebaseAuth, email, password);
  };

  const signOut = async () => {
    await fbSignOut(firebaseAuth);
    setSession({ role: null });
    setStatus('idle');
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  };

  const refreshMe = async () => {
    if (!session.idToken) return;
    await fetchMe(session.idToken);
  };

  const value: AuthContextValue = {
    session,
    status,
    signIn,
    signOut,
    refreshMe,
  };

  if (DEV_ROLE_SWITCH) {
    value.devSignInAs = (role: Role, tenantId = 'demo-tenant') =>
      setSession({ role, tenantId, userId: 'dev', email: 'dev@local', idToken: 'dev' });
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
