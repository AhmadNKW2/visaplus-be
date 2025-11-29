import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import { Country } from './entities/country.entity';
import { CountryAttribute } from './entities/country-attribute.entity';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { ReorderCountriesDto } from './dto/reorder-countries.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { normalizeArabicForSearch, getSearchTermsWithAliases } from '../common/utils/arabic-search.util';

@Injectable()
export class CountriesService {
  constructor(
    @InjectRepository(Country)
    private countriesRepository: Repository<Country>,
    @InjectRepository(CountryAttribute)
    private countryAttributesRepository: Repository<CountryAttribute>,
  ) {}

  async create(createCountryDto: CreateCountryDto): Promise<Country> {
    // Check if country with this countryWorldId already exists
    const existing = await this.countriesRepository.findOne({
      where: { countryWorldId: createCountryDto.countryWorldId },
    });

    if (existing) {
      throw new ConflictException('Country with this countryWorldId already exists');
    }

    // Get the current max order and increment by 1
    const maxOrderResult = await this.countriesRepository
      .createQueryBuilder('country')
      .select('MAX(country.order)', 'maxOrder')
      .getRawOne();
    
    const nextOrder = (maxOrderResult?.maxOrder || 0) + 1;

    const country = this.countriesRepository.create({
      countryWorldId: createCountryDto.countryWorldId,
      order: nextOrder,
    });
    
    const savedCountry = await this.countriesRepository.save(country);

    // Create country attributes if provided
    if (createCountryDto.attributes && createCountryDto.attributes.length > 0) {
      const countryAttributes = createCountryDto.attributes.map(attr => 
        this.countryAttributesRepository.create({
          countryId: savedCountry.id,
          attributeId: attr.attributeId,
          value_en: attr.value_en,
          value_ar: attr.value_ar,
          isActive: attr.isActive,
        })
      );
      await this.countryAttributesRepository.save(countryAttributes);
    }

    return this.findOne(savedCountry.id);
  }

  async findAll(queryDto?: PaginationQueryDto): Promise<PaginatedResult<Country>> {
    const { page = 1, limit = 10, sort, search } = queryDto || {};
    
    const queryBuilder = this.countriesRepository.createQueryBuilder('country')
      .leftJoinAndSelect('country.countryWorld', 'countryWorld')
      .leftJoinAndSelect('country.attributes', 'attributes')
      .leftJoinAndSelect('attributes.attribute', 'attribute');

    // Apply search with Arabic normalization and aliases
    if (search) {
      const searchTerms = getSearchTermsWithAliases(search);
      
      queryBuilder.andWhere(new Brackets(qb => {
        searchTerms.forEach((term, index) => {
          // Search in English name (case-insensitive)
          qb.orWhere(`countryWorld.name_en ILIKE :termEn${index}`, { [`termEn${index}`]: `%${term}%` });
          
          // Search in Arabic name with normalization
          // Use REPLACE to normalize Arabic text in the database for comparison
          qb.orWhere(
            `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(countryWorld.name_ar, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا'), 'ة', 'ه'), 'ى', 'ي') ILIKE :termAr${index}`,
            { [`termAr${index}`]: `%${normalizeArabicForSearch(term)}%` }
          );
        });
      }));
    }

    // Apply sorting
    if (sort) {
      const sortFields = sort.split(',');
      sortFields.forEach((field) => {
        const [key, order] = field.split(':');
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (snakeKey === 'name_en' || snakeKey === 'name_ar') {
          queryBuilder.addOrderBy(`countryWorld.${snakeKey}`, order.toUpperCase() as 'ASC' | 'DESC');
        } else {
          queryBuilder.addOrderBy(`country.${snakeKey}`, order.toUpperCase() as 'ASC' | 'DESC');
        }
      });
    } else {
      queryBuilder.orderBy('country.order', 'ASC');
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
        hasPreviousPage: page > 1,
      },
    };
  }

  async findOne(id: number): Promise<Country> {
    const country = await this.countriesRepository.findOne({
      where: { id },
      relations: ['countryWorld', 'attributes', 'attributes.attribute'],
    });

    if (!country) {
      throw new NotFoundException(`Country with ID ${id} not found`);
    }

    return country;
  }

  async update(id: number, updateCountryDto: UpdateCountryDto): Promise<Country> {
    const country = await this.findOne(id);

    if (updateCountryDto.countryWorldId) {
      const existing = await this.countriesRepository.findOne({
        where: { countryWorldId: updateCountryDto.countryWorldId },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Country with this countryWorldId already exists');
      }

      // Use update instead of save to avoid relation issues
      await this.countriesRepository.update(id, { countryWorldId: updateCountryDto.countryWorldId });
    }

    // Update attributes if provided
    if (updateCountryDto.attributes) {
      for (const attr of updateCountryDto.attributes) {
        const existingAttribute = await this.countryAttributesRepository.findOne({
          where: { countryId: id, attributeId: attr.attributeId },
        });

        if (existingAttribute) {
          // Update existing attribute
          existingAttribute.value_en = attr.value_en;
          existingAttribute.value_ar = attr.value_ar;
          existingAttribute.isActive = attr.isActive;
          await this.countryAttributesRepository.save(existingAttribute);
        } else {
          // Create new attribute
          const newAttribute = this.countryAttributesRepository.create({
            countryId: id,
            attributeId: attr.attributeId,
            value_en: attr.value_en,
            value_ar: attr.value_ar,
            isActive: attr.isActive,
          });
          await this.countryAttributesRepository.save(newAttribute);
        }
      }
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const country = await this.findOne(id);
    await this.countriesRepository.remove(country);
  }

  async reorder(reorderCountriesDto: ReorderCountriesDto): Promise<Country[]> {
    const { countries } = reorderCountriesDto;

    if (!countries || countries.length === 0) {
      const result = await this.findAll({ page: 1, limit: 1000 });
      return result.data;
    }

    // Check if all countries exist
    const countryIds = countries.map(country => country.id);
    const existingCountries = await this.countriesRepository.findByIds(countryIds);
    
    if (existingCountries.length !== countryIds.length) {
      throw new BadRequestException('One or more country IDs do not exist');
    }

    // Check for duplicate order values
    const orderValues = countries.map(country => country.order);
    const uniqueOrderValues = new Set(orderValues);
    if (orderValues.length !== uniqueOrderValues.size) {
      throw new BadRequestException('Duplicate order values are not allowed');
    }

    // Use CASE UPDATE to avoid unique constraint violations during reordering
    const cases = countries
      .map((item) => `WHEN ${Number(item.id)} THEN ${Number(item.order)}`)
      .join(' ');
    const ids = countries.map((item) => Number(item.id)).join(',');

    await this.countriesRepository.manager.transaction(async (manager) => {
      // Temporarily set all orders to negative values to avoid conflicts
      await manager.query(`UPDATE countries SET "order" = -"order" WHERE id IN (${ids})`);
      
      // Now apply the new order values
      const sql = `UPDATE countries SET "order" = CASE id ${cases} END WHERE id IN (${ids})`;
      await manager.query(sql);
    });

    const result = await this.findAll({ page: 1, limit: 1000 });
    return result.data;
  }
}
