import { Type } from '@nestjs/common';
import {
  RegionResponseDto,
  CityResponseDto,
  CurrencyResponseDto,
  SettingResponseDto,
  RoleResponseDto,
} from './catalog-response.dto';
import { EntityTarget, ObjectLiteral } from 'typeorm';
import { CurrencyEntity } from '../accounting/persistence/currency.entity';
import { CityEntity } from '../geography/persistence/city.entity';
import { RegionEntity } from '../geography/persistence/region.entity';
import { SettingEntity } from '../settings/persistence/setting.entity';
import { RoleEntity } from '../roles/persistence/role.entity';

export interface ResourceDefinition<
  T extends ObjectLiteral,
  R extends { id: number },
> {
  entity: EntityTarget<T>;
  response: Type<R>;
  writable: readonly Extract<keyof T, string>[];
  eventPrefix: string;
  columns: readonly Extract<keyof T, string>[];
  search: readonly Extract<keyof T, string>[];
}

function defineResource<T extends ObjectLiteral, R extends { id: number }>(
  resource: ResourceDefinition<T, R>,
) {
  return resource;
}

// Read and write capabilities are declared independently; exposing a column never grants write access.
export const regions = defineResource<RegionEntity, RegionResponseDto>({
  entity: RegionEntity,
  response: RegionResponseDto,
  writable: ['name'],
  eventPrefix: 'regions',
  columns: ['id', 'name'],
  search: ['name'],
});
export const cities = defineResource<CityEntity, CityResponseDto>({
  entity: CityEntity,
  response: CityResponseDto,
  writable: ['name', 'region_id'],
  eventPrefix: 'cities',
  columns: ['id', 'name', 'region_id'],
  search: ['name'],
});
export const currencies = defineResource<CurrencyEntity, CurrencyResponseDto>({
  entity: CurrencyEntity,
  response: CurrencyResponseDto,
  writable: ['name', 'symbol'],
  eventPrefix: 'currencies',
  columns: ['id', 'name', 'symbol'],
  search: ['name', 'symbol'],
});
export const settings = defineResource<SettingEntity, SettingResponseDto>({
  entity: SettingEntity,
  response: SettingResponseDto,
  writable: ['value', 'description'],
  eventPrefix: 'app_settings',
  columns: ['id', 'property', 'value', 'description'],
  search: ['property', 'description'],
});
export const roles = defineResource<RoleEntity, RoleResponseDto>({
  entity: RoleEntity,
  response: RoleResponseDto,
  writable: ['name', 'resources'],
  eventPrefix: 'role',
  columns: ['id', 'name', 'resources'],
  search: ['name'],
});
