import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { User, OperationalActionType } from '../types';
import { auth, db } from '../config/firebase';

interface AppState {
  currentUser: User | null;
  selectedProductionId: string | null;
  currentAction: OperationalActionType | null;
  isAuthLoading: boolean;
}

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: User['role'];
}

interface AppContextType extends AppState {
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  setSelectedProductionId: (id: string | null) => void;
  setCurrentAction: (action: OperationalActionType | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const VALID_ROLES: User['role'][] = ['Produtor', 'Gestor', 'Técnico', 'Investidor', 'Fornecedor', 'Integradora', 'Operador', 'Produtor de Sementes'];

const normalizeRole = (role: unknown): User['role'] => {
  if (typeof role !== 'string') {
    return 'Produtor';
  }
  return (VALID_ROLES.includes(role as User['role']) ? role : 'Produtor') as User['role'];
};

const mapAuthErrorMessage = (error: unknown): string => {
  const code = (error as { code?: string } | undefined)?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'E-mail invalido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Credenciais invalidas.';
    case 'auth/email-already-in-use':
      return 'Este e-mail ja esta em uso.';
    case 'auth/weak-password':
      return 'Senha fraca. Use pelo menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Falha de rede ao comunicar com o Firebase.';
    default:
      return 'Nao foi possivel concluir a autenticacao.';
  }
};

const buildUserFromProfile = (firebaseUser: any, profile: Partial<User> | undefined): User => {
  const fallbackName = firebaseUser.email?.split('@')[0] ?? 'Usuario';
  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? undefined,
    name: profile?.name ?? fallbackName,
    role: normalizeRole(profile?.role),
  };
};

const userDocRef = (uid: string) => doc(db, 'users', uid);

const ensureUserProfile = async (firebaseUser: any): Promise<User> => {
  const ref = userDocRef(firebaseUser.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    return buildUserFromProfile(firebaseUser, snapshot.data() as Partial<User>);
  }

  const fallbackUser = buildUserFromProfile(firebaseUser, undefined);
  await setDoc(
    ref,
    {
      name: fallbackUser.name,
      role: fallbackUser.role,
      email: fallbackUser.email ?? null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
  return fallbackUser;
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<OperationalActionType | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: any | null) => {
      if (!mounted) {
        return;
      }

      if (!firebaseUser) {
        setCurrentUser(null);
        setIsAuthLoading(false);
        return;
      }

      try {
        const profile = await ensureUserProfile(firebaseUser);
        if (mounted) {
          setCurrentUser(profile);
        }
      } catch {
        if (mounted) {
          setCurrentUser(null);
        }
      } finally {
        if (mounted) {
          setIsAuthLoading(false);
        }
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      setIsAuthLoading(true);
      const credentials = await signInWithEmailAndPassword(auth, email, password);
      const profile = await ensureUserProfile(credentials.user);
      setCurrentUser(profile);
      setSelectedProductionId(null);
      setCurrentAction(null);
      return profile;
    } catch (error) {
      throw new Error(mapAuthErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const register = async ({ name, email, password, role }: RegisterPayload): Promise<User> => {
    try {
      setIsAuthLoading(true);
      const credentials = await createUserWithEmailAndPassword(auth, email, password);
      const profile: User = {
        uid: credentials.user.uid,
        email,
        name,
        role: normalizeRole(role),
      };

      await setDoc(
        userDocRef(credentials.user.uid),
        {
          name: profile.name,
          role: profile.role,
          email: profile.email,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setCurrentUser(profile);
      setSelectedProductionId(null);
      setCurrentAction(null);
      return profile;
    } catch (error) {
      throw new Error(mapAuthErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setSelectedProductionId(null);
    setCurrentAction(null);
    void signOut(auth);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        selectedProductionId,
        currentAction,
        isAuthLoading,
        login,
        register,
        logout,
        setSelectedProductionId,
        setCurrentAction,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
