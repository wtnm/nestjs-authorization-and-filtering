import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { User } from '../src/base/modules/user/user.entity';
import { UserCreateDto, UserUpdateDto } from '../src/base/modules/user/user.dtos';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { Role } from '../src/base/modules/role/role.entity';
import { plainToInstance } from 'class-transformer';
import { AuthModule } from '../src/base/modules/auth/auth.module';
import { AuthService } from '../src/base/modules/auth/auth.service';
import { initApp } from './helpers';
import { AuthAccessEntities } from '../src/base/modules/auth/auth.dto';

const roleAuth: AuthAccessEntities = {
  user: {
    read: { filterRows: { role__in: [-1] }, excludeCols: ['auth'] },
    create: { filterRows: { role__in: [-1] }, excludeCols: ['auth'] },
    update: { filterRows: { role__in: [-1] }, excludeCols: ['auth'] },
    delete: { filterRows: { role__in: [-1] }, excludeCols: ['auth'] },
  },
};

const userCustomAuth: AuthAccessEntities = {
  user: { read: true, create: true, update: true, delete: true },
  role: { read: true, create: true, update: true, delete: true },
};
describe('Auth restrictions (e2e)', () => {
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let accessTokenAdmin: string;
  let accessTokenUser: string;
  let accessTokenCustomAuth: string;
  let accessTokenGuest: string;
  const roleGuest = -1;
  const role = -2;
  const name = 'NAME';
  const emailAdmin = 'admin.test@test.test';
  const emailUser = 'user.test@test.test';
  const emailCustomAuth = 'custom.auth.test@test.test';
  const emailGuest = 'guest.test@test.test';
  const password = 'test_password';
  const email = 'test@test.test';
  const email2 = '2.test@test.test';

  const createUser = async (dto: UserCreateDto = { name, password, email, role }): Promise<User> => {
    const savedUser = userRepository.create(dto);
    return await userRepository.save(savedUser);
  };

  beforeAll(async () => {
    [app, moduleFixture] = await initApp();
    userRepository = moduleFixture.get('UserRepository');
    roleRepository = moduleFixture.get('RoleRepository');
    await userRepository.query(`DELETE FROM users WHERE email LIKE '%test@test.test'`);
    await roleRepository.query(`DELETE FROM roles WHERE id < 0`);
    await roleRepository.query(`INSERT INTO roles (id, name, auth) VALUES (${roleGuest}, 'testGuestRole', '{}')`);
    await roleRepository.query(
      `INSERT INTO roles (id, name, auth) VALUES (${role}, 'testRole', '${JSON.stringify(roleAuth)}')`,
    );

    await createUser({ email: emailAdmin, name, password, role, isSuperUser: true });
    await createUser({ email: emailUser, name, password, role });
    await createUser({ email: emailCustomAuth, name, password, role, auth: userCustomAuth });
    await createUser({ email: emailGuest, name, password, role: roleGuest });

    const authService = app.select(AuthModule).get(AuthService);
    accessTokenAdmin = (await authService.login(emailAdmin, password)).access_token;
    accessTokenUser = (await authService.login(emailUser, password)).access_token;
    accessTokenCustomAuth = (await authService.login(emailCustomAuth, password)).access_token;
    accessTokenGuest = (await authService.login(emailGuest, password)).access_token;
  });

  afterAll(async () => {
    await userRepository.query(`DELETE FROM users WHERE role < 0`);
    await roleRepository.query(`DELETE FROM roles WHERE id < 0`);
    await app.close();
  });

  afterEach(async () => {
    await userRepository.query(`DELETE FROM users WHERE email IN ('${email}', '${email2}')`);
  });

  it('[POST] /user: Response is OK if user is superuser', async () => {
    const dto = plainToInstance(UserCreateDto, { name, password, email, role });
    const result = await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessTokenAdmin}`])
      .send(dto)
      .expect(HttpStatus.CREATED);

    const response = result.body.data as User;
    expect(typeof response.id).toBe('number');
  });

  it('[POST] /user: Response is FORBIDDEN if user role is "guest"', async () => {
    const dto = plainToInstance(UserCreateDto, { name, password, email, role });
    await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessTokenGuest}`])
      .send(dto)
      .expect(HttpStatus.FORBIDDEN);
  });

  it('[POST] /user: Response is FORBIDDEN if user role is "user" and restrictions (filterRows) not passed', async () => {
    const dto = plainToInstance(UserCreateDto, { name, password, email, role });
    await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessTokenUser}`])
      .send(dto)
      .expect(HttpStatus.FORBIDDEN);
  });

  it('[POST] /user: Response is FORBIDDEN if user role is "user" and restrictions (excludedCols) not passed', async () => {
    const dto = plainToInstance(UserCreateDto, { name, password, email, role: roleGuest, auth: JSON.stringify({}) });
    const result = await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessTokenUser}`])
      .send(dto);
    expect(result.status).toBe(HttpStatus.FORBIDDEN);
  });

  it('[POST] /user: Response is OK if user role is "user" and restrictions passed', async () => {
    const dto = plainToInstance(UserCreateDto, { name, password, email, role: roleGuest });
    await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessTokenUser}`])
      .send(dto)
      .expect(HttpStatus.CREATED);
  });

  it('[POST] /user: Response is OK if user role is "user" with custom auth', async () => {
    const dto = plainToInstance(UserCreateDto, { name, password, email, role });
    await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessTokenCustomAuth}`])
      .send(dto)
      .expect(HttpStatus.CREATED);
  });

  it('[GET] /user/{userId}: Response is OK if user is superuser', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenAdmin}`]);
    expect(result.status).toBe(HttpStatus.OK);

    const response = result.body.data as User;
    expect(response.id).toBe(userId);
    expect(response.password).toBeUndefined();
  });

  it('[GET] /user/{userId}: Response is FORBIDDEN if user role is "guest"', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenGuest}`]);
    expect(result.status).toBe(HttpStatus.FORBIDDEN);
  });

  it('[GET] /user/{userId}: Response is NOT_FOUND if user role is "user" and restrictions not passed', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenUser}`]);
    expect(result.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('[GET] /user/{userId}: Response is OK if user role is "user" and restrictions passed', async () => {
    const savedUser = await createUser({ name, password, email, role: roleGuest });
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenUser}`]);
    expect(result.status).toBe(HttpStatus.OK);
  });

  it('[GET] /user/{userId}: Response is OK if user role is "user" with custom auth', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenCustomAuth}`]);
    expect(result.status).toBe(HttpStatus.OK);
  });

  it('[GET] /user: Response is OK and limited if user role is "user"', async () => {
    await createUser({ name, email, password, role: roleGuest });
    const result = await request(app.getHttpServer())
      .get(`/user`)
      .set('Cookie', [`access_token=Bearer ${accessTokenUser}`]);
    expect(result.status).toBe(HttpStatus.OK);
    expect(result.body?.count).toBe(2);
  });

  it('[PUT] /user/{userId}: Response is OK if user is superuser', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const updateDto = plainToInstance(UserUpdateDto, { name: 'NEW_NAME', password: 'NEW_PASSWORD' });

    const result = await request(app.getHttpServer())
      .put(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenAdmin}`])
      .send(updateDto);
    expect(result.status).toBe(HttpStatus.OK);

    const updatedUser = await userRepository.findOneBy({ id: userId });
    expect(updatedUser.name).toBe('NEW_NAME');
  });

  it('[PUT] /user/{userId}: Response is FORBIDDEN if user role is "guest"', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const updateDto = plainToInstance(UserUpdateDto, { name: 'NEW_NAME', password: 'NEW_PASSWORD' });

    const result = await request(app.getHttpServer())
      .put(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenGuest}`])
      .send(updateDto);
    expect(result.status).toBe(HttpStatus.FORBIDDEN);
  });

  it('[PUT] /user/{userId}: Response is FORBIDDEN if user role is "user" and restrictions (filterRows) not passed', async () => {
    const savedUser = await createUser({ name, password, email, role });
    const userId = savedUser.id;
    const updateDto = plainToInstance(UserUpdateDto, { name: 'NEW_NAME', password: 'NEW_PASSWORD' });

    const result = await request(app.getHttpServer())
      .put(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenUser}`])
      .send(updateDto);
    expect(result.status).toBe(HttpStatus.FORBIDDEN);
  });

  it('[PUT] /user/{userId}: Response is FORBIDDEN if user role is "user" and restrictions (excludedCols) not passed', async () => {
    const savedUser = await createUser({ name, password, email, role: roleGuest });
    const userId = savedUser.id;
    const updateDto = plainToInstance(UserUpdateDto, {
      name: 'NEW_NAME',
      password: 'NEW_PASSWORD',
      auth: JSON.stringify({}),
    });

    const result = await request(app.getHttpServer())
      .put(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenUser}`])
      .send(updateDto);
    expect(result.status).toBe(HttpStatus.FORBIDDEN);
  });

  it('[PUT] /user/{userId}: Response is OK if user role is "user" and restrictions passed', async () => {
    const savedUser = await createUser({ name, password, email, role: roleGuest });
    const userId = savedUser.id;
    const updateDto = plainToInstance(UserUpdateDto, { name: 'NEW_NAME', password: 'NEW_PASSWORD' });

    const result = await request(app.getHttpServer())
      .put(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenUser}`])
      .send(updateDto);
    expect(result.status).toBe(HttpStatus.OK);
  });

  it('[PUT] /user/{userId}: Response is OK if user role is "user" with custom auth', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const updateDto = plainToInstance(UserUpdateDto, { name: 'NEW_NAME', password: 'NEW_PASSWORD' });

    const result = await request(app.getHttpServer())
      .put(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenCustomAuth}`])
      .send(updateDto);
    expect(result.status).toBe(HttpStatus.OK);
  });

  it('[DELETE] /user/{userId} : Response is OK if all conditions are right', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .delete(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenAdmin}`]);
    expect(result.status).toBe(HttpStatus.OK);

    const userDeleteCheck = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenAdmin}`]);
    expect(userDeleteCheck.status).toBe(HttpStatus.NOT_FOUND);

    const userRestore = await request(app.getHttpServer())
      .patch(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenAdmin}`]);
    expect(userRestore.status).toBe(HttpStatus.OK);

    const userRestoreCheck = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenAdmin}`]);
    expect(userRestoreCheck.status).toBe(HttpStatus.OK);
  });

  it('[DELETE] /user/{userId}: Response is FORBIDDEN if user role is "guest"', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenGuest}`]);
    expect(result.status).toBe(HttpStatus.FORBIDDEN);
  });

  it('[DELETE] /user/{userId}: Result is 0 if user role is "user" and restrictions not passed', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .delete(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenUser}`]);
    expect(result.status).toBe(HttpStatus.OK);
    expect(result.body.data).toBe(0);
  });

  it('[DELETE] /user/{userId}: Result is 1 if user role is "user" and restrictions passed', async () => {
    const savedUser = await createUser({ name, password, email, role: roleGuest });
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .delete(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenUser}`]);
    expect(result.status).toBe(HttpStatus.OK);
    expect(result.body.data).toBe(1);
  });

  it('[DELETE] /user/{userId}: Result is 1 if user role is "user" with custom auth', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .delete(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessTokenCustomAuth}`]);
    expect(result.status).toBe(HttpStatus.OK);
    expect(result.body.data).toBe(1);
  });
});
