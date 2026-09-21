import { ApiDataResponse } from './api-data-response.decorator';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  BadRequestException,
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
import { IsString, MaxLength, MinLength } from 'class-validator';
import { roles as resource } from './catalog-resources';
import { AdminStore } from './admin-store.service';
import { AdminQueryDto } from './admin-query.dto';
import { AdminRequest } from './permission.guard';
import {
  CORE_PERMISSIONS,
  PERMISSIONS,
  PermissionCode,
  RequirePermission,
} from './permissions';
import { businessExamplesEnabled } from '../platform/business-examples.guard';

export class AdminRoleDto {
  @IsString() @MinLength(1) @MaxLength(100) name: string;
  @IsString() @MaxLength(2000) resources: string;
}
@AdminController()
export class AdminRolesController {
  constructor(private readonly store: AdminStore) {}
  @Get('roles')
  @ApiDataResponse(resource.response, { paged: true })
  @RequirePermission(PermissionCode.RoleRead)
  list(@Query() query: AdminQueryDto) {
    return this.store.list(resource, query);
  }
  @Get('all/roles')
  @ApiDataResponse(resource.response, { array: true })
  @RequirePermission(PermissionCode.UserWrite)
  lookup() {
    return this.store.lookup(resource);
  }
  @Get('resources')
  @ApiOkResponse({
    schema: {
      type: 'object',
      required: ['data'],
      properties: {
        data: {
          type: 'array',
          items: { type: 'string', enum: [...PERMISSIONS] },
        },
      },
    },
  })
  @RequirePermission(PermissionCode.RoleRead)
  resources() {
    return { data: businessExamplesEnabled() ? PERMISSIONS : CORE_PERMISSIONS };
  }
  @Post('roles')
  @ApiDataResponse(resource.response, { status: 201 })
  @RequirePermission(PermissionCode.RoleWrite)
  create(@Body() body: AdminRoleDto, @Req() request: AdminRequest) {
    return this.store.save(resource, this.validate(body), request.user.id);
  }
  @Put('roles/:id')
  @ApiDataResponse(resource.response)
  @RequirePermission(PermissionCode.RoleWrite)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: AdminRoleDto,
    @Req() request: AdminRequest,
  ) {
    if (id <= 2)
      throw new BadRequestException('Built-in roles cannot be modified');
    return this.store.save(resource, this.validate(body), request.user.id, id);
  }
  @Delete('roles/:id')
  @RequirePermission(PermissionCode.RoleWrite)
  @HttpCode(204)
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: AdminRequest) {
    if (id <= 2)
      throw new BadRequestException('Built-in roles cannot be deleted');
    return this.store.remove(resource, id, request.user.id);
  }
  private validate(body: AdminRoleDto) {
    const permissions = [
      ...new Set(
        body.resources
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    if (
      permissions.some(
        (permission) =>
          !(PERMISSIONS as readonly string[]).includes(permission),
      )
    )
      throw new BadRequestException('Unknown permission');
    // Permission administration is reserved for built-in administrators by the guard.
    return { name: body.name, resources: permissions.join(',') };
  }
}
