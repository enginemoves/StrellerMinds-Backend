/**
 * FilesController handles endpoints for file management (upload, download, etc.).
 *
 * @module Files
 */
import { Controller } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Files')
@Controller('files')
export class FilesController {}
