import { ApiProperty } from '@nestjs/swagger';

export class AccountCreditResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() account_id: number;
  @ApiProperty() currency_id: number;
  @ApiProperty({ example: '25.5000', description: 'Exact decimal string' })
  balance: string;
  @ApiProperty() currency: string;
  @ApiProperty({ type: String, format: 'date-time' }) created_at: Date;
  @ApiProperty({ type: String, format: 'date-time' }) updated_at: Date;
}
export class CreditAdjustmentResponseDto {
  @ApiProperty({ example: '25.5000' }) balance: string;
  @ApiProperty() replayed: boolean;
}
