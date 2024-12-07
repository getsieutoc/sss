import {
  IsNotEmpty,
  IsEmail,
  MinLength,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class SignUpDto {
  @IsOptional()
  @MaxLength(255)
  readonly name: string;

  @IsNotEmpty()
  @IsEmail()
  readonly email: string;

  @IsNotEmpty()
  @MinLength(8)
  readonly password: string;
}
