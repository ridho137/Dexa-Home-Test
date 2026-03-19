export const env = {
  port: Number(process.env.PORT ?? 3020),
  logLevel: (process.env.LOG_LEVEL as 'DEBUG' | 'WARN' | 'ERROR') ?? 'DEBUG',
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'dexa_app',
    password: process.env.DB_PASSWORD ?? 'D3x@2026_App',
    name: process.env.DB_NAME ?? 'dexa_attendance',
  },
  employeeGrpcUrl: process.env.EMPLOYEE_GRPC_URL ?? 'localhost:50020',
} as const;
