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
          return await this.executeJavascript({ code, name }, input);
        } catch (_) {
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
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Function execution failed',
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
    const runtime = await quickJS();
    const { evalCode, context } = (await runtime.createRuntime({
      env: {
        KV: {
          set: (key: string, value: string) => {
            console.log('KV.set called with:', key, value);
            return true;
          },
          get: (key: string) => {
            console.log('KV.get called with:', key);
            return null;
          },
        },
      },
    })) as any;

    let fn: any = null;
    const inputHandles: any[] = [];
    let callResult: any = null;

    try {
      // Validate function name
      const functionName = name.trim() || 'anonymous';

      // Properly wrap the code if it's not already a function
      const wrappedCode = code.trim().startsWith('function')
        ? code
        : `function ${functionName}(...args) { ${code} }`;

      // Evaluate the code in the context
      const contextResult = (await evalCode(wrappedCode)) as any;

      if (contextResult?.error) {
        const errorMessage = context.dump(contextResult.error);
        contextResult.error.dispose();

        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Failed to eval function: ${errorMessage}`,
        };
      }

      if (contextResult?.value) {
        contextResult.value.dispose();
      }

      // Get the function from the global context
      fn = context.getProp(context.global, functionName);

      if (!fn) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Function '${functionName}' not found in context`,
        };
      }

      // Prepare input arguments
      args.forEach((arg) => {
        if (typeof arg === 'object') {
          inputHandles.push(
            this.prepareInputHandle(context, arg as Record<string, unknown>)
          );
          return;
        }

        switch (typeof arg) {
          case 'string':
            inputHandles.push(context.newString(arg));
            break;
          case 'number':
            inputHandles.push(context.newNumber(arg));
            break;
          case 'boolean':
            inputHandles.push(arg ? context.true : context.false);
            break;
          case 'undefined':
            inputHandles.push(context.undefined);
            break;
          default:
            inputHandles.push(context.null);
        }
      });

      // Call the function with prepared arguments
      callResult = context.callFunction(fn, context.undefined, ...inputHandles);

      if (callResult?.error) {
        const errorMessage = context.dump(callResult.error);
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: `Runtime error in function '${functionName}': ${errorMessage}`,
        };
      }

      const result = context.dump(callResult?.value);

      return {
        statusCode: HttpStatus.OK,
        data: result,
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message:
          error instanceof Error ? error.message : 'Function execution failed',
      };
    } finally {
      // Clean up all resources
      inputHandles.forEach((handle) => {
        if (handle && typeof handle.dispose === 'function') {
          handle.dispose();
        }
      });

      if (fn && typeof fn.dispose === 'function') {
        fn.dispose();
      }

      if (callResult) {
        if (
          callResult.value &&
          typeof callResult.value.dispose === 'function'
        ) {
          callResult.value.dispose();
        }
        if (
          callResult.error &&
          typeof callResult.error.dispose === 'function'
        ) {
          callResult.error.dispose();
        }
      }

      if (context && typeof context.dispose === 'function') {
        context.dispose();
      }
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
