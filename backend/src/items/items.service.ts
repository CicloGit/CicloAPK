import { Injectable, NotFoundException } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { FirestoreService } from '../firebase/firestore.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Injectable()
export class ItemsService {
  constructor(private readonly firestore: FirestoreService) {}

  async list(tenantId: string) {
    const snap = await this.firestore.withTenant('items', tenantId).get();
    return snap.docs.map((d) => {
      const data = d.data();
      const available = (data.onHand ?? 0) - (data.reserved ?? 0);
      return {
        id: d.id,
        ...data,
        available,
        lowStock: data.minStock ? available <= data.minStock : false,
      };
    });
  }

  async create(user: AuthenticatedUser, dto: CreateItemDto) {
    const doc = {
      name: dto.name,
      category: dto.category,
      unit: dto.unit,
      price: dto.price ?? null,
      photoUrl: dto.photoUrl ?? null,
      minStock: dto.minStock ?? null,
      active: dto.active ?? true,
      tenantId: user.tenantId,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
      onHand: 0,
      reserved: 0,
      available: 0,
    };
    const ref = await this.firestore.collection('items').add(doc);
    return { id: ref.id, ...doc };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateItemDto) {
    const ref = this.firestore.collection('items').doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.tenantId !== user.tenantId) {
      throw new NotFoundException('Item not found');
    }
    await ref.update({
      ...dto,
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() };
  }

  async remove(user: AuthenticatedUser, id: string) {
    const ref = this.firestore.collection('items').doc(id);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.tenantId !== user.tenantId) {
      throw new NotFoundException('Item not found');
    }
    await ref.update({ active: false, updatedAt: new Date().toISOString(), updatedBy: user.uid });
    return { id, deleted: true };
  }
}
