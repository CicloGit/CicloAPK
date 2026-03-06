import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  AuctionEvent,
  AuctionEventLotLink,
  AuctionEventStatus,
  AuctionBidEntry,
  AuctionBidSignal,
  AuctionBidSignalStatus,
  AuctionLiveStreamStatus,
  AuctionModality,
  AuctionParticipantChannel,
  AuctionPaymentStatus,
  AuctionLot,
  AuctionLotMedia,
  AuctionLotStatus,
  AuctioneerProfile,
  AuctionStreamProvider,
  AuctionTransportStatus,
} from '../types';
import { immutableAuditService } from './immutableAuditService';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const auctionLotsCollection = collection(db, 'auctionLots');
const auctioneerProfilesCollection = collection(db, 'auctioneerProfiles');
const auctionEventsCollection = collection(db, 'auctionEvents');
const auctionBidSignalsCollection = collection(db, 'auctionBidSignals');
const AUCTION_START_HOUR = 19;
const AUCTION_DURATION_DAYS = 7;
const DEFAULT_SERVICE_RADIUS_KM = 180;
const SIGNAL_ALLOWED_ROLES = new Set(['operador', 'leiloeiro', 'gestor', 'administrador']);
const SIGNAL_REVIEW_ALLOWED_ROLES = new Set(['leiloeiro', 'gestor', 'administrador']);

const nowIso = (): string => new Date().toISOString();
const toNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeRole = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const resolveCurrentUserRole = async (userId: string): Promise<string> => {
  const snapshot = await getDoc(doc(db, 'users', userId));
  if (!snapshot.exists()) {
    return '';
  }
  const raw = snapshot.data() as Record<string, unknown>;
  return normalizeRole(raw.role);
};

const normalizeStatus = (value: unknown): AuctionLotStatus => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (
    normalized === 'RECEBIDO' ||
    normalized === 'EM_ANALISE' ||
    normalized === 'PENDENTE_COMPLEMENTO' ||
    normalized === 'APROVADO' ||
    normalized === 'PUBLICADO' ||
    normalized === 'EM_LEILAO' ||
    normalized === 'FINALIZADO' ||
    normalized === 'REPROVADO'
  ) {
    return normalized as AuctionLotStatus;
  }
  return 'RECEBIDO';
};

const normalizeModality = (value: unknown): AuctionModality => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'PRESENCIAL' || normalized === 'ONLINE') {
    return normalized as AuctionModality;
  }
  return 'HIBRIDO';
};

const normalizeParticipantChannel = (value: unknown): AuctionParticipantChannel => {
  const normalized = String(value ?? '').trim().toUpperCase();
  return normalized === 'ONLINE' ? 'ONLINE' : 'PRESENCIAL';
};

const normalizeLiveStreamStatus = (value: unknown): AuctionLiveStreamStatus => {
  const status = String(value ?? '').trim().toUpperCase();
  if (status === 'AO_VIVO' || status === 'ENCERRADA') {
    return status as AuctionLiveStreamStatus;
  }
  return 'PREPARACAO';
};

const normalizeEventStatus = (value: unknown): AuctionEventStatus => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'AGENDADO' || normalized === 'AO_VIVO' || normalized === 'ENCERRADO' || normalized === 'CANCELADO') {
    return normalized as AuctionEventStatus;
  }
  return 'RASCUNHO';
};

const normalizeBidSignalStatus = (value: unknown): AuctionBidSignalStatus => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'VALIDADO' || normalized === 'REJEITADO') {
    return normalized as AuctionBidSignalStatus;
  }
  return 'RECEBIDO';
};

const normalizeStreamProvider = (value: unknown): AuctionStreamProvider | undefined => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'YOUTUBE' || normalized === 'VIMEO' || normalized === 'MEET' || normalized === 'TEAMS' || normalized === 'RTMP') {
    return normalized as AuctionStreamProvider;
  }
  if (normalized === 'OUTRO') {
    return 'OUTRO';
  }
  return undefined;
};

const toMedia = (raw: unknown): AuctionLotMedia => {
  const value = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  const mediaType = String(value.type ?? '').toUpperCase();
  return {
    id: String(value.id ?? `MEDIA-${Date.now()}`),
    type: mediaType === 'PHOTO' || mediaType === 'QR' ? (mediaType as AuctionLotMedia['type']) : 'VIDEO',
    reference: String(value.reference ?? ''),
    createdAt: String(value.createdAt ?? nowIso()),
  };
};

const toAuctionLot = (id: string, raw: Record<string, unknown>): AuctionLot => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  producerId: raw.producerId ? String(raw.producerId) : undefined,
  producerName: String(raw.producerName ?? ''),
  sourceLotId: raw.sourceLotId ? String(raw.sourceLotId) : undefined,
  propertyId: raw.propertyId ? String(raw.propertyId) : undefined,
  propertyName: raw.propertyName ? String(raw.propertyName) : undefined,
  propertyRegistrationNumber: raw.propertyRegistrationNumber ? String(raw.propertyRegistrationNumber) : undefined,
  locationLabel: raw.locationLabel ? String(raw.locationLabel) : undefined,
  geoCenter:
    raw.geoCenter && typeof raw.geoCenter === 'object'
      ? {
          lat: Number((raw.geoCenter as { lat?: unknown }).lat ?? 0),
          lon: Number((raw.geoCenter as { lon?: unknown }).lon ?? 0),
        }
      : undefined,
  lotName: String(raw.lotName ?? ''),
  category: String(raw.category ?? ''),
  headcount: raw.headcount !== undefined && raw.headcount !== null ? Number(raw.headcount) : undefined,
  totalWeightKg: raw.totalWeightKg !== undefined && raw.totalWeightKg !== null ? Number(raw.totalWeightKg) : undefined,
  reservePrice: raw.reservePrice !== undefined && raw.reservePrice !== null ? Number(raw.reservePrice) : undefined,
  isPublicOffer: raw.isPublicOffer !== false,
  auctionStartAt: raw.auctionStartAt ? String(raw.auctionStartAt) : undefined,
  auctionDate: raw.auctionDate ? String(raw.auctionDate) : undefined,
  auctionEndAt: raw.auctionEndAt ? String(raw.auctionEndAt) : undefined,
  auctionDurationDays:
    raw.auctionDurationDays !== undefined && raw.auctionDurationDays !== null ? Number(raw.auctionDurationDays) : undefined,
  bidCount: raw.bidCount !== undefined && raw.bidCount !== null ? Number(raw.bidCount) : undefined,
  highestBid: raw.highestBid !== undefined && raw.highestBid !== null ? Number(raw.highestBid) : undefined,
  bidHistory: Array.isArray(raw.bidHistory)
    ? (raw.bidHistory as Array<Record<string, unknown>>).map((entry) => ({
        id: String(entry.id ?? `BID-${Date.now()}`),
        bidderId: entry.bidderId ? String(entry.bidderId) : undefined,
        bidderName: String(entry.bidderName ?? ''),
        amount: Number(entry.amount ?? 0),
        channel: normalizeParticipantChannel(entry.channel),
        validatedByAuctioneer: entry.validatedByAuctioneer !== false,
        createdAt: String(entry.createdAt ?? nowIso()),
      }))
    : [],
  winningBidId: raw.winningBidId ? String(raw.winningBidId) : undefined,
  winningBidderName: raw.winningBidderName ? String(raw.winningBidderName) : undefined,
  winningBidAmount: raw.winningBidAmount !== undefined && raw.winningBidAmount !== null ? Number(raw.winningBidAmount) : undefined,
  winnerChannel: raw.winnerChannel ? normalizeParticipantChannel(raw.winnerChannel) : undefined,
  commercialLockActiveUntil: raw.commercialLockActiveUntil ? String(raw.commercialLockActiveUntil) : undefined,
  lotAssemblyProfile: raw.lotAssemblyProfile ? String(raw.lotAssemblyProfile) : undefined,
  assignedAuctioneerUserId: raw.assignedAuctioneerUserId ? String(raw.assignedAuctioneerUserId) : undefined,
  assignedAuctioneerName: raw.assignedAuctioneerName ? String(raw.assignedAuctioneerName) : undefined,
  assignedAuctionEventId: raw.assignedAuctionEventId ? String(raw.assignedAuctionEventId) : undefined,
  distanceToAuctionParkKm:
    raw.distanceToAuctionParkKm !== undefined && raw.distanceToAuctionParkKm !== null ? Number(raw.distanceToAuctionParkKm) : undefined,
  allowedModalities: Array.isArray(raw.allowedModalities)
    ? (raw.allowedModalities as Array<unknown>).map((item) => normalizeModality(item))
    : ['HIBRIDO'],
  currentModality: raw.currentModality ? normalizeModality(raw.currentModality) : 'HIBRIDO',
  transportStatus: (() => {
    const status = String(raw.transportStatus ?? '').toUpperCase();
    if (status === 'AGENDADO' || status === 'EM_TRANSITO' || status === 'CONCLUIDO') {
      return status as AuctionTransportStatus;
    }
    return 'PENDENTE';
  })(),
  transportProvider: raw.transportProvider ? String(raw.transportProvider) : undefined,
  transportVehicle: raw.transportVehicle ? String(raw.transportVehicle) : undefined,
  transportNotes: raw.transportNotes ? String(raw.transportNotes) : undefined,
  paymentStatus: (() => {
    const status = String(raw.paymentStatus ?? '').toUpperCase();
    if (status === 'EM_ESCROW' || status === 'PARCIAL' || status === 'QUITADO') {
      return status as AuctionPaymentStatus;
    }
    return 'PENDENTE';
  })(),
  paymentAmountDue: raw.paymentAmountDue !== undefined && raw.paymentAmountDue !== null ? Number(raw.paymentAmountDue) : undefined,
  paymentAmountPaid:
    raw.paymentAmountPaid !== undefined && raw.paymentAmountPaid !== null ? Number(raw.paymentAmountPaid) : undefined,
  paymentNotes: raw.paymentNotes ? String(raw.paymentNotes) : undefined,
  documentReferences: Array.isArray(raw.documentReferences)
    ? (raw.documentReferences as Array<unknown>).map((entry) => String(entry))
    : [],
  fiscalNoteReferences: Array.isArray(raw.fiscalNoteReferences)
    ? (raw.fiscalNoteReferences as Array<unknown>).map((entry) => String(entry))
    : [],
  liveStreamUrl: raw.liveStreamUrl ? String(raw.liveStreamUrl) : undefined,
  liveStreamStatus: normalizeLiveStreamStatus(raw.liveStreamStatus),
  liveStreamStartedAt: raw.liveStreamStartedAt ? String(raw.liveStreamStartedAt) : undefined,
  liveStreamEndedAt: raw.liveStreamEndedAt ? String(raw.liveStreamEndedAt) : undefined,
  status: normalizeStatus(raw.status),
  contactInfo: raw.contactInfo ? String(raw.contactInfo) : undefined,
  notes: raw.notes ? String(raw.notes) : undefined,
  media: Array.isArray(raw.media) ? raw.media.map((item) => toMedia(item)) : [],
  protocolAuditOk: raw.protocolAuditOk === true,
  protocolMediaOk: raw.protocolMediaOk === true,
  protocolTraceabilityOk: raw.protocolTraceabilityOk === true,
  finalizedAt: raw.finalizedAt ? String(raw.finalizedAt) : undefined,
  createdAt: String(raw.createdAt ?? nowIso()),
  updatedAt: String(raw.updatedAt ?? nowIso()),
  immutableAuditHash: raw.immutableAuditHash ? String(raw.immutableAuditHash) : undefined,
});

