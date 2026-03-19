import { env } from './env';

export type ServiceTarget = {
  baseUrl: string;
  targetPath: string;
};

/**
 * Very simple path-based mapping:
 * - /auth/...       -> auth-service
 * - /employee/...   -> employee-service
 * - /attendance/... -> attendance-service
 * - /notification/... -> notification-service
 */
export function resolveService(path: string): ServiceTarget | null {
  if (path.startsWith('/auth')) {
    return {
      baseUrl: env.authHttpUrl,
      targetPath: path,
    };
  }

  if (path.startsWith('/employee')) {
    return {
      baseUrl: env.employeeHttpUrl,
      targetPath: path,
    };
  }

  if (path.startsWith('/attendance')) {
    return {
      baseUrl: env.attendanceHttpUrl,
      targetPath: path,
    };
  }

  if (path.startsWith('/notification')) {
    return {
      baseUrl: env.notificationHttpUrl,
      targetPath: path,
    };
  }

  return null;
}
