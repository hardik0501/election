import crypto from 'crypto';
import { User, Role } from '@/types';

export type UserRoleName =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'DATA_OFFICER'
  | 'AUDITOR'
  | 'VIEWER';

export type Permission =
  | 'CAN_SEARCH'
  | 'CAN_VIEW_SOURCE'
  | 'CAN_UPLOAD'
  | 'CAN_VALIDATE'
  | 'CAN_EDIT_VOTER'
  | 'CAN_DELETE_VOTER'
  | 'CAN_VIEW_AUDIT'
  | 'CAN_MANAGE_USERS';

export const ROLE_PERMISSIONS: Record<UserRoleName, Permission[]> = {
  SUPER_ADMIN: [
    'CAN_SEARCH',
    'CAN_VIEW_SOURCE',
    'CAN_UPLOAD',
    'CAN_VALIDATE',
    'CAN_EDIT_VOTER',
    'CAN_DELETE_VOTER',
    'CAN_VIEW_AUDIT',
    'CAN_MANAGE_USERS',
  ],
  ADMIN: [
    'CAN_SEARCH',
    'CAN_VIEW_SOURCE',
    'CAN_UPLOAD',
    'CAN_VALIDATE',
    'CAN_EDIT_VOTER',
    'CAN_DELETE_VOTER',
    'CAN_VIEW_AUDIT',
  ],
  DATA_OFFICER: [
    'CAN_SEARCH',
    'CAN_VIEW_SOURCE',
    'CAN_UPLOAD',
    'CAN_VALIDATE',
    'CAN_EDIT_VOTER',
  ],
  AUDITOR: [
    'CAN_SEARCH',
    'CAN_VIEW_SOURCE',
    'CAN_VIEW_AUDIT',
  ],
  VIEWER: [
    'CAN_SEARCH',
    'CAN_VIEW_SOURCE',
  ],
};

const AUTH_SECRET = process.env.AUTH_SECRET || 'voterfinder_sec_production_key_2026_x89a';

export interface AuthSession {
  user_id: string;
  email: string;
  full_name: string;
  role: UserRoleName;
  permissions: Permission[];
  issued_at: number;
  expires_at: number;
}

export class AuthService {
  /**
   * Hash a password securely with salt using PBKDF2
   */
  public static hashPassword(password: string, salt?: string): { hash: string; salt: string } {
    const s = salt || crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, s, 10000, 64, 'sha512').toString('hex');
    return { hash: `${s}:${hash}`, salt: s };
  }

  /**
   * Verify password against salted hash
   */
  public static verifyPassword(password: string, storedHashWithSalt: string): boolean {
    if (!storedHashWithSalt || !storedHashWithSalt.includes(':')) {
      return false;
    }
    const [salt, originalHash] = storedHashWithSalt.split(':');
    const computedHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(computedHash), Buffer.from(originalHash));
  }

  /**
   * Generate signed HMAC-SHA256 Token
   */
  public static generateToken(user: { id: string; email: string; full_name: string; role: UserRoleName }): string {
    const now = Math.floor(Date.now() / 1000);
    const session: AuthSession = {
      user_id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.VIEWER,
      issued_at: now,
      expires_at: now + 86400 * 7, // 7 days validity
    };

    const payload = Buffer.from(JSON.stringify(session)).toString('base64url');
    const signature = crypto
      .createHmac('sha256', AUTH_SECRET)
      .update(payload)
      .digest('base64url');

    return `${payload}.${signature}`;
  }

  /**
   * Verify token and extract verified AuthSession
   */
  public static verifyToken(token: string): AuthSession | null {
    if (!token || !token.includes('.')) return null;

    try {
      const [payload, signature] = token.split('.');
      const expectedSig = crypto
        .createHmac('sha256', AUTH_SECRET)
        .update(payload)
        .digest('base64url');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
      }

      const sessionStr = Buffer.from(payload, 'base64url').toString('utf8');
      const session: AuthSession = JSON.parse(sessionStr);

      const now = Math.floor(Date.now() / 1000);
      if (session.expires_at < now) {
        return null; // Expired
      }

      return session;
    } catch {
      return null;
    }
  }

  /**
   * Check if a session possesses the required permission
   */
  public static hasPermission(session: AuthSession | null, permission: Permission): boolean {
    if (!session) return false;
    const permissions = ROLE_PERMISSIONS[session.role] || [];
    return permissions.includes(permission);
  }

  /**
   * Built-in initial mock admin users for seed authentication
   */
  public static getInitialAdminUsers(): Array<{
    id: string;
    email: string;
    full_name: string;
    role: UserRoleName;
    password_hash: string;
    is_active: boolean;
  }> {
    const adminPass = this.hashPassword('Admin@VoterFinder2026');
    const officerPass = this.hashPassword('Officer@VoterFinder2026');
    const auditorPass = this.hashPassword('Auditor@VoterFinder2026');

    return [
      {
        id: 'usr_super_admin_01',
        email: 'superadmin@voterfinder.gov.in',
        full_name: 'Chief Electoral Systems Administrator',
        role: 'SUPER_ADMIN',
        password_hash: adminPass.hash,
        is_active: true,
      },
      {
        id: 'usr_data_officer_01',
        email: 'dataofficer@voterfinder.gov.in',
        full_name: 'Electoral Roll Verification Officer',
        role: 'DATA_OFFICER',
        password_hash: officerPass.hash,
        is_active: true,
      },
      {
        id: 'usr_auditor_01',
        email: 'auditor@voterfinder.gov.in',
        full_name: 'Electoral Data Integrity Auditor',
        role: 'AUDITOR',
        password_hash: auditorPass.hash,
        is_active: true,
      },
    ];
  }
}
