import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { RoleService } from '../services/role.service';
import { AuditLogService } from '../services/audit-log.service';
import { Permissions } from '../decorators/permissions.decorator';
import { PermissionsGuard } from '../guards/permissions.guard';

@UseGuards(PermissionsGuard)
@Controller('rbac/roles')
export class RoleController {
  constructor(
    private readonly roleService: RoleService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Post()
  @Permissions('role:create')
  async create(@Body() body: any, @Req() req: any) {
    const role = await this.roleService.createRole(
      body.name,
      body.description,
      body.parentRoleId,
    );
    await this.auditLogService.log(req.user.id, 'create', 'role', { role });
    return role;
  }

  @Get()
  @Permissions('role:read')
  async findAll() {
    return this.roleService.getAllRoles();
  }

  @Get(':id')
  @Permissions('role:read')
  async findOne(@Param('id') id: string) {
    return this.roleService.getRoleById(id);
  }

  @Patch(':id')
  @Permissions('role:update')
  async update(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    const updated = await this.roleService.updateRole(id, body);
    await this.auditLogService.log(req.user.id, 'update', 'role', { id, body });
    return updated;
  }

  @Delete(':id')
  @Permissions('role:delete')
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.roleService.deleteRole(id);
    await this.auditLogService.log(req.user.id, 'delete', 'role', { id });
    return { success: true };
  }
}
