import { PrismaClient } from '@prisma/client';

export class PrismaClientSingleton {
  private static instance: PrismaClient;

  private constructor() {}

  public static getInstance(): PrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = new PrismaClient({
        log: ['error', 'warn'],
      });
    }
    return PrismaClientSingleton.instance;
  }
}

// Prevent multiple instances during development
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const prisma = global.prisma ?? PrismaClientSingleton.getInstance();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
