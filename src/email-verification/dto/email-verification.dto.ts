import { IsEmail, IsString, IsUUID } from 'class-validator';

export class SendVerificationEmailDto {
  @IsEmail()
  email: string;
}

export class VerifyEmailDto {
  @IsString()
  @IsUUID()
  token: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}
