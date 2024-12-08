import { IsNumber, IsOptional, IsString } from 'class-validator';
import { Prisma } from '@prisma/client';

export class UpdateFunctionDto {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsString()
  readonly code?: string;

  @IsOptional()
  @IsString()
  readonly entryPoint?: string;

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
