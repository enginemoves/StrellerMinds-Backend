import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { UserRole } from '../entities/mentorship-preference.entity';

export class CreatePreferenceDto {
  @ApiProperty({
    description: 'Role in the mentorship relationship',
    enum: UserRole,
    example: UserRole.MENTEE,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiProperty({
    description: 'List of skills the user has or wants to learn',
    example: ['JavaScript', 'React', 'Node.js'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skills?: string[];

  @ApiProperty({
    description: 'List of interests the user has',
    example: ['Web Development', 'Mobile Apps', 'AI'],
    required: false,
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  interests?: string[];

  @ApiProperty({
    description: 'Weights for each skill (0-10)',
    example: { JavaScript: 8, React: 9, 'Node.js': 7 },
    required: false,
  })
  @IsObject()
  @IsOptional()
  skillWeights?: Record<string, number>;

  @ApiProperty({
    description: 'Weights for each interest (0-10)',
    example: { 'Web Development': 9, 'Mobile Apps': 6, AI: 8 },
    required: false,
  })
  @IsObject()
  @IsOptional()
  interestWeights?: Record<string, number>;

  @ApiProperty({
    description: 'Whether the preference is active',
    example: true,
    required: false,
    default: true,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'Bio or description',
    example: 'I am a software developer with 5 years of experience...',
    required: false,
  })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({
    description: 'Experience level (0-10)',
    example: 7,
    required: false,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @Max(10)
  @IsOptional()
  experienceLevel?: number;

  @ApiProperty({
    description: 'Preferred language for communication',
    example: 'English',
    required: false,
  })
  @IsString()
  @IsOptional()
  preferredLanguage?: string;

  @ApiProperty({
    description: 'Additional preferences as key-value pairs',
    example: { 'meeting-frequency': 'weekly', 'preferred-time': 'evenings' },
    required: false,
  })
  @IsObject()
  @IsOptional()
  additionalPreferences?: Record<string, any>;
}
