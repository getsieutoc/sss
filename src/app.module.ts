import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Module } from '@nestjs/common';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { FunctionModule } from './functions/functions.module';
import { PrismaModule } from './prisma/prisma.module';
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
    PrismaModule,
    AuthModule,
    FunctionModule,
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
