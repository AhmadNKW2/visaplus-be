import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Transform } from 'class-transformer';

@Entity('contact_requests')
export class ContactRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  nationality: string;

  @Column()
  phone_number: string;

  @Column()
  destination_country: string;

  @CreateDateColumn()
  @Transform(({ value }) => value && new Date(value.getTime() + (3 * 60 * 60 * 1000)))
  created_at: Date;

  @UpdateDateColumn()
  @Transform(({ value }) => value && new Date(value.getTime() + (3 * 60 * 60 * 1000)))
  updated_at: Date;
}
