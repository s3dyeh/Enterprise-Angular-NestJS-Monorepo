import { Transform } from 'class-transformer';
import { IsEmail, IsIn, IsString, Length, MaxLength } from 'class-validator';
import type { WorkspaceRole } from '@enterprise/contracts';
import { ApiProperty } from '@nestjs/swagger';

export class WorkspaceDto {
  @ApiProperty({ minLength: 1, maxLength: 80 })
  @IsString()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @Length(1, 80)
  name: string;
}
export class InviteDto {
  @ApiProperty({ format: 'email', maxLength: 254 })
  @IsEmail()
  @MaxLength(254)
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({ enum: ['admin', 'member'] })
  @IsIn(['admin', 'member'])
  role: 'admin' | 'member';
}
export class MemberRoleDto {
  @ApiProperty({ enum: ['owner', 'admin', 'member'] })
  @IsIn(['owner', 'admin', 'member'])
  role: WorkspaceRole;
}
export class AcceptInvitationDto {
  @ApiProperty({ minLength: 64, maxLength: 64 })
  @IsString()
  @Length(64, 64)
  token: string;
}
