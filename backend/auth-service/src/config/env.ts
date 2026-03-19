export const env = {
  port: Number(process.env.PORT ?? 3010),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'dexa_app',
    password: process.env.DB_PASSWORD ?? 'D3x@2026_App',
    name: process.env.DB_NAME ?? 'dexa_attendance',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '10m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
    refreshExpiresIn:
      process.env.JWT_REFRESH_EXPIRES_IN ??
      '90d' /* ~3 months, for development */,
  },
  logLevel: (process.env.LOG_LEVEL ?? 'DEBUG').toUpperCase() as
    | 'DEBUG'
    | 'WARN'
    | 'ERROR',
  apiKey: process.env.AUTH_API_KEY ?? 'dev-auth-key',
  grpcPort: Number(process.env.GRPC_PORT ?? 50010),
  gatewaySigningSecret:
    process.env.GATEWAY_SIGNING_SECRET ?? 'dev-gateway-secret',
} as const;
