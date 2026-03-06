import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { parseDateToTimestamp } from './dateUtils';
import { Employee, PayrollEntry, PPEOrder, TimeRecord } from '../types';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const employeesCollection = collection(db, 'employees');
const timeRecordsCollection = collection(db, 'timeRecords');
const payrollCollection = collection(db, 'payrollEntries');
const ppeOrdersCollection = collection(db, 'ppeOrders');
const shiftConfigCollection = collection(db, 'workforceShiftConfigs');

export interface WorkforceShiftConfig {
  entryTime: string;
  exitTime: string;
  lunchDuration: string;
  tolerance: string;
}

const toEmployee = (id: string, raw: Record<string, unknown>): Employee => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  propertyId: raw.propertyId ? String(raw.propertyId) : undefined,
  producerId: raw.producerId ? String(raw.producerId) : undefined,
  userId: raw.userId ? String(raw.userId) : undefined,
  name: String(raw.name ?? ''),
  role: String(raw.role ?? ''),
  type: (raw.type as Employee['type']) ?? 'CLT',
  status: (raw.status as Employee['status']) ?? 'Ativo',
  hourlyRate: raw.hourlyRate !== undefined ? Number(raw.hourlyRate) : undefined,
  monthlySalary: raw.monthlySalary !== undefined ? Number(raw.monthlySalary) : undefined,
});

const toTimeRecord = (id: string, raw: Record<string, unknown>): TimeRecord => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  propertyId: raw.propertyId ? String(raw.propertyId) : undefined,
  producerId: raw.producerId ? String(raw.producerId) : undefined,
  employeeId: String(raw.employeeId ?? ''),
  date: String(raw.date ?? ''),
  hours: Number(raw.hours ?? 0),
  activity: String(raw.activity ?? ''),
  status: (raw.status as TimeRecord['status']) ?? 'Pendente',
});

const toPayrollEntry = (id: string, raw: Record<string, unknown>): PayrollEntry => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  propertyId: raw.propertyId ? String(raw.propertyId) : undefined,
  producerId: raw.producerId ? String(raw.producerId) : undefined,
  employeeId: String(raw.employeeId ?? ''),
  period: String(raw.period ?? ''),
  amount: Number(raw.amount ?? 0),
  status: (raw.status as PayrollEntry['status']) ?? 'Pendente',
  dueDate: String(raw.dueDate ?? ''),
});

const toPPEOrder = (id: string, raw: Record<string, unknown>): PPEOrder => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  propertyId: raw.propertyId ? String(raw.propertyId) : undefined,
  producerId: raw.producerId ? String(raw.producerId) : undefined,
  requesterId: String(raw.requesterId ?? ''),
  items: String(raw.items ?? ''),
  date: String(raw.date ?? ''),
  status: (raw.status as PPEOrder['status']) ?? 'Solicitado',
  conformityDoc: Boolean(raw.conformityDoc),
});

