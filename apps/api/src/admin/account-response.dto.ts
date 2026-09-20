import { ApiProperty } from '@nestjs/swagger';

export class AccountResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() full_name: string;
  @ApiProperty({ type: String, nullable: true }) username: string | null;
  @ApiProperty({ type: String, nullable: true }) email: string | null;
  @ApiProperty({ type: String, nullable: true }) phone: string | null;
  @ApiProperty({ enum: ['user', 'customer'] }) type: 'user' | 'customer';
  @ApiProperty({ type: Number, nullable: true }) role_id: number | null;
  @ApiProperty({ enum: ['active', 'in_active'] }) status:
    | 'active'
    | 'in_active';
}
