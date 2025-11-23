import { IsArray, ValidateNested, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class AttributeOrderDto {
  @IsInt()
  id: number;

  @IsInt()
  @Min(1)
  order: number;
}

export class ReorderAttributesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AttributeOrderDto)
  attributes: AttributeOrderDto[];
}
