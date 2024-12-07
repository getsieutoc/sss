import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateFunctionDto } from './dto/create-function.dto';

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

  async executeFunction(idOrName: string, input: any): Promise<any> {
    try {
      const { code, language } =
        await this.prisma.client.function.findFirstOrThrow({
          where: {
            OR: [{ id: idOrName }, { name: idOrName }],
          },
        });

      const codeBuffer = Buffer.from(code);

      let result;

      const context = {
        input,
        // input: JSON.parse(input),
        // console,
        // require,
      };

      switch (language?.toLowerCase()) {
        case 'javascript':
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const vm = require('vm');
          vm.createContext(context);
          result = vm.runInContext(codeBuffer.toString(), context);
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }

      console.log('### result: ', result);

      return result;
    } catch (error) {
      throw new Error(`Execution failed: ${error.message}`);
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
