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

@Controller('f')
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

  @Post(':id')
  async executeFunction(@Param('id') id: string, @Body() input: any) {
    try {
      return await this.functionService.executeFunction(id, input);
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
