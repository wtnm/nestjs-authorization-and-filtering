import { Repository } from 'typeorm';
import { typeormWhereBuilder } from '../../../helpers/typeorm-where-builder';
import { extractPaginationData } from '../../../helpers/extract-pagination-data';
import { FORBIDDEN_VALUE, NOT_FOUND_VALUE } from '../../../common/constants';

export abstract class AuthBaseService<T> {
  tableName: string;
  protected constructor(protected readonly repository: Repository<T>) {
    this.tableName = repository.metadata.tableName;
  }

  async createOne(dto: Partial<T>) {
    const user: any = this.repository.create(dto as T);
    await this.repository.insert(user);
    return await this.repository.findOneBy({ id: user.id } as any);
  }

  readOne(query: any) {
    return this.repository
      .createQueryBuilder(this.tableName)
      .where(...typeormWhereBuilder(this.tableName, query))
      .getOne();
  }

  async readMany(query: any) {
    const { offset, limit, order, direction, rest } = extractPaginationData(query);
    let preQuery = this.repository
      .createQueryBuilder(this.tableName)
      .where(...typeormWhereBuilder(this.tableName, rest));
    const count = await preQuery.getCount();
    if (limit)
      preQuery = preQuery
        .offset(offset)
        .limit(limit)
        .orderBy(`${this.tableName}."${order}"`, direction as 'DESC' | 'ASC');
    const data = await preQuery.getMany();
    return { data, count };
  }

  async updateOne(query: any, dto: Partial<T>): Promise<T | typeof NOT_FOUND_VALUE | typeof FORBIDDEN_VALUE> {
    const record = await this.repository
      .createQueryBuilder(this.tableName)
      .where(...typeormWhereBuilder(this.tableName, query))
      .getOne();
    if (!record) {
      const isUserExists = await this.repository.findOneBy({ id: query.id__exact } as any);
      if (!isUserExists) return NOT_FOUND_VALUE;
      else return FORBIDDEN_VALUE;
    }
    const updated = Object.assign(record, dto);
    return await this.repository.save(updated);
  }

  async deleteMany(query: any) {
    return await this.repository
      .createQueryBuilder(this.tableName)
      .softDelete()
      .where(...typeormWhereBuilder(this.tableName, query))
      .execute();
  }

  async restoreMany(query: any) {
    return await this.repository
      .createQueryBuilder(this.tableName)
      .restore()
      .where(...typeormWhereBuilder(this.tableName, query))
      .execute();
  }
}
