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

describe('UserController (e2e)', () => {
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let accessToken: string;
  const roleAdmin = -1;
  const role = -2;
  const name = 'NAME';
  const emailAdmin = 'admin.test@test.test';
  const email = 'test@test.test';
  const email2 = '2.test@test.test';
  const password = 'test_password';
  const WRONG_TOKEN = 'WRONG_TOKEN';

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
    await roleRepository.query(`INSERT INTO roles (id, name, auth) VALUES (${roleAdmin}, 'testAdminRole', '{}')`);
    await roleRepository.query(`INSERT INTO roles (id, name, auth) VALUES (${role}, 'testRole', '{}')`);

    const authService = app.select(AuthModule).get(AuthService);
    await createUser({ email: emailAdmin, name, password, role: roleAdmin, isSuperUser: true });
    accessToken = (await authService.login(emailAdmin, password)).access_token;
  });

  afterAll(async () => {
    await userRepository.query(`DELETE FROM users WHERE email LIKE '%test@test.test'`);
    await roleRepository.query(`DELETE FROM roles WHERE id < 0`);
    await app.close();
  });

  afterEach(async () => {
    await userRepository.query(`DELETE FROM users WHERE email IN ('${email}', '${email2}')`);
  });

  // ------------------------------ tests ------------------------------

  it('[POST] /user/login and /user/logout: Response is OK and cookies set and unset', async () => {
    await createUser();
    const result = await request(app.getHttpServer())
      .post('/user/login')
      .send({ email, password })
      .expect(HttpStatus.OK);
    expect(result.header['set-cookie'][0].startsWith('access_token=Bearer')).toBe(true);

    const resultLogout = await request(app.getHttpServer())
      .post('/user/logout')
      .set('Cookie', result.header['set-cookie'])
      .expect(HttpStatus.OK);
    expect(resultLogout.header['set-cookie'][0].startsWith('access_token=;')).toBe(true);
  });

  it('[POST] /user/{userId}: Response is OK if conditions are right', async () => {
    const dto = plainToInstance(UserCreateDto, { name, password, email, role });
    const result = await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(dto)
      .expect(HttpStatus.CREATED);

    const response = result.body.data as User;
    expect(response.email).toBe(email);
    expect(response.name).toBe(name);
    expect((response as any).password).toBe(undefined);
    expect(typeof response.id).toBe('number');
  });

  it('[POST] /user: Response is BAD_REQUEST if email is missing', async () => {
    const dto = plainToInstance(UserCreateDto, { name, password, role });
    const result = await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(dto);
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('[POST] /user: Response is BAD_REQUEST if name is missing', async () => {
    const dto = plainToInstance(UserCreateDto, { email, password, role });
    const result = await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(dto);
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('[POST] /user: Response is BAD_REQUEST if password is missing', async () => {
    const dto = plainToInstance(UserCreateDto, { email, name, role });
    const result = await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(dto);
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('[POST] /user: Response is BAD_REQUEST if email is not type of email', async () => {
    const dto = plainToInstance(UserCreateDto, { name, password, email: 'NOT_FORM_OF_EMAIL', role });
    const result = await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(dto);
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('[POST] /user: Response is CONFLICT if email already exists.', async () => {
    await createUser();
    const dto = plainToInstance(UserCreateDto, { name, password, email, role });
    const result = await request(app.getHttpServer())
      .post('/user')
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(dto);
    expect(result.status).toBe(HttpStatus.CONFLICT);
  });

  it('[GET] /user/{userId} : Response is OK if userId exists.', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(result.status).toBe(HttpStatus.OK);

    const response = result.body.data as User;
    expect(response.id).toBe(userId);
    expect(response.email).toBe(email);
    expect(response.name).toBe(name);
    expect(response.password).toBeUndefined();
  });

  it('[GET] /user/{userId} : Response is NOT_FOUND if userId does not exist', async () => {
    const result = await request(app.getHttpServer())
      .get('/user/-1')
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(result.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('[GET] /user/{userId} : Response is BAD_REQUEST if authorization header is missing', async () => {
    const result = await request(app.getHttpServer()).get('/user/-1');
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('[GET] /user/{userId} : Response is UNAUTHOZIRED if token is malformed', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${WRONG_TOKEN}`]);
    expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('[PUT] /user/{userId} : Response is OK if all conditions are right', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;

    const updateDto = plainToInstance(UserUpdateDto, { name: 'NEW_NAME', password: 'NEW_PASSWORD' });

    const result = await request(app.getHttpServer())
      .put(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(updateDto);

    expect(result.status).toBe(HttpStatus.OK);
    const updatedUser = await userRepository.findOneBy({ id: userId });
    expect(updatedUser.name).toBe('NEW_NAME');

    expect(updatedUser.password).not.toBe(savedUser.password);
  });

  it('[PUT] /user/{userId} : Response is UNAUTHOZIRED if token is malformed.', async () => {
    const result = await request(app.getHttpServer())
      .put(`/user/-1`)
      .set('Cookie', [`access_token=Bearer ${WRONG_TOKEN}`]);
    expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('[PUT] /user/{userId} : Response is BAD_REQUEST if authorization header is missing', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const updateDto = plainToInstance(UserUpdateDto, { name: 'NEW_NAME', password: 'NEW_PASSWORD' });
    const result = await request(app.getHttpServer()).put(`/user/${userId}`).send(updateDto);
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('[PUT] /user{userId} : Response is NOT_FOUND if userId is invalid', async () => {
    const updateDto = plainToInstance(UserUpdateDto, { name: 'NEW_NAME', password: 'NEW_PASSWORD' });
    const result = await request(app.getHttpServer())
      .put(`/user/-1`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(updateDto);
    expect(result.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('[DELETE] /user/{userId} : Response is OK if all conditions are right', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .delete(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(result.status).toBe(HttpStatus.OK);

    const userDeleteCheck = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(userDeleteCheck.status).toBe(HttpStatus.NOT_FOUND);

    const userRestore = await request(app.getHttpServer())
      .patch(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(userRestore.status).toBe(HttpStatus.OK);

    const userRestoreCheck = await request(app.getHttpServer())
      .get(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(userRestoreCheck.status).toBe(HttpStatus.OK);
  });

  it('[DELETE MANY] /user : Response is OK if all conditions are right', async () => {
    const savedUser = await createUser();
    const savedUser2 = await createUser({ name, password, email: email2, role });
    const userIds = [savedUser.id, savedUser2.id];
    const result = await request(app.getHttpServer())
      .delete(`/user`)
      .send({ id__in: userIds })
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(result.status).toBe(HttpStatus.OK);

    const userDeleteCheck = await request(app.getHttpServer())
      .get(`/user`)
      .query({ id__in: userIds, page: 1, part: 10, orderBy: 'name' })
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(userDeleteCheck.body.count).toBe(0);

    const userRestore = await request(app.getHttpServer())
      .patch(`/user`)
      .send({ id__in: userIds })
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(userRestore.status).toBe(HttpStatus.OK);

    const userRestoreCheck = await request(app.getHttpServer())
      .get(`/user`)
      .query({ id__in: userIds, page: 1, part: 10, orderBy: 'name' })
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(userRestoreCheck.body.count).toBe(2);
  });

  it('[DELETE] /user/{userId} : Response is BAD_REQUEST if authorization header is missing', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer()).delete(`/user/${userId}`);
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('[DELETE] /user/{userId} : Response is UNAUTHORIZED if token is malformed', async () => {
    const savedUser = await createUser();
    const userId = savedUser.id;
    const result = await request(app.getHttpServer())
      .delete(`/user/${userId}`)
      .set('Cookie', [`access_token=Bearer ${WRONG_TOKEN}`]);
    expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('[DELETE] /user/{userId} : Response is NOT_FOUND if userId is invalid', async () => {
    const result = await request(app.getHttpServer())
      .delete(`/user/-1`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(result.body.data).toBe(0);
  });
});
