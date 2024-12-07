import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClientSingleton } from './prisma.client';

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private prisma = PrismaClientSingleton.getInstance();

  get client() {
    return this.prisma;
  }

  async onModuleInit() {
    await this.prisma.$connect();
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
