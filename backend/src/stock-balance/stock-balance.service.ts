import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { FirestoreService } from '../firebase/firestore.service';

export type BalanceInput = {
  supplierId: string;
  supplierItemId: string;
  qty: number;
  type: 'IN' | 'OUT' | 'RESERVE' | 'RELEASE' | 'ADJUST';
  requestId?: string;
  supplierOrderId?: string;
  note?: string;
};

@Injectable()
export class StockBalanceService {
  constructor(private readonly firestore: FirestoreService) {}

  private balanceId(tenantId: string, supplierId: string, supplierItemId: string) {
    return `${tenantId}_${supplierId}_${supplierItemId}`;
  }

  async list(tenantId: string, supplierId?: string) {
    let q = this.firestore.collection('stock_balances').where('tenantId', '==', tenantId);
    if (supplierId) q = q.where('supplierId', '==', supplierId);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async movement(user: AuthenticatedUser, input: BalanceInput) {
    if (input.qty <= 0) throw new BadRequestException('qty must be positive');
    const balanceId = this.balanceId(user.tenantId, input.supplierId, input.supplierItemId);
    const balanceRef = this.firestore.collection('stock_balances').doc(balanceId);
    const moveRef = this.firestore.collection('stock_movements').doc();

    return this.firestore.runTransaction(async (t) => {
      const balSnap = await t.get(balanceRef);
      const balData = balSnap.exists ? balSnap.data() : null;
      if (!balSnap.exists) {
        t.set(balanceRef, {
          tenantId: user.tenantId,
          supplierId: input.supplierId,
          supplierItemId: input.supplierItemId,
          onHand: 0,
          reserved: 0,
          available: 0,
          minStock: null,
          lowStock: false,
          updatedAt: new Date().toISOString(),
        });
      }
      const current = balData || { onHand: 0, reserved: 0, available: 0, minStock: null };
      let { onHand, reserved } = current;
      switch (input.type) {
        case 'IN':
          onHand += input.qty;
          break;
        case 'OUT':
          onHand = Math.max(onHand - input.qty, 0);
          reserved = Math.max(reserved - input.qty, 0);
          break;
        case 'RESERVE':
          reserved += input.qty;
          break;
        case 'RELEASE':
          reserved = Math.max(reserved - input.qty, 0);
          break;
        case 'ADJUST':
          onHand += input.qty;
          break;
        default:
          throw new BadRequestException('invalid type');
      }
      const available = onHand - reserved;
      const minStock = current.minStock ?? null;
      const lowStock = minStock !== null ? available <= minStock : false;

      t.set(
        balanceRef,
        {
          tenantId: user.tenantId,
          supplierId: input.supplierId,
          supplierItemId: input.supplierItemId,
          onHand,
          reserved,
          available,
          minStock,
          lowStock,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      t.set(moveRef, {
        tenantId: user.tenantId,
        supplierId: input.supplierId,
        supplierItemId: input.supplierItemId,
        qty: input.qty,
        type: input.type,
        requestId: input.requestId ?? null,
        supplierOrderId: input.supplierOrderId ?? null,
        note: input.note ?? null,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
      });

      return {
        balance: { id: balanceId, onHand, reserved, available, lowStock },
        movementId: moveRef.id,
      };
    });
  }

  async setMinStock(user: AuthenticatedUser, supplierId: string, supplierItemId: string, minStock: number) {
    const balanceId = this.balanceId(user.tenantId, supplierId, supplierItemId);
    const ref = this.firestore.collection('stock_balances').doc(balanceId);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException('balance not found');
    const data = snap.data();
    const available = data.available ?? data.onHand - data.reserved;
    const lowStock = available <= minStock;
    await ref.update({ minStock, lowStock, updatedAt: new Date().toISOString() });
    return { id: balanceId, minStock, lowStock };
  }
}
