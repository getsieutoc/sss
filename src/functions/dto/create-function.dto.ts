import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { Prisma } from '@prisma/client';

export class CreateFunctionDto {
  @IsNotEmpty()
  @IsString()
  readonly projectId: string;

  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @IsNotEmpty()
  @IsString()
  readonly code: string;

  @IsNotEmpty()
  @IsString()
  readonly entryPoint: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsString()
  readonly language?: 'typescript' | 'javascript' | 'python';

  @IsOptional()
  @IsString()
  readonly runtime?: string;

  @IsOptional()
  @IsNumber()
  readonly timeout?: number;

  @IsOptional()
  @IsNumber()
  readonly memoryLimit?: number;

  @IsOptional()
  readonly metadata?: Prisma.JsonObject;

  @IsOptional()
  readonly envVars?: Prisma.JsonObject;
}
