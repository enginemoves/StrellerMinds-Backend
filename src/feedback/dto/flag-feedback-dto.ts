import { IsBoolean } from 'class-validator';

export class FlagFeedbackDto {
  @IsBoolean()
  isFlagged: boolean;
}
