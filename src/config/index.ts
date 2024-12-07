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
    jwt: {
      secret: process.env.AUTH_SECRET,
      accessTokenExpiresIn: IS_PRODUCTION ? '24h' : '99y',
      refreshTokenExpiresIn: IS_PRODUCTION ? '30d' : '99y',
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
    pgvector: {
      postgresConnectionOptions: {
        type: 'postgres',
        host: process.env.PGVECTOR_HOST ?? 'localhost',
        database: process.env.PGVECTOR_DB ?? 'pgvector',
        user: process.env.PGVECTOR_USER ?? 'pgvector',
        port: process.env.PGVECTOR_PORT ?? 5433,
        password: process.env.PGVECTOR_PASSWORD,
      } as PoolConfig,
      tableName: process.env.PGVECTOR_TABLE ?? 'ragchat',
      columns: {
        idColumnName: 'id',
        vectorColumnName: 'vector',
        contentColumnName: 'content',
        metadataColumnName: 'metadata',
      },
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
    ollama: {
      llm: {
        model: 'llama3',
        streaming: true,
        // temperature: 0,
        // maxRetries: 2,
      },
      embedding: {
        model: 'mxbai-embed-large',
        baseUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
      },
    },
    fuse: {
      publicKey: process.env.FUSE_PUBLIC_KEY,
      secretKey: process.env.FUSE_SECRET_KEY,
      baseUrl: process.env.FUSE_BASE_URL,
    },
  };
};

export type Configs = ReturnType<typeof configurations>;
export type ConfigType<T extends keyof Configs> = Configs[T];
