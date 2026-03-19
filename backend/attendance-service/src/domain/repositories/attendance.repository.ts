import { Attendance, AttendanceStatus } from '../entities/attendance.entity';

export interface ListMyAttendanceFilters {
  employeeId: string;
  startDate?: Date | null;
  endDate?: Date | null;
  page: number;
  limit: number;
}

export interface ListAttendanceResult {
  data: Attendance[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ListAllAttendanceFilters {
  employeeId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  page: number;
  limit: number;
}

export abstract class AttendanceRepository {
  abstract create(payload: {
    id: string;
    employeeId: string;
    attendanceDate: Date;
    status: AttendanceStatus;
  }): Promise<Attendance>;

  abstract findLastForDate(
    employeeId: string,
    date: Date,
  ): Promise<Attendance | null>;

  abstract listMy(
    filters: ListMyAttendanceFilters,
  ): Promise<ListAttendanceResult>;

  abstract listAll(
    filters: ListAllAttendanceFilters,
  ): Promise<ListAttendanceResult>;

  abstract autoClockOutMissingForDate(date: Date): Promise<number>;
}
