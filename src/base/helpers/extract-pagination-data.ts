import { WithPaginationDto } from '../dtos/with-pagination.dto';
import { ObjectLiteral } from 'typeorm';

export function extractPaginationData(query: WithPaginationDto & ObjectLiteral) {
  const { page, part, orderBy, desc = false, ...rest } = query;
  const offset = ((page || 1) - 1) * part;
  return { offset, limit: part, order: orderBy, direction: `${desc ? 'DESC' : 'ASC'}`, rest };
}
