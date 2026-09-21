import { BusinessExamplesGuard } from '../platform/business-examples.guard';
import { AccountResponseDto } from './account-response.dto';
import { ApiDataResponse } from './api-data-response.decorator';
import {
  Body,
  UseGuards,
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
import { RequirePermission, PermissionCode } from './permissions';
import { AccountsService } from './accounts.service';

@AdminController()
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}
  @Get('users')
  @ApiDataResponse(AccountResponseDto, { paged: true })
  @RequirePermission(PermissionCode.UserRead)
  users(@Query() query: AdminQueryDto) {
    return this.accounts.list('user', query);
  }
  @Get('customers')
  @UseGuards(BusinessExamplesGuard)
  @ApiDataResponse(AccountResponseDto, { paged: true })
  @RequirePermission(PermissionCode.AccountRead)
  customers(@Query() query: AdminQueryDto) {
    return this.accounts.list('customer', query);
  }
  @Post('users')
  @ApiDataResponse(AccountResponseDto, { status: 201 })
  @RequirePermission(PermissionCode.UserWrite)
  createUser(@Body() body: AdminAccountDto, @Req() req: AdminRequest) {
    return this.accounts.save('user', body, req.user.id);
  }
  @Post('customers')
  @UseGuards(BusinessExamplesGuard)
  @ApiDataResponse(AccountResponseDto, { status: 201 })
  @RequirePermission(PermissionCode.AccountWrite)
  createCustomer(@Body() body: AdminAccountDto, @Req() req: AdminRequest) {
    return this.accounts.save('customer', body, req.user.id);
  }
  @Put('users/:id')
  @ApiDataResponse(AccountResponseDto)
  @RequirePermission(PermissionCode.UserWrite)
  updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminAccountDto,
    @Req() req: AdminRequest,
  ) {
    return this.accounts.save('user', body, req.user.id, id);
  }
  @Put('customers/:id')
  @UseGuards(BusinessExamplesGuard)
  @ApiDataResponse(AccountResponseDto)
  @RequirePermission(PermissionCode.AccountWrite)
  updateCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAdminAccountDto,
    @Req() req: AdminRequest,
  ) {
    return this.accounts.save('customer', body, req.user.id, id);
  }
  @Delete('users/:id')
  @RequirePermission(PermissionCode.UserWrite)
  @HttpCode(204)
  deleteUser(@Param('id', ParseIntPipe) id: number, @Req() req: AdminRequest) {
    return this.accounts.remove('user', id, req.user.id);
  }
  @Delete('customers/:id')
  @UseGuards(BusinessExamplesGuard)
  @RequirePermission(PermissionCode.AccountWrite)
  @HttpCode(204)
  deleteCustomer(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AdminRequest,
  ) {
    return this.accounts.remove('customer', id, req.user.id);
  }
}
