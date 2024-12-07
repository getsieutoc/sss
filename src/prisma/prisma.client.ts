import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ['error', 'warn'],
    omit: {
      apiKey: {
        hashedSecretKey: true,
      },
    },
  });
};

type ExtendedPrismaClient = ReturnType<typeof prismaClientSingleton>;

export class PrismaClientSingleton {
  private static instance: ExtendedPrismaClient;

  private constructor() {}

  public static getInstance(): ExtendedPrismaClient {
    if (!PrismaClientSingleton.instance) {
      PrismaClientSingleton.instance = prismaClientSingleton();
    }
    return PrismaClientSingleton.instance;
  }
}

// Prevent multiple instances during development
declare global {
  // eslint-disable-next-line no-var
  var prisma: ExtendedPrismaClient | undefined;
}

const prisma = global.prisma ?? PrismaClientSingleton.getInstance();

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

