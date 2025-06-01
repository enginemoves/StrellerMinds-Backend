import { PartialType } from '@nestjs/swagger';
import { CreateGdprDto } from './create-gdpr.dto';

export class UpdateGdprDto extends PartialType(CreateGdprDto) {}
