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
    { code }: { code: string; name?: string },
    input: { args: UnknownData }
  ) {
    const QuickJS = await getQuickJS();
    const vm = QuickJS.newContext();
    let result;

    try {
      // Create a function from the code string
      result = vm.evalCode(code);

      if (result.error) {
        result.error.dispose();
        throw new Error('Failed to create function');
      }

      // Get the function handle
      const fn = result.value;

      // Convert input args to QuickJS handles
      const inputHandle = this.prepareInputHandle(vm, input.args);
      console.log('### inputHandle: ', inputHandle);

      // Call the function with args
      const callResult = vm.callFunction(fn, vm.global, inputHandle);
      console.log('### callResult: ', callResult);

      if (callResult.error) {
        callResult.error.dispose();
        throw new Error('Function execution failed');
      }

      // Get the final result and convert it to a JavaScript value
      const finalResult = vm.dump(callResult.value);
      console.log('### finalResult: ', finalResult);

      // Cleanup all handles
      callResult.value.dispose();
      fn.dispose();
      inputHandle.dispose();

      return finalResult;
    } finally {
      console.log('### result: ', result);
      if (result) {
        result.dispose();
      }
      vm.dispose();
    }
  }

  private prepareInputHandle = (vm: QuickJSContext, input: UnknownData) => {
    const objHandle = vm.newObject();

    for (const [key, value] of Object.entries(input)) {
      switch (typeof value) {
        case 'string':
          vm.setProp(objHandle, key, vm.newString(value));
          break;
        case 'number':
          vm.setProp(objHandle, key, vm.newNumber(value));
          break;
        case 'boolean':
          vm.setProp(objHandle, key, value ? vm.true : vm.false);
          break;
        case 'object':
          // Speciall null case
          if (!value) {
            vm.setProp(objHandle, key, vm.null);
            break;
          }
          // Array case
          if (Array.isArray(value)) {
            const arrayHandle = vm.newArray();
            value.map((v, i) => {
              const newHandle = this.prepareInputHandle(vm, v);
              vm.setProp(arrayHandle, i, newHandle);
            });
            break;
          }
          this.prepareInputHandle(vm, value as UnknownData);
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
