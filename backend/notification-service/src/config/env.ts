export const env = {
  port: Number(process.env.PORT ?? 3030),
  logLevel: (process.env.LOG_LEVEL ?? 'DEBUG').toUpperCase() as
    | 'DEBUG'
    | 'WARN'
    | 'ERROR',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'super-secret-dev-key',
  },
  rabbitmq: {
    url:
      process.env.RABBITMQ_URL ??
      'amqp://dexa_app:D3x@2026_Rabbit@localhost:5672/',
    queueName: process.env.NOTIFICATION_QUEUE_NAME ?? 'notification.events',
  },
  db: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    user: process.env.DB_USER ?? 'dexa_app',
    password: process.env.DB_PASSWORD ?? 'D3x@2026_App',
    name: process.env.DB_NAME ?? 'dexa_attendance_log',
  },
} as const;
