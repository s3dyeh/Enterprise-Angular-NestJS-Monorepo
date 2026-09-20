import { BadRequestException } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Transform, Type, plainToInstance } from 'class-transformer';
import { User } from '../domain/user';
import { RoleDto } from '../../roles/dto/role.dto';

function parseQueryJson(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new BadRequestException('Query filters and sort must be valid JSON.');
  }
}

export class FilterUserDto {
  @ApiPropertyOptional({ type: [RoleDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleDto)
  roles?: RoleDto[] | null;
}

export class SortUserDto {
  @ApiProperty({
    enum: ['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt'],
  })
  @IsIn(['id', 'email', 'firstName', 'lastName', 'createdAt', 'updatedAt'])
  orderBy: keyof User;

  @ApiProperty({ enum: ['ASC', 'DESC'] })
  @IsIn(['ASC', 'DESC'])
  order: 'ASC' | 'DESC';
}

export class QueryUserDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 10, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) =>
    plainToInstance(FilterUserDto, parseQueryJson(value)),
  )
  @ValidateNested()
  filters?: FilterUserDto | null;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @Transform(({ value }) => {
    const parsed = parseQueryJson(value);
    return Array.isArray(parsed)
      ? plainToInstance(SortUserDto, parsed)
      : parsed;
  })
  @IsArray()
  @ValidateNested({ each: true })
  sort?: SortUserDto[] | null;
}
