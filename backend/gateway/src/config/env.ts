export const env = {
  port: Number(process.env.PORT ?? 3000),
  authGrpcUrl: process.env.AUTH_GRPC_URL ?? 'localhost:50051',
  authHttpUrl: process.env.AUTH_HTTP_URL ?? 'http://localhost:3010',
  employeeHttpUrl: process.env.EMPLOYEE_HTTP_URL ?? 'http://localhost:3050',
  attendanceHttpUrl: process.env.ATTENDANCE_HTTP_URL ?? 'http://localhost:3020',
  notificationHttpUrl:
    process.env.NOTIFICATION_HTTP_URL ?? 'http://localhost:3030',
  gatewaySigningSecret:
    process.env.GATEWAY_SIGNING_SECRET ?? 'dev-gateway-secret',
} as const;
