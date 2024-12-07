import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import { PrismaService } from '@/prisma/prisma.service';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import { CreateFunctionDto } from './dto/create-function.dto';

const execAsync = promisify(exec);

@Injectable()
export class FunctionService {
  @Inject(PrismaService)
  private readonly prisma: PrismaService;

  async registerFunction({ metadata, ...rest }: CreateFunctionDto) {
    // Create default metadata if not provided
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

  async executeFunction(functionId: string, input: any): Promise<any> {
    const response = await this.prisma.client.function.findUniqueOrThrow({
      where: { id: functionId },
    });

    // Create a temporary file for execution
    const tmpFile = join(
      tmpdir(),
      `${response.name}-${Date.now()}${this.getFileExtension(response.language)}`
    );

    try {
      // Write the code to a temporary file
      await writeFile(tmpFile, response.code);

      const command = this.buildExecutionCommand(response, tmpFile, input);
      const { stdout, stderr } = await execAsync(command, {
        timeout: response.timeout ?? 30000,
      });

      if (stderr) {
        throw new Error(stderr);
      }

      return JSON.parse(stdout);
    } catch (error) {
      throw new Error(`Execution failed: ${error.message}`);
    } finally {
      // Clean up temporary file
      try {
        await import('fs/promises').then(({ unlink }) => unlink(tmpFile));
      } catch {
        // Ignore cleanup errors
      }
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

  private buildExecutionCommand(
    function_: any,
    filePath: string,
    input: any
  ): string {
    const inputStr = JSON.stringify(input);

    switch (function_.language.toLowerCase()) {
      case 'python':
        return `python ${filePath} '${inputStr}'`;
      case 'node':
      case 'javascript':
        return `node ${filePath} '${inputStr}'`;
      default:
        throw new Error(`Unsupported language: ${function_.language}`);
    }
  }

  private getFileExtension(language?: string | null): string {
    if (!language) {
      throw new Error('Langauge is required');
    }

    switch (language.toLowerCase()) {
      case 'python':
        return '.py';
      case 'node':
      case 'javascript':
        return '.js';
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }
}
