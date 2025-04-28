// src/auth/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { Role } from 'src/role/roles.enum';
// import { Role } from '@/roles/enums/user-role.enum';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