const toAuctioneerProfile = (id: string, raw: Record<string, unknown>): AuctioneerProfile => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  userId: String(raw.userId ?? id),
  name: String(raw.name ?? ''),
  parkName: String(raw.parkName ?? ''),
  parkDocument: raw.parkDocument ? String(raw.parkDocument) : undefined,
  city: String(raw.city ?? ''),
  state: String(raw.state ?? ''),
  parkLatitude: Number(raw.parkLatitude ?? 0),
  parkLongitude: Number(raw.parkLongitude ?? 0),
  serviceRadiusKm: Number(raw.serviceRadiusKm ?? DEFAULT_SERVICE_RADIUS_KM),
  modalities: Array.isArray(raw.modalities)
    ? (raw.modalities as Array<unknown>).map((item) => normalizeModality(item))
    : ['PRESENCIAL', 'HIBRIDO'],
  supportsOnlineBidding: raw.supportsOnlineBidding !== false,
  supportsLiveStream: raw.supportsLiveStream !== false,
  liveStreamProvider: normalizeStreamProvider(raw.liveStreamProvider),
  defaultLiveStreamUrl: raw.defaultLiveStreamUrl ? String(raw.defaultLiveStreamUrl) : undefined,
  contactPhone: raw.contactPhone ? String(raw.contactPhone) : undefined,
  contactEmail: raw.contactEmail ? String(raw.contactEmail) : undefined,
  createdAt: String(raw.createdAt ?? nowIso()),
  updatedAt: String(raw.updatedAt ?? nowIso()),
});

const toEventLotLink = (raw: unknown): AuctionEventLotLink => {
  const value = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    lotId: String(value.lotId ?? ''),
    lotName: String(value.lotName ?? ''),
    producerName: String(value.producerName ?? ''),
    reservePrice: toNumber(value.reservePrice),
    currentBid: toNumber(value.currentBid),
    status: normalizeStatus(value.status),
  };
};

const toAuctionEvent = (id: string, raw: Record<string, unknown>): AuctionEvent => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  auctioneerUserId: String(raw.auctioneerUserId ?? ''),
  auctioneerName: String(raw.auctioneerName ?? ''),
  auctioneerParkName: String(raw.auctioneerParkName ?? ''),
  title: String(raw.title ?? ''),
  modality: normalizeModality(raw.modality),
  status: normalizeEventStatus(raw.status),
  startsAt: String(raw.startsAt ?? nowIso()),
  endsAt: String(raw.endsAt ?? nowIso()),
  checkInOpensAt: raw.checkInOpensAt ? String(raw.checkInOpensAt) : undefined,
  liveStreamProvider: normalizeStreamProvider(raw.liveStreamProvider),
  liveStreamUrl: raw.liveStreamUrl ? String(raw.liveStreamUrl) : undefined,
  liveStreamStatus: normalizeLiveStreamStatus(raw.liveStreamStatus),
  lots: Array.isArray(raw.lots) ? raw.lots.map((item) => toEventLotLink(item)).filter((lot) => Boolean(lot.lotId)) : [],
  onlineBidEnabled: raw.onlineBidEnabled !== false,
  inPersonEnabled: raw.inPersonEnabled !== false,
  notes: raw.notes ? String(raw.notes) : undefined,
  createdAt: String(raw.createdAt ?? nowIso()),
  updatedAt: String(raw.updatedAt ?? nowIso()),
  immutableAuditHash: raw.immutableAuditHash ? String(raw.immutableAuditHash) : undefined,
});

const toAuctionBidSignal = (id: string, raw: Record<string, unknown>): AuctionBidSignal => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  lotId: String(raw.lotId ?? ''),
  lotName: raw.lotName ? String(raw.lotName) : undefined,
  auctionEventId: raw.auctionEventId ? String(raw.auctionEventId) : undefined,
  bidderName: String(raw.bidderName ?? ''),
  amount: Number(raw.amount ?? 0),
  channel: normalizeParticipantChannel(raw.channel),
  status: normalizeBidSignalStatus(raw.status),
  assistantUserId: raw.assistantUserId ? String(raw.assistantUserId) : undefined,
  assistantName: raw.assistantName ? String(raw.assistantName) : undefined,
  assistantNote: raw.assistantNote ? String(raw.assistantNote) : undefined,
  evidenceReference: raw.evidenceReference ? String(raw.evidenceReference) : undefined,
  validatedByUserId: raw.validatedByUserId ? String(raw.validatedByUserId) : undefined,
  validatedByName: raw.validatedByName ? String(raw.validatedByName) : undefined,
  validatedAt: raw.validatedAt ? String(raw.validatedAt) : undefined,
  rejectionReason: raw.rejectionReason ? String(raw.rejectionReason) : undefined,
  createdAt: String(raw.createdAt ?? nowIso()),
  updatedAt: String(raw.updatedAt ?? nowIso()),
});

const isFiniteCoordinate = (value?: number): value is number => value !== undefined && Number.isFinite(value);

