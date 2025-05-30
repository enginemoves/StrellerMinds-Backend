import {
  Controller,
  Post,
  Body,
  Request,
  Get,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { RespondToFeedbackDto } from './dto/respond-to-feedback.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { 
  ApiBearerAuth, 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiParam,
  ApiBody 
} from '@nestjs/swagger';

@ApiTags('Feedback')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('feedback')
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Submit peer feedback',
    description: 'Create a new feedback entry. Supports anonymous feedback and structured templates.'
  })
  @ApiBody({ type: CreateFeedbackDto })
  @ApiResponse({ 
    status: HttpStatus.CREATED, 
    description: 'Feedback has been successfully created.',
    type: CreateFeedbackDto 
  })
  @ApiResponse({ 
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid input data.' 
  })
  async create(@Request() req, @Body() dto: CreateFeedbackDto) {
    return this.feedbackService.create(req.user.id, dto);
  }

  @Get('received')
  @ApiOperation({ 
    summary: 'Get received feedback',
    description: 'Retrieve all feedback received by the current user.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of received feedback.',
    type: [CreateFeedbackDto] 
  })
  async getReceived(@Request() req) {
    return this.feedbackService.getByRecipient(req.user.id);
  }

  @Get('sent')
  @ApiOperation({ 
    summary: 'Get sent feedback',
    description: 'Retrieve all feedback sent by the current user.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'List of sent feedback.',
    type: [CreateFeedbackDto] 
  })
  async getSent(@Request() req) {
    return this.feedbackService.getBySender(req.user.id);
  }

  @Get('stats')
  @ApiOperation({ 
    summary: 'Get feedback statistics',
    description: 'Retrieve feedback statistics including total counts, categories, and average ratings.'
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Feedback statistics for the current user.' 
  })
  async getStats(@Request() req) {
    return this.feedbackService.getFeedbackStats(req.user.id);
  }

  @Patch(':id/respond')
  @ApiOperation({ 
    summary: 'Respond to feedback',
    description: 'Add a response to received feedback.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'The ID of the feedback to respond to' 
  })
  @ApiBody({ type: RespondToFeedbackDto })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Feedback has been successfully responded to.',
    type: RespondToFeedbackDto 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Feedback not found.' 
  })
  async respondToFeedback(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: RespondToFeedbackDto,
  ) {
    return this.feedbackService.respondToFeedback(id, req.user.id, dto);
  }

  @UseGuards(AdminGuard)
  @Patch('flag/:id')
  @ApiOperation({ 
    summary: 'Flag inappropriate feedback',
    description: 'Mark feedback as inappropriate (admin only).'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'The ID of the feedback to flag' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Feedback has been successfully flagged.' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Feedback not found.' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Only admins can flag feedback.' 
  })
  async flag(@Param('id') id: string) {
    return this.feedbackService.flagFeedback(id);
  }

  @UseGuards(AdminGuard)
  @Delete('flagged/:id')
  @ApiOperation({ 
    summary: 'Remove flagged feedback',
    description: 'Delete flagged feedback (admin only).'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'The ID of the flagged feedback to remove' 
  })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Flagged feedback has been successfully removed.' 
  })
  @ApiResponse({ 
    status: HttpStatus.NOT_FOUND, 
    description: 'Feedback not found.' 
  })
  @ApiResponse({ 
    status: HttpStatus.FORBIDDEN, 
    description: 'Only admins can remove flagged feedback.' 
  })
  async remove(@Param('id') id: string) {
    return this.feedbackService.removeFlagged(id);
  }
}
