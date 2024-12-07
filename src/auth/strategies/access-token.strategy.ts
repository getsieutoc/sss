import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '@/users/users.service';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy as PassportJwtStrategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@/types';
import { Keys } from '@/utils/constants';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  PassportJwtStrategy,
  Keys.ACCESS_TOKEN_STRATEGY
) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('AUTH_SECRET'),
    });
  }

  @Inject()
  private readonly usersService: UsersService;

  // This will return the `payload` into the guards
  // The payload is the value we gave to jwtService.signAsync(...) when we login
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    const user = await this.usersService.findOne(payload.id);

    if (!user) {
      throw new UnauthorizedException();
    }

    return payload;
  }
}
