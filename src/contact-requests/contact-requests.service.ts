import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like, Brackets } from 'typeorm';
import { CreateContactRequestDto } from './dto/create-contact-request.dto';
import { UpdateContactRequestDto } from './dto/update-contact-request.dto';
import { FilterContactRequestDto } from './dto/filter-contact-request.dto';
import { ContactRequest } from './entities/contact-request.entity';
import { PaginatedResult } from '../common/interfaces/paginated-result.interface';
import { normalizeArabicForSearch } from '../common/utils/arabic-search.util';

@Injectable()
export class ContactRequestsService {
  constructor(
    @InjectRepository(ContactRequest)
    private contactRequestsRepository: Repository<ContactRequest>,
  ) {}

  async create(createContactRequestDto: CreateContactRequestDto): Promise<ContactRequest> {
    const contactRequest = this.contactRequestsRepository.create(createContactRequestDto);
    return await this.contactRequestsRepository.save(contactRequest);
  }

  async findAll(filterDto: FilterContactRequestDto): Promise<PaginatedResult<ContactRequest>> {
    const { page = 1, limit = 10, sort, search, destination_country, nationality, startDate, endDate } = filterDto;
    
    const queryBuilder = this.contactRequestsRepository.createQueryBuilder('contact_request');

    // Apply search with Arabic normalization
    if (search) {
      const normalizedSearch = normalizeArabicForSearch(search);
      
      queryBuilder.andWhere(new Brackets(qb => {
        // Search in regular fields (case-insensitive)
        qb.where('contact_request.name ILIKE :search', { search: `%${search}%` })
          .orWhere('contact_request.phone_number ILIKE :search', { search: `%${search}%` })
          .orWhere('contact_request.nationality ILIKE :search', { search: `%${search}%` })
          .orWhere('contact_request.destination_country ILIKE :search', { search: `%${search}%` });
        
        // Search with Arabic normalization
        qb.orWhere(
          `REPLACE(REPLACE(REPLACE(contact_request.name, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') ILIKE :normalizedSearch`,
          { normalizedSearch: `%${normalizedSearch}%` }
        ).orWhere(
          `REPLACE(REPLACE(REPLACE(contact_request.nationality, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') ILIKE :normalizedSearch`,
          { normalizedSearch: `%${normalizedSearch}%` }
        ).orWhere(
          `REPLACE(REPLACE(REPLACE(contact_request.destination_country, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') ILIKE :normalizedSearch`,
          { normalizedSearch: `%${normalizedSearch}%` }
        );
      }));
    }

    // Apply filters with Arabic normalization
    if (destination_country) {
      const normalizedDestination = normalizeArabicForSearch(destination_country);
      queryBuilder.andWhere(new Brackets(qb => {
        qb.where('contact_request.destination_country ILIKE :destination_country', {
          destination_country: `%${destination_country}%`
        }).orWhere(
          `REPLACE(REPLACE(REPLACE(contact_request.destination_country, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') ILIKE :normalizedDestination`,
          { normalizedDestination: `%${normalizedDestination}%` }
        );
      }));
    }

    if (nationality) {
      const normalizedNationality = normalizeArabicForSearch(nationality);
      queryBuilder.andWhere(new Brackets(qb => {
        qb.where('contact_request.nationality ILIKE :nationality', {
          nationality: `%${nationality}%`
        }).orWhere(
          `REPLACE(REPLACE(REPLACE(contact_request.nationality, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') ILIKE :normalizedNationality`,
          { normalizedNationality: `%${normalizedNationality}%` }
        );
      }));
    }

    // Apply date range filter
    if (startDate && endDate) {
      queryBuilder.andWhere('contact_request.created_at BETWEEN :startDate AND :endDate', {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });
    } else if (startDate) {
      queryBuilder.andWhere('contact_request.created_at >= :startDate', {
        startDate: new Date(startDate)
      });
    } else if (endDate) {
      queryBuilder.andWhere('contact_request.created_at <= :endDate', {
        endDate: new Date(endDate)
      });
    }

    // Apply sorting
    if (sort) {
      const sortFields = sort.split(',');
      sortFields.forEach((field) => {
        const [key, order] = field.split(':');
        
        // Handle special sort keys
        let snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (snakeKey === 'date') {
          snakeKey = 'created_at';
        }
        
        queryBuilder.addOrderBy(`contact_request.${snakeKey}`, order.toUpperCase() as 'ASC' | 'DESC');
      });
    } else {
      queryBuilder.orderBy('contact_request.created_at', 'DESC');
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

  async findOne(id: number): Promise<ContactRequest> {
    const contactRequest = await this.contactRequestsRepository.findOne({
      where: { id },
    });

    if (!contactRequest) {
      throw new NotFoundException(`Contact request with ID ${id} not found`);
    }

    return contactRequest;
  }

  async update(id: number, updateContactRequestDto: UpdateContactRequestDto): Promise<ContactRequest> {
    const contactRequest = await this.findOne(id);
    Object.assign(contactRequest, updateContactRequestDto);
    return await this.contactRequestsRepository.save(contactRequest);
  }

  async remove(id: number): Promise<void> {
    const contactRequest = await this.findOne(id);
    await this.contactRequestsRepository.remove(contactRequest);
  }
}
