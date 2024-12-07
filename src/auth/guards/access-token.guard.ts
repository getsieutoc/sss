import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { Keys } from '@/utils/constants';

@Injectable()
export class AccessTokenGuard extends AuthGuard(Keys.ACCESS_TOKEN_STRATEGY) {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(Keys.IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // // The Express bring payload and add it into 'user' property!!!
    // // It is NOT our 'User' entity!
    // const { user: payload } = context.switchToHttp().getRequest<Request>();

    // return !!payload;
    return super.canActivate(context);
  }

  // This payload will be passed down to controller requests in form of `user`
  // This will return the payload into the guards
  // only use it when we need to modify the payload
  // public handleRequest<T extends JwtPayload>(_: unknown, payload: T) {
  //   return payload;
  // }
}