export const workforceService = {
  async createEmployee(payload: Omit<Employee, 'id'>): Promise<Employee> {
    if (!payload.name.trim() || !payload.role.trim()) {
      throw new Error('Informe nome e funcao para cadastrar o colaborador.');
    }

    const context = await resolveTenantContext();
    const employee: Employee = {
      id: `EMP-${Date.now()}`,
      name: payload.name.trim(),
      role: payload.role.trim(),
      type: payload.type,
      status: payload.status,
      hourlyRate: payload.hourlyRate,
      monthlySalary: payload.monthlySalary,
      tenantId: context.tenantId,
      producerId: payload.producerId,
      propertyId: payload.propertyId,
      userId: payload.userId,
    };

    await setDoc(
      doc(db, 'employees', employee.id),
      withTenantFields(
        {
          ...employee,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return employee;
  },

  async listEmployees(): Promise<Employee[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(employeesCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, employee: toEmployee(docSnapshot.id, raw) };
      })
      .filter((entry: { raw: Record<string, unknown> }) => hasTenantAccess(entry.raw, context))
      .map((entry: { employee: Employee }) => entry.employee)
      .sort((a: Employee, b: Employee) => a.name.localeCompare(b.name));
  },

  async createTimeRecord(payload: Omit<TimeRecord, 'id'>): Promise<TimeRecord> {
    if (!payload.employeeId.trim() || !payload.date.trim() || !payload.activity.trim()) {
      throw new Error('Informe funcionario, data e atividade para registrar o ponto.');
    }

    const context = await resolveTenantContext();
    const record: TimeRecord = {
      id: `TIME-${Date.now()}`,
      employeeId: payload.employeeId.trim(),
      date: payload.date.trim(),
      hours: Number(payload.hours ?? 0),
      activity: payload.activity.trim(),
      status: payload.status,
      tenantId: context.tenantId,
      producerId: payload.producerId,
      propertyId: payload.propertyId,
    };

    await setDoc(
      doc(db, 'timeRecords', record.id),
      withTenantFields(
        {
          ...record,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return record;
  },

  async listTimeRecords(): Promise<TimeRecord[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(timeRecordsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, record: toTimeRecord(docSnapshot.id, raw) };
      })
      .filter((entry: { raw: Record<string, unknown> }) => hasTenantAccess(entry.raw, context))
      .map((entry: { record: TimeRecord }) => entry.record)
      .sort((a: TimeRecord, b: TimeRecord) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async createPayrollEntry(payload: Omit<PayrollEntry, 'id'>): Promise<PayrollEntry> {
    if (!payload.employeeId.trim() || !payload.period.trim() || !payload.dueDate.trim()) {
      throw new Error('Informe funcionario, periodo e vencimento para lancar a folha.');
    }

    const context = await resolveTenantContext();
    const entry: PayrollEntry = {
      id: `PAY-${Date.now()}`,
      employeeId: payload.employeeId.trim(),
      period: payload.period.trim(),
      amount: Number(payload.amount ?? 0),
      status: payload.status,
      dueDate: payload.dueDate.trim(),
      tenantId: context.tenantId,
      producerId: payload.producerId,
      propertyId: payload.propertyId,
    };

    await setDoc(
      doc(db, 'payrollEntries', entry.id),
      withTenantFields(
        {
          ...entry,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return entry;
  },

  async listPayrollEntries(): Promise<PayrollEntry[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(payrollCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, entry: toPayrollEntry(docSnapshot.id, raw) };
      })
      .filter((entry: { raw: Record<string, unknown> }) => hasTenantAccess(entry.raw, context))
      .map((entry: { entry: PayrollEntry }) => entry.entry)
      .sort((a: PayrollEntry, b: PayrollEntry) => parseDateToTimestamp(b.dueDate) - parseDateToTimestamp(a.dueDate));
  },

  async createPPEOrder(payload: Omit<PPEOrder, 'id'>): Promise<PPEOrder> {
    if (!payload.requesterId.trim() || !payload.items.trim() || !payload.date.trim()) {
      throw new Error('Informe colaborador, itens e data para registrar entrega de EPI.');
    }

    const context = await resolveTenantContext();
    const order: PPEOrder = {
      id: `PPE-${Date.now()}`,
      requesterId: payload.requesterId.trim(),
      items: payload.items.trim(),
      date: payload.date.trim(),
      status: payload.status,
      conformityDoc: payload.conformityDoc,
      tenantId: context.tenantId,
      producerId: payload.producerId,
      propertyId: payload.propertyId,
    };

    await setDoc(
      doc(db, 'ppeOrders', order.id),
      withTenantFields(
        {
          ...order,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return order;
  },

  async listPPEOrders(): Promise<PPEOrder[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(ppeOrdersCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, order: toPPEOrder(docSnapshot.id, raw) };
      })
      .filter((entry: { raw: Record<string, unknown> }) => hasTenantAccess(entry.raw, context))
      .map((entry: { order: PPEOrder }) => entry.order)
      .sort((a: PPEOrder, b: PPEOrder) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async updatePayrollStatus(entryId: string, status: PayrollEntry['status']): Promise<void> {
    const context = await resolveTenantContext();
    const entryRef = doc(db, 'payrollEntries', entryId);
    const snapshot = await getDoc(entryRef);
    if (!snapshot.exists()) {
      throw new Error('Lancamento da folha nao encontrado.');
    }
    if (!hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para alterar folha de outro tenant.');
    }

    await setDoc(
      entryRef,
      {
        status,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  async getShiftConfig(): Promise<WorkforceShiftConfig | null> {
    const context = await resolveTenantContext();
    const configRef = doc(db, 'workforceShiftConfigs', context.tenantId);
    const snapshot = await getDoc(configRef);
    if (!snapshot.exists()) {
      return null;
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, context)) {
      throw new Error('Sem permissao para ler configuracao de turno de outro tenant.');
    }

    return {
      entryTime: String(raw.entryTime ?? '07:00'),
      exitTime: String(raw.exitTime ?? '17:00'),
      lunchDuration: String(raw.lunchDuration ?? '60'),
      tolerance: String(raw.tolerance ?? '10'),
    };
  },

  async saveShiftConfig(payload: WorkforceShiftConfig): Promise<WorkforceShiftConfig> {
    const context = await resolveTenantContext();
    const config: WorkforceShiftConfig = {
      entryTime: payload.entryTime.trim(),
      exitTime: payload.exitTime.trim(),
      lunchDuration: payload.lunchDuration.trim(),
      tolerance: payload.tolerance.trim(),
    };

    if (!config.entryTime || !config.exitTime) {
      throw new Error('Informe horario de entrada e saida para salvar o turno.');
    }

    await setDoc(
      doc(db, 'workforceShiftConfigs', context.tenantId),
      withTenantFields(
        {
          ...config,
          updatedByUserId: context.userId,
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return config;
  },
};
