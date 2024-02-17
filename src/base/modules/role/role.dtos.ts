import { OmitType } from '@nestjs/swagger';
import { Role } from './role.entity';

export class RoleReturnDto extends OmitType(Role, [] as const) {}
export class RoleUpdateDto extends OmitType(RoleReturnDto, ['id', 'created', 'updated', 'deletedAt'] as const) {}

export class RoleCreateDto extends OmitType(RoleReturnDto, ['id', 'created', 'updated', 'deletedAt'] as const) {}
