import { HttpsError } from 'firebase-functions/v2/https';

export type ListingState = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
export type OrderState =
  | 'CREATED'
  | 'RESERVED'
  | 'CONTRACT_PENDING'
  | 'ESCROW_CREATED'
  | 'DISPATCHED'
  | 'DELIVERED'
  | 'SETTLED'
  | 'CLOSED';
export type ContractState = 'DRAFT' | 'SIGNED' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED';
export type SettlementState = 'CREATED' | 'ESCROWED' | 'PARTIAL_RELEASED' | 'RELEASED' | 'FAILED';
export type DisputeState = 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'REJECTED';

const listingTransitions: Record<ListingState, ListingState[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['PAUSED', 'CLOSED'],
  PAUSED: ['PUBLISHED', 'CLOSED'],
  CLOSED: [],
};

const orderTransitions: Record<OrderState, OrderState[]> = {
  CREATED: ['RESERVED'],
  RESERVED: ['CONTRACT_PENDING'],
  CONTRACT_PENDING: ['ESCROW_CREATED'],
  ESCROW_CREATED: ['DISPATCHED'],
  DISPATCHED: ['DELIVERED'],
  DELIVERED: ['SETTLED'],
  SETTLED: ['CLOSED'],
  CLOSED: [],
};

const contractTransitions: Record<ContractState, ContractState[]> = {
  DRAFT: ['SIGNED'],
  SIGNED: ['ACTIVE', 'TERMINATED'],
  ACTIVE: ['COMPLETED', 'TERMINATED'],
  COMPLETED: [],
  TERMINATED: [],
};

const settlementTransitions: Record<SettlementState, SettlementState[]> = {
  CREATED: ['ESCROWED', 'FAILED'],
  ESCROWED: ['PARTIAL_RELEASED', 'RELEASED', 'FAILED'],
  PARTIAL_RELEASED: ['RELEASED', 'FAILED'],
  RELEASED: [],
  FAILED: [],
};

const disputeTransitions: Record<DisputeState, DisputeState[]> = {
  OPEN: ['IN_REVIEW', 'REJECTED'],
  IN_REVIEW: ['RESOLVED', 'REJECTED'],
  RESOLVED: [],
  REJECTED: [],
};

const throwInvalidTransition = (entity: string, from: string, to: string): never => {
  throw new HttpsError(
    'failed-precondition',
    `Transicao invalida (${entity}): ${from} -> ${to}.`
  );
};

export const assertListingTransition = (from: string, to: ListingState): void => {
  const state = from as ListingState;
  if (!listingTransitions[state]?.includes(to)) {
    throwInvalidTransition('Listing', from, to);
  }
};

export const assertOrderTransition = (from: string, to: OrderState): void => {
  const state = from as OrderState;
  if (!orderTransitions[state]?.includes(to)) {
    throwInvalidTransition('Order', from, to);
  }
};

export const assertContractTransition = (from: string, to: ContractState): void => {
  const state = from as ContractState;
  if (!contractTransitions[state]?.includes(to)) {
    throwInvalidTransition('Contract', from, to);
  }
};

export const assertSettlementTransition = (from: string, to: SettlementState): void => {
  const state = from as SettlementState;
  if (!settlementTransitions[state]?.includes(to)) {
    throwInvalidTransition('Settlement', from, to);
  }
};

export const assertDisputeTransition = (from: string, to: DisputeState): void => {
  const state = from as DisputeState;
  if (!disputeTransitions[state]?.includes(to)) {
    throwInvalidTransition('Dispute', from, to);
  }
};
