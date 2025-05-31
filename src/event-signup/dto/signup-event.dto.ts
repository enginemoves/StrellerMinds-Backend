import { IsUUID, IsNotEmpty } from 'class-validator';

export class SignupEventDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsUUID()
  @IsNotEmpty()
  userId: string;
}
