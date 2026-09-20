import {
  AccountCreditResponseDto,
  CreditAdjustmentResponseDto,
} from './credit-response.dto';
import { ApiDataResponse } from '../admin/api-data-response.decorator';
import { Body, Get, Post, Query, Req } from '@nestjs/common';
import { AdminController } from '../admin/admin-controller.decorator';
import { AdminQueryDto } from '../admin/admin-query.dto';
import { AdminRequest } from '../admin/permission.guard';
import { RequirePermission } from '../admin/permissions';
import { CreditAdjustmentDto } from './catalog.dto';
import { AccountCreditsService } from './account-credits.service';

@AdminController('admin/account-credits')
export class AccountCreditsController {
  constructor(private readonly credits: AccountCreditsService) {}
  @Get()
  @ApiDataResponse(AccountCreditResponseDto, { paged: true })
  @RequirePermission('account-credit:read')
  list(@Query() query: AdminQueryDto) {
    return this.credits.list(query);
  }
  @Post('adjustments')
  @ApiDataResponse(CreditAdjustmentResponseDto, { status: 201 })
  @RequirePermission('account-credit:write')
  adjust(@Body() body: CreditAdjustmentDto, @Req() request: AdminRequest) {
    return this.credits.adjust(body, request.user.id);
  }
}
