import { isArray } from 'class-validator';
import { ObjectLiteral } from 'typeorm';
import merge from 'lodash/merge';

export function typeormWhereBuilder(table = 't', query: ObjectLiteral, varPostfix = ''): [string, ObjectLiteral] {
  const vars: ObjectLiteral = {};
  const andWhere: string[] = [];
  Object.entries(query).forEach((keyValuePair) => {
    andWhere.push(makeStatement(vars, keyValuePair, table, varPostfix));
  });
  const where = andWhere.length ? '(' + andWhere.join(') AND (') + ')' : '';
  return [where, vars];
}
function makeStatement(
  vars: ObjectLiteral,
  [field__op__not, value]: [string, unknown],
  table: string,
  varPostfix = '',
) {
  const [field, op, not] = field__op__not.split('__');
  if (!field) throw new Error(`Empty field for "${field__op__not}" is not allowed`);
  if (!op) throw new Error(`Empty operator for "${field__op__not}" is not allowed`);

  let result = '';
  const varName = field__op__not + (varPostfix ? `__${varPostfix}` : '');
  if (op === 'range') {
    if (!isArray(value) || value.length !== 2)
      throw new Error(`Value for "range" operator must be array of two values`);
    const [gteVal, ltVal] = value as [number | string, number | string];
    vars[varName + '__' + 'gte'] = gteVal;
    vars[varName + '__' + 'lt'] = ltVal;
    result = `"${table}"."${field}" >= :${varName + '__' + 'gte'} AND "${table}"."${field}" < :${varName + '__' + 'lt'}`;
  } else if (op === 'gt' || op === 'gte' || op === 'lt' || op === 'lte') {
    vars[varName] = value;
    result = `"${table}"."${field}" ${op[0] === 'g' ? '>' : '<'}${op[3] === 'e' ? '=' : ''} :${varName}`;
  } else if (op === 'in') {
    vars[varName] = value;
    result = `"${table}"."${field}" IN (:${isArray(value) ? '...' + varName : varName})`;
  } else if (op === 'exact') {
    vars[varName] = value;
    result = `"${table}"."${field}" = :${varName}`;
  } else {
    vars[varName] = formatValue(op, value);
    result = `"${table}"."${field}" ${op[0] == 'i' ? 'I' : ''}LIKE :${varName}`;
  }
  if (not === 'not') result = `NOT (${result})`;
  return result;
}

function formatValue(op: string, value: unknown) {
  if (op === 'iexact') {
    return value;
  } else if (op === 'startswith' || op === 'istartswith') {
    return value + '%';
  } else if (op === 'contains' || op === 'icontains') {
    return '%' + value + '%';
  } else if (op === 'endswith' || op === 'iendswith') {
    return '%' + value;
  } else {
    throw new Error(`Operator "${op}" is not allowed`);
  }
}

export function setRestrictionFilter(
  table: string,
  whereArgs: [string, ObjectLiteral],
  restrictionFilter: ObjectLiteral,
): [string, ObjectLiteral] {
  const args = typeormWhereBuilder(table, restrictionFilter, 'mandatory');
  const where = `(${whereArgs[0]}) AND (${args[0]})`;
  const vars = merge(whereArgs[1], args[1]);
  return [where, vars];
}
