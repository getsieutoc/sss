import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Inject,
  Query,
  UseGuards,
} from '@nestjs/common';
import { handleError } from '@/utils/error-handler';
import { ApiKeyGuard } from '@/auth/guards/api-key.guard';

import { FunctionService } from './functions.service';
import { CreateFunctionDto } from './dto/create-function.dto';

@Controller('functions')
@UseGuards(ApiKeyGuard)
export class FunctionController {
  @Inject(FunctionService)
  private readonly functionService: FunctionService;

  @Post()
  async registerFunction(@Body() body: CreateFunctionDto) {
    try {
      return await this.functionService.registerFunction(body);
    } catch (err) {
      return handleError(err, 'Issues at registering function');
    }
  }

  @Post('e/:functionId')
  async executeFunction(
    @Param('functionId') functionId: string,
    @Body() input: any
  ) {
    try {
      return await this.functionService.executeFunction(functionId, input);
    } catch (err) {
      console.log('### err: ', err);
      return handleError(err, 'Issues at executing function');
    }
  }

  @Get()
  async listFunctions(@Query('project-id') projectId: string) {
    try {
      return await this.functionService.listFunctions(projectId);
    } catch (err) {
      return handleError(err, 'Issues at listing function');
    }
  }
}
