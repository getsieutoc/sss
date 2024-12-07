import { Controller, Post, Body, UseGuards, Get, Inject } from '@nestjs/common';
import { handleError } from '@/utils/error-handler';

import { ApiKeyStrategy } from './strategies/api-key.strategy';
import { AuthService } from './auth.service';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  @Inject(AuthService)
  private readonly authService: AuthService;

  @Public()
  @Post('setup')
  async createFirstApiKey() {
    try {
      return await this.authService.generateGenesisApiKey();
    } catch (err) {
      return handleError(err, 'Issues at creating genesis API key');
    }
  }

  @UseGuards(ApiKeyStrategy)
  @Post('api-key')
  async createApiKey(@Body() data: CreateApiKeyDto) {
    try {
      return await this.authService.createApiKey(data);
    } catch (err) {
      return handleError(err, 'Issues at creating API key');
    }
  }

  @UseGuards(ApiKeyStrategy)
  @Get('api-key')
  async listApiKeys() {
    try {
      return await this.authService.listApiKeys();
    } catch (err) {
      return handleError(err, 'Issues at listing API keys');
    }
  }
}
