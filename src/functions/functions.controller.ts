import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '@/auth/guards/api-key.guard';
import { handleError } from '@/utils/error-handler';
import { type UnknownData } from '@/types';

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

  @Post(':name')
  async executeFunction(
    @Param('name') name: string,
    @Body() input: { args: UnknownData[] }
  ) {
    try {
      return await this.functionService.executeFunction(name, input);
    } catch (err) {
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

  @Patch(':id')
  async updateFunction(
    @Param('id') id: string,
    @Body() body: CreateFunctionDto
  ) {
    try {
      return await this.functionService.updateFunction(id, body);
    } catch (err) {
      return handleError(err, 'Issues at updating function');
    }
  }

  @Delete(':id')
  async deleteFunction(@Param('id') id: string) {
    try {
      return await this.functionService.deleteFunction(id);
    } catch (err) {
      return handleError(err, 'Issues at deleting function');
    }
  }
}
