import {
  Controller,
  Get,
  Param,
  UseGuards,
  Query,
  SerializeOptions,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../roles/roles.decorator';
import { RoleId } from '../roles/roles.enum';
import { AuthGuard } from '@nestjs/passport';
import { QueryUserDto } from './dto/query-user.dto';
import { UsersService } from './users.service';
import { RolesGuard } from '../roles/roles.guard';
import { infinityPagination } from '../utils/infinity-pagination';

// Administrative writes use /admin/users so audit, revocation, and last-admin protection cannot be bypassed.
@ApiBearerAuth()
@Roles(RoleId.admin)
@UseGuards(AuthGuard('jwt'), RolesGuard)
@ApiTags('Users')
@SerializeOptions({ groups: ['admin'] })
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  @Get()
  async findAll(@Query() query: QueryUserDto) {
    const page = query.page ?? 1,
      limit = Math.min(query.limit ?? 10, 50);
    return infinityPagination(
      await this.usersService.findManyWithPagination({
        filterOptions: query.filters,
        sortOptions: query.sort,
        paginationOptions: { page, limit },
      }),
      { page, limit },
    );
  }
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findById(id);
  }
}
