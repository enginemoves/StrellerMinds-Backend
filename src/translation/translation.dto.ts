import { IsEnum, IsString } from 'class-validator';
import { Language } from 'src/language/language.enum';

export class CreateTranslationDto {
  @IsString()
  key: string;

  @IsEnum(Language)
  language: Language;

  @IsString()
  value: string;
}
