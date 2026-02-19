import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  createUserWithEmailAndPassword,
  fetchSignInMethodsForEmail,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { AccessProfileType, CouncilType, DocumentType, OperationalActionType, ProducerScopes, User } from '../types';
import { auth, db } from '../config/firebase';
import { authClaimsService, claimsRoleToUserRole, ResolvedAuthClaims } from '../services/authClaimsService';
import {
  ACCESS_PROFILE_DEFINITIONS,
  inferProfileTypeFromRole,
  normalizeRegisterProfileData,
  resolveProfileIdentity,
  SYSTEM_MANAGER_LOGIN,
  SYSTEM_MANAGER_PASSWORD,
} from '../lib/profileAuth';

type FirebaseUser = NonNullable<typeof auth.currentUser>;

interface AppState {
  currentUser: User | null;
  selectedProductionId: string | null;
  currentAction: OperationalActionType | null;
  isAuthLoading: boolean;
}

interface LoginPayload {
  profileType: AccessProfileType;
  identifier: string;
  password: string;
}

interface RegisterPayload {
  profileType: AccessProfileType;
  name: string;
  identifier: string;
  password: string;
  stateRegistration?: string;
  specialty?: string;
  councilType?: CouncilType | '';
  councilNumber?: string;
}

interface AppContextType extends AppState {
  login: (payload: LoginPayload) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  setSelectedProductionId: (id: string | null) => void;
  setCurrentAction: (action: OperationalActionType | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);
const ROLE_ALIASES: Record<string, User['role']> = {
  PRODUTOR: 'Produtor',
  GESTOR: 'Gestor',
  TECNICO: 'T\u00e9cnico',
  INVESTIDOR: 'Investidor',
  FORNECEDOR: 'Fornecedor',
  INTEGRADORA: 'Integradora',
  OPERADOR: 'Operador',
  GESTOR_DE_TRAFEGO: 'Gestor de Trafego',
  ADMINISTRADOR: 'Administrador',
};

const normalizeRole = (role: unknown): User['role'] => {
  if (typeof role !== 'string') {
    return 'Produtor';
  }

  if (role === 'Produtor de Sementes') {
    return 'Produtor';
  }

  const normalized = role
    .replace(/T\u00c3\u0192\u00c2\u00a9cnico/gi, 'Tecnico')
    .replace(/T\u00c3\u00a9cnico/gi, 'Tecnico')
    .trim()
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

  return ROLE_ALIASES[normalized] ?? 'Produtor';
};

const normalizeProducerScopes = (value: unknown): ProducerScopes => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const raw = value as Record<string, unknown>;
  return {
    seedProducer: raw.seedProducer === true,
  };
};

const mergeProducerScopes = (profileScopes: ProducerScopes, claimScopes: ProducerScopes, legacyRole: unknown): ProducerScopes => ({
  seedProducer:
    profileScopes.seedProducer === true ||
    claimScopes.seedProducer === true ||
    String(legacyRole ?? '') === 'Produtor de Sementes',
});

const mapAuthErrorMessage = (error: unknown): string => {
  const code = (error as { code?: string } | undefined)?.code ?? '';
  switch (code) {
    case 'auth/invalid-email':
      return 'Identificador invalido.';
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Credenciais invalidas.';
    case 'auth/email-already-in-use':
      return 'Ja existe um cadastro para este perfil.';
    case 'auth/weak-password':
      return 'Senha fraca. Use pelo menos 6 caracteres.';
    case 'auth/network-request-failed':
      return 'Falha de rede ao comunicar com o Firebase.';
    default:
      return 'Nao foi possivel concluir a autenticacao.';
  }
};

const normalizeProfileType = (value: unknown, fallbackRole: unknown): AccessProfileType | undefined => {
  if (typeof value === 'string' && Object.prototype.hasOwnProperty.call(ACCESS_PROFILE_DEFINITIONS, value)) {
    return value as AccessProfileType;
  }
  return inferProfileTypeFromRole(fallbackRole);
};

const normalizeDocumentType = (value: unknown): DocumentType | undefined => {
  if (value === 'CPF' || value === 'CNPJ' || value === 'LOGIN') {
    return value;
  }
  return undefined;
};

const normalizeDocumentNumber = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeCouncilType = (value: unknown): CouncilType | undefined => {
  if (value === 'CRMV' || value === 'CFTA' || value === 'CREA') {
    return value;
  }
  return undefined;
};

const normalizeText = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
};

const isSimulationOnlyRole = (_role: User['role']): boolean => false;
const isSystemManagerMasterCredentials = (identifier: string, password: string): boolean =>
  identifier.trim().toLowerCase() === SYSTEM_MANAGER_LOGIN && password === SYSTEM_MANAGER_PASSWORD;

const userDocRef = (uid: string) => doc(db, 'users', uid);

