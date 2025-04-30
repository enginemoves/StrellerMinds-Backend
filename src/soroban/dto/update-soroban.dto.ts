import { PartialType } from '@nestjs/swagger';
import { CreateSorobanDto } from './create-soroban.dto';

export class UpdateSorobanDto extends PartialType(CreateSorobanDto) {}
