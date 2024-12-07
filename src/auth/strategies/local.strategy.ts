import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Strategy as PassportLocalStrategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { User } from '@/types';

import { AuthService } from '../auth.service';
import { Keys } from '@/utils/constants';

@Injectable()
export class LocalStrategy extends PassportStrategy(
  PassportLocalStrategy,
  Keys.LOCAL_STRATEGY
) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<User> {
    const response = await this.authService.validateUser({ email, password });

    if (!response) {
      throw new UnauthorizedException();
    }

    return response;
  }
}
