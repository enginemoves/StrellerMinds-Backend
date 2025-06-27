import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseUUIDPipe, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from './services/users.service';
import { CreateUsersDto } from './dtos/create.users.dto';
import { updateUsersDto } from './dtos/update.users.dto';
import { Roles } from '../role/roles.decorator';
import { RolesGuard } from '../role/roles.guard';
import { Role } from '../role/roles.enum';
import { AuditLogService } from '../audit/services/audit.log.service';
import { UserRole } from './enums/userRole.enum';
import { AccountStatus } from './enums/accountStatus.enum';

@ApiTags('Admin Users')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(RolesGuard)
@Roles(Role.Admin)
export class AdminUsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @ApiOperation({ summary: 'Create a new user (admin only)' })
  @ApiResponse({ status: 201, description: 'User created.' })
  @Post()
  async create(@Body() dto: CreateUsersDto, @Body('adminId') adminId: string) {
    const user = await this.usersService.create(dto);
    await this.auditLogService.createLog({
      action: 'CREATE_USER',
      entityType: 'User',
      entityId: user.id,
      performedBy: adminId,
      details: { created: true },
    });
    return user;
  }

  @ApiOperation({ summary: 'Get all users' })
  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @ApiOperation({ summary: 'Get user by ID' })
  @Get(':id')
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @ApiOperation({ summary: 'Update user by ID' })
  @Patch(':id')
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: updateUsersDto, @Body('adminId') adminId: string) {
    const user = await this.usersService.update(id, dto);
    await this.auditLogService.createLog({
      action: 'UPDATE_USER',
      entityType: 'User',
      entityId: id,
      performedBy: adminId,
      details: { updated: true },
    });
    return user;
  }

  @ApiOperation({ summary: 'Delete user by ID' })
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string, @Body('adminId') adminId: string) {
    await this.usersService.delete(id);
    await this.auditLogService.createLog({
      action: 'DELETE_USER',
      entityType: 'User',
      entityId: id,
      performedBy: adminId,
      details: { deleted: true },
    });
    return;
  }

  @ApiOperation({ summary: 'Update user role' })
  @Patch(':id/role')
  async updateRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('role') role: UserRole,
    @Body('adminId') adminId: string
  ) {
    const user = await this.usersService.update(id, { role });
    await this.auditLogService.createLog({
      action: 'UPDATE_ROLE',
      entityType: 'User',
      entityId: id,
      performedBy: adminId,
      details: { newRole: role },
    });
    return user;
  }

  @ApiOperation({ summary: 'Update user account status' })
  @Patch(':id/status')
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: AccountStatus,
    @Body('adminId') adminId: string
  ) {
    const user = await this.usersService.update(id, { status });
    await this.auditLogService.createLog({
      action: 'UPDATE_STATUS',
      entityType: 'User',
      entityId: id,
      performedBy: adminId,
      details: { newStatus: status },
    });
    return user;
  }

  @ApiOperation({ summary: 'Get user analytics' })
  @Get(':id/analytics')
  async getUserAnalytics(@Param('id', ParseUUIDPipe) id: string) {
    // This should call analyticsService for user-specific analytics
    // Placeholder: return basic info for now
    return { message: 'User analytics endpoint (to be implemented)' };
  }
}
