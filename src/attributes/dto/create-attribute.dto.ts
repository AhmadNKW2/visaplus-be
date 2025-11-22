import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAttributeDto {
  @IsString()
  @IsNotEmpty()
  name_en: string;

  @IsString()
  @IsNotEmpty()
  name_ar: string;
}
