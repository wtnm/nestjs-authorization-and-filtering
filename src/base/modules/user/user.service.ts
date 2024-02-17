import { Injectable } from '@nestjs/common';
import { User } from './user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeleteManyDto } from '../../dtos/delete-many.dto';
import { UserUpdateDto } from './user.dtos';
import { RoleRestrictionFilter } from '../auth/auth.dto';
import { IdExactDto } from '../../dtos/id-exact.dto';
import { AuthCacheService } from '../auth/auth.cache.module';
import { FORBIDDEN_VALUE, NOT_FOUND_VALUE } from '../../common/constants';
import { AuthBaseService } from '../auth/base/auth.base.service';

@Injectable()
export class UserService extends AuthBaseService<User> {
  constructor(
    @InjectRepository(User)
    userRepository: Repository<User>,
    private authCacheService: AuthCacheService,
  ) {
    super(userRepository);
  }

  async updateOne(
    query: IdExactDto & RoleRestrictionFilter,
    dto: UserUpdateDto,
  ): Promise<User | typeof NOT_FOUND_VALUE | typeof FORBIDDEN_VALUE> {
    const result = await super.updateOne(query, dto);
    await this.authCacheService.invalidateOneCachedValue(`${query.id__exact}`);
    return result;
  }

  async deleteMany(query: DeleteManyDto & RoleRestrictionFilter) {
    const result = await super.deleteMany(query);
    await Promise.all(query.id__in.map((id) => this.authCacheService.invalidateOneCachedValue(`${id}`)));
    return result;
  }
}
