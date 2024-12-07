import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateApiKeyDto {
  @IsNotEmpty()
  @IsString()
  readonly projectId: string;

  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsDateString()
  readonly expiresAt?: string;
}
