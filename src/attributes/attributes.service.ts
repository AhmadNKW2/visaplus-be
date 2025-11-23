import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attribute } from './entities/attribute.entity';
import { CreateAttributeDto } from './dto/create-attribute.dto';
import { UpdateAttributeDto } from './dto/update-attribute.dto';
import { ReorderAttributesDto } from './dto/reorder-attributes.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';

@Injectable()
export class AttributesService {
  constructor(
    @InjectRepository(Attribute)
    private attributesRepository: Repository<Attribute>,
  ) {}

  async create(createAttributeDto: CreateAttributeDto): Promise<Attribute> {
    // Get the current max order and increment by 1
    const maxOrderResult = await this.attributesRepository
      .createQueryBuilder('attribute')
      .select('MAX(attribute.order)', 'maxOrder')
      .getRawOne();
    
    const nextOrder = (maxOrderResult?.maxOrder || 0) + 1;
    
    const attribute = this.attributesRepository.create({
      ...createAttributeDto,
      order: nextOrder,
    });
    return await this.attributesRepository.save(attribute);
  }

  async findAll(queryDto?: PaginationQueryDto): Promise<PaginatedResult<Attribute>> {
    const { page = 1, limit = 10, sort, search } = queryDto || {};
    
    const queryBuilder = this.attributesRepository.createQueryBuilder('attribute');

    // Apply search
    if (search) {
      queryBuilder.andWhere(
        '(attribute.name_en ILIKE :search OR attribute.name_ar ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Apply sorting
    if (sort) {
      const sortFields = sort.split(',');
      sortFields.forEach((field) => {
        const [key, order] = field.split(':');
        // Convert camelCase to snake_case
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        queryBuilder.addOrderBy(`attribute.${snakeKey}`, order.toUpperCase() as 'ASC' | 'DESC');
      });
    } else {
      queryBuilder.orderBy('attribute.order', 'ASC');
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

  async findOne(id: number): Promise<Attribute> {
    const attribute = await this.attributesRepository.findOne({
      where: { id },
    });

    if (!attribute) {
      throw new NotFoundException(`Attribute with ID ${id} not found`);
    }

    return attribute;
  }

  async update(id: number, updateAttributeDto: UpdateAttributeDto): Promise<Attribute> {
    const attribute = await this.findOne(id);
    Object.assign(attribute, updateAttributeDto);
    return await this.attributesRepository.save(attribute);
  }

  async remove(id: number): Promise<void> {
    const attribute = await this.findOne(id);
    await this.attributesRepository.remove(attribute);
  }

  async reorder(reorderAttributesDto: ReorderAttributesDto): Promise<Attribute[]> {
    const { attributes } = reorderAttributesDto;

    if (!attributes || attributes.length === 0) {
      const result = await this.findAll({ page: 1, limit: 1000 });
      return result.data;
    }

    // Check if all attributes exist
    const attributeIds = attributes.map(attr => attr.id);
    const existingAttributes = await this.attributesRepository.findByIds(attributeIds);
    
    if (existingAttributes.length !== attributeIds.length) {
      throw new BadRequestException('One or more attribute IDs do not exist');
    }

    // Check for duplicate order values
    const orderValues = attributes.map(attr => attr.order);
    const uniqueOrderValues = new Set(orderValues);
    if (orderValues.length !== uniqueOrderValues.size) {
      throw new BadRequestException('Duplicate order values are not allowed');
    }

    // Use CASE UPDATE to avoid unique constraint violations during reordering
    const cases = attributes
      .map((item) => `WHEN ${Number(item.id)} THEN ${Number(item.order)}`)
      .join(' ');
    const ids = attributes.map((item) => Number(item.id)).join(',');

    await this.attributesRepository.manager.transaction(async (manager) => {
      // Temporarily set all orders to negative values to avoid conflicts
      await manager.query(`UPDATE attributes SET "order" = -"order" WHERE id IN (${ids})`);
      
      // Now apply the new order values
      const sql = `UPDATE attributes SET "order" = CASE id ${cases} END WHERE id IN (${ids})`;
      await manager.query(sql);
    });

    const result = await this.findAll({ page: 1, limit: 1000 });
    return result.data;
  }
}