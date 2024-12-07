import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CustomPrismaModule } from 'nestjs-prisma';
import { PassportModule } from '@nestjs/passport';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

import { ThrottlerConfig } from './common/throttler.service';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { prisma } from './database/prisma.client';
import { configurations } from './config';
import { APP_GUARD } from '@nestjs/core';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useClass: ThrottlerConfig,
    }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('AUTH_SECRET'),
      }),
    }),
    ConfigModule.forRoot({
      load: [configurations],
      expandVariables: true,
      isGlobal: true,
    }),
    CustomPrismaModule.forRootAsync({
      name: 'ExtendedPrismaService',
      isGlobal: true,
      useFactory: () => {
        return prisma;
      },
    }),
    PassportModule,
    UsersModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
  ],
  controllers: [AppController],
})
export class AppModule {}
