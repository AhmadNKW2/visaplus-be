import { IsNumber, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class CountryAttributeDto {
  @IsNumber()
  @IsNotEmpty()
  attributeId: number;

  @IsString()
  @IsNotEmpty()
  value_en: string;

  @IsString()
  @IsNotEmpty()
  value_ar: string;

  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}

export class CreateCountryDto {
  @IsNumber()
  @IsNotEmpty()
  countryWorldId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountryAttributeDto)
  @IsOptional()
  attributes?: CountryAttributeDto[];
}
