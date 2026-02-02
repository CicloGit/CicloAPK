import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { FirestoreService } from '../firebase/firestore.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';
import { REQUEST_STATUSES } from '../common/constants/statuses';
import { StockBalanceService } from '../stock-balance/stock-balance.service';

@Injectable()
export class RequestsService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly stockBalances: StockBalanceService,
  ) {}

  async list(tenantId: string) {
    const snap = await this.firestore.withTenant('requests', tenantId).get();
    return snap.docs.map((d) => this.decorateLegacy(d));
  }

  async listMine(user: AuthenticatedUser) {
    const snap = await this.firestore
      .withTenant('requests', user.tenantId)
      .where('requesterUid', '==', user.uid)
      .get();
    return snap.docs.map((d) => this.decorateLegacy(d));
  }

  private decorateLegacy(doc: FirebaseFirestore.DocumentSnapshot) {
    const data = doc.data() || {};
    const lines = data.lines || [];
    const isLegacy = lines.some((l: any) => !l.supplierId || !l.supplierItemId);
    return { id: doc.id, legacy: isLegacy, ...data };
  }

  async create(user: AuthenticatedUser, dto: any) {
    const status = dto.status ?? 'PENDING';
    const preparedLines = await this.prepareLines(user, dto.lines);
    const doc = {
      lines: preparedLines,
      notes: dto.notes ?? null,
      scheduleAt: dto.scheduleAt ?? null,
      status,
      statusHistory: [{ status, at: new Date().toISOString(), byUid: user.uid }],
      tenantId: user.tenantId,
      requesterUid: user.uid,
      createdAt: new Date().toISOString(),
    };
    const ref = await this.firestore.collection('requests').add(doc);
    return { id: ref.id, ...doc };
  }

  private async prepareLines(user: AuthenticatedUser, lines: any[]) {
    const result: any[] = [];
    for (const line of lines) {
      if (line.catalogItemId && !line.supplierId) {
        const catalogDoc = await this.firestore.doc('tenant_catalog_items', line.catalogItemId).get();
        if (!catalogDoc.exists || catalogDoc.data()?.tenantId !== user.tenantId) {
          throw new NotFoundException('Catalog item not found');
        }
        const catalog = catalogDoc.data();
        if (user.role === 'client_user' && catalog.published !== true) {
          throw new ForbiddenException('Catalog item not published');
        }

        const supplierItemSnap = await this.firestore.doc('supplier_items', catalog.supplierItemId).get();
        if (!supplierItemSnap.exists) throw new NotFoundException('Supplier item not found');
        const sItem = supplierItemSnap.data();

        result.push({
          supplierId: catalog.supplierId,
          supplierItemId: catalog.supplierItemId,
          catalogItemId: catalog.catalogItemId || catalogDoc.id,
          nameSnapshot: catalog.displayName || sItem.name,
          unitSnapshot: sItem.unit,
          sellPriceSnapshot: catalog.sellPrice,
          qty: line.qty,
        });
      } else {
        // legacy line already has supplier data
        result.push(line as any);
      }
    }
    return result;
  }

  async updateStatus(user: AuthenticatedUser, requestId: string, dto: UpdateRequestStatusDto) {
    if (!REQUEST_STATUSES.includes(dto.status)) {
      throw new ForbiddenException('Invalid status');
    }
    const ref = this.firestore.collection('requests').doc(requestId);
    const snap = await ref.get();
    if (!snap.exists || snap.data()?.tenantId !== user.tenantId) {
      throw new NotFoundException('Request not found');
    }
    const data = snap.data();
    const prevStatus = data.status;
    const lines = data.lines || [];

    // Automations based on status transition
    if (dto.status === 'APPROVED' && !['APPROVED', 'IN_PROGRESS', 'DELIVERED'].includes(prevStatus)) {
      for (const line of lines) {
        await this.stockBalances.movement(user, {
          supplierId: line.supplierId,
          supplierItemId: line.supplierItemId,
          qty: line.qty,
          type: 'RESERVE',
          requestId,
        });
      }
    }

    if (dto.status === 'DELIVERED' && prevStatus !== 'DELIVERED') {
      for (const line of lines) {
        await this.stockBalances.movement(user, {
          supplierId: line.supplierId,
          supplierItemId: line.supplierItemId,
          qty: line.qty,
          type: 'OUT',
          requestId,
        });
      }
    }

    if (dto.status === 'CANCELED' && prevStatus !== 'CANCELED') {
      for (const line of lines) {
        await this.stockBalances.movement(user, {
          supplierId: line.supplierId,
          supplierItemId: line.supplierItemId,
          qty: line.qty,
          type: 'RELEASE',
          requestId,
        });
      }
    }

    await ref.update({
      status: dto.status,
      statusHistory: [
        ...(data.statusHistory || []),
        { status: dto.status, at: new Date().toISOString(), byUid: user.uid },
      ],
      updatedAt: new Date().toISOString(),
      updatedBy: user.uid,
    });
    const updated = await ref.get();
    return { id: updated.id, ...updated.data() };
  }
}
