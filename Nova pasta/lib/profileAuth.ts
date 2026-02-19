import { AccessProfileType, CouncilType, DocumentType, User } from '../types';

const AUTH_EMAIL_DOMAIN = 'login.cicloplus.local';
export const SYSTEM_MANAGER_LOGIN = String(import.meta.env.VITE_GESTOR_LOGIN ?? 'gestor')
  .trim()
  .toLowerCase();
export const SYSTEM_MANAGER_PASSWORD = String(import.meta.env.VITE_GESTOR_PASSWORD ?? '159375').trim();
export const SYSTEM_MANAGER_AUTH_EMAIL = `gestor.sistema@${AUTH_EMAIL_DOMAIN}`;
const STATE_REGISTRATION_PATTERN = /^(ISENTO|[0-9A-Z]{8,14})$/;
const COUNCIL_NUMBER_PATTERN = /^[0-9A-Z./-]{4,20}$/;

export interface AccessProfileDefinition {
  profileType: AccessProfileType;
  label: string;
  role: User['role'];
  identifierType: DocumentType;
  identifierLabel: 'CPF' | 'CNPJ' | 'Login';
  identifierPlaceholder: string;
  nameLabel: string;
  namePlaceholder: string;
  requiresStateRegistration: boolean;
  requiresSpecialty: boolean;
  requiresCouncilData: boolean;
  simulationOnly: boolean;
}

export const ACCESS_PROFILE_DEFINITIONS: Record<AccessProfileType, AccessProfileDefinition> = {
  PRODUTOR: {
    profileType: 'PRODUTOR',
    label: 'Produtor',
    role: 'Produtor',
    identifierType: 'CPF',
    identifierLabel: 'CPF',
    identifierPlaceholder: '000.000.000-00',
    nameLabel: 'Nome',
    namePlaceholder: 'Nome completo',
    requiresStateRegistration: true,
    requiresSpecialty: false,
    requiresCouncilData: false,
    simulationOnly: false,
  },
  EMPRESA_FORNECEDORA: {
    profileType: 'EMPRESA_FORNECEDORA',
    label: 'Empresa Fornecedora',
    role: 'Fornecedor',
    identifierType: 'CNPJ',
    identifierLabel: 'CNPJ',
    identifierPlaceholder: '00.000.000/0000-00',
    nameLabel: 'Razao social',
    namePlaceholder: 'Razao social',
    requiresStateRegistration: true,
    requiresSpecialty: false,
    requiresCouncilData: false,
    simulationOnly: false,
  },
  EMPRESA_INTEGRADORA: {
    profileType: 'EMPRESA_INTEGRADORA',
    label: 'Empresa Integradora',
    role: 'Integradora',
    identifierType: 'CNPJ',
    identifierLabel: 'CNPJ',
    identifierPlaceholder: '00.000.000/0000-00',
    nameLabel: 'Razao social',
    namePlaceholder: 'Razao social',
    requiresStateRegistration: true,
    requiresSpecialty: false,
    requiresCouncilData: false,
    simulationOnly: false,
  },
  OPERADOR: {
    profileType: 'OPERADOR',
    label: 'Operador',
    role: 'Operador',
    identifierType: 'CPF',
    identifierLabel: 'CPF',
    identifierPlaceholder: '000.000.000-00',
    nameLabel: 'Nome',
    namePlaceholder: 'Nome completo',
    requiresStateRegistration: false,
    requiresSpecialty: false,
    requiresCouncilData: false,
    simulationOnly: false,
  },
  TECNICO: {
    profileType: 'TECNICO',
    label: 'Tecnico',
    role: 'T\u00e9cnico',
    identifierType: 'CPF',
    identifierLabel: 'CPF',
    identifierPlaceholder: '000.000.000-00',
    nameLabel: 'Nome',
    namePlaceholder: 'Nome completo',
    requiresStateRegistration: false,
    requiresSpecialty: true,
    requiresCouncilData: true,
    simulationOnly: false,
  },
  GESTOR: {
    profileType: 'GESTOR',
    label: 'Gestor',
    role: 'Gestor',
    identifierType: 'LOGIN',
    identifierLabel: 'Login',
    identifierPlaceholder: SYSTEM_MANAGER_LOGIN,
    nameLabel: 'Nome',
    namePlaceholder: 'Gestor do Sistema',
    requiresStateRegistration: false,
    requiresSpecialty: false,
    requiresCouncilData: false,
    simulationOnly: false,
  },
};

