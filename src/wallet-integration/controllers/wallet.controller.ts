import {
    Controller,
    Post,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    HttpStatus,
    HttpCode,
  } from '@nestjs/common';
  import { WalletService } from '../services/wallet.service';
  import { JwtAuthGuard } from '../guards/jwt-auth.guard';
  import { ConnectWalletDto } from '../dto/connect-wallet.dto';
  import { ShareCredentialDto } from '../dto/share-credential.dto';
  import { CredentialFilterDto } from '../dto/credential-filter.dto';
  
  @Controller('wallet')
  export class WalletController {
    constructor(private readonly walletService: WalletService) {}
  
    @Post('connect')
    @HttpCode(HttpStatus.OK)
    async connectWallet(@Body() connectWalletDto: ConnectWalletDto) {
      return await this.walletService.connectWallet(connectWalletDto);
    }
  
    @Post('disconnect')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async disconnectWallet(@Request() req) {
      await this.walletService.disconnectWallet(req.user.walletId);
    }
  
    @Get('credentials')
    @UseGuards(JwtAuthGuard)
    async getCredentials(
      @Request() req,
      @Query() filters: CredentialFilterDto
    ) {
      return await this.walletService.getWalletCredentials(req.user.walletId, filters);
    }
  
    @Get('credentials/:id')
    @UseGuards(JwtAuthGuard)
    async getCredential(@Request() req, @Param('id') credentialId: string) {
      return await this.walletService.getCredentialById(credentialId, req.user.walletId);
    }
  
    @Post('credentials/share')
    @UseGuards(JwtAuthGuard)
    async shareCredentials(
      @Request() req,
      @Body() shareDto: ShareCredentialDto
    ) {
      return await this.walletService.shareCredentials(req.user.walletId, shareDto);
    }
  
    @Delete('credentials/:id/share')
    @UseGuards(JwtAuthGuard)
    @HttpCode(HttpStatus.NO_CONTENT)
    async revokeCredentialShare(
      @Request() req,
      @Param('id') credentialId: string
    ) {
      await this.walletService.revokeCredentialShare(credentialId, req.user.walletId);
    }
  
    @Get('stats')
    @UseGuards(JwtAuthGuard)
    async getWalletStats(@Request() req) {
      return await this.walletService.getWalletStats(req.user.walletId);
    }
  }
  
  // src/wallet/guards/jwt-auth.guard.ts
  import { Injectable, UnauthorizedException } from '@nestjs/common';
  import { AuthGuard } from '@nestjs/passport';
  
  @Injectable()
  export class JwtAuthGuard extends AuthGuard('jwt') {
    handleRequest(err: any, user: any, info: any) {
      if (err || !user) {
        throw err || new UnauthorizedException('Invalid token');
      }
      return user;
    }
  }
  