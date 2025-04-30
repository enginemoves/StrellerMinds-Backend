/* eslint-disable prettier/prettier */
import { Controller, Get, UseGuards } from '@nestjs/common';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { Role } from './roles.enum';

@Controller('protected')
@UseGuards(RolesGuard) // Apply the RolesGuard to this controller
export class ProtectedController {
  @Get('admin')
  @Roles(Role.ADMIN) // Corrected
  adminEndpoint() {
    return 'Admin Access Granted';
  }

  @Get('mentor') // Changed from 'instructor' to 'mentor'
  @Roles(Role.MENTOR) // Corrected
  instructorEndpoint() {
    return 'Instructor Access Granted';
  }

  @Get('student')
  @Roles(Role.STUDENT) // Corrected
  studentEndpoint() {
    return 'Student Access Granted';
  }
}
