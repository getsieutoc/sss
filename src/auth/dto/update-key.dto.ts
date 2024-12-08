import { IsDateString, IsOptional, IsString } from 'class-validator';

export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  readonly description?: string;

  @IsOptional()
  @IsDateString()
  readonly expiresAt?: string;
}
