import { ApiProperty } from '@nestjs/swagger';
import type { WorkspaceRole } from '@enterprise/contracts';

export class WorkspaceResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ['owner', 'admin', 'member'] }) role: WorkspaceRole;
}
export class WorkspaceMemberResponseDto {
  @ApiProperty() userId: number;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: ['owner', 'admin', 'member'] }) role: WorkspaceRole;
}
export class WorkspaceInvitationResponseDto {
  @ApiProperty({ format: 'uuid' }) id: string;
  @ApiProperty({ format: 'email' }) email: string;
  @ApiProperty({ enum: ['admin', 'member'] }) role: 'admin' | 'member';
  @ApiProperty({ format: 'date-time' }) expiresAt: string;
}
export class WorkspaceDetailsResponseDto {
  @ApiProperty({ type: WorkspaceResponseDto }) workspace: WorkspaceResponseDto;
  @ApiProperty({ type: [WorkspaceMemberResponseDto] })
  members: WorkspaceMemberResponseDto[];
  @ApiProperty({ type: [WorkspaceInvitationResponseDto] })
  invitations: WorkspaceInvitationResponseDto[];
}
export class InvitationTokenResponseDto {
  @ApiProperty({
    description:
      'Single-use invitation token, returned once for private sharing.',
  })
  token: string;
}
export class AcceptedInvitationResponseDto {
  @ApiProperty({ format: 'uuid' }) workspaceId: string;
}
