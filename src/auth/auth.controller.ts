import { Controller, Post, Body, UseGuards, HttpStatus } from '@nestjs/common';
import { handleError } from '@/utils/error-handler';
import { Throttle } from '@nestjs/throttler';

import { CreateApiKeyDto, LoginDto, SignUpDto } from './dto';
import { MultipleAuthGuards, Public } from './decorators';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards';

@Throttle({ auth: {} })
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('signup')
  async signup(@Body() body: SignUpDto) {
    try {
      return await this.authService.signup(body);
    } catch (error) {
      return handleError(error, 'Issues at signing up');
    }
  }

  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Body() body: LoginDto) {
    try {
      return await this.authService.login(body);
    } catch (error) {
      return handleError(error, 'Issues at logging in');
    }
  }

  @MultipleAuthGuards()
  @Post('hello')
  async hello() {
    return {
      statusCode: HttpStatus.OK,
      message: 'Auth works well',
    };
  }

  @MultipleAuthGuards()
  @Post('api-key')
  async createApiKey(@Body() data: CreateApiKeyDto) {
    try {
      return await this.authService.generateApiKey(data);
    } catch (error) {
      return handleError(error, 'Issues at creating API key');
    }
  }
}
