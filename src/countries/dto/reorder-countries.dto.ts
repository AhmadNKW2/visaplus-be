import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CountryOrderDto {
  @IsInt()
  id: number;

  @IsInt()
  @Min(1)
  order: number;
}

export class ReorderCountriesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CountryOrderDto)
  countries: CountryOrderDto[];
}
