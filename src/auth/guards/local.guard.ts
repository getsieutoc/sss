import { Keys } from '@/utils/constants';
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class LocalAuthGuard extends AuthGuard(Keys.LOCAL_STRATEGY) {}
