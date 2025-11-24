import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  UseGuards,
  Query,
} from '@nestjs/common';
import { CountriesService } from './countries.service';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { ReorderCountriesDto } from './dto/reorder-countries.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';

@Controller('countries')
export class CountriesController {
  constructor(private readonly countriesService: CountriesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createCountryDto: CreateCountryDto) {
    const data = await this.countriesService.create(createCountryDto);
    return {
      data,
      message: 'Country created successfully'
    };
  }

  @Post('reorder')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async reorder(@Body() reorderCountriesDto: ReorderCountriesDto) {
    const data = await this.countriesService.reorder(reorderCountriesDto);
    return {
      data,
      message: 'Countries reordered successfully'
    };
  }

  @Get()
  async findAll(@Query() queryDto: PaginationQueryDto) {
    const result = await this.countriesService.findAll(queryDto);
    return {
      ...result,
      message: 'Countries retrieved successfully'
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.countriesService.findOne(+id);
    return {
      data,
      message: 'Country retrieved successfully'
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateCountryDto: UpdateCountryDto) {
    const data = await this.countriesService.update(+id, updateCountryDto);
    return {
      data,
      message: 'Country updated successfully'
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.countriesService.remove(+id);
    return {
      message: 'Country deleted successfully'
    };
  }
}
