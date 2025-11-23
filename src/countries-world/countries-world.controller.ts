import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { CountriesWorldService } from './countries-world.service';
import { CreateCountryWorldDto } from './dto/create-country-world.dto';
import { UpdateCountryWorldDto } from './dto/update-country-world.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';

@Controller('countries-world')
export class CountriesWorldController {
  constructor(private readonly countriesWorldService: CountriesWorldService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createCountryWorldDto: CreateCountryWorldDto) {
    const data = await this.countriesWorldService.create(createCountryWorldDto);
    return {
      data,
      message: 'World country created successfully'
    };
  }

  @Get()
  async findAll() {
    const data = await this.countriesWorldService.findAll();
    return {
      data,
      message: 'World countries retrieved successfully'
    };
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    const data = await this.countriesWorldService.findOne(+id);
    return {
      data,
      message: 'World country retrieved successfully'
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(@Param('id') id: string, @Body() updateCountryWorldDto: UpdateCountryWorldDto) {
    const data = await this.countriesWorldService.update(+id, updateCountryWorldDto);
    return {
      data,
      message: 'World country updated successfully'
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(@Param('id') id: string) {
    await this.countriesWorldService.remove(+id);
    return {
      message: 'World country deleted successfully'
    };
  }
}
