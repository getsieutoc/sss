import { UseGuards, applyDecorators } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Keys } from '@/utils/constants';

export function MultipleAuthGuards() {
  return applyDecorators(
    UseGuards(AuthGuard([Keys.API_KEY_STRATEGY, Keys.ACCESS_TOKEN_STRATEGY]))
  );
}
