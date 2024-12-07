import { JwtModule, JwtService } from '@nestjs/jwt';
import { UsersModule } from '@/users/users.module';
import { ConfigService } from '@nestjs/config';
import { Module } from '@nestjs/common';

import {
  AccessTokenStrategy,
  ApiKeyStrategy,
  LocalStrategy,
} from './strategies';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [JwtModule.register({}), UsersModule],
  providers: [
    AuthService,
    ConfigService,
    JwtService,
    LocalStrategy,
    AccessTokenStrategy,
    ApiKeyStrategy,
  ],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
