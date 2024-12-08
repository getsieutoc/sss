import {
  type QuickJSContext,
  type QuickJSHandle,
  getQuickJS,
} from 'quickjs-emscripten';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { functionIncludes } from '@/utils/rich-includes';
import { type UnknownData } from '@/types';

import { CreateFunctionDto } from './dto/create-function.dto';

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
        } catch (error) {
          console.log(`[JavaScript Execution Error] Function: ${name}`);
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
    } catch (error) {
      console.log(`[Function Execution Error] ID/Name: ${idOrName}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Function execution failed',
      };
    }
  }

  private prepareInputHandle = (
    ctx: QuickJSContext,
    input: Record<string, unknown>
  ) => {
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
      console.log('[Input Handle Preparation Error]');
      objHandle.dispose();
      throw error;
    }
  };

  private async executeJavascript(
    { code, name }: { code: string; name: string },
    { args }: { args: UnknownData[] }
  ) {
    const QuickJS = await getQuickJS();
    const context = QuickJS.newContext();

    let fn = null;
    let inputHandles: QuickJSHandle[] = [];
    let callResult = null;

    try {
      const functionName = name || 'anonymous';
      const wrappedCode = code.trim().startsWith('function')
        ? code
        : `function ${functionName}() { ${code} }`;

      console.log(`[JavaScript Execution] Function: ${functionName}`);

      const contextResult = context.evalCode(wrappedCode);
      if (contextResult.error) {
        contextResult.error.dispose();
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Failed to create function',
        };
      }

      contextResult.value?.dispose();

      fn = context.getProp(context.global, functionName);
      if (!fn) {
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Function not found in context',
        };
      }

      inputHandles = args.map((arg) => {
        if (typeof arg === 'object') {
          return this.prepareInputHandle(
            context,
            arg as Record<string, unknown>
          );
        }
        switch (typeof arg) {
          case 'string':
            return context.newString(arg);
          case 'number':
            return context.newNumber(arg);
          case 'boolean':
            return arg ? context.true : context.false;
          default:
            return context.null;
        }
      });

      callResult = context.callFunction(fn, context.undefined, ...inputHandles);

      if (callResult.error) {
        console.log(`[JavaScript Runtime Error] Function: ${functionName}`);
        return {
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Runtime error in function execution',
        };
      }

      const result = context.dump(callResult.value);
      return {
        statusCode: HttpStatus.OK,
        data: result,
      };
    } catch (error) {
      console.log(`[JavaScript General Error] Function: ${name}`);
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Function execution failed',
      };
    } finally {
      inputHandles.forEach((handle) => handle?.dispose());
      fn?.dispose();
      callResult?.value?.dispose();
      callResult?.error?.dispose();
      context.dispose();
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
