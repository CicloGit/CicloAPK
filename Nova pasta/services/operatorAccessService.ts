import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { resolveProfileIdentity } from '../lib/profileAuth';
import { OperatorAccessAuthorization } from '../types';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const operatorAccessCollection = collection(db, 'operatorAccessAuthorizations');

const normalizeDocument = (value: string): string => value.replace(/\D/g, '');
const normalizePropertyRegistration = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');

const normalizeIsoDate = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  const asTimestamp = value as { toDate?: () => Date } | undefined;
  if (asTimestamp && typeof asTimestamp.toDate === 'function') {
    return asTimestamp.toDate().toISOString();
  }
  return new Date().toISOString();
};

const toAuthorization = (id: string, raw: Record<string, unknown>): OperatorAccessAuthorization => ({
  id,
  tenantId: String(raw.tenantId ?? ''),
  producerId: String(raw.producerId ?? ''),
  producerName: String(raw.producerName ?? ''),
  propertyId: String(raw.propertyId ?? ''),
  propertyName: String(raw.propertyName ?? ''),
  propertyRegistrationNumber: String(raw.propertyRegistrationNumber ?? ''),
  operatorName: String(raw.operatorName ?? ''),
  operatorDocumentNumber: String(raw.operatorDocumentNumber ?? ''),
  operatorAuthEmail: String(raw.operatorAuthEmail ?? ''),
  status: (() => {
    const status = String(raw.status ?? '').toUpperCase();
    if (status === 'CONCLUIDO' || status === 'CANCELADO') {
      return status as OperatorAccessAuthorization['status'];
    }
    return 'ATIVO';
  })(),
  createdByUserId: String(raw.createdByUserId ?? ''),
  createdAt: normalizeIsoDate(raw.createdAt),
  linkedUserId: raw.linkedUserId ? String(raw.linkedUserId) : undefined,
  linkedAt: raw.linkedAt ? normalizeIsoDate(raw.linkedAt) : undefined,
});

const loadCurrentUserProfile = async (): Promise<Record<string, unknown>> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('Usuario nao autenticado.');
  }

  const snapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
  if (!snapshot.exists()) {
    throw new Error('Perfil do usuario atual nao encontrado.');
  }

  return snapshot.data() as Record<string, unknown>;
};

export interface CreateOperatorAuthorizationPayload {
  operatorName: string;
  operatorIdentifier: string;
  propertyId: string;
  propertyName: string;
  propertyRegistrationNumber: string;
  producerName: string;
}

export interface ConsumedOperatorAuthorization {
  authorizationId: string;
  tenantId: string;
  producerId: string;
  producerName: string;
  propertyId: string;
  propertyName: string;
  propertyRegistrationNumber: string;
  operatorName: string;
  operatorDocumentNumber: string;
  authorizedByUserId: string;
}

