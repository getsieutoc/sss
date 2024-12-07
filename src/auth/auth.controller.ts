import { Controller, Post, Body, UseGuards, Get } from '@nestjs/common';
import { handleError } from '@/utils/error-handler';

import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { AuthService } from './auth.service';
import { CreateApiKeyDto } from './dto/api-key.dto';

@Controller('auth')
@UseGuards(ApiKeyStrategy)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('api-key')
  async createApiKey(@Body() data: CreateApiKeyDto) {
    try {
      return await this.authService.createApiKey(data);
    } catch (err) {
      return handleError(err, 'Issues at creating API key');
    }
  }

  @Get('api-key')
  async listApiKeys() {
    try {
      return await this.authService.listApiKeys();
    } catch (err) {
      return handleError(err, 'Issues at listing API keys');
    }
  }
}
