import {
  Controller,
  Post,
  Patch,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GradingService } from '../services/grading.service';
import { CreateGradeDto } from '../dto/create-grade.dto';
import { UpdateGradeDto } from '../dto/update-grade.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Grading')
@ApiBearerAuth()
@Controller('grading')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GradingController {
  constructor(private readonly gradingService: GradingService) {}

  @Post(':studentId/:assignmentId')
  @Roles('mentor')
  @ApiOperation({ summary: 'Mentor grades a student assignment' })
  @ApiParam({ name: 'studentId', type: Number, example: 2 })
  @ApiParam({ name: 'assignmentId', type: Number, example: 5 })
  @ApiBody({ type: CreateGradeDto })
  @ApiResponse({ status: 201, description: 'Grade successfully created.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Only mentors can grade assignments.',
  })
  async gradeAssignment(
    @Param('studentId') studentId: number,
    @Param('assignmentId') assignmentId: number,
    @Body() dto: CreateGradeDto,
    @Req() req,
  ) {
    return this.gradingService.gradeAssignment(
      req.user,
      studentId,
      assignmentId,
      dto,
    );
  }

  @Patch(':gradeId')
  @Roles('mentor')
  @ApiOperation({ summary: 'Mentor updates an existing grade' })
  @ApiParam({ name: 'gradeId', type: Number, example: 12 })
  @ApiBody({ type: UpdateGradeDto })
  @ApiResponse({ status: 200, description: 'Grade successfully updated.' })
  @ApiResponse({ status: 404, description: 'Grade not found.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. Only mentors can update grades.',
  })
  async updateGrade(
    @Param('gradeId') gradeId: number,
    @Body() dto: UpdateGradeDto,
    @Req() req,
  ) {
    return this.gradingService.updateGrade(req.user, gradeId, dto);
  }

  @Get('history')
  @Roles('mentor')
  @ApiOperation({ summary: 'Mentor views grading history' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all grades submitted by the mentor.',
  })
  async getGradingHistory(@Req() req) {
    return this.gradingService.getGradingHistory(req.user);
  }
}