export const operatorAccessService = {
  async listAuthorizations(): Promise<OperatorAccessAuthorization[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(
      query(operatorAccessCollection, where('tenantId', '==', context.tenantId))
    );

    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, authorization: toAuthorization(docSnapshot.id, raw) };
      })
      .map((entry: { authorization: OperatorAccessAuthorization }) => entry.authorization)
      .sort(
        (a: OperatorAccessAuthorization, b: OperatorAccessAuthorization) =>
          b.createdAt.localeCompare(a.createdAt)
      );
  },

  async createAuthorization(payload: CreateOperatorAuthorizationPayload): Promise<OperatorAccessAuthorization> {
    const context = await resolveTenantContext();
    const profile = await loadCurrentUserProfile();
    const currentRole = String(profile.role ?? '');
    if (currentRole !== 'Produtor' && currentRole !== 'Gestor' && currentRole !== 'Administrador') {
      throw new Error('Somente produtor/gestor pode autorizar conta de operador.');
    }

    if (!payload.operatorName.trim()) {
      throw new Error('Informe o nome do operador.');
    }
    if (!payload.propertyId.trim() || !payload.propertyName.trim()) {
      throw new Error('Selecione a fazenda/propriedade para vincular o operador.');
    }
    const normalizedPropertyRegistration = normalizePropertyRegistration(payload.propertyRegistrationNumber);
    if (!normalizedPropertyRegistration) {
      throw new Error('Informe a inscricao da propriedade (CAR/IE) para autorizar o operador.');
    }

    const identity = resolveProfileIdentity('OPERADOR', payload.operatorIdentifier);
    const operatorDocumentNumber = normalizeDocument(identity.documentNumber);

    const duplicatedSnapshot = await getDocs(
      query(
        operatorAccessCollection,
        where('tenantId', '==', context.tenantId),
        where('operatorDocumentNumber', '==', operatorDocumentNumber)
      )
    );
    const hasActiveDuplicate = duplicatedSnapshot.docs.some((docSnapshot: any) => {
      const raw = docSnapshot.data() as Record<string, unknown>;
      const status = String(raw.status ?? '').toUpperCase();
      return hasTenantAccess(raw, context) && status === 'ATIVO';
    });
    if (hasActiveDuplicate) {
      throw new Error('Ja existe autorizacao ativa para este operador nesta empresa.');
    }

    const nowIso = new Date().toISOString();
    const record = {
      tenantId: context.tenantId,
      producerId: context.userId,
      producerName: payload.producerName.trim() || 'Produtor',
      propertyId: payload.propertyId.trim(),
      propertyName: payload.propertyName.trim(),
      propertyRegistrationNumber: normalizedPropertyRegistration,
      operatorName: payload.operatorName.trim(),
      operatorDocumentNumber,
      operatorAuthEmail: identity.authEmail.trim().toLowerCase(),
      status: 'ATIVO' as OperatorAccessAuthorization['status'],
      createdAt: nowIso,
      linkedUserId: null,
      linkedAt: null,
    };

    const createdRef = await addDoc(
      operatorAccessCollection,
      withTenantFields(
        {
          ...record,
          createdAtServer: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      )
    );

    return {
      id: createdRef.id,
      ...record,
      createdByUserId: context.userId,
      linkedUserId: undefined,
      linkedAt: undefined,
    };
  },

  async cancelAuthorization(authorizationId: string): Promise<void> {
    if (!authorizationId.trim()) {
      throw new Error('Autorizacao invalida.');
    }

    const context = await resolveTenantContext();
    const targetRef = doc(db, 'operatorAccessAuthorizations', authorizationId);
    const snapshot = await getDoc(targetRef);
    if (!snapshot.exists()) {
      throw new Error('Autorizacao nao encontrada.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para cancelar autorizacao de outro tenant.');
    }

    await updateDoc(targetRef, {
      status: 'CANCELADO',
      updatedAt: serverTimestamp(),
    });
  },

  async consumeAuthorizationForCurrentUser(
    expectedDocumentNumber: string,
    expectedPropertyRegistrationNumber?: string
  ): Promise<ConsumedOperatorAuthorization> {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser?.email) {
      throw new Error('Usuario operador sem email de autenticacao.');
    }

    const normalizedDocument = normalizeDocument(expectedDocumentNumber);
    const normalizedPropertyRegistration = normalizePropertyRegistration(expectedPropertyRegistrationNumber ?? '');
    if (!normalizedDocument) {
      throw new Error('Documento do operador nao informado.');
    }

    const snapshot = await getDocs(
      query(operatorAccessCollection, where('operatorAuthEmail', '==', firebaseUser.email.trim().toLowerCase()))
    );

    const candidates = snapshot.docs
      .map((docSnapshot: any) => toAuthorization(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .filter(
        (entry: OperatorAccessAuthorization) =>
          entry.status === 'ATIVO' &&
          normalizeDocument(entry.operatorDocumentNumber) === normalizedDocument &&
          (!normalizedPropertyRegistration ||
            normalizePropertyRegistration(entry.propertyRegistrationNumber) === normalizedPropertyRegistration)
      )
      .sort(
        (a: OperatorAccessAuthorization, b: OperatorAccessAuthorization) =>
          b.createdAt.localeCompare(a.createdAt)
      );

    const selected = candidates[0];
    if (!selected) {
      throw new Error(
        'Cadastro de operador bloqueado. Solicite ao produtor responsavel a autorizacao no portal da propriedade (inscricao CAR/IE).'
      );
    }

    const targetRef = doc(db, 'operatorAccessAuthorizations', selected.id);
    await updateDoc(targetRef, {
      status: 'CONCLUIDO',
      linkedUserId: firebaseUser.uid,
      linkedAt: new Date().toISOString(),
      updatedAt: serverTimestamp(),
    });

    return {
      authorizationId: selected.id,
      tenantId: selected.tenantId,
      producerId: selected.producerId,
      producerName: selected.producerName,
      propertyId: selected.propertyId,
      propertyName: selected.propertyName,
      propertyRegistrationNumber: selected.propertyRegistrationNumber,
      operatorName: selected.operatorName,
      operatorDocumentNumber: selected.operatorDocumentNumber,
      authorizedByUserId: selected.createdByUserId,
    };
  },
};
