import {
  Controller,
  Get,
  Query,
  UseGuards,
  HttpStatus,
  HttpException,
  createParamDecorator,
  ExecutionContext,
} from '@nestjs/common';
import { CredentialService } from './credential.service';
import { CredentialHistoryQueryDto } from './dto/credential-history-query.dto';
import { CredentialHistoryResponseDto } from './dto/credential-history-response.dto';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

// ✅ Moved the User decorator above the class definition
export const User = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@ApiTags('credentials')
@Controller('credentials')
export class CredentialController {
  constructor(private readonly credentialService: CredentialService) {}

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user credential history from Stellar blockchain',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Credential history retrieved successfully',
    type: CredentialHistoryResponseDto,
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid query parameters',
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Internal server error',
  })
  async getCredentialHistory(
    @User() user: { id: string },
    @Query() queryParams: CredentialHistoryQueryDto,
  ): Promise<CredentialHistoryResponseDto> {
    try {
      return await this.credentialService.getUserCredentialHistory(
        user.id,
        queryParams,
      );
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
  @ApiOperation({
    summary: 'Verify a specific credential on the blockchain',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Credential verification result',
  })
  @ApiResponse({ status: HttpStatus.UNAUTHORIZED, description: 'Unauthorized' })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Credential not found',
  })
  async verifyCredential(
    @User() user: { id: string },
    @Query('id') credentialId: string,
  ) {
    try {
      return await this.credentialService.verifyCredential(
        user.id,
        credentialId,
      );
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
