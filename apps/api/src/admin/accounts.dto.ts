import {
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class AdminAccountDto {
  @IsString() @MinLength(2) @MaxLength(160) full_name: string;
  @IsString() @Matches(/^[a-zA-Z0-9_.-]{3,80}$/) username: string;
  @IsEmail() @MaxLength(254) email: string;
  @IsString() @MinLength(12) @MaxLength(72) password: string;
  @IsOptional() @IsString() @MaxLength(40) phone?: string;
  @IsIn(['active', 'in_active']) status: 'active' | 'in_active';
  @IsOptional() @IsInt() @Min(1) role_id?: number;
}
export class UpdateAdminAccountDto extends PartialType(AdminAccountDto, {
  skipNullProperties: false,
}) {}