const PROFILE_ORDER: AccessProfileType[] = [
  'PRODUTOR',
  'EMPRESA_FORNECEDORA',
  'EMPRESA_INTEGRADORA',
  'OPERADOR',
  'TECNICO',
  'GESTOR',
];

export const ACCESS_PROFILE_OPTIONS: AccessProfileDefinition[] = PROFILE_ORDER.map(
  (profileType) => ACCESS_PROFILE_DEFINITIONS[profileType]
);

const onlyDigits = (value: string): string => value.replace(/\D/g, '');

const normalizeSpacing = (value: string): string => value.trim().replace(/\s+/g, ' ');

const buildStableHash = (value: string): string => {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
};

const buildInternalAuthEmail = (profileType: AccessProfileType, documentNumber: string): string => {
  const profileSegment = profileType.toLowerCase().replace(/_/g, '-');
  const fingerprint = buildStableHash(`${profileType}:${documentNumber}`);
  const suffix = documentNumber.slice(-4);
  return `${profileSegment}.${fingerprint}.${suffix}@${AUTH_EMAIL_DOMAIN}`;
};

const isValidCpf = (value: string): boolean => {
  if (!/^\d{11}$/.test(value) || /^(\d)\1{10}$/.test(value)) {
    return false;
  }

  const numbers = value.split('').map(Number);

  const digit1Base = numbers.slice(0, 9);
  const digit1Sum = digit1Base.reduce((acc, current, index) => acc + current * (10 - index), 0);
  const digit1 = (digit1Sum * 10) % 11;
  if ((digit1 === 10 ? 0 : digit1) !== numbers[9]) {
    return false;
  }

  const digit2Base = numbers.slice(0, 10);
  const digit2Sum = digit2Base.reduce((acc, current, index) => acc + current * (11 - index), 0);
  const digit2 = (digit2Sum * 10) % 11;
  return (digit2 === 10 ? 0 : digit2) === numbers[10];
};

