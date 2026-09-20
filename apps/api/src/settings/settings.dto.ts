import { IsString, Matches, MaxLength } from 'class-validator';

export class SettingDto {
  @IsString() @MaxLength(100) property: string;
  @IsString() @MaxLength(2000) value: string;
  @IsString() @MaxLength(500) description: string;
}
export class UnblockDto {
  @IsString() @Matches(/^[a-f0-9]{64}$/) ip: string;
}
