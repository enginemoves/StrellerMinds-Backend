// src/submission/dto/create-submission.dto.ts
import { IsNotEmpty, IsOptional, IsUUID, IsString } from 'class-validator';

export class CreateSubmissionDto {
  @IsUUID()
  studentId: string;

  @IsUUID()
  assignmentId: string;

  @IsOptional()
  @IsString()
  textContent?: string;
}