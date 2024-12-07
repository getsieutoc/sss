import { CustomPrismaService } from 'nestjs-prisma';
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient({
    omit: {
      user: {
        hashedPassword: true,
      },
      apiKey: {
        hashedSecretKey: true,
      },
    },
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export { prisma };

export type ExtendedPrismaClient = typeof prisma;

// The use of `ExtendedPrismaClient` type for correct type-safety of your extended PrismaClient
// it can not be used as class like other services!
export type ExtendedPrismaService = CustomPrismaService<ExtendedPrismaClient>;
