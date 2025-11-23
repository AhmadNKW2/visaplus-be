import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, Query } from '@nestjs/common';
import { AttributesService } from './attributes.service';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { ReorderAttributesDto } from './dto/reorder-attributes.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';

@Controller('attributes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AttributesController {
  constructor(private readonly attributesService: AttributesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  async create(@Body() createAttributeDto: CreateAttributeDto) {
    const data = await this.attributesService.create(createAttributeDto);
    return {
      data,
      message: 'Attribute created successfully'
    };
  }

  @Post('reorder')
  @Roles(UserRole.ADMIN)
  async reorder(@Body() reorderAttributesDto: ReorderAttributesDto) {
    const data = await this.attributesService.reorder(reorderAttributesDto);
    return {
      data,
      message: 'Attributes reordered successfully'
    };
  }

  @Get()
  async findAll(@Query() queryDto: PaginationQueryDto) {
    const result = await this.attributesService.findAll(queryDto);
    return {
      ...result,
      message: 'Attributes retrieved successfully'
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.attributesService.findOne(+id);
    return {
      data,
      message: 'Attribute retrieved successfully'
    };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateAttributeDto: UpdateAttributeDto) {
    const data = await this.attributesService.update(+id, updateAttributeDto);
    return {
      data,
      message: 'Attribute updated successfully'
    };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.attributesService.remove(+id);
    return {
      message: 'Attribute deleted successfully'
    };
  }
}
