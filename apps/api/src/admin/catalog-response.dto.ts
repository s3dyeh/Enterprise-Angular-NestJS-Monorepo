import { ApiProperty } from '@nestjs/swagger';

export class RegionResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() name: string;
}
export class CityResponseDto extends RegionResponseDto {
  @ApiProperty() region_id: number;
}
export class CurrencyResponseDto extends RegionResponseDto {
  @ApiProperty() symbol: string;
}
export class RoleResponseDto extends RegionResponseDto {
  @ApiProperty({ description: 'Comma-separated allowlisted permissions' })
  resources: string;
}
export class SettingResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() property: string;
  @ApiProperty() value: string;
  @ApiProperty() description: string;
}
