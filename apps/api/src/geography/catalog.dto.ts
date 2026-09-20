import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class RegionDto {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
}

export class CityDto extends RegionDto {
  @IsInt() @Min(1) region_id: number;
}
