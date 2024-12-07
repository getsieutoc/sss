import {
  ThrottlerModuleOptions,
  ThrottlerOptionsFactory,
} from '@nestjs/throttler';
import { ConfigService, ConfigType } from '@/config';
import { Injectable } from '@nestjs/common';

@Injectable()
export class ThrottlerConfig implements ThrottlerOptionsFactory {
  constructor(private readonly config: ConfigService) {}

  createThrottlerOptions(): ThrottlerModuleOptions {
    const rateConfig = this.config.get<ConfigType<'rate'>>('rate')!;
    return rateConfig;
  }
}
