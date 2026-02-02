import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';
import { CreateSupplierItemDto } from './dto/create-supplier-item.dto';
import { UpdateSupplierItemDto } from './dto/update-supplier-item.dto';
import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';

@Injectable()
export class SupplierItemsService {
  constructor(private readonly firestore: FirestoreService) {}

  async list(tenantId: string, supplierId?: string) {
    let q = this.firestore.collection('supplier_items').where('tenantId', '==', tenantId);
    if (supplierId) q = q.where('supplierId', '==', supplierId);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async create(user: AuthenticatedUser, dto: CreateSupplierItemDto) {
    if (user.role === 'supplier' && dto.supplierId !== user.uid && dto.supplierId !== user.tenantId) {
      throw new ForbiddenException();
    }
    const doc = {
      tenantId: user.tenantId,
      supplierId: dto.supplierId,
      name: dto.name,
      unit: dto.unit,
      category: dto.category ?? null,
      photoUrl: dto.photoUrl ?? null,
      costPrice: dto.costPrice ?? null,
      minStock: dto.minStock ?? null,
      active: dto.active ?? true,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    };
    const ref = await this.firestore.collection('supplier_items').add(doc);
    await ref.update({ supplierItemId: ref.id });
    return { id: ref.id, supplierItemId: ref.id, ...doc };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateSupplierItemDto) {
    const ref = this.firestore.collection('supplier_items').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException();
    const data = snap.data();
    if (data.tenantId !== user.tenantId) throw new ForbiddenException();
    if (user.role === 'supplier' && data.supplierId !== user.uid && data.supplierId !== user.tenantId) {
      throw new ForbiddenException();
    }
    await ref.update({ ...dto, updatedAt: new Date().toISOString(), updatedBy: user.uid });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() };
  }
}
