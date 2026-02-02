import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { FirestoreService } from '../firebase/firestore.service';

type MovementType = 'IN' | 'OUT' | 'ADJUST' | 'RESERVE' | 'RELEASE';

interface MovementInput {
  itemId: string;
  qty: number;
  type: MovementType;
  requestId?: string;
  note?: string;
}

@Injectable()
export class StockMovementsService {
  constructor(private readonly firestore: FirestoreService) {}

  async create(user: AuthenticatedUser, input: MovementInput) {
    if (input.qty <= 0) throw new BadRequestException('Quantity must be positive');

    return this.firestore.runTransaction(async (t) => {
      const itemRef = this.firestore.doc('items', input.itemId);
      const itemSnap = await t.get(itemRef);
      if (!itemSnap.exists || itemSnap.data()?.tenantId !== user.tenantId) {
        throw new NotFoundException('Item not found');
      }

      const itemData = itemSnap.data() || {};
      let onHand = itemData.onHand ?? 0;
      let reserved = itemData.reserved ?? 0;

      switch (input.type) {
        case 'IN':
          onHand += input.qty;
          break;
        case 'OUT':
          onHand = Math.max(onHand - input.qty, 0);
          reserved = Math.max(reserved - input.qty, 0);
          break;
        case 'ADJUST':
          onHand += input.qty;
          break;
        case 'RESERVE':
          reserved += input.qty;
          break;
        case 'RELEASE':
          reserved = Math.max(reserved - input.qty, 0);
          break;
        default:
          throw new BadRequestException('Invalid movement type');
      }

      const available = onHand - reserved;
      const lowStock = itemData.minStock ? available <= itemData.minStock : false;

      t.update(itemRef, {
        onHand,
        reserved,
        available,
        lowStock,
        updatedAt: new Date().toISOString(),
        updatedBy: user.uid,
      });

      const moveRef = this.firestore.collection('stock_movements').doc();
      const movement = {
        ...input,
        tenantId: user.tenantId,
        createdAt: new Date().toISOString(),
        createdBy: user.uid,
        itemNameSnapshot: itemData.name,
        before: {
          onHand: itemData.onHand ?? 0,
          reserved: itemData.reserved ?? 0,
        },
        after: { onHand, reserved, available },
      };
      t.set(moveRef, movement);

      return { id: moveRef.id, ...movement };
    });
  }

  async list(user: AuthenticatedUser, supplierItemId?: string, supplierId?: string) {
    let query = this.firestore.withTenant('stock_movements', user.tenantId).orderBy('createdAt', 'desc');
    if (supplierItemId) query = query.where('supplierItemId', '==', supplierItemId);
    if (supplierId) query = query.where('supplierId', '==', supplierId);
    const snap = await query.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}
