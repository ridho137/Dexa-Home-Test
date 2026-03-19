export const env = {
  port: Number(process.env.PORT ?? 3050),
  grpcPort: Number(process.env.GRPC_PORT ?? 50020),
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'dexa_app',
    password: process.env.DB_PASSWORD ?? 'D3x@2026_App',
    name: process.env.DB_NAME ?? 'dexa_attendance',
  },
  logLevel: (process.env.LOG_LEVEL ?? 'DEBUG').toUpperCase() as
    | 'DEBUG'
    | 'WARN'
    | 'ERROR',
  rabbitmq: {
    url:
      process.env.RABBITMQ_URL ??
      'amqp://dexa_app:D3x@2026_Rabbit@localhost:5672/',
    queueName: process.env.NOTIFICATION_QUEUE_NAME ?? 'notification.events',
  },
  s3: {
    endpoint: process.env.S3_ENDPOINT ?? '',
    bucket: process.env.S3_BUCKET ?? '',
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
  },
  authGrpcUrl: process.env.AUTH_GRPC_URL ?? 'localhost:50010',
} as const;
