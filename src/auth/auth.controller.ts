import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Inject,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { handleError } from '@/utils/error-handler';

import { ApiKeyGuard } from './guards/api-key.guard';
import { AuthService } from './auth.service';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { UpdateApiKeyDto } from './dto/update-key.dto';
import { Public } from './decorators/public.decorator';

@Controller('auth')
@UseGuards(ApiKeyGuard)
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

  @Patch('api-key/:id')
  async updateApiKey(
    @Param('id') id: string,
    @Body() updateDto: UpdateApiKeyDto
  ) {
    try {
      return await this.authService.updateApiKey(id, updateDto);
    } catch (err) {
      return handleError(err, 'Issues at updating API key');
    }
  }

  @Delete('api-key/:id')
  async deleteApiKey(@Param('id') id: string) {
    try {
      return await this.authService.deleteApiKey(id);
    } catch (err) {
      return handleError(err, 'Issues at deleting API key');
    }
  }
}
