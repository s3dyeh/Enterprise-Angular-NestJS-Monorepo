import { ApiDataResponse } from '../admin/api-data-response.decorator';
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
import { AdminController } from '../admin/admin-controller.decorator';
import { currencies as resource } from '../admin/catalog-resources';
import { AdminStore } from '../admin/admin-store.service';
import { AdminQueryDto } from '../admin/admin-query.dto';
import { AdminRequest } from '../admin/permission.guard';
import { RequirePermission } from '../admin/permissions';
import { CurrencyDto } from './catalog.dto';

@AdminController()
export class CurrenciesController {
  constructor(private readonly store: AdminStore) {}
  @Get('currencies')
  @ApiDataResponse(resource.response, { paged: true })
  @RequirePermission('currency:read')
  list(@Query() query: AdminQueryDto) {
    return this.store.list(resource, query);
  }
  @Get('all/currencies')
  @ApiDataResponse(resource.response, { array: true })
  @RequirePermission('currency:read')
  lookup() {
    return this.store.lookup(resource);
  }
  @Post('currencies')
  @ApiDataResponse(resource.response, { status: 201 })
  @RequirePermission('currency:write')
  create(@Body() body: CurrencyDto, @Req() request: AdminRequest) {
    return this.store.save(resource, body, request.user.id);
  }
  @Put('currencies/:id')
  @ApiDataResponse(resource.response)
  @RequirePermission('currency:write')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: CurrencyDto,
    @Req() request: AdminRequest,
  ) {
    return this.store.save(resource, body, request.user.id, id);
  }
  @Delete('currencies/:id')
  @RequirePermission('currency:write')
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: AdminRequest) {
    return this.store.remove(resource, id, request.user.id);
  }
}
