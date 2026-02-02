import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { FirestoreService } from '../firebase/firestore.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Injectable()
export class SuppliersService {
  constructor(private readonly firestore: FirestoreService) {}

  async list(tenantId: string) {
    const snapshot = await this.firestore.withTenant('suppliers', tenantId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async create(user: AuthenticatedUser, payload: CreateSupplierDto) {
    const doc = {
      name: payload.name,
      email: payload.email ?? null,
      contact: payload.contact ?? null,
      items: payload.items ?? [],
      tenantId: user.tenantId,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
      status: 'active',
    };
    const ref = await this.firestore.collection('suppliers').add(doc);
    return { id: ref.id, ...doc };
  }
}
