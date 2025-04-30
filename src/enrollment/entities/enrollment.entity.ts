// src/enrollment/entities/enrollment.entity.ts
import { ApiProperty } from '@nestjs/swagger';

export class Enrollment {
  @ApiProperty()
  id: string;

  @ApiProperty()
  studentId: string;

  @ApiProperty()
  courseId: string;

  @ApiProperty()
  enrolledAt: Date;

  @ApiProperty({ enum: ['ENROLLED', 'UNENROLLED'] })
  status: 'ENROLLED' | 'UNENROLLED';

  @ApiProperty({ enum: ['PENDING', 'PAID'], required: false })
  paymentStatus?: 'PENDING' | 'PAID';
}
