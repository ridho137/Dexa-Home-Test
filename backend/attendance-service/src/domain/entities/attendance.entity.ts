export type AttendanceStatus = 'IN' | 'OUT';

export interface Attendance {
  id: string;
  employeeId: string;
  attendanceDate: Date;
  attendanceTime: Date;
  status: AttendanceStatus;
  createdAt: Date;
}
