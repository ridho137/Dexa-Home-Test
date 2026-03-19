export type EmployeeRole = 'EMPLOYEE' | 'ADMIN_HR';

export interface Employee {
  id: string;
  name: string;
  email: string;
  position: string;
  role: EmployeeRole;
  phoneNumber: string | null;
  photoUrl: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
