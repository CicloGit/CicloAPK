import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { FirestoreService } from '../firebase/firestore.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';
import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';

@Injectable()
export class CatalogService {
  constructor(private readonly firestore: FirestoreService) {}

  async listForTenant(user: AuthenticatedUser, publishedOnly = false) {
    let q = this.firestore.collection('tenant_catalog_items').where('tenantId', '==', user.tenantId);
    if (publishedOnly) q = q.where('published', '==', true);
    const snap = await q.get();
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async create(user: AuthenticatedUser, dto: CreateCatalogItemDto) {
    if (user.role === 'supplier') throw new ForbiddenException();
    const doc = {
      tenantId: user.tenantId,
      supplierId: dto.supplierId,
      supplierItemId: dto.supplierItemId,
      inherit: dto.inherit ?? true,
      displayName: dto.displayName ?? null,
      displayDesc: dto.displayDesc ?? null,
      displayPhoto: dto.displayPhoto ?? null,
      sellPrice: dto.sellPrice,
      published: dto.published ?? false,
      createdAt: new Date().toISOString(),
      createdBy: user.uid,
    };
    const ref = await this.firestore.collection('tenant_catalog_items').add(doc);
    await ref.update({ catalogItemId: ref.id });
    return { id: ref.id, catalogItemId: ref.id, ...doc };
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateCatalogItemDto) {
    const ref = this.firestore.collection('tenant_catalog_items').doc(id);
    const snap = await ref.get();
    if (!snap.exists) throw new NotFoundException();
    const data = snap.data();
    if (data.tenantId !== user.tenantId) throw new ForbiddenException();
    if (user.role === 'supplier') throw new ForbiddenException();
    await ref.update({ ...dto, updatedAt: new Date().toISOString(), updatedBy: user.uid });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() };
  }
}
