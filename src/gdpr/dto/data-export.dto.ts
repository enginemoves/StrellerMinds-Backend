import { IsOptional, IsArray, IsString, IsEnum } from 'class-validator';

export enum ExportFormat {
  JSON = 'json',
  CSV = 'csv',
  XML = 'xml',
}

export class DataExportRequestDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dataTypes?: string[];

  @IsOptional()
  @IsEnum(ExportFormat)
  format?: ExportFormat = ExportFormat.JSON;

  @IsOptional()
  @IsString()
  reason?: string;
}
