import { 
    Controller, 
    Get, 
    Query, 
    UseGuards, 
    Request,
    BadRequestException,
    Logger
  } from '@nestjs/common';
  import { 
    ApiTags, 
    ApiOperation, 
    ApiResponse, 
    ApiQuery,
    ApiBearerAuth
  } from '@nestjs/swagger';
  import { UserProgressService } from '../services/user-progress.service';
  import { ProgressDashboardQueryDto } from '../dto/progress-dashboard-query.dto';
  import { ProgressDashboardResponseDto } from '../dto/progress-dashboard-response.dto';
  import { CourseStatus } from '../enums/course-status.enum';
  import { TimeRange } from '../enums/time-range.enum';
  // Import your auth guards
  // import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
  
  @ApiTags('User Progress')
  @ApiBearerAuth()
  @Controller('api/v1/user/progress')
  @UseGuards(/* Your auth guards here */)
  export class UserProgressController {
    private readonly logger = new Logger(UserProgressController.name);
  
    constructor(private readonly userProgressService: UserProgressService) {}
  
    @Get('dashboard')
    @ApiOperation({ 
      summary: 'Get user progress dashboard',
      description: 'Retrieves comprehensive user progress data including statistics, course progress, and recent activity'
    })
    @ApiResponse({
      status: 200,
      description: 'Progress dashboard data retrieved successfully',
      type: ProgressDashboardResponseDto
    })
    @ApiResponse({
      status: 400,
      description: 'Invalid query parameters'
    })
    @ApiResponse({
      status: 401,
      description: 'Unauthorized - Invalid or missing authentication token'
    })
    @ApiResponse({
      status: 404,
      description: 'User not found'
    })
    @ApiQuery({
      name: 'status',
      required: false,
      enum: CourseStatus,
      description: 'Filter courses by status'
    })
    @ApiQuery({
      name: 'timeRange',
      required: false,
      enum: TimeRange,
      description: 'Time range for activity data'
    })
    @ApiQuery({
      name: 'startDate',
      required: false,
      type: String,
      description: 'Custom start date (ISO 8601 format)'
    })
    @ApiQuery({
      name: 'endDate',
      required: false,
      type: String,
      description: 'Custom end date (ISO 8601 format)'
    })
    @ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Number of courses to return (1-100)'
    })
    @ApiQuery({
      name: 'offset',
      required: false,
      type: Number,
      description: 'Pagination offset'
    })
    async getDashboard(
      @Request() req: any, // Replace with your user request type
      @Query() query: ProgressDashboardQueryDto
    ): Promise<ProgressDashboardResponseDto> {
      try {
        // Extract user ID from authenticated request
        const userId = req.user?.id || req.user?.userId;
        
        if (!userId) {
          throw new BadRequestException('User ID not found in request');
        }
  
        this.logger.log(`Dashboard request for user ${userId} with query:`, query);
  
        const dashboard = await this.userProgressService.getUserProgressDashboard(
          userId,
          query
        );
  
        this.logger.log(`Dashboard data retrieved for user ${userId}`);
        return dashboard;
  
      } catch (error) {
        this.logger.error(`Dashboard request failed: ${error.message}`, error.stack);
        throw error;
      }
    }
  }
  