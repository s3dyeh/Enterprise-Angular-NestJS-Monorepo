import { AccountResponseDto } from './account-response.dto';
import { ApiDataResponse } from './api-data-response.decorator';
import {
  Body,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { AdminController } from './admin-controller.decorator';
import { AdminAccountDto, UpdateAdminAccountDto } from './accounts.dto';
import { AdminQueryDto } from './admin-query.dto';
import { AdminRequest } from './permission.guard';
import { RequirePermission } from './permissions';
import { AccountsService } from './accounts.service';

@AdminController()
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}
  @Get('users')
  @ApiDataResponse(AccountResponseDto, { paged: true })
  @RequirePermission('user:read')
  users(@Query() query: AdminQueryDto) {
    return this.accounts.list('user', query);
  }
  @Get('customers')
  @ApiDataResponse(AccountResponseDto, { paged: true })
  @RequirePermission('account:read')
  customers(@Query() query: AdminQueryDto) {
    return this.accounts.list('customer', query);
  }
  @Post('users')
  @ApiDataResponse(AccountResponseDto, { status: 201 })
  @RequirePermission('user:write')
  createUser(@Body() body: AdminAccountDto, @Req() req: AdminRequest) {
    return this.accounts.save('user', body, req.user.id);
  }
  @Post('customers')
  @ApiDataResponse(AccountResponseDto, { status: 201 })
  @RequirePermission('account:write')
  createCustomer(@Body() body: AdminAccountDto, @Req() req: AdminRequest) {
    return this.accounts.save('customer', body, req.user.id);
  }
  @Put('users/:id')
  @ApiDataResponse(AccountResponseDto)
  @RequirePermission('user:write')
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminAccountDto,
    @Req() req: AdminRequest,
  ) {
    return this.accounts.save('user', body, req.user.id, id);
  }
  @Put('customers/:id')
  @ApiDataResponse(AccountResponseDto)
  @RequirePermission('account:write')
  updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminAccountDto,
    @Req() req: AdminRequest,
  ) {
    return this.accounts.save('customer', body, req.user.id, id);
  }
  @Delete('users/:id')
  @RequirePermission('user:write')
  @HttpCode(204)
  deleteUser(@Param('id', ParseIntPipe) id: number, @Req() req: AdminRequest) {
    return this.accounts.remove('user', id, req.user.id);
  }
  @Delete('customers/:id')
  @RequirePermission('account:write')
  @HttpCode(204)
  deleteCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AdminRequest,
  ) {
    return this.accounts.remove('customer', id, req.user.id);
  }
}
