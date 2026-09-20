import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AdminQueryDto {
  @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) page_size = 25;
  @IsString() @MaxLength(50) @IsOptional() order_by = 'id';
  @IsIn(['asc', 'desc']) @IsOptional() direction: 'asc' | 'desc' = 'desc';
  @IsString() @MaxLength(200) @IsOptional() search?: string;
}
