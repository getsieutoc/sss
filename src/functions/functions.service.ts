import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFunctionDto } from './dto/create-function.dto';
import {
  type QuickJSContext,
  QuickJSHandle,
  getQuickJS,
} from 'quickjs-emscripten';
import { type UnknownData } from '@/types';

@Injectable()
export class FunctionService {
  @Inject(PrismaService)
  private readonly prisma: PrismaService;

  async registerFunction({ metadata, ...rest }: CreateFunctionDto) {
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
      },
    });

    return {
      status: HttpStatus.OK,
      data: response,
    };
  }

  async executeFunction(idOrName: string, input: { args: UnknownData[] }) {
    try {
      const fn = await this.prisma.client.function.findFirstOrThrow({
        where: {
          OR: [{ id: idOrName }, { name: idOrName }],
        },
      });

      const { code, language, name } = fn;

      if (language === 'javascript') {
        try {
          return await this.executeJavascript({ code, name }, input);
        } catch (jsError) {
          return {
            statusCode: HttpStatus.BAD_REQUEST,
            message: `JavaScript execution failed: ${jsError.message}`,
            errorDetails: jsError,
          };
        }
      }

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Unsupported language',
      };
    } catch (error) {
      if (error.code === 'P2025') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          message: `Function not found: ${idOrName}`,
        };
      }
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `Execution failed: ${error.message}`,
        errorDetails: error,
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
      // Ensure code is wrapped in a proper function
      const functionName = name || 'anonymous';
      const wrappedCode = code.trim().startsWith('function')
        ? code
        : `function ${functionName}() { ${code} }`;

      console.log(`Evaluating JavaScript code for function "${functionName}":`);
      console.log('Original code:', code);
      console.log('Wrapped code:', wrappedCode);
      console.log('With arguments:', args);

      // First evaluate the function definition
      const contextResult = context.evalCode(wrappedCode);
      if (contextResult.error) {
        const errorObj = context.dump(contextResult.error);
        console.error('Function creation error:', errorObj);
        contextResult.error.dispose();
        throw new Error(
          `Failed to create function: ${JSON.stringify(errorObj)}`
        );
      }

      // Get the function from the global context
      fn = context.getProp(context.global, functionName);
      if (!fn) {
        throw new Error(
          `Function "${functionName}" not found in global context`
        );
      }

      inputHandles = args.map((arg) => {
        switch (typeof arg) {
          case 'string':
            return context.newString(arg);
          case 'number':
            return context.newNumber(arg);
          case 'boolean':
            return arg ? context.true : context.false;
          case 'object':
            if (arg === null) return context.null;
            return context.newString(JSON.stringify(arg));
          default:
            throw new Error(`Unsupported argument type: ${typeof arg}`);
        }
      });

      callResult = context.callFunction(fn, context.global, ...inputHandles);

      if (callResult.error) {
        const errorObj = context.dump(callResult.error);
        console.error('Function execution error:', errorObj);
        callResult.error.dispose();
        throw new Error(
          `Function execution failed: ${JSON.stringify(errorObj)}`
        );
      }

      if (!('value' in callResult)) {
        throw new Error('Function execution failed: no return value');
      }

      const result = context.dump(callResult.value);
      console.log('Function execution result:', result);

      return {
        statusCode: HttpStatus.OK,
        data: result,
      };
    } catch (error) {
      console.error('JavaScript execution error:', error);
      throw {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: `JavaScript execution failed: ${error.message}`,
        errorDetails: error.cause || error,
      };
    } finally {
      // Clean up all handles in reverse order
      if (callResult && 'value' in callResult) {
        callResult.value.dispose();
      }
      if (inputHandles.length > 0) {
        inputHandles.forEach((handle) => {
          if (handle && typeof handle.dispose === 'function') {
            handle.dispose();
          }
        });
      }
      if (fn) fn.dispose();
      context.dispose();
    }
  }

  async listFunctions(projectId: string) {
    const functions = await this.prisma.client.function.findMany({
      where: { projectId },
    });

    return {
      statusCode: HttpStatus.OK,
      data: functions,
    };
  }

  async getFunction(id: string) {
    const found = await this.prisma.client.function.findUnique({
      where: { id },
    });

    return {
      statusCode: HttpStatus.OK,
      data: found,
    };
  }

  async deleteFunction(id: string) {
    return await this.prisma.client.function.delete({
      where: { id },
    });
  }
}
