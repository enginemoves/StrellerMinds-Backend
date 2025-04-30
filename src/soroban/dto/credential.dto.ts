import { IsNotEmpty, IsString, IsObject } from 'class-validator';

export class MintCredentialDto {
  @IsNotEmpty()
  @IsString()
  recipientAddress: string;

  @IsNotEmpty()
  @IsObject()
  credentialData: Record<string, any>;
}

export class VerifyCredentialDto {
  @IsNotEmpty()
  @IsString()
  credentialId: string;
}
