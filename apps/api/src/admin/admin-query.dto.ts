import {
  PAGE_SIZE_DEFAULT,
  PAGE_SIZE_MAX,
  PAGE_SIZE_MIN,
  SEARCH_MAX_LENGTH,
} from '@enterprise/contracts';
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
  @Type(() => Number)
  @IsInt()
  @Min(PAGE_SIZE_MIN)
  @Max(PAGE_SIZE_MAX)
  page_size = PAGE_SIZE_DEFAULT;
  @IsString() @MaxLength(50) @IsOptional() order_by = 'id';
  @IsIn(['asc', 'desc']) @IsOptional() direction: 'asc' | 'desc' = 'desc';
  @IsString() @MaxLength(SEARCH_MAX_LENGTH) @IsOptional() search?: string;
}
