export { ConfigService } from '@nestjs/config';
import { PoolConfig } from 'pg';

export const configurations = () => {
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';

  if (!process.env.AUTH_SECRET) {
    throw new Error('Missing AUTH_SECRET environment variable');
  }

  return {
    general: {
      isProduction: IS_PRODUCTION,
    },
    auth: {
      secret: Buffer.from(process.env.AUTH_SECRET),
      hashLength: 64,
      timeCost: 4,
    },
    apiKey: {
      expiresInYears: 99,
    },
    rate: [
      {
        name: 'default',
        ttl: 60 * 1000, // 60 seconds
        limit: 100,
      },
      {
        name: 'short',
        ttl: 1000,
        limit: 10,
      },
    ],
    database: {
      url: process.env.DATABASE_URL,
    },
    record: {
      postgresConnectionOptions: {
        type: 'postgres',
        host: process.env.PGVECTOR_HOST ?? 'localhost',
        database: process.env.PGVECTOR_DB ?? 'pgvector',
        user: process.env.PGVECTOR_USER ?? 'pgvector',
        port: process.env.PGVECTOR_PORT ?? 5433,
        password: process.env.PGVECTOR_PASSWORD,
      } as PoolConfig,
      tableName: process.env.RECORD_MANAGER_TABLE ?? 'upsertion_records',
    },
  };
};

export type Configs = ReturnType<typeof configurations>;

export type ConfigType<T extends keyof Configs> = Configs[T];
