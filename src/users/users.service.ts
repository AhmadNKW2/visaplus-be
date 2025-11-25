import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Brackets } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { FilterUserDto } from './dto/filter-user.dto';
import { normalizeArabicForSearch } from '../common/utils/arabic-search.util';

@Injectable()
export class UsersService {
    constructor(
        @InjectRepository(User)
        private usersRepository: Repository<User>,
    ) { }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const existingUser = await this.usersRepository.findOne({
            where: { email: createUserDto.email },
        });

        if (existingUser) {
            throw new ConflictException('Email already exists');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

        // Create user with specified role or default to USER
        const user = this.usersRepository.create({
            ...createUserDto,
            password: hashedPassword,
            role: createUserDto.role || UserRole.USER, // Default to USER if not specified
        });

        return await this.usersRepository.save(user);
    }

    async findAll(filterDto?: FilterUserDto) {
        const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC', role, isActive, search } = filterDto || {};

        const queryBuilder = this.usersRepository
            .createQueryBuilder('user')
            .select(['user.id', 'user.email', 'user.firstName', 'user.lastName', 'user.role', 'user.isActive', 'user.createdAt', 'user.updatedAt']);

        // Filter by role
        if (role) {
            queryBuilder.andWhere('user.role = :role', { role });
        }

        // Filter by isActive
        if (isActive !== undefined) {
            queryBuilder.andWhere('user.isActive = :isActive', { isActive });
        }

        // Search with Arabic normalization
        if (search) {
            const normalizedSearch = normalizeArabicForSearch(search);
            
            queryBuilder.andWhere(new Brackets(qb => {
                // Search in English fields (case-insensitive)
                qb.where('user.email ILIKE :search', { search: `%${search}%` })
                  .orWhere('user.firstName ILIKE :search', { search: `%${search}%` })
                  .orWhere('user.lastName ILIKE :search', { search: `%${search}%` });
                
                // Search in Arabic fields with normalization
                qb.orWhere(
                    `REPLACE(REPLACE(REPLACE(user.firstName, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') ILIKE :normalizedSearch`,
                    { normalizedSearch: `%${normalizedSearch}%` }
                ).orWhere(
                    `REPLACE(REPLACE(REPLACE(user.lastName, 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا') ILIKE :normalizedSearch`,
                    { normalizedSearch: `%${normalizedSearch}%` }
                );
            }));
        }

        // Sorting
        queryBuilder.orderBy(`user.${sortBy}`, sortOrder);

        // Pagination
        queryBuilder.skip((page - 1) * limit).take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number): Promise<User> {
        const user = await this.usersRepository.findOne({ where: { id } });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        return user;
    }

    async findByEmail(email: string): Promise<User | null> {
        return await this.usersRepository.findOne({ where: { email } });
    }

    async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
        return await bcrypt.compare(plainPassword, hashedPassword);
    }

    async updatePassword(userId: number, newPassword: string): Promise<void> {
        const user = await this.findOne(userId);
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await this.usersRepository.save(user);
    }

    // Update user (including role)
    async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
        const user = await this.findOne(id);

        // Update fields
        Object.assign(user, updateUserDto);

        return await this.usersRepository.save(user);
    }

    // Delete user
    async remove(id: number): Promise<void> {
        const user = await this.findOne(id);
        await this.usersRepository.remove(user);
    }
}