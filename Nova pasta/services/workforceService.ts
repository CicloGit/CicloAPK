import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockEmployees, mockPayroll, mockPPEOrders, mockTimeRecords } from '../constants';
import { db } from '../config/firebase';
import { Employee, PayrollEntry, PPEOrder, TimeRecord } from '../types';

const employeesCollection = collection(db, 'employees');
const timeRecordsCollection = collection(db, 'timeRecords');
const payrollCollection = collection(db, 'payrollEntries');
const ppeOrdersCollection = collection(db, 'ppeOrders');

let seeded = false;

const toEmployee = (id: string, raw: Record<string, unknown>): Employee => ({
  id,
  name: String(raw.name ?? ''),
  role: String(raw.role ?? ''),
  type: (raw.type as Employee['type']) ?? 'CLT',
  status: (raw.status as Employee['status']) ?? 'Ativo',
  hourlyRate: raw.hourlyRate !== undefined ? Number(raw.hourlyRate) : undefined,
  monthlySalary: raw.monthlySalary !== undefined ? Number(raw.monthlySalary) : undefined,
});

const toTimeRecord = (id: string, raw: Record<string, unknown>): TimeRecord => ({
  id,
  employeeId: String(raw.employeeId ?? ''),
  date: String(raw.date ?? ''),
  hours: Number(raw.hours ?? 0),
  activity: String(raw.activity ?? ''),
  status: (raw.status as TimeRecord['status']) ?? 'Pendente',
});

const toPayrollEntry = (id: string, raw: Record<string, unknown>): PayrollEntry => ({
  id,
  employeeId: String(raw.employeeId ?? ''),
  period: String(raw.period ?? ''),
  amount: Number(raw.amount ?? 0),
  status: (raw.status as PayrollEntry['status']) ?? 'Pendente',
  dueDate: String(raw.dueDate ?? ''),
});

const toPPEOrder = (id: string, raw: Record<string, unknown>): PPEOrder => ({
  id,
  requesterId: String(raw.requesterId ?? ''),
  items: String(raw.items ?? ''),
  date: String(raw.date ?? ''),
  status: (raw.status as PPEOrder['status']) ?? 'Solicitado',
  conformityDoc: Boolean(raw.conformityDoc),
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(employeesCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockEmployees.map((employee) =>
      setDoc(doc(db, 'employees', employee.id), {
        ...employee,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockTimeRecords.map((record) =>
      setDoc(doc(db, 'timeRecords', record.id), {
        ...record,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockPayroll.map((entry) =>
      setDoc(doc(db, 'payrollEntries', entry.id), {
        ...entry,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockPPEOrders.map((order) =>
      setDoc(doc(db, 'ppeOrders', order.id), {
        ...order,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const workforceService = {
  async listEmployees(): Promise<Employee[]> {
    await ensureSeedData();
    const snapshot = await getDocs(employeesCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toEmployee(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: Employee, b: Employee) => a.name.localeCompare(b.name));
  },

  async listTimeRecords(): Promise<TimeRecord[]> {
    await ensureSeedData();
    const snapshot = await getDocs(timeRecordsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toTimeRecord(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: TimeRecord, b: TimeRecord) => b.date.localeCompare(a.date));
  },

  async listPayrollEntries(): Promise<PayrollEntry[]> {
    await ensureSeedData();
    const snapshot = await getDocs(payrollCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toPayrollEntry(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: PayrollEntry, b: PayrollEntry) => b.dueDate.localeCompare(a.dueDate));
  },

  async listPPEOrders(): Promise<PPEOrder[]> {
    await ensureSeedData();
    const snapshot = await getDocs(ppeOrdersCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toPPEOrder(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: PPEOrder, b: PPEOrder) => b.date.localeCompare(a.date));
  },
};
