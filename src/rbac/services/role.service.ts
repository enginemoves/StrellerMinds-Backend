import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepo: Repository<Role>,
  ) {}

  async createRole(name: string, description?: string, parentRoleId?: string) {
    const role = this.roleRepo.create({ name, description, parentRoleId });
    return this.roleRepo.save(role);
  }

  async getRoleById(id: string) {
    return this.roleRepo.findOne({ where: { id } });
  }

  async getAllRoles() {
    return this.roleRepo.find();
  }

  async updateRole(id: string, data: Partial<Role>) {
    await this.roleRepo.update(id, data);
    return this.getRoleById(id);
  }

  async deleteRole(id: string) {
    return this.roleRepo.delete(id);
  }
}
