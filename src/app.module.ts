import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaService } from './prisma/prisma.service';
import { ThrottlerConfig } from './common/throttler.service';

import { configurations } from './config';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useClass: ThrottlerConfig,
    }),
    ConfigModule.forRoot({
      load: [configurations],
      expandVariables: true,
      isGlobal: true,
    }),
    PassportModule,
    AuthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    AppService,
    PrismaService,
  ],
  controllers: [AppController],
})
export class AppModule {}
