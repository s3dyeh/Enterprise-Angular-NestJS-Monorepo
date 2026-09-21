import { BusinessExamplesGuard } from '../platform/business-examples.guard';
import {
  ActivityResponseDto,
  LoginBlockResponseDto,
  UnblockResponseDto,
  ClearCacheResponseDto,
  DashboardResponseDto,
} from './settings-response.dto';
import { SettingResponseDto } from '../admin/catalog-response.dto';
import { ApiDataResponse } from '../admin/api-data-response.decorator';
import { ApiOkResponse, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import {
  Body,
  UseGuards,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { AdminController } from '../admin/admin-controller.decorator';
import { AdminQueryDto } from '../admin/admin-query.dto';
import { AdminRequest } from '../admin/permission.guard';
import { RequirePermission, PermissionCode } from '../admin/permissions';
import { SettingsService } from './settings.service';
import { SettingDto, UnblockDto } from './settings.dto';

@AdminController()
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('settings')
  @ApiDataResponse(SettingResponseDto, { paged: true, status: 200 })
  @RequirePermission(PermissionCode.SettingWrite)
  list(@Query() query: AdminQueryDto) {
    return this.settings.list(query);
  }

  @Put('settings/:id')
  @ApiDataResponse(SettingResponseDto, { paged: false, status: 200 })
  @RequirePermission(PermissionCode.SettingWrite)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SettingDto,
    @Req() request: AdminRequest,
  ) {
    return this.settings.update(id, body, request.user.id);
  }

  @Get('clear-cache/keys')
  @ApiOkResponse({
    schema: {
      type: 'object',
      properties: { data: { type: 'array', items: { type: 'string' } } },
    },
  })
  @RequirePermission(PermissionCode.SettingWrite)
  cacheKeys() {
    return this.settings.cacheKeys();
  }

  @Put('clear-cache/:key')
  @ApiDataResponse(ClearCacheResponseDto, { paged: false, status: 200 })
  @RequirePermission(PermissionCode.SettingWrite)
  clear(@Param('key') key: string) {
    return this.settings.clear(key);
  }

  @Get('activities')
  @ApiDataResponse(ActivityResponseDto, { paged: true, status: 200 })
  @RequirePermission(PermissionCode.ActivityRead)
  activities(@Query() query: AdminQueryDto) {
    return this.settings.activities(query);
  }

  @Get('login-blocks')
  @ApiDataResponse(LoginBlockResponseDto, { paged: true, status: 200 })
  @RequirePermission(PermissionCode.SettingWrite)
  blocks(@Query() query: AdminQueryDto) {
    return this.settings.blocks(query);
  }

  @Post('login-blocks/unblock')
  @ApiServiceUnavailableResponse({
    description:
      'Durable unblock intent saved; automatic reconciliation pending',
  })
  @ApiDataResponse(UnblockResponseDto, { paged: false, status: 201 })
  @RequirePermission(PermissionCode.SettingWrite)
  unblock(@Body() body: UnblockDto, @Req() request: AdminRequest) {
    return this.settings.unblock(body.ip, request.user.id);
  }

  @Get('dashboard')
  @UseGuards(BusinessExamplesGuard)
  @ApiDataResponse(DashboardResponseDto, { paged: false, status: 200 })
  @RequirePermission(PermissionCode.UserRead)
  dashboard() {
    return this.settings.dashboard();
  }
}
