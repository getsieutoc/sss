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
    try {
      const res = await this.prisma.client.function.findFirstOrThrow({
        where: {
          OR: [{ id: idOrName }, { name: idOrName }],
        },
      });

      const { code, language, name } = res;

      if (language === 'javascript') {
        try {
          const result = await this.executeJavascript({ code, name }, input);
          return result;
        } catch (error) {
          if (error instanceof Error) {
            return {
              statusCode: HttpStatus.BAD_REQUEST,
              message: error.message,
            };
          }
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: 'JavaScript execution failed',
          };
        }
      }

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Unsupported language',
      };
    } catch (_error) {
      return {
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Function not found',
      };
    }
  }

  private prepareInputHandle = (ctx: any, input: Record<string, unknown>) => {
    if (!input || typeof input !== 'object') {
      return ctx.null;
    }

    const objHandle = ctx.newObject();

    try {
      for (const [key, value] of Object.entries(input)) {
        let propHandle;

        switch (typeof value) {
          case 'string':
            propHandle = ctx.newString(value);
            ctx.setProp(objHandle, key, propHandle);
            propHandle.dispose();
            break;
          case 'number':
            propHandle = ctx.newNumber(value);
            ctx.setProp(objHandle, key, propHandle);
            propHandle.dispose();
            break;
          case 'boolean':
            ctx.setProp(objHandle, key, value ? ctx.true : ctx.false);
            break;
          case 'object':
            if (!value) {
              ctx.setProp(objHandle, key, ctx.null);
              break;
            }
            if (Array.isArray(value)) {
              const arrayHandle = ctx.newArray();
              try {
                value.forEach((v, i) => {
                  const elemHandle = this.prepareInputHandle(
                    ctx,
                    typeof v === 'object' && v !== null
                      ? (v as Record<string, unknown>)
                      : { value: v }
                  );
                  try {
                    ctx.setProp(arrayHandle, i, elemHandle);
                  } finally {
                    elemHandle.dispose();
                  }
                });
                ctx.setProp(objHandle, key, arrayHandle);
              } finally {
                arrayHandle.dispose();
              }
              break;
            }
            {
              const nestedHandle = this.prepareInputHandle(
                ctx,
                typeof value === 'object' && value !== null
                  ? (value as Record<string, unknown>)
                  : { value }
              );
              try {
                ctx.setProp(objHandle, key, nestedHandle);
              } finally {
                nestedHandle.dispose();
              }
              break;
            }
        }
      }
      return objHandle;
    } catch (error) {
      objHandle.dispose();
      throw error;
    }
  };

  private async executeJavascript(
    { code, name }: { code: string; name: string },
    { args }: { args: UnknownData[] }
  ) {
    const { createRuntime } = await quickJS();
    const runtime = await createRuntime();

    try {
      // Validate function name
      const functionName = name.trim() || 'anonymous';

      // First evaluate just the function definition
      const evalResult = await(runtime as any).evalCode(code);
      if ('error' in evalResult && evalResult.error) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Failed to eval function',
        };
      }

      // Get the function from global context
      const funcHandle = (runtime as any).context.getProp(
        (runtime as any).context.global,
        functionName
      );

      if (!funcHandle) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Function not found in context',
        };
      }

      try {
        // Call the function with args
        const result = await(runtime as any).context.callFunction(
          funcHandle,
          null,
          args.map((arg) =>
            (runtime as any).context.newString(JSON.stringify(arg))
          )
        );

        if ('error' in result && result.error) {
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: `Runtime error in function execution: ${name}`,
          };
        }

        const data = (runtime as any).context.dump(result.value);
        return {
          statusCode: HttpStatus.OK,
          data,
        };
      } catch (error) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Runtime error in function execution: ${name}`,
        };
      } finally {
        funcHandle.dispose();
      }
    } catch (error) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: `Runtime error in function execution: ${name}`,
      };
    } finally {
      (runtime as any).context?.dispose?.();
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
