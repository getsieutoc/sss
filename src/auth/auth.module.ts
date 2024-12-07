import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  providers: [AuthService, ConfigService, ApiKeyStrategy],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
