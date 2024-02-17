import { IsEmail, IsString } from 'class-validator';
import { AuthAccessGeneric } from './auth.interfaces';

export class AuthLoginRequestDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

export class RoleRestrictionFilter {
  role__in?: number[];
}

export class UserRestrictionFilter {
  user_id__in?: number[];
}
export class AuthAccessEntities {
  // entities
  role?: AuthAccessGeneric<never, string>;
  user?: AuthAccessGeneric<RoleRestrictionFilter, string>;
}

type Auth = {
  [entity: string]: Record<
    'create' | 'read' | 'update' | 'delete',
    boolean | { filterRows: { [field__op: string]: any }; excludeCols: string[] }
  >;
};
