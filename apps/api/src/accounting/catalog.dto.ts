import {
  IsInt,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CurrencyDto {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsString() @MinLength(1) @MaxLength(12) symbol: string;
}

export class CreditAdjustmentDto {
  @IsInt() @Min(1) account_id: number;
  @IsInt() @Min(1) currency_id: number;
  @IsString() @Matches(/^-?\d{1,15}(\.\d{1,4})?$/) amount: string;
  @IsUUID() idempotency_key: string;
  @IsString() @MinLength(5) @MaxLength(300) reason: string;
}
