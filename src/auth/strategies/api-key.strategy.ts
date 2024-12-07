import { HeaderAPIKeyStrategy as PassportHeaderAPIKeyStrategy } from 'passport-headerapikey';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Keys } from '@/utils/constants';

import { AuthService } from '../auth.service';

@Injectable()
export class ApiKeyStrategy extends PassportStrategy(
  PassportHeaderAPIKeyStrategy,
  Keys.API_KEY_STRATEGY
) {
  constructor(authService: AuthService) {
    super(
      { header: 'x-api-key', prefix: '' },
      true, // passReqToCallback
      async (
        apiKey: string,
        verified: (err: Error | null, payload?: unknown) => void
      ) => {
        const foundKey = await authService.validateApiKey(apiKey);

        if (!foundKey) {
          return verified(new UnauthorizedException('Invalid API key'));
        }

        return verified(null, foundKey);
      }
    );
  }
}
