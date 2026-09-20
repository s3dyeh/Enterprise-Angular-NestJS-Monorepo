import { ApiProperty } from '@nestjs/swagger';

export class ActivityResponseDto {
  @ApiProperty({ description: '64-bit identifier represented as a string' })
  id: string;
  @ApiProperty({ type: String, format: 'date-time' }) created_at: Date;
  @ApiProperty() event: string;
  @ApiProperty({ type: Number, nullable: true }) operator_id: number | null;
  @ApiProperty() uri: string;
  @ApiProperty({ type: String, nullable: true }) username: string | null;
}
export class LoginBlockResponseDto {
  @ApiProperty() key: string;
  @ApiProperty() attempts: number;
  @ApiProperty({ type: String, format: 'date-time' }) locked_until: Date;
  @ApiProperty() stage: number;
  @ApiProperty() locked: boolean;
  @ApiProperty() retry_after_sec: number;
}
export class UnblockResponseDto {
  @ApiProperty() unblocked: boolean;
}
export class ClearCacheResponseDto {
  @ApiProperty() cleared: boolean;
}
export class RecentActivityResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() event: string;
  @ApiProperty({ type: String, format: 'date-time' }) created_at: Date;
}
export class DashboardResponseDto {
  @ApiProperty() accounts: number;
  @ApiProperty() roles: number;
  @ApiProperty() regions: number;
  @ApiProperty() cities: number;
  @ApiProperty({ type: [RecentActivityResponseDto] })
  activity: RecentActivityResponseDto[];
}
