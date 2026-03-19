import { Employee, EmployeeRole } from '../entities/employee.entity';

export interface ListEmployeesFilters {
  page: number;
  limit: number;
  role?: EmployeeRole | null;
  search?: string | null;
}

export interface ListEmployeesResult {
  data: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class EmployeeRepository {
  abstract findById(id: string): Promise<Employee | null>;
  abstract findByEmail(email: string): Promise<Employee | null>;
  abstract create(payload: {
    id: string;
    name: string;
    email: string;
    position: string;
    role?: EmployeeRole;
    phoneNumber?: string | null;
    photoUrl?: string | null;
  }): Promise<Employee>;
  abstract updateProfile(
    id: string,
    payload: {
      phoneNumber?: string | null;
      photoUrl?: string | null;
    },
  ): Promise<Employee>;
  abstract adminUpdate(
    id: string,
    payload: {
      name?: string;
      position?: string;
      phoneNumber?: string | null;
    },
  ): Promise<Employee>;
  abstract findAll(): Promise<Employee[]>;
  abstract findWithFilters(
    filters: ListEmployeesFilters,
  ): Promise<ListEmployeesResult>;
}
