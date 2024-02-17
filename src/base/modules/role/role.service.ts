import { Injectable } from '@nestjs/common';
import { Role } from './role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DeleteManyDto } from '../../dtos/delete-many.dto';
import { AuthCacheService } from '../auth/auth.cache.module';
import { AuthBaseService } from '../auth/base/auth.base.service';
import { User } from '../user/user.entity';
import { IdExactDto } from '../../dtos/id-exact.dto';
import { FORBIDDEN_VALUE, NOT_FOUND_VALUE } from '../../common/constants';
import { RoleUpdateDto } from './role.dtos';

@Injectable()
export class RoleService extends AuthBaseService<Role> {
  constructor(
    @InjectRepository(Role)
    roleRepository: Repository<Role>,
    private authCacheService: AuthCacheService,
  ) {
    super(roleRepository);
  }

  async updateOne(
    query: IdExactDto,
    dto: RoleUpdateDto,
  ): Promise<User | typeof NOT_FOUND_VALUE | typeof FORBIDDEN_VALUE> {
    const result = await super.updateOne(query, dto);
    await this.authCacheService.invalidateAllCache();
    return result;
  }

  async deleteMany(query: DeleteManyDto) {
    const result = await super.deleteMany(query);
    await this.authCacheService.invalidateAllCache();
    return result;
  }
}
