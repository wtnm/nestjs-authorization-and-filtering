import { Reflector } from '@nestjs/core';

export const PUBLIC_ROUTE = Symbol('PUBLIC_ROUTE');
export const AuthOperation = Reflector.createDecorator<string | typeof PUBLIC_ROUTE>();
export const AuthEntity = Reflector.createDecorator<string | typeof PUBLIC_ROUTE>();
