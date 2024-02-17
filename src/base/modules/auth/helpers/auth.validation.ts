import { ObjectLiteral } from 'typeorm';
import { isArray } from 'class-validator';
import { ForbiddenException } from '@nestjs/common';
import { AuthAccessOperationGeneric } from '../auth.interfaces';

export function addRestrictions(query: any, authData?: AuthAccessOperationGeneric<ObjectLiteral, string>) {
  return Object.assign(query, authData?.filterRows);
}

// Due to the order of execution (the pipe is executed last), it will not be possible to do it as a guard or interceptor (cause we need already transformed value by global ValidationPipe)
// Can be done as a pipe, but you need a request (@Req) with auth data, that needs to be injected, which leads to the fact that a pipe will be created on each request
// so for now it's done as a helper
export function authValidation(record: ObjectLiteral, authData?: AuthAccessOperationGeneric<ObjectLiteral, string>) {
  if (!authData) return;
  const result = [];
  Object.entries(authData.filterRows ?? {}).forEach((singleKeyValueFilter) => {
    if (!isKeyValueAllowed(record, singleKeyValueFilter)) result.push(Object.fromEntries([singleKeyValueFilter]));
  });
  (authData.excludeCols || []).forEach((field) => {
    if (field in record) result.push(`column "${field}" is not allowed`);
  });
  if (result.length) throw new ForbiddenException(`Authorization restrictions not passed: ${JSON.stringify(result)}`);

  return;
}

function isKeyValueAllowed(record: ObjectLiteral, [field__op__not, value]) {
  let result = true;
  const [field, op, not] = field__op__not.split('__');
  if (!(field in record)) return result;
  const valuesToCheck = isArray(record[field]) ? record[field] : [record[field]];
  for (let i = 0; i < valuesToCheck.length; i++) {
    result = checkValue(valuesToCheck[i], op, value);
    if (not === 'not') result = !result;
    if (!result) break;
  }
  return result;
}

function checkValue(valueToCheck: any, op: string, filterValue: any) {
  if (op === 'range') {
    const [gteVal, ltVal] = filterValue;
    return valueToCheck >= gteVal && valueToCheck < ltVal;
  } else if (op === 'gt') {
    return valueToCheck > filterValue;
  } else if (op === 'gte') {
    return valueToCheck >= filterValue;
  } else if (op === 'lt') {
    return valueToCheck < filterValue;
  } else if (op === 'lte') {
    return valueToCheck <= filterValue;
  } else if (op === 'in') {
    const values = isArray(filterValue) ? filterValue : [filterValue];
    return values.includes(valueToCheck);
  } else if (op === 'exact') {
    return valueToCheck === filterValue;
  } else if (op === 'iexact') {
    return `${valueToCheck}`.toLowerCase() === `${filterValue}`.toLowerCase();
  } else if (op === 'startswith') {
    return `${valueToCheck}`.startsWith(`${filterValue}`);
  } else if (op === 'istartswith') {
    return `${valueToCheck}`.toLowerCase().startsWith(`${filterValue}`.toLowerCase());
  } else if (op === 'contains') {
    return `${valueToCheck}`.includes(`${filterValue}`);
  } else if (op === 'icontains') {
    return `${valueToCheck}`.toLowerCase().includes(`${filterValue}`.toLowerCase());
  } else if (op === 'endswith') {
    return `${valueToCheck}`.endsWith(`${filterValue}`);
  } else if (op === 'iendswith') {
    return `${valueToCheck}`.toLowerCase().endsWith(`${filterValue}`.toLowerCase());
  } else {
    throw new Error(`Operator "${op}" is not allowed`);
  }
}
