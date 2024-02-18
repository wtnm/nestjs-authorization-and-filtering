# Nest with custom authorization and declarative filtering

[Nest](https://github.com/nestjs/nest) framework TypeScript Typeorm starter repository with implemented django-like declarative (field__operator) filtering and flexible customizable authorization (with row filtering and columns exclusion)

## Declarative (django-like) filtering
GET methods should receive object whose prop names are written in the format `${field}__${operation}`, where `field` is a field in the Entity, and `operation` is a filtering method.

Example:

```js
{id_in: [1,2]} // transforms into SQL 'WHERE id IN (1,2)'
```
### Supported operators

##### in
`field__in: value` transforms into `field IN (...value)`

##### range
`field__range: value` transforms into `value[0] <= field AND field < value[0]`

##### gt
`field__gt: value` transforms into `field > value`

##### gte
`field__gte: value` transforms into `field >= value`

##### lt
`field__lt: value` transforms into `field < value`

##### lte
`field__lte: value` transforms into `field <= value`

##### exact
`field__exact: value` transforms into `field = value`

##### iexact
`field__iexact: value` transforms into `field ILIKE value`

##### startswith
`field__startswith: value` transforms into `field LIKE value%`

##### istartswith
`field__istartswith: value` transforms into `field IIKE value%`

##### contains
`field__contains: value` transforms into `field LIKE %value%`

##### icontains
`field__icontains: value` transforms into `field IIKE %value%`

##### endswith
`field__endswith: value` transforms into `field LIKE %value`

##### iendswith
`field__iendswith: value` transforms into `field IIKE %value`

## Customizable authorization
Entities Role and User have field `auth`, which contains authorization information.

The initial value is taken from Role.auth (by foreign key User.role = Role.id) and then merged with User.auth.

I.e. general authorization rights are assigned in the Role, and then can be further expanded (or removed) for each individual User.

Field `auth` has following format:

```ts
type AuthAccessEntities = {
  [entity: string]: Record<
    'create' | 'read' | 'update' | 'delete',
    boolean | { filterRows: { [field__op: string]: any }; excludeCols: string[] }
  >;
};
```

The `filterRows` field specifies a declarative filter that will restrict access to rows.

The `excludeCols` field specifies fields to which access will be denied.

Example:

```ts
const roleAuth: AuthAccessEntities = {
  user: {
    read: { filterRows: { role__in: [1] }, excludeCols: ['auth'] },
    create: { filterRows: { role__in: [1] }, excludeCols: ['auth'] },
    update: { filterRows: { role__in: [1] }, excludeCols: ['auth'] },
    delete: { filterRows: { role__in: [1] }, excludeCols: ['auth'] },
  },
};

```
#### Value USER_SELF_MAGIC_VALUE
The `USER_SELF_MAGIC_VALUE` value is converted to its own User.id, to limit access only to the user's own records (where necessary).

Example:

```ts
import { USER_SELF_MAGIC_VALUE } from 'src/base/modules/auth/auth.constants';

const filterRows = {user_id__in: [USER_SELF_MAGIC_VALUE]}
```

#### AuthBaseController and AuthBaseService<T>
Classes that implement basic authorization management and basic CRUD. Can be inherited.

#### AuthEntity and AuthOperation decorators
`AuthEntity` decorate class to define what entity name should be used for access. 

`AuthOperation` decorate method to define what operation name should be used for access.
```ts
@Controller('user')
@AuthEntity('user')
export class UserController extends AuthBaseController{
  @Post()
  @AuthOperation('create')
  createOne() {}
}
```


## Installation
Clone (or download), copy .env_example to .env and .env.test, run:

```bash
$ npm install
```

## Running the app

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Migrations

```bash
# generate migration with any_name
$ npm run migration:generate --name=any_name

# run
$ npm run migration:run

# revert
$ npm run migration:revert
```

## Test

```bash
# unit tests
$ npm test

# e2e tests
$ npm run test:e2e
```
