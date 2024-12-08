import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '@/auth/guards/api-key.guard';
import { handleError } from '@/utils/error-handler';

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

  @Post(':idorname')
  async executeFunction(
    @Param('idorname') idOrName: string,
    @Body() input: any
  ) {
    try {
      return await this.functionService.executeFunction(idOrName, input);
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