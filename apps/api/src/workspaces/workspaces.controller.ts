import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import type { RequestWithUser } from '../utils/types/request-with-user.type';
import type { JwtPayloadType } from '../auth/strategies/types/jwt-payload.type';
import {
  AcceptInvitationDto,
  InviteDto,
  MemberRoleDto,
  WorkspaceDto,
} from './workspace.dto';
import { WorkspacesService } from './workspaces.service';
import {
  WorkspaceResponseDto,
  WorkspaceDetailsResponseDto,
  InvitationTokenResponseDto,
  AcceptedInvitationResponseDto,
} from './workspace-response.dto';
import { RateLimit } from '../platform/rate-limit.decorator';

type SessionRequest = RequestWithUser<JwtPayloadType>;
@ApiTags('Workspaces')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'workspaces', version: '1' })
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}
  @Get()
  @ApiOkResponse({ type: [WorkspaceResponseDto] })
  list(@Req() req: SessionRequest) {
    return this.workspaces.list(Number(req.user.id));
  }
  @Post()
  @RateLimit({ limit: 20, windowSeconds: 3600, bucket: 'workspace-create' })
  @ApiCreatedResponse({ type: WorkspaceResponseDto })
  create(@Req() req: SessionRequest, @Body() body: WorkspaceDto) {
    return this.workspaces.create(Number(req.user.id), body.name);
  }
  @Post('accept-invitation')
  @RateLimit({ limit: 30, windowSeconds: 3600, bucket: 'workspace-accept' })
  @ApiCreatedResponse({ type: AcceptedInvitationResponseDto })
  accept(@Req() req: SessionRequest, @Body() body: AcceptInvitationDto) {
    return this.workspaces.accept(Number(req.user.id), body.token);
  }
  @Get(':id')
  @ApiOkResponse({ type: WorkspaceDetailsResponseDto })
  details(@Param('id', ParseUUIDPipe) id: string, @Req() req: SessionRequest) {
    return this.workspaces.details(id, Number(req.user.id));
  }
  @Patch(':id')
  @ApiNoContentResponse()
  @HttpCode(204)
  rename(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: SessionRequest,
    @Body() body: WorkspaceDto,
  ) {
    return this.workspaces.rename(id, Number(req.user.id), body.name);
  }
  @Post(':id/invitations')
  @RateLimit({ limit: 30, windowSeconds: 3600, bucket: 'workspace-invite' })
  @ApiCreatedResponse({ type: InvitationTokenResponseDto })
  invite(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: SessionRequest,
    @Body() body: InviteDto,
  ) {
    return this.workspaces.invite(id, Number(req.user.id), body);
  }
  @Delete(':id/invitations/:invitationId')
  @ApiNoContentResponse()
  @HttpCode(204)
  revoke(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
    @Req() req: SessionRequest,
  ) {
    return this.workspaces.revoke(id, Number(req.user.id), invitationId);
  }
  @Patch(':id/members/:memberId')
  @ApiNoContentResponse()
  @HttpCode(204)
  changeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Req() req: SessionRequest,
    @Body() body: MemberRoleDto,
  ) {
    return this.workspaces.changeMember(
      id,
      Number(req.user.id),
      memberId,
      body.role,
    );
  }
  @Delete(':id/members/:memberId')
  @ApiNoContentResponse()
  @HttpCode(204)
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('memberId', ParseIntPipe) memberId: number,
    @Req() req: SessionRequest,
  ) {
    return this.workspaces.changeMember(
      id,
      Number(req.user.id),
      memberId,
      null,
    );
  }
}
