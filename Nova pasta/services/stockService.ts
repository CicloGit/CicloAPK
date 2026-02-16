import {
  collection,
  doc,
  getDocs,
  orderBy,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { AuditChain } from '../lib/auditChain';
import { RulesEngine, hasSufficientStock } from '../lib/rulesEngine';
import { db } from '../config/firebase';
import { AuditEvent, InventoryItem, StockMovement } from '../types';

const inventoryCollection = collection(db, 'inventoryItems');
const movementCollection = collection(db, 'stockMovements');
const auditCollection = collection(db, 'auditEvents');

const todayBR = () => new Date().toLocaleDateString('pt-BR');

const toInventoryItem = (id: string, raw: Record<string, unknown>): InventoryItem => ({
  id,
  name: String(raw.name ?? ''),
  category: (raw.category as InventoryItem['category']) ?? 'Outro',
  quantity: Number(raw.quantity ?? 0),
  unit: String(raw.unit ?? ''),
  minLevel: Number(raw.minLevel ?? 0),
  location: String(raw.location ?? ''),
  lastUpdated: String(raw.lastUpdated ?? todayBR()),
});

const toStockMovement = (id: string, raw: Record<string, unknown>): StockMovement => ({
  id,
  itemId: String(raw.itemId ?? ''),
  itemName: String(raw.itemName ?? ''),
  type: (raw.type as StockMovement['type']) ?? 'OUTBOUND_USAGE',
  quantity: Number(raw.quantity ?? 0),
  unit: String(raw.unit ?? ''),
  date: String(raw.date ?? todayBR()),
  status: (raw.status as StockMovement['status']) ?? 'PENDING_APPROVAL',
  requester: String(raw.requester ?? ''),
  invoiceNumber: raw.invoiceNumber ? String(raw.invoiceNumber) : undefined,
  proofUrl: raw.proofUrl ? String(raw.proofUrl) : undefined,
  reason: raw.reason ? String(raw.reason) : undefined,
  auditHash: raw.auditHash ? String(raw.auditHash) : undefined,
});

const toAuditEvent = (id: string, raw: Record<string, unknown>): AuditEvent => ({
  id,
  timestamp: String(raw.timestamp ?? new Date().toISOString()),
  actor: String(raw.actor ?? ''),
  action: String(raw.action ?? ''),
  details: String(raw.details ?? ''),
  geolocation: String(raw.geolocation ?? ''),
  hash: String(raw.hash ?? ''),
  verified: Boolean(raw.verified),
  proofUrl: raw.proofUrl ? String(raw.proofUrl) : undefined,
});

async function getLatestAuditEvent(): Promise<AuditEvent | null> {
  const auditSnapshot = await getDocs(auditCollection);
  if (auditSnapshot.empty) {
    return null;
  }

  const docSnapshot = auditSnapshot.docs.sort((left: any, right: any) => {
    const leftCreatedAt = left.get('createdAt')?.seconds ?? 0;
    const rightCreatedAt = right.get('createdAt')?.seconds ?? 0;
    return rightCreatedAt - leftCreatedAt;
  })[0];
  return toAuditEvent(docSnapshot.id, docSnapshot.data() as Record<string, unknown>);
}

export const stockService = {
  async listInventory(): Promise<InventoryItem[]> {
    const snapshot = await getDocs(inventoryCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toInventoryItem(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: InventoryItem, b: InventoryItem) => a.name.localeCompare(b.name));
  },

  async listMovements(): Promise<StockMovement[]> {
    const snapshot = await getDocs(movementCollection);
    return snapshot.docs.map((docSnapshot: any) => toStockMovement(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async registerStockUsage(
    data: { itemId: string; quantity: number; reason: string; proofUrl: string; requester: string }
  ): Promise<{ success: boolean; message?: string; newMovement?: StockMovement; auditEvent?: AuditEvent }> {
    try {
      const itemRef = doc(db, 'inventoryItems', data.itemId);
      const lastAuditEvent = await getLatestAuditEvent();
      const previousHash = lastAuditEvent ? lastAuditEvent.hash : '0'.repeat(64);

      const currentInventory = await this.listInventory();
      const item = currentInventory.find((inventoryItem) => inventoryItem.id === data.itemId);

      if (!item) {
        return { success: false, message: 'Item de estoque nao encontrado.' };
      }

      const validation = RulesEngine.validate([hasSufficientStock], { quantity: data.quantity }, { item });
      if (!validation.success) {
        return { success: false, message: validation.errors.join(', ') };
      }

      const auditData: Omit<AuditEvent, 'id' | 'timestamp' | 'hash'> = {
        actor: data.requester,
        action: 'STOCK_OUTBOUND_LOSS',
        details: `Baixa de ${data.quantity} ${item.unit} de ${item.name}. Motivo: ${data.reason}`,
        geolocation: '-15.123, -47.654',
        verified: true,
        proofUrl: data.proofUrl,
      };

      const newAuditEvent = await AuditChain.createAuditEvent(auditData, previousHash);

      const newMovement: StockMovement = {
        id: `MOV-${Date.now()}`,
        itemId: data.itemId,
        itemName: item.name,
        type: 'OUTBOUND_LOSS',
        quantity: data.quantity,
        unit: item.unit,
        date: todayBR(),
        status: 'AUDITED',
        requester: data.requester,
        reason: data.reason,
        proofUrl: data.proofUrl,
        auditHash: newAuditEvent.hash,
      };

      await runTransaction(db, async (transaction: any) => {
        const itemSnapshot = await transaction.get(itemRef);
        if (!itemSnapshot.exists()) {
          throw new Error('Item de estoque nao encontrado.');
        }

        const itemData = toInventoryItem(itemSnapshot.id, itemSnapshot.data() as Record<string, unknown>);
        const businessValidation = RulesEngine.validate([hasSufficientStock], { quantity: data.quantity }, { item: itemData });
        if (!businessValidation.success) {
          throw new Error(businessValidation.errors.join(', '));
        }

        transaction.update(itemRef, {
          quantity: itemData.quantity - data.quantity,
          lastUpdated: todayBR(),
          updatedAt: serverTimestamp(),
        });

        transaction.set(doc(db, 'stockMovements', newMovement.id), {
          ...newMovement,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        transaction.set(doc(db, 'auditEvents', newAuditEvent.id), {
          ...newAuditEvent,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });

      return { success: true, newMovement, auditEvent: newAuditEvent };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao registrar a baixa de estoque.';
      return { success: false, message };
    }
  },

  async confirmInboundEntry(
    movementId: string,
    invoiceNumber: string
  ): Promise<{ success: boolean; message?: string; updatedMovement?: StockMovement }> {
    try {
      const movementRef = doc(db, 'stockMovements', movementId);
      const movements = await this.listMovements();
      const movement = movements.find((entry) => entry.id === movementId);

      if (!movement) {
        return { success: false, message: 'Movimentacao nao encontrada.' };
      }

      if (movement.type !== 'INBOUND_PURCHASE') {
        return { success: false, message: 'Somente entradas de compra podem ser confirmadas.' };
      }

      const itemRef = doc(db, 'inventoryItems', movement.itemId);
      await runTransaction(db, async (transaction: any) => {
        const itemSnapshot = await transaction.get(itemRef);
        if (!itemSnapshot.exists()) {
          throw new Error('Item de estoque nao encontrado.');
        }

        const item = toInventoryItem(itemSnapshot.id, itemSnapshot.data() as Record<string, unknown>);

        transaction.update(itemRef, {
          quantity: item.quantity + movement.quantity,
          lastUpdated: todayBR(),
          updatedAt: serverTimestamp(),
        });

        transaction.update(movementRef, {
          status: 'COMPLETED',
          invoiceNumber,
          updatedAt: serverTimestamp(),
        });
      });

      const updatedMovement: StockMovement = {
        ...movement,
        status: 'COMPLETED',
        invoiceNumber,
      };

      return { success: true, updatedMovement };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao confirmar entrada.';
      return { success: false, message };
    }
  },

  async appendStockMovement(movement: StockMovement): Promise<void> {
    await setDoc(
      doc(db, 'stockMovements', movement.id),
      {
        ...movement,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  },

  async updateMovementStatus(movementId: string, status: StockMovement['status']): Promise<void> {
    await updateDoc(doc(db, 'stockMovements', movementId), { status, updatedAt: serverTimestamp() });
  },
};
