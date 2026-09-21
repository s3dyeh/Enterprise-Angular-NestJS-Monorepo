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
import { regions as resource } from '../admin/catalog-resources';
import { AdminStore } from '../admin/admin-store.service';
import { AdminQueryDto } from '../admin/admin-query.dto';
import { AdminRequest } from '../admin/permission.guard';
import { RequirePermission, PermissionCode } from '../admin/permissions';
import { RegionDto } from './catalog.dto';

@AdminController()
export class RegionsController {
  constructor(private readonly store: AdminStore) {}
  @Get('regions')
  @ApiDataResponse(resource.response, { paged: true })
  @RequirePermission(PermissionCode.RegionRead)
  list(@Query() query: AdminQueryDto) {
    return this.store.list(resource, query);
  }
  @Get('all/regions')
  @ApiDataResponse(resource.response, { array: true })
  @RequirePermission(PermissionCode.RegionRead)
  lookup() {
    return this.store.lookup(resource);
  }
  @Post('regions')
  @ApiDataResponse(resource.response, { status: 201 })
  @RequirePermission(PermissionCode.RegionWrite)
  create(@Body() body: RegionDto, @Req() request: AdminRequest) {
    return this.store.save(resource, body, request.user.id);
  }
  @Put('regions/:id')
  @ApiDataResponse(resource.response)
  @RequirePermission(PermissionCode.RegionWrite)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: RegionDto,
    @Req() request: AdminRequest,
  ) {
    return this.store.save(resource, body, request.user.id, id);
  }
  @Delete('regions/:id')
  @RequirePermission(PermissionCode.RegionWrite)
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: AdminRequest) {
    return this.store.remove(resource, id, request.user.id);
  }
}
