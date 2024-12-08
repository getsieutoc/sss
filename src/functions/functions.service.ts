import { quickJS } from '@sebastianwessel/quickjs';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { functionIncludes } from '@/utils/rich-includes';
import { type UnknownData } from '@/types';

import { CreateFunctionDto } from './dto/create-function.dto';
import { UpdateFunctionDto } from './dto/update-function.dto';

@Injectable()
export class FunctionService {
  @Inject(PrismaService)
  private readonly prisma: PrismaService;

  async registerFunction({ projectId, metadata, ...rest }: CreateFunctionDto) {
    const defaultMetadata = {
      tags: [],
      dependencies: [],
      permissions: {
        public: false,
        allowedUsers: [],
        executionRoles: [],
      },
    };

    const response = await this.prisma.client.function.create({
      data: {
        ...rest,
        metadata: metadata ?? defaultMetadata,
        project: { connect: { id: projectId } },
      },
    });

    return {
      statusCode: HttpStatus.CREATED,
      data: response,
    };
  }

  async executeFunction(idOrName: string, input: { args: UnknownData[] }) {
    // Find the function in database
    const functionData = await this.prisma.client.function.findFirst({
      where: { id: idOrName },
    });

    if (!functionData) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        data: null,
      };
    }

    try {
      // Create a new QuickJS runtime
      const runtime = await quickJS();

      console.log(runtime); // Log the runtime object to inspect its structure
      console.log('Available methods:', Object.keys(runtime)); // Log available methods
      console.log('Available methods:', Object.getOwnPropertyNames(runtime)); // Log available methods

      // Evaluate the function code
      const evalResult = runtime.evalCode(functionData.code);

      if (evalResult.error) {
        throw new Error(`Function evaluation error: ${evalResult.error}`);
      }

      // Get the function from the runtime
      const fn = runtime.getValue(evalResult.value);

      // Execute the function with provided arguments
      const result = fn(...(input.args || []));

      // Clean up
      runtime.dispose();

      return {
        statusCode: HttpStatus.OK,
        data: result,
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        data: error.message,
      };
    }
  }

  async listFunctions(projectId: string) {
    const functions = await this.prisma.client.function.findMany({
      where: { projectId },
      include: functionIncludes,
    });

    return {
      statusCode: HttpStatus.OK,
      data: functions,
    };
  }

  async getFunction(id: string) {
    console.log('getFunction called with id:', id); // Log the input parameter
    const found = await this.prisma.client.function.findUnique({
      where: { id },
      include: functionIncludes,
    });

    return {
      statusCode: HttpStatus.OK,
      data: found,
    };
  }

  async updateFunction(id: string, data: UpdateFunctionDto) {
    const updatedFunction = await this.prisma.client.function.update({
      where: { id },
      data,
      include: functionIncludes,
    });

    return {
      statusCode: HttpStatus.OK,
      data: updatedFunction,
    };
  }

  async deleteFunction(id: string) {
    const res = await this.prisma.client.function.delete({
      where: { id },
    });

    return {
      statusCode: HttpStatus.OK,
      data: res,
    };
  }
}
