import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Logger,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SorobanService } from './soroban.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MintCredentialDto, VerifyCredentialDto } from './dto/credential.dto';

@ApiTags('credentials')
@Controller('credentials')
export class SorobanController {
  private readonly logger = new Logger(SorobanController.name);

  constructor(private readonly sorobanService: SorobanService) {}

  @Post('mint')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mint a new verifiable credential' })
  @ApiResponse({ status: 201, description: 'Credential successfully minted' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 500, description: 'Internal server error' })
  async mintCredential(@Body() mintCredentialDto: MintCredentialDto) {
    try {
      const result = await this.sorobanService.mintCredential(
        mintCredentialDto.recipientAddress,
        mintCredentialDto.credentialData,
      );

      return {
        success: true,
        message: 'Credential successfully minted',
        data: result,
      };
    } catch (error) {
      this.logger.error(
        `Failed to mint credential: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to mint credential',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get credential by ID' })
  @ApiResponse({ status: 200, description: 'Returns the credential data' })
  @ApiResponse({ status: 404, description: 'Credential not found' })
  async getCredential(@Param('id') credentialId: string) {
    try {
      const credential = await this.sorobanService.getCredential(credentialId);

      if (!credential) {
        throw new HttpException(
          {
            status: HttpStatus.NOT_FOUND,
            error: 'Credential not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        data: credential,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(
        `Failed to get credential: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to get credential',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('verify')
  @ApiOperation({ summary: 'Verify a credential' })
  @ApiResponse({ status: 200, description: 'Returns verification result' })
  async verifyCredential(@Body() verifyCredentialDto: VerifyCredentialDto) {
    try {
      const isValid = await this.sorobanService.verifyCredential(
        verifyCredentialDto.credentialId,
      );

      return {
        success: true,
        data: {
          credentialId: verifyCredentialDto.credentialId,
          isValid,
          verifiedAt: new Date(),
        },
      };
    } catch (error) {
      this.logger.error(
        `Failed to verify credential: ${error.message}`,
        error.stack,
      );
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: 'Failed to verify credential',
          message: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
