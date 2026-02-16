import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { parseDateToTimestamp } from './dateUtils';
import { BankAccount, Expense, Receivable, Transaction } from '../types';

const accountCollection = collection(db, 'bankAccounts');
const receivableCollection = collection(db, 'receivables');
const expenseCollection = collection(db, 'expenses');
const transactionCollection = collection(db, 'transactions');

export const financialSplitConfig = {
  platformFeeRate: 0.05,
  logisticsRate: 0.08,
} as const;

const toReceivable = (id: string, raw: Record<string, unknown>): Receivable => ({
  id,
  origin: String(raw.origin ?? ''),
  value: Number(raw.value ?? 0),
  dueDate: String(raw.dueDate ?? ''),
  status: (raw.status as Receivable['status']) ?? 'PENDENTE',
  fiscalEntityId: String(raw.fiscalEntityId ?? ''),
  liquidationFlow: raw.liquidationFlow
    ? {
        title: String((raw.liquidationFlow as { title?: string }).title ?? ''),
        description: String((raw.liquidationFlow as { description?: string }).description ?? ''),
        steps: Array.isArray((raw.liquidationFlow as { steps?: unknown[] }).steps)
          ? ((raw.liquidationFlow as { steps?: unknown[] }).steps as Array<Record<string, unknown>>).map((step) => ({
              name: String(step.name ?? ''),
              completed: Boolean(step.completed),
            }))
          : [],
      }
    : undefined,
});

const toExpense = (id: string, raw: Record<string, unknown>): Expense => ({
  id,
  description: String(raw.description ?? ''),
  supplier: String(raw.supplier ?? ''),
  value: Number(raw.value ?? 0),
  dueDate: String(raw.dueDate ?? ''),
  status: (raw.status as Expense['status']) ?? 'A_PAGAR',
  category: String(raw.category ?? ''),
  fiscalEntityId: String(raw.fiscalEntityId ?? ''),
});

const toBankAccount = (id: string, raw: Record<string, unknown>): BankAccount => ({
  id,
  userId: String(raw.userId ?? ''),
  provider: (raw.provider as BankAccount['provider']) ?? 'OTHER',
  accountNumber: String(raw.accountNumber ?? ''),
  agency: String(raw.agency ?? ''),
  balance: Number(raw.balance ?? 0),
  blockedBalance: Number(raw.blockedBalance ?? 0),
  holderName: String(raw.holderName ?? ''),
  holderDoc: String(raw.holderDoc ?? ''),
});

const toTransaction = (id: string, raw: Record<string, unknown>): Transaction => ({
  id,
  accountId: String(raw.accountId ?? ''),
  type: (raw.type as Transaction['type']) ?? 'PIX_IN',
  description: String(raw.description ?? ''),
  amount: Number(raw.amount ?? 0),
  date: String(raw.date ?? ''),
  status: (raw.status as Transaction['status']) ?? 'PENDING',
  counterparty: raw.counterparty ? String(raw.counterparty) : undefined,
  documentUrl: raw.documentUrl ? String(raw.documentUrl) : undefined,
});

export const financialService = {
  async listReceivables(): Promise<Receivable[]> {
    const snapshot = await getDocs(receivableCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toReceivable(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: Receivable, b: Receivable) => parseDateToTimestamp(a.dueDate) - parseDateToTimestamp(b.dueDate));
  },

  async listExpenses(): Promise<Expense[]> {
    const snapshot = await getDocs(expenseCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toExpense(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: Expense, b: Expense) => parseDateToTimestamp(a.dueDate) - parseDateToTimestamp(b.dueDate));
  },

  async listBankAccounts(): Promise<BankAccount[]> {
    const snapshot = await getDocs(accountCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toBankAccount(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: BankAccount, b: BankAccount) => a.holderName.localeCompare(b.holderName));
  },

  async listTransactions(accountId?: string): Promise<Transaction[]> {
    const snapshot = await getDocs(transactionCollection);
    const allItems: Transaction[] = snapshot.docs.map((docSnapshot: any) =>
      toTransaction(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );

    const filtered = accountId ? allItems.filter((item: Transaction) => item.accountId === accountId) : allItems;
    return filtered.sort((a: Transaction, b: Transaction) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async getReceivableById(receivableId: string): Promise<Receivable | null> {
    const snapshot = await getDoc(doc(db, 'receivables', receivableId));
    if (!snapshot.exists()) {
      return null;
    }
    return toReceivable(snapshot.id, snapshot.data() as Record<string, unknown>);
  },

  async markReceivableAsLiquidated(receivableId: string): Promise<void> {
    await setDoc(
      doc(db, 'receivables', receivableId),
      {
        status: 'LIQUIDADO',
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },
};
