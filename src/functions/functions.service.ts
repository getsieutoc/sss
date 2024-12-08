import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFunctionDto } from './dto/create-function.dto';
import { type QuickJSContext, getQuickJS } from 'quickjs-emscripten';
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

  async executeFunction(idOrName: string, input: { args: UnknownData }) {
    try {
      const { code, language, name } =
        await this.prisma.client.function.findFirstOrThrow({
          where: {
            OR: [{ id: idOrName }, { name: idOrName }],
          },
        });

      if (language === 'javascript') {
        return await this.executeJavascript({ code, name }, input);
      }

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Unsupported language',
      };
    } catch (error) {
      throw new Error(`Execution failed: ${error.message}`);
    }
  }

  private async executeJavascript(
    { code, name }: { code: string; name: string },
    input: { args: UnknownData }
  ) {
    const QuickJS = await getQuickJS();

    const context = QuickJS.newContext();

    // Create a function from the code string
    const contextResult = context.evalCode(code);

    if (contextResult.error) {
      contextResult.error.dispose();
      throw new Error('Failed to create function');
    }

    // Get the function handle
    const fn = contextResult.value;

    using fnHandle = context.newFunction(name, () => fn);

    context.setProp(context.global, name, fnHandle);

    // Convert input args to QuickJS handles
    const inputHandle = this.prepareInputHandle(context, input);

    // Call the function with args
    const callResult = context.callFunction(fn, context.global, inputHandle);

    if (callResult.error) {
      callResult.error.dispose();
      throw new Error('Function execution failed');
    }

    // Get the final result and convert it to a JavaScript value
    const finalResult = context.dump(callResult.value);

    // Cleanup all handles
    callResult.value.dispose();
    fn.dispose();
    inputHandle.dispose();

    if (contextResult) {
      contextResult.dispose();
    }

    context.dispose();

    return finalResult;
  }

  private prepareInputHandle = (ctx: QuickJSContext, input: UnknownData) => {
    const objHandle = ctx.newObject();

    for (const [key, value] of Object.entries(input)) {
      switch (typeof value) {
        case 'string':
          ctx.setProp(objHandle, key, ctx.newString(value));
          break;
        case 'number':
          ctx.setProp(objHandle, key, ctx.newNumber(value));
          break;
        case 'boolean':
          ctx.setProp(objHandle, key, value ? ctx.true : ctx.false);
          break;
        case 'object':
          // Speciall null case
          if (!value) {
            ctx.setProp(objHandle, key, ctx.null);
            break;
          }
          // Array case
          if (Array.isArray(value)) {
            const arrayHandle = ctx.newArray();
            value.map((v, i) => {
              const newHandle = this.prepareInputHandle(ctx, v);
              ctx.setProp(arrayHandle, i, newHandle);
            });
            break;
          }
          // Object case
          this.prepareInputHandle(ctx, value as UnknownData);
          break;
        default:
          break;
      }
    }

    return objHandle;
  };

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
