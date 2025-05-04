import { Controller, Get, Query, UseGuards, UseFilters, HttpStatus, HttpException } from '@nestjs/common';
import { CredentialService } from './credential.service';
import { CredentialHistoryQueryDto } from './dto/credential-history-query.dto';
import { CredentialHistoryResponseDto } from './dto/credential-history-response.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';
import { User } from '../common/decorators/user.decorator';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';

@ApiTags('credentials')
@Controller('credentials')
@UseFilters(HttpExceptionFilter)
export class CredentialController {
  constructor(private readonly credentialService: CredentialService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get user credential history from Stellar blockchain' })
  @ApiResponse({ 
    status: HttpStatus.OK, 
    description: 'Credential history retrieved successfully',
    type: CredentialHistoryResponseDto 
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid query parameters' })
  @ApiResponse({ status: HttpStatus.INTERNAL_SERVER_ERROR, description: 'Internal server error' })
  async getCredentialHistory(
    @User() user: { id: string },
    @Query() queryParams: CredentialHistoryQueryDto,
  ): Promise<CredentialHistoryResponseDto> {
    try {
      return await this.credentialService.getUserCredentialHistory(user.id, queryParams);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve credential history',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('history/:id/verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify a specific credential on the blockchain' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Credential verification result' })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Credential not found' })
  async verifyCredential(
    @User() user: { id: string },
    @Query('id') credentialId: string,
  ) {
    try {
      return await this.credentialService.verifyCredential(user.id, credentialId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to verify credential',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}