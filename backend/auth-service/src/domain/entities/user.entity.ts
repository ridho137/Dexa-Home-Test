export type UserRole = 'EMPLOYEE' | 'ADMIN_HR';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