const haversineKm = (fromLat: number, fromLon: number, toLat: number, toLon: number): number => {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(toLat - fromLat);
  const dLon = toRadians(toLon - fromLon);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

const computeDistanceToParkKm = (lot: AuctionLot, profile: AuctioneerProfile): number | null => {
  if (
    !lot.geoCenter ||
    !isFiniteCoordinate(lot.geoCenter.lat) ||
    !isFiniteCoordinate(lot.geoCenter.lon) ||
    !isFiniteCoordinate(profile.parkLatitude) ||
    !isFiniteCoordinate(profile.parkLongitude)
  ) {
    return null;
  }
  const distance = haversineKm(profile.parkLatitude, profile.parkLongitude, lot.geoCenter.lat, lot.geoCenter.lon);
  return Number(distance.toFixed(2));
};

const assertTenantAccess = (lot: AuctionLot, tenantId: string) => {
  if (lot.tenantId && lot.tenantId !== tenantId) {
    throw new Error('Lote de leilao pertence a outro tenant.');
  }
};

const withStartAtNineteen = (baseDate: Date): Date => {
  const atNineteen = new Date(baseDate);
  atNineteen.setHours(AUCTION_START_HOUR, 0, 0, 0);
  return atNineteen;
};

const parseInputDate = (value?: string): Date | null => {
  if (!value?.trim()) {
    return null;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const computeAuctionWindow = (requestedDate?: string): { auctionStartAt: string; auctionEndAt: string } => {
  const now = new Date();
  const requested = parseInputDate(requestedDate);

  let startDate: Date;
  if (requested) {
    startDate = withStartAtNineteen(requested);
  } else {
    const todayNineteen = withStartAtNineteen(now);
    startDate = now.getTime() <= todayNineteen.getTime() ? todayNineteen : withStartAtNineteen(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  }

  const endDate = new Date(startDate.getTime() + AUCTION_DURATION_DAYS * 24 * 60 * 60 * 1000);
  return {
    auctionStartAt: startDate.toISOString(),
    auctionEndAt: endDate.toISOString(),
  };
};

const canBeAutoFinalized = (lot: AuctionLot): boolean => {
  if (lot.status === 'FINALIZADO' || lot.status === 'REPROVADO') {
    return false;
  }
  if (!lot.auctionEndAt?.trim()) {
    return false;
  }
  const endAt = new Date(lot.auctionEndAt);
  if (Number.isNaN(endAt.getTime())) {
    return false;
  }
  return Date.now() >= endAt.getTime();
};

export const auctioneerService = {
  async listLots(): Promise<AuctionLot[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(
      query(auctionLotsCollection, where('tenantId', '==', context.tenantId))
    );
    const lots = snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { lot: toAuctionLot(docSnapshot.id, raw), raw };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { lot: AuctionLot }) => row.lot)
      .sort((a: AuctionLot, b: AuctionLot) => b.updatedAt.localeCompare(a.updatedAt));

    const autoFinalizePromises = lots
      .filter((lot: AuctionLot) => canBeAutoFinalized(lot))
      .map(async (lot: AuctionLot) => {
        const lotRef = doc(db, 'auctionLots', lot.id);
        const finalizedAt = nowIso();
        await updateDoc(lotRef, {
          status: 'FINALIZADO',
          finalizedAt,
          updatedAt: finalizedAt,
          updatedAtTs: serverTimestamp(),
        });
      });

    if (autoFinalizePromises.length > 0) {
      await Promise.all(autoFinalizePromises);
      const refreshed = await getDocs(
        query(auctionLotsCollection, where('tenantId', '==', context.tenantId))
      );
      return refreshed.docs
        .map((docSnapshot: any) => {
          const raw = docSnapshot.data() as Record<string, unknown>;
          return { lot: toAuctionLot(docSnapshot.id, raw), raw };
        })
        .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
        .map((row: { lot: AuctionLot }) => row.lot)
        .sort((a: AuctionLot, b: AuctionLot) => b.updatedAt.localeCompare(a.updatedAt));
    }

    return lots;
  },

  async getProfile(): Promise<AuctioneerProfile | null> {
    const context = await resolveTenantContext();
    const profileRef = doc(db, 'auctioneerProfiles', context.userId);
    const snapshot = await getDoc(profileRef);
    if (!snapshot.exists()) {
      return null;
    }
    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      return null;
    }
    return toAuctioneerProfile(snapshot.id, raw);
  },

  async upsertProfile(params: {
    actor: string;
    name: string;
    parkName: string;
    parkDocument?: string;
    city: string;
    state: string;
    parkLatitude: number;
    parkLongitude: number;
    serviceRadiusKm?: number;
    modalities: AuctionModality[];
    supportsOnlineBidding?: boolean;
    supportsLiveStream?: boolean;
    liveStreamProvider?: AuctionStreamProvider;
    defaultLiveStreamUrl?: string;
    contactPhone?: string;
    contactEmail?: string;
  }): Promise<AuctioneerProfile> {
    if (!params.name.trim() || !params.parkName.trim()) {
      throw new Error('Informe nome do leiloeiro e nome do parque.');
    }
    if (!params.city.trim() || !params.state.trim()) {
      throw new Error('Informe cidade e UF do parque de leiloes.');
    }
    if (!Number.isFinite(params.parkLatitude) || !Number.isFinite(params.parkLongitude)) {
      throw new Error('Informe latitude/longitude validas para o parque.');
    }
    if (!Array.isArray(params.modalities) || params.modalities.length === 0) {
      throw new Error('Selecione ao menos uma modalidade de operacao do parque.');
    }

    const context = await resolveTenantContext();
    const now = nowIso();
    const sanitizedModalities = Array.from(new Set(params.modalities.map((item) => normalizeModality(item))));
    const normalizedRadius = Number(
      Math.max(10, Math.min(Number(params.serviceRadiusKm ?? DEFAULT_SERVICE_RADIUS_KM), 2000)).toFixed(1)
    );

    const existing = await this.getProfile();
    const profile: AuctioneerProfile = {
      id: context.userId,
      tenantId: context.tenantId,
      userId: context.userId,
      name: params.name.trim(),
      parkName: params.parkName.trim(),
      parkDocument: params.parkDocument?.trim() || undefined,
      city: params.city.trim(),
      state: params.state.trim().toUpperCase(),
      parkLatitude: Number(params.parkLatitude),
      parkLongitude: Number(params.parkLongitude),
      serviceRadiusKm: normalizedRadius,
      modalities: sanitizedModalities,
      supportsOnlineBidding: params.supportsOnlineBidding !== false,
      supportsLiveStream: params.supportsLiveStream !== false,
      liveStreamProvider: normalizeStreamProvider(params.liveStreamProvider),
      defaultLiveStreamUrl: params.defaultLiveStreamUrl?.trim() || undefined,
      contactPhone: params.contactPhone?.trim() || undefined,
      contactEmail: params.contactEmail?.trim() || undefined,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: existing ? 'AUCTIONEER_PROFILE_UPDATED' : 'AUCTIONEER_PROFILE_CREATED',
      details: `Cadastro operacional do parque ${profile.parkName} atualizado para roteamento de lotes por proximidade.`,
      proofUrl: profile.defaultLiveStreamUrl,
      metadata: {
        parkName: profile.parkName,
        city: profile.city,
        state: profile.state,
        serviceRadiusKm: profile.serviceRadiusKm,
        modalities: profile.modalities,
      },
    });

    await setDoc(
      doc(db, 'auctioneerProfiles', profile.id),
      withTenantFields(
        {
          ...profile,
          immutableAuditHash: audit.hash,
          updatedAtTs: serverTimestamp(),
          ...(existing ? {} : { createdAtTs: serverTimestamp() }),
        },
        context
      ),
      { merge: true }
    );

    return profile;
  },

  async listLotsForCurrentAuctioneer(): Promise<AuctionLot[]> {
    const [profile, lots] = await Promise.all([this.getProfile(), this.listLots()]);
    if (!profile) {
      return lots;
    }

    return lots
      .map((lot) => {
        const distanceToAuctionParkKm = computeDistanceToParkKm(lot, profile);
        return {
          ...lot,
          distanceToAuctionParkKm: distanceToAuctionParkKm ?? lot.distanceToAuctionParkKm,
        };
      })
      .filter((lot) => {
        if (!lot.assignedAuctioneerUserId || lot.assignedAuctioneerUserId === profile.userId) {
          if (lot.distanceToAuctionParkKm === undefined || lot.distanceToAuctionParkKm === null) {
            return true;
          }
          return lot.distanceToAuctionParkKm <= profile.serviceRadiusKm;
        }
        return false;
      })
      .sort((a, b) => {
        const assignedA = a.assignedAuctioneerUserId === profile.userId ? 0 : 1;
        const assignedB = b.assignedAuctioneerUserId === profile.userId ? 0 : 1;
        if (assignedA !== assignedB) {
          return assignedA - assignedB;
        }
        return (a.distanceToAuctionParkKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceToAuctionParkKm ?? Number.MAX_SAFE_INTEGER);
      });
  },

  async assignLotToCurrentAuctioneer(params: {
    lotId: string;
    actor: string;
    force?: boolean;
  }): Promise<AuctionLot> {
    const profile = await this.getProfile();
    if (!profile) {
      throw new Error('Cadastre o parque do leiloeiro antes de assumir lotes.');
    }

    const context = await resolveTenantContext();
    const lotRef = doc(db, 'auctionLots', params.lotId);
    const snapshot = await getDoc(lotRef);
    if (!snapshot.exists()) {
      throw new Error('Lote de leilao nao encontrado.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para assumir lote de outro tenant.');
    }

    const lot = toAuctionLot(snapshot.id, raw);
    assertTenantAccess(lot, context.tenantId);

    const distance = computeDistanceToParkKm(lot, profile);
    if (!params.force && distance !== null && distance > profile.serviceRadiusKm) {
      throw new Error(`Lote fora do raio de atendimento (${distance.toFixed(1)} km > ${profile.serviceRadiusKm.toFixed(1)} km).`);
    }

    const updatedAt = nowIso();
    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_LOT_ASSIGNED_TO_AUCTIONEER',
      details: `Lote ${lot.lotName} direcionado ao parque ${profile.parkName} por proximidade operacional.`,
      metadata: {
        lotId: lot.id,
        assignedAuctioneerUserId: profile.userId,
        assignedAuctioneerName: profile.name,
        distanceToAuctionParkKm: distance,
      },
    });

    await updateDoc(lotRef, {
      assignedAuctioneerUserId: profile.userId,
      assignedAuctioneerName: profile.name,
      distanceToAuctionParkKm: distance,
      immutableAuditHash: audit.hash,
      updatedAt,
      updatedAtTs: serverTimestamp(),
    });

    return {
      ...lot,
      assignedAuctioneerUserId: profile.userId,
      assignedAuctioneerName: profile.name,
      distanceToAuctionParkKm: distance ?? undefined,
      immutableAuditHash: audit.hash,
      updatedAt,
    };
  },

  async listEvents(): Promise<AuctionEvent[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(
      query(auctionEventsCollection, where('tenantId', '==', context.tenantId))
    );
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, event: toAuctionEvent(docSnapshot.id, raw) };
      })
      .filter((entry: { raw: Record<string, unknown> }) => hasTenantAccess(entry.raw, context))
      .map((entry: { event: AuctionEvent }) => entry.event)
      .sort((a: AuctionEvent, b: AuctionEvent) => a.startsAt.localeCompare(b.startsAt));
  },

  async scheduleEvent(params: {
    actor: string;
    title: string;
    modality: AuctionModality;
    startsAt: string;
    endsAt: string;
    checkInOpensAt?: string;
    lotIds: string[];
    notes?: string;
    liveStreamProvider?: AuctionStreamProvider;
    liveStreamUrl?: string;
    onlineBidEnabled?: boolean;
    inPersonEnabled?: boolean;
  }): Promise<AuctionEvent> {
    const profile = await this.getProfile();
    if (!profile) {
      throw new Error('Cadastre o parque do leiloeiro antes de agendar sessao.');
    }
    if (!params.title.trim()) {
      throw new Error('Informe o titulo da sessao de leilao.');
    }
    if (!Array.isArray(params.lotIds) || params.lotIds.length === 0) {
      throw new Error('Selecione ao menos um lote para agendamento.');
    }

    const startsAt = new Date(params.startsAt);
    const endsAt = new Date(params.endsAt);
    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt.getTime() <= startsAt.getTime()) {
      throw new Error('Janela de agendamento invalida. Verifique inicio e fim da sessao.');
    }

    const context = await resolveTenantContext();
    const lots = await Promise.all(
      Array.from(new Set(params.lotIds.map((id) => id.trim()).filter(Boolean))).map(async (lotId) => {
        const snapshot = await getDoc(doc(db, 'auctionLots', lotId));
        if (!snapshot.exists()) {
          throw new Error(`Lote ${lotId} nao encontrado.`);
        }
        const raw = snapshot.data() as Record<string, unknown>;
        if (!hasTenantAccess(raw, context)) {
          throw new Error(`Sem permissao para vincular lote ${lotId}.`);
        }
        const lot = toAuctionLot(snapshot.id, raw);
        if (lot.assignedAuctioneerUserId && lot.assignedAuctioneerUserId !== context.userId) {
          throw new Error(`Lote ${lot.lotName} ja esta atribuido a outro leiloeiro.`);
        }
        return lot;
      })
    );

    const modality = normalizeModality(params.modality);
    const liveStreamUrl = params.liveStreamUrl?.trim() || profile.defaultLiveStreamUrl;
    if ((modality === 'ONLINE' || modality === 'HIBRIDO') && !liveStreamUrl) {
      throw new Error('Sessao online/hibrida exige URL de transmissao ao vivo.');
    }

    const now = nowIso();
    const lotLinks: AuctionEventLotLink[] = lots.map((lot) => ({
      lotId: lot.id,
      lotName: lot.lotName,
      producerName: lot.producerName,
      reservePrice: lot.reservePrice,
      currentBid: lot.highestBid,
      status: lot.status,
    }));

    const event: AuctionEvent = {
      id: `AEV-${Date.now()}`,
      tenantId: context.tenantId,
      auctioneerUserId: context.userId,
      auctioneerName: profile.name,
      auctioneerParkName: profile.parkName,
      title: params.title.trim(),
      modality,
      status: 'AGENDADO',
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      checkInOpensAt: params.checkInOpensAt ? new Date(params.checkInOpensAt).toISOString() : undefined,
      liveStreamProvider: normalizeStreamProvider(params.liveStreamProvider ?? profile.liveStreamProvider),
      liveStreamUrl,
      liveStreamStatus: 'PREPARACAO',
      lots: lotLinks,
      onlineBidEnabled: params.onlineBidEnabled !== false,
      inPersonEnabled: params.inPersonEnabled !== false,
      notes: params.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_EVENT_SCHEDULED',
      details: `Sessao ${event.title} agendada para o parque ${profile.parkName}.`,
      proofUrl: event.liveStreamUrl,
      metadata: {
        auctionEventId: event.id,
        modality: event.modality,
        startsAt: event.startsAt,
        endsAt: event.endsAt,
        lots: event.lots.map((lot) => lot.lotId),
      },
    });

    await setDoc(
      doc(db, 'auctionEvents', event.id),
      withTenantFields(
        {
          ...event,
          immutableAuditHash: audit.hash,
          createdAtTs: serverTimestamp(),
          updatedAtTs: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    await Promise.all(
      lots.map((lot) =>
        updateDoc(doc(db, 'auctionLots', lot.id), {
          assignedAuctioneerUserId: context.userId,
          assignedAuctioneerName: profile.name,
          assignedAuctionEventId: event.id,
          currentModality: event.modality,
          updatedAt: nowIso(),
          updatedAtTs: serverTimestamp(),
        })
      )
    );

    return {
      ...event,
      immutableAuditHash: audit.hash,
    };
  },

  async updateEventStatus(params: {
    eventId: string;
    actor: string;
    status: AuctionEventStatus;
    evidenceReference?: string;
  }): Promise<AuctionEvent> {
    const context = await resolveTenantContext();
    const eventRef = doc(db, 'auctionEvents', params.eventId);
    const snapshot = await getDoc(eventRef);
    if (!snapshot.exists()) {
      throw new Error('Sessao de leilao nao encontrada.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para alterar sessao de outro tenant.');
    }

    const event = toAuctionEvent(snapshot.id, raw);
    if (event.auctioneerUserId !== context.userId) {
      throw new Error('Apenas o leiloeiro responsavel pode alterar esta sessao.');
    }

    const nextStatus = normalizeEventStatus(params.status);
    if ((event.modality === 'ONLINE' || event.modality === 'HIBRIDO') && nextStatus === 'AO_VIVO' && !event.liveStreamUrl) {
      throw new Error('Sessao online/hibrida exige URL de transmissao para iniciar ao vivo.');
    }

    const nextLiveStreamStatus: AuctionLiveStreamStatus =
      nextStatus === 'AO_VIVO' ? 'AO_VIVO' : nextStatus === 'ENCERRADO' ? 'ENCERRADA' : event.liveStreamStatus;
    const updatedAt = nowIso();

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_EVENT_STATUS_CHANGED',
      details: `Sessao ${event.title} atualizada para ${nextStatus}.`,
      proofUrl: params.evidenceReference?.trim() || event.liveStreamUrl,
      metadata: {
        auctionEventId: event.id,
        previousStatus: event.status,
        nextStatus,
      },
    });

    await updateDoc(eventRef, {
      status: nextStatus,
      liveStreamStatus: nextLiveStreamStatus,
      immutableAuditHash: audit.hash,
      updatedAt,
      updatedAtTs: serverTimestamp(),
    });

    return {
      ...event,
      status: nextStatus,
      liveStreamStatus: nextLiveStreamStatus,
      immutableAuditHash: audit.hash,
      updatedAt,
    };
  },

  async updateEventLiveStream(params: {
    eventId: string;
    actor: string;
    liveStreamProvider?: AuctionStreamProvider;
    liveStreamUrl?: string;
    liveStreamStatus: AuctionLiveStreamStatus;
    evidenceReference?: string;
  }): Promise<AuctionEvent> {
    const context = await resolveTenantContext();
    const eventRef = doc(db, 'auctionEvents', params.eventId);
    const snapshot = await getDoc(eventRef);
    if (!snapshot.exists()) {
      throw new Error('Sessao de leilao nao encontrada.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para alterar sessao de outro tenant.');
    }

    const event = toAuctionEvent(snapshot.id, raw);
    const nextStatus = normalizeLiveStreamStatus(params.liveStreamStatus);
    const nextUrl = params.liveStreamUrl?.trim() || event.liveStreamUrl;
    if ((event.modality === 'ONLINE' || event.modality === 'HIBRIDO' || nextStatus === 'AO_VIVO') && !nextUrl) {
      throw new Error('URL de transmissao obrigatoria para sessao online/ao vivo.');
    }

    const updatedAt = nowIso();
    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_EVENT_STREAM_UPDATED',
      details: `Transmissao da sessao ${event.title} atualizada para ${nextStatus}.`,
      proofUrl: params.evidenceReference?.trim() || nextUrl,
      metadata: {
        auctionEventId: event.id,
        liveStreamStatus: nextStatus,
      },
    });

    await updateDoc(eventRef, {
      liveStreamProvider: normalizeStreamProvider(params.liveStreamProvider ?? event.liveStreamProvider) ?? null,
      liveStreamUrl: nextUrl ?? null,
      liveStreamStatus: nextStatus,
      immutableAuditHash: audit.hash,
      updatedAt,
      updatedAtTs: serverTimestamp(),
    });

    return {
      ...event,
      liveStreamProvider: normalizeStreamProvider(params.liveStreamProvider ?? event.liveStreamProvider),
      liveStreamUrl: nextUrl,
      liveStreamStatus: nextStatus,
      immutableAuditHash: audit.hash,
      updatedAt,
    };
  },

  async attachLotToEvent(params: {
    eventId: string;
    lotId: string;
    actor: string;
  }): Promise<AuctionEvent> {
    const context = await resolveTenantContext();
    const [eventSnapshot, lotSnapshot] = await Promise.all([
      getDoc(doc(db, 'auctionEvents', params.eventId)),
      getDoc(doc(db, 'auctionLots', params.lotId)),
    ]);
    if (!eventSnapshot.exists()) {
      throw new Error('Sessao de leilao nao encontrada.');
    }
    if (!lotSnapshot.exists()) {
      throw new Error('Lote nao encontrado.');
    }

    const rawEvent = eventSnapshot.data() as Record<string, unknown>;
    const rawLot = lotSnapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(rawEvent, context) || !hasTenantAccess(rawLot, context)) {
      throw new Error('Sem permissao para vincular evento/lote de outro tenant.');
    }

    const event = toAuctionEvent(eventSnapshot.id, rawEvent);
    const lot = toAuctionLot(lotSnapshot.id, rawLot);
    if (event.auctioneerUserId !== context.userId) {
      throw new Error('Apenas o leiloeiro responsavel pode vincular lotes nesta sessao.');
    }

    const currentLots = event.lots ?? [];
    const alreadyLinked = currentLots.some((item) => item.lotId === lot.id);
    const nextLots = alreadyLinked
      ? currentLots
      : [
          ...currentLots,
          {
            lotId: lot.id,
            lotName: lot.lotName,
            producerName: lot.producerName,
            reservePrice: lot.reservePrice,
            currentBid: lot.highestBid,
            status: lot.status,
          },
        ];

    const updatedAt = nowIso();
    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_EVENT_LOT_ATTACHED',
      details: `Lote ${lot.lotName} vinculado a sessao ${event.title}.`,
      metadata: {
        auctionEventId: event.id,
        lotId: lot.id,
      },
    });

    await Promise.all([
      updateDoc(doc(db, 'auctionEvents', event.id), {
        lots: nextLots,
        immutableAuditHash: audit.hash,
        updatedAt,
        updatedAtTs: serverTimestamp(),
      }),
      updateDoc(doc(db, 'auctionLots', lot.id), {
        assignedAuctionEventId: event.id,
        assignedAuctioneerUserId: event.auctioneerUserId,
        assignedAuctioneerName: event.auctioneerName,
        currentModality: event.modality,
        updatedAt,
        updatedAtTs: serverTimestamp(),
      }),
    ]);

    return {
      ...event,
      lots: nextLots,
      immutableAuditHash: audit.hash,
      updatedAt,
    };
  },

  async registerLot(params: {
    actor: string;
    producerId?: string;
    producerName: string;
    sourceLotId?: string;
    propertyId?: string;
    propertyName?: string;
    propertyRegistrationNumber?: string;
    locationLabel?: string;
    geoCenter?: { lat: number; lon: number };
    lotName?: string;
    category: string;
    headcount?: number;
    totalWeightKg?: number;
    reservePrice?: number;
    auctionDate?: string;
    lotAssemblyProfile?: string;
    allowedModalities?: AuctionModality[];
    contactInfo?: string;
    notes?: string;
    primaryVideoReference: string;
  }): Promise<AuctionLot> {
    if (!params.producerName.trim() || !params.category.trim()) {
      throw new Error('Informe produtor e categoria para registrar no leilao.');
    }
    if (!params.propertyRegistrationNumber?.trim()) {
      throw new Error('Informe a inscricao da propriedade (CAR/IE) para registrar oferta publica de leilao.');
    }
    if (!params.primaryVideoReference.trim()) {
      throw new Error('Registro de lote para leilao exige video de evidencia.');
    }

    const context = await resolveTenantContext();
    const createdAt = nowIso();
    const lotName = params.lotName?.trim() || `LOTE-${Date.now()}`;
    const window = computeAuctionWindow(params.auctionDate);
    const media: AuctionLotMedia[] = [
      {
        id: `MEDIA-${Date.now()}`,
        type: 'VIDEO',
        reference: params.primaryVideoReference.trim(),
        createdAt,
      },
    ];

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_LOT_REGISTERED',
      details: `Lote ${lotName} registrado como oferta publica de leilao por 7 dias.`,
      proofUrl: params.primaryVideoReference.trim(),
      metadata: {
        producerName: params.producerName,
        lotName,
        sourceLotId: params.sourceLotId?.trim() || null,
        propertyRegistrationNumber: params.propertyRegistrationNumber?.trim() || null,
        locationLabel: params.locationLabel?.trim() || null,
        auctionStartAt: window.auctionStartAt,
        auctionEndAt: window.auctionEndAt,
      },
    });

    const allowedModalities =
      Array.isArray(params.allowedModalities) && params.allowedModalities.length > 0
        ? Array.from(new Set(params.allowedModalities.map((item) => normalizeModality(item))))
        : (['PRESENCIAL', 'ONLINE', 'HIBRIDO'] as AuctionModality[]);

    const lot: AuctionLot = {
      id: `AUC-${Date.now()}`,
      tenantId: context.tenantId,
      producerId: params.producerId?.trim() || context.userId,
      producerName: params.producerName.trim(),
      sourceLotId: params.sourceLotId?.trim() || undefined,
      propertyId: params.propertyId?.trim() || undefined,
      propertyName: params.propertyName?.trim() || undefined,
      propertyRegistrationNumber: params.propertyRegistrationNumber?.trim() || undefined,
      locationLabel: params.locationLabel?.trim() || undefined,
      geoCenter:
        params.geoCenter && Number.isFinite(params.geoCenter.lat) && Number.isFinite(params.geoCenter.lon)
          ? { lat: Number(params.geoCenter.lat), lon: Number(params.geoCenter.lon) }
          : undefined,
      lotName,
      category: params.category.trim(),
      headcount: params.headcount,
      totalWeightKg: params.totalWeightKg,
      reservePrice: params.reservePrice,
      isPublicOffer: true,
      auctionStartAt: window.auctionStartAt,
      auctionDate: window.auctionStartAt,
      auctionEndAt: window.auctionEndAt,
      auctionDurationDays: AUCTION_DURATION_DAYS,
      bidCount: 0,
      highestBid: undefined,
      bidHistory: [],
      commercialLockActiveUntil: window.auctionEndAt,
      lotAssemblyProfile: params.lotAssemblyProfile?.trim() || undefined,
      allowedModalities,
      currentModality: allowedModalities.includes('HIBRIDO') ? 'HIBRIDO' : allowedModalities[0] ?? 'PRESENCIAL',
      transportStatus: 'PENDENTE',
      paymentStatus: 'PENDENTE',
      paymentAmountDue: params.reservePrice,
      paymentAmountPaid: 0,
      documentReferences: [],
      fiscalNoteReferences: [],
      liveStreamStatus: 'PREPARACAO',
      status: 'PUBLICADO',
      contactInfo: params.contactInfo?.trim() || undefined,
      notes: params.notes?.trim() || undefined,
      media,
      protocolAuditOk: true,
      protocolMediaOk: true,
      protocolTraceabilityOk: true,
      createdAt,
      updatedAt: createdAt,
      immutableAuditHash: audit.hash,
    };

    await setDoc(
      doc(db, 'auctionLots', lot.id),
      withTenantFields(
        {
          ...lot,
          immutable: true,
          createdAtTs: serverTimestamp(),
          updatedAtTs: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return lot;
  },

  async attachMedia(params: {
    lotId: string;
    actor: string;
    type: AuctionLotMedia['type'];
    reference: string;
  }): Promise<AuctionLot> {
    if (!params.reference.trim()) {
      throw new Error('Informe a referencia da evidencia digital.');
    }

    const context = await resolveTenantContext();
    const ref = doc(db, 'auctionLots', params.lotId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Lote de leilao nao encontrado.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para alterar este lote.');
    }

    const lot = toAuctionLot(snapshot.id, raw);
    assertTenantAccess(lot, context.tenantId);

    const newMedia: AuctionLotMedia = {
      id: `MEDIA-${Date.now()}`,
      type: params.type,
      reference: params.reference.trim(),
      createdAt: nowIso(),
    };
    const nextMedia = [...lot.media, newMedia];

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_LOT_MEDIA_ATTACHED',
      details: `Nova evidencia ${params.type} anexada ao lote ${lot.lotName}.`,
      proofUrl: params.reference.trim(),
      metadata: {
        lotId: lot.id,
        mediaType: params.type,
      },
    });

    await updateDoc(ref, {
      media: nextMedia,
      protocolMediaOk: true,
      immutableAuditHash: audit.hash,
      immutable: true,
      updatedAt: nowIso(),
      updatedAtTs: serverTimestamp(),
    });

    return {
      ...lot,
      media: nextMedia,
      protocolMediaOk: true,
      immutableAuditHash: audit.hash,
      updatedAt: nowIso(),
    };
  },

  async setLotStatus(params: {
    lotId: string;
    actor: string;
    status: AuctionLotStatus;
    notes?: string;
    evidenceReference?: string;
    protocolAuditOk?: boolean;
    protocolTraceabilityOk?: boolean;
  }): Promise<AuctionLot> {
    const context = await resolveTenantContext();
    const ref = doc(db, 'auctionLots', params.lotId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Lote de leilao nao encontrado.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para alterar este lote.');
    }

    const current = toAuctionLot(snapshot.id, raw);
    assertTenantAccess(current, context.tenantId);

    if (params.status === 'FINALIZADO' && current.auctionEndAt) {
      const auctionEndAt = new Date(current.auctionEndAt);
      if (!Number.isNaN(auctionEndAt.getTime()) && Date.now() < auctionEndAt.getTime()) {
        throw new Error('Finalizacao permitida somente no 7o dia apos inicio oficial as 19:00.');
      }
    }

    if (
      (params.status === 'PUBLICADO' || params.status === 'EM_LEILAO' || params.status === 'FINALIZADO') &&
      !params.evidenceReference?.trim()
    ) {
      throw new Error('Mudancas de publicacao/finalizacao exigem evidencia digital.');
    }

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_LOT_STATUS_CHANGED',
      details: `Lote ${current.lotName} alterado para ${params.status}.`,
      proofUrl: params.evidenceReference?.trim(),
      metadata: {
        lotId: current.id,
        previousStatus: current.status,
        nextStatus: params.status,
      },
    });

    const updatedAt = nowIso();
    const next: AuctionLot = {
      ...current,
      status: params.status,
      notes: params.notes?.trim() || current.notes,
      protocolAuditOk: params.protocolAuditOk ?? current.protocolAuditOk,
      protocolTraceabilityOk: params.protocolTraceabilityOk ?? current.protocolTraceabilityOk,
      finalizedAt: params.status === 'FINALIZADO' ? updatedAt : current.finalizedAt,
      immutableAuditHash: audit.hash,
      updatedAt,
    };

    await updateDoc(ref, {
      status: next.status,
      notes: next.notes ?? null,
      protocolAuditOk: next.protocolAuditOk,
      protocolTraceabilityOk: next.protocolTraceabilityOk,
      finalizedAt: next.finalizedAt ?? null,
      immutableAuditHash: next.immutableAuditHash,
      immutable: true,
      updatedAt,
      updatedAtTs: serverTimestamp(),
    });

    return next;
  },

  async updateLotOperations(params: {
    lotId: string;
    actor: string;
    transportStatus?: AuctionTransportStatus;
    transportProvider?: string;
    transportVehicle?: string;
    transportNotes?: string;
    paymentStatus?: AuctionPaymentStatus;
    paymentAmountDue?: number;
    paymentAmountPaid?: number;
    paymentNotes?: string;
    evidenceReference?: string;
  }): Promise<AuctionLot> {
    const context = await resolveTenantContext();
    const ref = doc(db, 'auctionLots', params.lotId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Lote de leilao nao encontrado.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para alterar operacao deste lote.');
    }

    const current = toAuctionLot(snapshot.id, raw);
    assertTenantAccess(current, context.tenantId);

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_LOT_OPERATION_UPDATED',
      details: `Operacao logistica/financeira atualizada no lote ${current.lotName}.`,
      proofUrl: params.evidenceReference?.trim(),
      metadata: {
        lotId: current.id,
        transportStatus: params.transportStatus ?? current.transportStatus,
        paymentStatus: params.paymentStatus ?? current.paymentStatus,
      },
    });

    const updatedAt = nowIso();
    const next: AuctionLot = {
      ...current,
      transportStatus: params.transportStatus ?? current.transportStatus ?? 'PENDENTE',
      transportProvider: params.transportProvider?.trim() || current.transportProvider,
      transportVehicle: params.transportVehicle?.trim() || current.transportVehicle,
      transportNotes: params.transportNotes?.trim() || current.transportNotes,
      paymentStatus: params.paymentStatus ?? current.paymentStatus ?? 'PENDENTE',
      paymentAmountDue: params.paymentAmountDue ?? current.paymentAmountDue,
      paymentAmountPaid: params.paymentAmountPaid ?? current.paymentAmountPaid,
      paymentNotes: params.paymentNotes?.trim() || current.paymentNotes,
      immutableAuditHash: audit.hash,
      updatedAt,
    };

    await updateDoc(ref, {
      transportStatus: next.transportStatus,
      transportProvider: next.transportProvider ?? null,
      transportVehicle: next.transportVehicle ?? null,
      transportNotes: next.transportNotes ?? null,
      paymentStatus: next.paymentStatus,
      paymentAmountDue: next.paymentAmountDue ?? null,
      paymentAmountPaid: next.paymentAmountPaid ?? null,
      paymentNotes: next.paymentNotes ?? null,
      immutableAuditHash: next.immutableAuditHash,
      updatedAt,
      updatedAtTs: serverTimestamp(),
    });

    return next;
  },

  async appendDocumentReference(params: {
    lotId: string;
    actor: string;
    kind: 'DOCUMENT' | 'FISCAL_NOTE';
    reference: string;
    evidenceReference?: string;
  }): Promise<AuctionLot> {
    const normalizedReference = params.reference.trim();
    if (!normalizedReference) {
      throw new Error('Informe a referencia do documento/nota.');
    }

    const context = await resolveTenantContext();
    const ref = doc(db, 'auctionLots', params.lotId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Lote de leilao nao encontrado.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para alterar documentos deste lote.');
    }

    const current = toAuctionLot(snapshot.id, raw);
    assertTenantAccess(current, context.tenantId);

    const baseList = params.kind === 'DOCUMENT' ? current.documentReferences ?? [] : current.fiscalNoteReferences ?? [];
    const nextList = Array.from(new Set([...baseList, normalizedReference]));

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_LOT_DOCUMENT_ATTACHED',
      details: `${params.kind === 'DOCUMENT' ? 'Documento' : 'Nota fiscal'} anexado ao lote ${current.lotName}.`,
      proofUrl: params.evidenceReference?.trim() || normalizedReference,
      metadata: {
        lotId: current.id,
        kind: params.kind,
      },
    });

    const updatedAt = nowIso();
    const patch =
      params.kind === 'DOCUMENT'
        ? { documentReferences: nextList }
        : { fiscalNoteReferences: nextList };

    await updateDoc(ref, {
      ...patch,
      immutableAuditHash: audit.hash,
      updatedAt,
      updatedAtTs: serverTimestamp(),
    });

    return {
      ...current,
      ...patch,
      immutableAuditHash: audit.hash,
      updatedAt,
    };
  },

  async updateLiveStream(params: {
    lotId: string;
    actor: string;
    liveStreamUrl?: string;
    liveStreamStatus: AuctionLiveStreamStatus;
    evidenceReference?: string;
  }): Promise<AuctionLot> {
    const context = await resolveTenantContext();
    const ref = doc(db, 'auctionLots', params.lotId);
    const snapshot = await getDoc(ref);
    if (!snapshot.exists()) {
      throw new Error('Lote de leilao nao encontrado.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para alterar transmissao deste lote.');
    }

    const current = toAuctionLot(snapshot.id, raw);
    assertTenantAccess(current, context.tenantId);

    const now = nowIso();
    const nextStartedAt =
      params.liveStreamStatus === 'AO_VIVO'
        ? current.liveStreamStartedAt || now
        : current.liveStreamStartedAt;
    const nextEndedAt =
      params.liveStreamStatus === 'ENCERRADA'
        ? now
        : params.liveStreamStatus === 'PREPARACAO'
          ? undefined
          : current.liveStreamEndedAt;

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_LIVE_STREAM_UPDATED',
      details: `Transmissao do lote ${current.lotName} atualizada para ${params.liveStreamStatus}.`,
      proofUrl: params.evidenceReference?.trim() || params.liveStreamUrl?.trim(),
      metadata: {
        lotId: current.id,
        liveStreamStatus: params.liveStreamStatus,
      },
    });

    const next: AuctionLot = {
      ...current,
      liveStreamUrl: params.liveStreamUrl?.trim() || current.liveStreamUrl,
      liveStreamStatus: params.liveStreamStatus,
      liveStreamStartedAt: nextStartedAt,
      liveStreamEndedAt: nextEndedAt,
      immutableAuditHash: audit.hash,
      updatedAt: now,
    };

    await updateDoc(ref, {
      liveStreamUrl: next.liveStreamUrl ?? null,
      liveStreamStatus: next.liveStreamStatus,
      liveStreamStartedAt: next.liveStreamStartedAt ?? null,
      liveStreamEndedAt: next.liveStreamEndedAt ?? null,
      immutableAuditHash: next.immutableAuditHash,
      updatedAt: now,
      updatedAtTs: serverTimestamp(),
    });

    return next;
  },

  async findActiveCommercialLockBySourceLotId(sourceLotId: string): Promise<AuctionLot | null> {
    const normalizedSourceLotId = sourceLotId.trim();
    if (!normalizedSourceLotId) {
      return null;
    }

    const context = await resolveTenantContext();
    const snapshot = await getDocs(
      query(
        auctionLotsCollection,
        where('tenantId', '==', context.tenantId),
        where('sourceLotId', '==', normalizedSourceLotId)
      )
    );
    const now = Date.now();

    const activeLots = snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, lot: toAuctionLot(docSnapshot.id, raw) };
      })
      .filter((entry: { raw: Record<string, unknown> }) => hasTenantAccess(entry.raw, context))
      .map((entry: { lot: AuctionLot }) => entry.lot)
      .filter((lot: AuctionLot) => lot.status !== 'FINALIZADO' && lot.status !== 'REPROVADO')
      .filter((lot: AuctionLot) => {
        const lockUntil = lot.commercialLockActiveUntil || lot.auctionEndAt;
        if (!lockUntil) {
          return false;
        }
        const lockDate = new Date(lockUntil);
        if (Number.isNaN(lockDate.getTime())) {
          return false;
        }
        return lockDate.getTime() > now;
      })
      .sort((a: AuctionLot, b: AuctionLot) => (a.commercialLockActiveUntil ?? '').localeCompare(b.commercialLockActiveUntil ?? ''));

    return activeLots[0] ?? null;
  },

  async listBidSignals(filters?: {
    auctionEventId?: string;
    lotId?: string;
    statuses?: AuctionBidSignalStatus[];
  }): Promise<AuctionBidSignal[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(auctionBidSignalsCollection, where('tenantId', '==', context.tenantId)));
    const normalizedEventId = filters?.auctionEventId?.trim();
    const normalizedLotId = filters?.lotId?.trim();
    const statusFilter = new Set((filters?.statuses ?? []).map((status) => normalizeBidSignalStatus(status)));

    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, signal: toAuctionBidSignal(docSnapshot.id, raw) };
      })
      .filter((entry: { raw: Record<string, unknown> }) => hasTenantAccess(entry.raw, context))
      .map((entry: { signal: AuctionBidSignal }) => entry.signal)
      .filter((signal: AuctionBidSignal) => {
        if (normalizedEventId && signal.auctionEventId !== normalizedEventId) {
          return false;
        }
        if (normalizedLotId && signal.lotId !== normalizedLotId) {
          return false;
        }
        if (statusFilter.size > 0 && !statusFilter.has(signal.status)) {
          return false;
        }
        return true;
      })
      .sort((a: AuctionBidSignal, b: AuctionBidSignal) => b.createdAt.localeCompare(a.createdAt));
  },

  async watchBidSignals(params: {
    onChange: (signals: AuctionBidSignal[]) => void;
    onError?: (error: Error) => void;
    auctionEventId?: string;
    lotId?: string;
    statuses?: AuctionBidSignalStatus[];
  }): Promise<() => void> {
    const context = await resolveTenantContext();
    const normalizedEventId = params.auctionEventId?.trim();
    const normalizedLotId = params.lotId?.trim();
    const statusFilter = new Set((params.statuses ?? []).map((status) => normalizeBidSignalStatus(status)));
    const collectionQuery = query(auctionBidSignalsCollection, where('tenantId', '==', context.tenantId));

    return onSnapshot(
      collectionQuery,
      (snapshot: any) => {
        const signals = snapshot.docs
          .map((docSnapshot: any) => {
            const raw = docSnapshot.data() as Record<string, unknown>;
            return { raw, signal: toAuctionBidSignal(docSnapshot.id, raw) };
          })
          .filter((entry: { raw: Record<string, unknown> }) => hasTenantAccess(entry.raw, context))
          .map((entry: { signal: AuctionBidSignal }) => entry.signal)
          .filter((signal: AuctionBidSignal) => {
            if (normalizedEventId && signal.auctionEventId !== normalizedEventId) {
              return false;
            }
            if (normalizedLotId && signal.lotId !== normalizedLotId) {
              return false;
            }
            if (statusFilter.size > 0 && !statusFilter.has(signal.status)) {
              return false;
            }
            return true;
          })
          .sort((a: AuctionBidSignal, b: AuctionBidSignal) => b.createdAt.localeCompare(a.createdAt));

        params.onChange(signals);
      },
      (error: unknown) => {
        const normalized = error instanceof Error ? error : new Error('Falha ao observar lances online.');
        if (params.onError) {
          params.onError(normalized);
        }
      }
    );
  },

  async registerBidSignal(params: {
    lotId: string;
    actor: string;
    bidderName: string;
    amount: number;
    auctionEventId?: string;
    assistantNote?: string;
    evidenceReference?: string;
  }): Promise<AuctionBidSignal> {
    if (!params.bidderName.trim()) {
      throw new Error('Informe o nome do participante para registrar o recebimento online.');
    }
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new Error('Informe um valor valido para o lance online recebido.');
    }

    const context = await resolveTenantContext();
    const currentRole = await resolveCurrentUserRole(context.userId);
    if (!SIGNAL_ALLOWED_ROLES.has(currentRole)) {
      throw new Error('Somente assistente/leiloeiro pode registrar recebimento de lance online.');
    }

    const lotRef = doc(db, 'auctionLots', params.lotId);
    const lotSnapshot = await getDoc(lotRef);
    if (!lotSnapshot.exists()) {
      throw new Error('Lote de leilao nao encontrado.');
    }

    const lotRaw = lotSnapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(lotRaw, context)) {
      throw new Error('Sem permissao para registrar lance online neste lote.');
    }

    const lot = toAuctionLot(lotSnapshot.id, lotRaw);
    if (lot.status === 'FINALIZADO' || lot.status === 'REPROVADO') {
      throw new Error('Nao e permitido receber lance online para lote finalizado/reprovado.');
    }
    if (lot.currentModality === 'PRESENCIAL') {
      throw new Error('Este lote esta em modalidade presencial e nao aceita recebimento online.');
    }
    if (params.auctionEventId?.trim() && lot.assignedAuctionEventId && lot.assignedAuctionEventId !== params.auctionEventId.trim()) {
      throw new Error('Lote vinculado a outra sessao de leilao.');
    }

    const createdAt = nowIso();
    const signal: AuctionBidSignal = {
      id: `ABS-${Date.now()}`,
      tenantId: context.tenantId,
      lotId: lot.id,
      lotName: lot.lotName,
      auctionEventId: params.auctionEventId?.trim() || lot.assignedAuctionEventId,
      bidderName: params.bidderName.trim(),
      amount: Number(params.amount),
      channel: 'ONLINE',
      status: 'RECEBIDO',
      assistantUserId: context.userId,
      assistantName: params.actor.trim() || 'Assistente',
      assistantNote: params.assistantNote?.trim() || undefined,
      evidenceReference: params.evidenceReference?.trim() || undefined,
      createdAt,
      updatedAt: createdAt,
    };

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_ONLINE_BID_SIGNAL_RECEIVED',
      details: `Lance online recebido para lote ${lot.lotName}: ${signal.bidderName}, valor ${signal.amount.toFixed(2)}.`,
      proofUrl: signal.evidenceReference,
      metadata: {
        lotId: signal.lotId,
        auctionEventId: signal.auctionEventId ?? null,
        bidderName: signal.bidderName,
        amount: signal.amount,
      },
    });

    await setDoc(
      doc(db, 'auctionBidSignals', signal.id),
      withTenantFields(
        {
          ...signal,
          immutableAuditHash: audit.hash,
          createdAtTs: serverTimestamp(),
          updatedAtTs: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return signal;
  },

  async reviewBidSignal(params: {
    signalId: string;
    actor: string;
    decision: 'VALIDAR' | 'REJEITAR';
    rejectionReason?: string;
    evidenceReference?: string;
  }): Promise<AuctionBidSignal> {
    const context = await resolveTenantContext();
    const currentRole = await resolveCurrentUserRole(context.userId);
    if (!SIGNAL_REVIEW_ALLOWED_ROLES.has(currentRole)) {
      throw new Error('Somente leiloeiro/gestor pode validar ou rejeitar lance online recebido.');
    }

    const signalRef = doc(db, 'auctionBidSignals', params.signalId);
    const snapshot = await getDoc(signalRef);
    if (!snapshot.exists()) {
      throw new Error('Recebimento de lance online nao encontrado.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para revisar recebimento de lance de outro tenant.');
    }

    const signal = toAuctionBidSignal(snapshot.id, raw);
    if (signal.status !== 'RECEBIDO') {
      return signal;
    }
    if (params.decision === 'REJEITAR' && !params.rejectionReason?.trim()) {
      throw new Error('Informe o motivo da rejeicao do lance recebido.');
    }

    if (currentRole === 'leiloeiro') {
      const lotSnapshot = await getDoc(doc(db, 'auctionLots', signal.lotId));
      if (lotSnapshot.exists()) {
        const lotRaw = lotSnapshot.data() as Record<string, unknown>;
        if (!hasTenantAccess(lotRaw, context)) {
          throw new Error('Sem permissao para revisar recebimento deste lote.');
        }
        const lot = toAuctionLot(lotSnapshot.id, lotRaw);
        if (lot.assignedAuctioneerUserId && lot.assignedAuctioneerUserId !== context.userId) {
          throw new Error('Apenas o leiloeiro responsavel pelo lote pode revisar este recebimento.');
        }
      }
    }

    if (params.decision === 'VALIDAR') {
      await this.registerBid({
        lotId: signal.lotId,
        actor: params.actor,
        bidderName: signal.bidderName,
        amount: signal.amount,
        channel: 'ONLINE',
        auctionEventId: signal.auctionEventId,
        evidenceReference: params.evidenceReference?.trim() || signal.evidenceReference,
      });
    }

    const updatedAt = nowIso();
    const nextStatus: AuctionBidSignalStatus = params.decision === 'VALIDAR' ? 'VALIDADO' : 'REJEITADO';
    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_ONLINE_BID_SIGNAL_REVIEWED',
      details: `Recebimento online ${signal.id} revisado para ${nextStatus}.`,
      proofUrl: params.evidenceReference?.trim() || signal.evidenceReference,
      metadata: {
        signalId: signal.id,
        lotId: signal.lotId,
        decision: nextStatus,
      },
    });

    const patch = {
      status: nextStatus,
      validatedByUserId: context.userId,
      validatedByName: params.actor,
      validatedAt: updatedAt,
      rejectionReason: params.decision === 'REJEITAR' ? params.rejectionReason?.trim() || null : null,
      immutableAuditHash: audit.hash,
      updatedAt,
      updatedAtTs: serverTimestamp(),
    };

    await updateDoc(signalRef, patch);

    return {
      ...signal,
      status: nextStatus,
      validatedByUserId: context.userId,
      validatedByName: params.actor,
      validatedAt: updatedAt,
      rejectionReason: params.decision === 'REJEITAR' ? params.rejectionReason?.trim() || undefined : undefined,
      updatedAt,
    };
  },

  async registerBid(params: {
    lotId: string;
    actor: string;
    bidderId?: string;
    bidderName: string;
    amount: number;
    channel?: AuctionParticipantChannel;
    auctionEventId?: string;
    evidenceReference?: string;
  }): Promise<AuctionLot> {
    if (!params.bidderName.trim()) {
      throw new Error('Informe o nome do participante para registrar o lance.');
    }
    if (!Number.isFinite(params.amount) || params.amount <= 0) {
      throw new Error('Informe um valor de lance valido.');
    }

    const context = await resolveTenantContext();
    const lotRef = doc(db, 'auctionLots', params.lotId);
    const snapshot = await getDoc(lotRef);
    if (!snapshot.exists()) {
      throw new Error('Lote de leilao nao encontrado.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para registrar lance neste lote.');
    }

    const lot = toAuctionLot(snapshot.id, raw);
    assertTenantAccess(lot, context.tenantId);
    const bidChannel = normalizeParticipantChannel(params.channel);

    if (lot.status === 'FINALIZADO' || lot.status === 'REPROVADO') {
      throw new Error('Nao e permitido registrar lance em lote finalizado/reprovado.');
    }
    if (params.auctionEventId?.trim() && lot.assignedAuctionEventId && lot.assignedAuctionEventId !== params.auctionEventId.trim()) {
      throw new Error('Lote vinculado a outra sessao de leilao.');
    }
    if (bidChannel === 'ONLINE' && lot.currentModality === 'PRESENCIAL') {
      throw new Error('Este lote esta em modalidade presencial e nao aceita lance online.');
    }

    const now = Date.now();
    const startAt = lot.auctionStartAt ? new Date(lot.auctionStartAt) : null;
    const endAt = lot.auctionEndAt ? new Date(lot.auctionEndAt) : null;
    if (!startAt || Number.isNaN(startAt.getTime()) || !endAt || Number.isNaN(endAt.getTime())) {
      throw new Error('Lote sem janela valida de leilao. Refaça o cadastro do lote.');
    }
    if (now < startAt.getTime()) {
      throw new Error(`Leilao ainda nao iniciou. Inicio oficial em ${startAt.toLocaleString('pt-BR')} (19:00).`);
    }
    if (now >= endAt.getTime()) {
      throw new Error('Prazo de lances encerrado no 7o dia. Lote deve ser finalizado.');
    }

    const minBidBase = Math.max(lot.reservePrice ?? 0, lot.highestBid ?? 0);
    if (params.amount <= minBidBase) {
      throw new Error(`Lance deve ser maior que ${minBidBase.toFixed(2)}.`);
    }

    const nextBidCount = (lot.bidCount ?? 0) + 1;
    const nextHighestBid = Math.max(lot.highestBid ?? 0, params.amount);
    const updatedAt = nowIso();
    const nextBidHistory: AuctionBidEntry[] = [
      {
        id: `BID-${Date.now()}`,
        bidderId: params.bidderId?.trim() || undefined,
        bidderName: params.bidderName.trim(),
        amount: params.amount,
        channel: bidChannel,
        validatedByAuctioneer: true,
        createdAt: updatedAt,
      },
      ...(lot.bidHistory ?? []),
    ];

    const audit = await immutableAuditService.append({
      actor: params.actor,
      action: 'AUCTION_BID_REGISTERED',
      details: `Lance registrado no lote ${lot.lotName}: participante ${params.bidderName}, valor ${params.amount.toFixed(2)}.`,
      proofUrl: params.evidenceReference?.trim(),
      metadata: {
        lotId: lot.id,
        bidderName: params.bidderName,
        amount: params.amount,
        channel: bidChannel,
        auctionEventId: params.auctionEventId?.trim() || lot.assignedAuctionEventId || null,
      },
    });

    await updateDoc(lotRef, {
      status: 'EM_LEILAO',
      bidCount: nextBidCount,
      highestBid: nextHighestBid,
      bidHistory: nextBidHistory,
      winningBidId: nextBidHistory[0]?.id ?? null,
      winningBidderName: params.bidderName.trim(),
      winningBidAmount: params.amount,
      winnerChannel: bidChannel,
      immutableAuditHash: audit.hash,
      updatedAt,
      updatedAtTs: serverTimestamp(),
    });

    return {
      ...lot,
      status: 'EM_LEILAO',
      bidCount: nextBidCount,
      highestBid: nextHighestBid,
      bidHistory: nextBidHistory,
      winningBidId: nextBidHistory[0]?.id ?? undefined,
      winningBidderName: params.bidderName.trim(),
      winningBidAmount: params.amount,
      winnerChannel: bidChannel,
      immutableAuditHash: audit.hash,
      updatedAt,
    };
  },
};