const ensureSystemManagerProfile = async (firebaseUser: FirebaseUser): Promise<void> => {
  await setDoc(
    userDocRef(firebaseUser.uid),
    {
      name: 'Gestor do Sistema',
      role: 'Gestor',
      email: firebaseUser.email ?? null,
      tenantId: firebaseUser.uid,
      profileType: 'GESTOR',
      documentType: 'LOGIN',
      documentNumber: SYSTEM_MANAGER_LOGIN,
      stateRegistration: null,
      specialty: null,
      councilType: null,
      councilNumber: null,
      simulationOnly: false,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
};

const ensureUserProfile = async (firebaseUser: FirebaseUser): Promise<Partial<User>> => {
  const ref = userDocRef(firebaseUser.uid);
  const snapshot = await getDoc(ref);

  if (snapshot.exists()) {
    const profile = snapshot.data() as Partial<User>;
    const updates: Record<string, unknown> = {};

    if (!profile.tenantId) {
      updates.tenantId = firebaseUser.uid;
      profile.tenantId = firebaseUser.uid;
    }

    if (String(profile.role ?? '') === 'Produtor de Sementes') {
      updates.role = 'Produtor';
      updates.producerScopes = {
        ...(normalizeProducerScopes(profile.producerScopes) ?? {}),
        seedProducer: true,
      };
      profile.role = 'Produtor';
      profile.producerScopes = {
        ...(normalizeProducerScopes(profile.producerScopes) ?? {}),
        seedProducer: true,
      };
    }

    const inferredProfileType = normalizeProfileType(profile.profileType, profile.role);
    if (inferredProfileType && profile.profileType !== inferredProfileType) {
      updates.profileType = inferredProfileType;
      profile.profileType = inferredProfileType;
    }

    if ((profile.profileType === 'GESTOR' || normalizeRole(profile.role) === 'Gestor') && profile.role !== 'Gestor') {
      updates.role = 'Gestor';
      profile.role = 'Gestor';
    }

    if (profile.simulationOnly !== false) {
      updates.simulationOnly = false;
      profile.simulationOnly = false;
    }

    if (Object.keys(updates).length > 0) {
      updates.updatedAt = serverTimestamp();
      await setDoc(ref, updates, { merge: true });
    }

    return profile;
  }

  const fallbackName = firebaseUser.email?.split('@')[0] ?? 'Usuario';
  const profile: Partial<User> = {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? undefined,
    name: fallbackName,
    role: 'Produtor',
    profileType: 'PRODUTOR',
    simulationOnly: false,
    tenantId: firebaseUser.uid,
    producerScopes: { seedProducer: false },
  };

  await setDoc(
    ref,
    {
      name: profile.name,
      role: profile.role,
      email: profile.email ?? null,
      tenantId: profile.tenantId ?? firebaseUser.uid,
      producerScopes: profile.producerScopes,
      profileType: profile.profileType ?? null,
      documentType: null,
      documentNumber: null,
      stateRegistration: null,
      specialty: null,
      councilType: null,
      councilNumber: null,
      simulationOnly: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  return profile;
};

const buildUser = (
  firebaseUser: FirebaseUser,
  profile: Partial<User>,
  claims: ResolvedAuthClaims
): User => {
  const fallbackName = firebaseUser.email?.split('@')[0] ?? 'Usuario';
  const roleFromClaims = claimsRoleToUserRole(claims.role);
  const resolvedRole = normalizeRole(roleFromClaims ?? profile.role);
  const profileScopes = normalizeProducerScopes(profile.producerScopes);
  const producerScopes = mergeProducerScopes(profileScopes, claims.producerScopes, profile.role);

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email ?? profile.email ?? undefined,
    name: profile.name ?? fallbackName,
    role: resolvedRole,
    tenantId: claims.tenantId ?? profile.tenantId ?? firebaseUser.uid,
    producerScopes,
    claimsRole: claims.role,
    profileType: normalizeProfileType(profile.profileType, resolvedRole),
    documentType: normalizeDocumentType(profile.documentType),
    documentNumber: normalizeDocumentNumber(profile.documentNumber),
    stateRegistration: normalizeText(profile.stateRegistration),
    specialty: normalizeText(profile.specialty),
    councilType: normalizeCouncilType(profile.councilType),
    councilNumber: normalizeText(profile.councilNumber),
    simulationOnly: profile.simulationOnly === true || isSimulationOnlyRole(resolvedRole),
  };
};

const hydrateCurrentUser = async (firebaseUser: FirebaseUser, forceRefreshClaims: boolean): Promise<User> => {
  const profile = await ensureUserProfile(firebaseUser);
  const claims = await authClaimsService.resolveClaims(firebaseUser, {
    forceRefresh: forceRefreshClaims,
    allowProfileFallback: true,
  });
  return buildUser(firebaseUser, profile, claims);
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProductionId, setSelectedProductionId] = useState<string | null>(null);
  const [currentAction, setCurrentAction] = useState<OperationalActionType | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    let mounted = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (!mounted) {
        return;
      }

      if (!firebaseUser) {
        setCurrentUser(null);
        setIsAuthLoading(false);
        return;
      }

      try {
        const hydrated = await hydrateCurrentUser(firebaseUser, true);
        if (mounted) {
          setCurrentUser(hydrated);
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

  const login = async ({ profileType, identifier, password }: LoginPayload): Promise<User> => {
    try {
      setIsAuthLoading(true);

      const usingManagerMasterCredentials = isSystemManagerMasterCredentials(identifier, password);
      const targetProfileType = usingManagerMasterCredentials ? 'GESTOR' : profileType;
      const normalizedIdentifier = usingManagerMasterCredentials ? SYSTEM_MANAGER_LOGIN : identifier;
      const identity = resolveProfileIdentity(targetProfileType, normalizedIdentifier);
      let credentials: Awaited<ReturnType<typeof signInWithEmailAndPassword>>;

      if (targetProfileType === 'GESTOR') {
        if (password !== SYSTEM_MANAGER_PASSWORD) {
          throw new Error('Senha padrao do Gestor invalida.');
        }

        try {
          credentials = await signInWithEmailAndPassword(auth, identity.authEmail, password);
        } catch (error) {
          const authCode = (error as { code?: string } | undefined)?.code ?? '';
          const signInMethods = await fetchSignInMethodsForEmail(auth, identity.authEmail).catch(() => []);

          if (signInMethods.length === 0 && (authCode === 'auth/user-not-found' || authCode === 'auth/invalid-credential')) {
            credentials = await createUserWithEmailAndPassword(auth, identity.authEmail, password);
          } else {
            throw error;
          }
        }

        await ensureSystemManagerProfile(credentials.user);
      } else {
        credentials = await signInWithEmailAndPassword(auth, identity.authEmail, password);
      }

      const hydrated = await hydrateCurrentUser(credentials.user, true);
      const hydratedProfileType = hydrated.profileType ?? inferProfileTypeFromRole(hydrated.role);

      if (!usingManagerMasterCredentials && hydratedProfileType && hydratedProfileType !== profileType) {
        await signOut(auth);
        throw new Error('Perfil selecionado nao corresponde ao cadastro informado.');
      }

      setCurrentUser(hydrated);
      setSelectedProductionId(null);
      setCurrentAction(null);
      return hydrated;
    } catch (error) {
      const authCode = (error as { code?: string } | undefined)?.code;
      if (!authCode && error instanceof Error) {
        throw error;
      }
      throw new Error(mapAuthErrorMessage(error));
    } finally {
      setIsAuthLoading(false);
    }
  };

  const register = async (payload: RegisterPayload): Promise<User> => {
    try {
      setIsAuthLoading(true);

      if (payload.profileType === 'GESTOR') {
        throw new Error('Perfil Gestor usa login padrao do sistema e nao permite criacao de conta.');
      }

      if (payload.password.length < 6) {
        throw new Error('Senha fraca. Use pelo menos 6 caracteres.');
      }

      const normalizedProfile = normalizeRegisterProfileData({
        profileType: payload.profileType,
        displayName: payload.name,
        identifier: payload.identifier,
        stateRegistration: payload.stateRegistration,
        specialty: payload.specialty,
        councilType: payload.councilType,
        councilNumber: payload.councilNumber,
      });

      const credentials = await createUserWithEmailAndPassword(auth, normalizedProfile.authEmail, payload.password);
      const role = normalizeRole(normalizedProfile.role);
      const profile: User = {
        uid: credentials.user.uid,
        email: normalizedProfile.authEmail,
        tenantId: credentials.user.uid,
        name: normalizedProfile.displayName,
        role,
        producerScopes: { seedProducer: false },
        profileType: normalizedProfile.profileType,
        documentType: normalizedProfile.documentType,
        documentNumber: normalizedProfile.documentNumber,
        stateRegistration: normalizedProfile.stateRegistration,
        specialty: normalizedProfile.specialty,
        councilType: normalizedProfile.councilType,
        councilNumber: normalizedProfile.councilNumber,
        simulationOnly: normalizedProfile.simulationOnly || isSimulationOnlyRole(role),
      };

      await setDoc(
        userDocRef(credentials.user.uid),
        {
          name: profile.name,
          role: profile.role,
          email: profile.email ?? null,
          tenantId: profile.tenantId,
          producerScopes: profile.producerScopes,
          profileType: profile.profileType ?? null,
          documentType: profile.documentType ?? null,
          documentNumber: profile.documentNumber ?? null,
          stateRegistration: profile.stateRegistration ?? null,
          specialty: profile.specialty ?? null,
          councilType: profile.councilType ?? null,
          councilNumber: profile.councilNumber ?? null,
          simulationOnly: profile.simulationOnly === true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      const hydrated = await hydrateCurrentUser(credentials.user, true);
      setCurrentUser(hydrated);
      setSelectedProductionId(null);
      setCurrentAction(null);
      return hydrated;
    } catch (error) {
      const authCode = (error as { code?: string } | undefined)?.code;
      if (!authCode && error instanceof Error) {
        throw error;
      }
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