const isValidCnpj = (value: string): boolean => {
  if (!/^\d{14}$/.test(value) || /^(\d)\1{13}$/.test(value)) {
    return false;
  }

  const digits = value.split('').map(Number);
  const calculateDigit = (base: number[], factors: number[]): number => {
    const sum = base.reduce((acc, current, index) => acc + current * factors[index], 0);
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };

  const digit1 = calculateDigit(digits.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  if (digit1 !== digits[12]) {
    return false;
  }

  const digit2 = calculateDigit(digits.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return digit2 === digits[13];
};

const normalizeAndValidateIdentifier = (profileType: AccessProfileType, identifier: string): {
  documentType: DocumentType;
  documentNumber: string;
} => {
  const profile = ACCESS_PROFILE_DEFINITIONS[profileType];

  if (profileType === 'GESTOR') {
    const normalizedLogin = identifier.trim().toLowerCase();
    if (!normalizedLogin) {
      throw new Error('Informe o login do Gestor.');
    }
    if (normalizedLogin !== SYSTEM_MANAGER_LOGIN) {
      throw new Error('Login do Gestor invalido.');
    }
    return { documentType: 'LOGIN', documentNumber: normalizedLogin };
  }

  const documentNumber = onlyDigits(identifier);

  if (profile.identifierType === 'CPF') {
    if (!isValidCpf(documentNumber)) {
      throw new Error('CPF invalido para o perfil selecionado.');
    }
    return { documentType: 'CPF', documentNumber };
  }

  if (!isValidCnpj(documentNumber)) {
    throw new Error('CNPJ invalido para o perfil selecionado.');
  }
  return { documentType: 'CNPJ', documentNumber };
};

const normalizeAndValidateStateRegistration = (value: string): string => {
  const normalized = value.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (!STATE_REGISTRATION_PATTERN.test(normalized)) {
    throw new Error('Inscricao estadual invalida. Use 8 a 14 caracteres alfanumericos ou ISENTO.');
  }
  return normalized;
};

const normalizeAndValidateCouncilNumber = (value: string): string => {
  const normalized = value.trim().toUpperCase().replace(/\s+/g, '');
  if (!COUNCIL_NUMBER_PATTERN.test(normalized)) {
    throw new Error('Numero de conselho invalido.');
  }
  return normalized;
};

export interface ResolvedProfileIdentity {
  profileType: AccessProfileType;
  role: User['role'];
  simulationOnly: boolean;
  documentType: DocumentType;
  documentNumber: string;
  authEmail: string;
}

export interface RegisterProfileInput {
  profileType: AccessProfileType;
  displayName: string;
  identifier: string;
  stateRegistration?: string;
  specialty?: string;
  councilType?: CouncilType | '';
  councilNumber?: string;
}

export interface NormalizedRegisterProfileData extends ResolvedProfileIdentity {
  displayName: string;
  stateRegistration?: string;
  specialty?: string;
  councilType?: CouncilType;
  councilNumber?: string;
}

export const resolveProfileIdentity = (
  profileType: AccessProfileType,
  identifier: string
): ResolvedProfileIdentity => {
  const profile = ACCESS_PROFILE_DEFINITIONS[profileType];
  if (!profile) {
    throw new Error('Perfil de acesso invalido.');
  }

  const { documentType, documentNumber } = normalizeAndValidateIdentifier(profileType, identifier);
  const authEmail = profileType === 'GESTOR' ? SYSTEM_MANAGER_AUTH_EMAIL : buildInternalAuthEmail(profileType, documentNumber);
  return {
    profileType,
    role: profile.role,
    simulationOnly: profile.simulationOnly,
    documentType,
    documentNumber,
    authEmail,
  };
};

export const normalizeRegisterProfileData = (
  input: RegisterProfileInput
): NormalizedRegisterProfileData => {
  const profile = ACCESS_PROFILE_DEFINITIONS[input.profileType];
  const identity = resolveProfileIdentity(input.profileType, input.identifier);

  const displayName = normalizeSpacing(input.displayName);
  if (displayName.length < 3) {
    throw new Error('Informe o nome/razao social com pelo menos 3 caracteres.');
  }

  let stateRegistration: string | undefined;
  if (profile.requiresStateRegistration) {
    if (!input.stateRegistration || !input.stateRegistration.trim()) {
      throw new Error('Inscricao estadual obrigatoria para o perfil selecionado.');
    }
    stateRegistration = normalizeAndValidateStateRegistration(input.stateRegistration);
  }

  let specialty: string | undefined;
  if (profile.requiresSpecialty) {
    specialty = normalizeSpacing(input.specialty ?? '');
    if (specialty.length < 3) {
      throw new Error('Especialidade obrigatoria para o perfil Tecnico.');
    }
  }

  let councilType: CouncilType | undefined;
  let councilNumber: string | undefined;
  if (profile.requiresCouncilData) {
    if (!input.councilType || !['CRMV', 'CFTA', 'CREA'].includes(input.councilType)) {
      throw new Error('Selecione o conselho profissional (CRMV, CFTA ou CREA).');
    }
    if (!input.councilNumber || !input.councilNumber.trim()) {
      throw new Error('Numero de conselho obrigatorio para Tecnico.');
    }
    councilType = input.councilType;
    councilNumber = normalizeAndValidateCouncilNumber(input.councilNumber);
  }

  return {
    ...identity,
    displayName,
    stateRegistration,
    specialty,
    councilType,
    councilNumber,
  };
};

export const inferProfileTypeFromRole = (role: unknown): AccessProfileType | undefined => {
  switch (role) {
    case 'Produtor':
      return 'PRODUTOR';
    case 'Fornecedor':
      return 'EMPRESA_FORNECEDORA';
    case 'Integradora':
      return 'EMPRESA_INTEGRADORA';
    case 'Operador':
      return 'OPERADOR';
    case 'T\u00e9cnico':
    case 'Tecnico':
      return 'TECNICO';
    case 'Gestor':
      return 'GESTOR';
    default:
      return undefined;
  }
};
