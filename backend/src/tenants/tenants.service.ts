import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { FirestoreService } from '../firebase/firestore.service';
import { FirebaseAdminService } from '../firebase/firebase-admin.service';
import { randomBytes } from 'crypto';

@Injectable()
export class TenantsService {
  constructor(
    private readonly firestore: FirestoreService,
    private readonly firebaseAdmin: FirebaseAdminService,
  ) {}

  async getTenantSummary(user: AuthenticatedUser) {
    return {
      tenantId: user.tenantId,
      accessibleModules: this.getModulesByRole(user.role),
      user: {
        uid: user.uid,
        role: user.role,
        email: user.email,
      },
    };
  }

  async listTenantUsers(tenantId: string) {
    const snapshot = await this.firestore.withTenant('users', tenantId).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  }

  async createTenantUser(requestor: AuthenticatedUser, payload: CreateTenantUserDto) {
    const password = payload.password || `Tmp#${randomBytes(4).toString('hex')}`;

    const userRecord = await this.firebaseAdmin['app']
      .auth()
      .createUser({
        email: payload.email,
        displayName: payload.displayName,
        password,
      });

    await this.firebaseAdmin['app']
      .auth()
      .setCustomUserClaims(userRecord.uid, {
        role: payload.role,
        tenantId: requestor.tenantId,
      });

    const userDoc = {
      uid: userRecord.uid,
      email: payload.email,
      displayName: payload.displayName,
      role: payload.role,
      phone: payload.phone || null,
      tenantId: requestor.tenantId,
      createdBy: requestor.uid,
      createdAt: new Date().toISOString(),
      active: true,
      inviteStatus: 'pending',
    };

    await this.firestore.collection('users').doc(userRecord.uid).set(userDoc);

    return {
      ...userDoc,
      tempPassword: password,
    };
  }

  private getModulesByRole(role: AuthenticatedUser['role']) {
    switch (role) {
      case 'owner':
        return ['users', 'suppliers', 'inventory', 'finance', 'reports'];
      case 'admin':
        return ['inventory', 'finance', 'distribution', 'reports'];
      case 'technician':
        return ['opportunities', 'visits', 'reports'];
      case 'client_user':
        return ['requests', 'finance'];
      case 'supplier':
        return ['restock', 'notifications'];
      default:
        return [];
    }
  }
}
