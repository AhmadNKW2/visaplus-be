import { PartialType } from '@nestjs/mapped-types';
import { CreateContactRequestDto } from './create-contact-request.dto';

export class UpdateContactRequestDto extends PartialType(CreateContactRequestDto) {}
