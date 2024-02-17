import { HttpStatus, INestApplication } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { Role } from '../src/base/modules/role/role.entity';
import { RoleCreateDto, RoleUpdateDto } from '../src/base/modules/role/role.dtos';
import { Repository } from 'typeorm';
import * as request from 'supertest';
import { plainToInstance } from 'class-transformer';
import { AuthModule } from '../src/base/modules/auth/auth.module';
import { AuthService } from '../src/base/modules/auth/auth.service';
import { initApp } from './helpers';
import { User } from '../src/base/modules/user/user.entity';

describe('RoleController (e2e)', () => {
  let userRepository: Repository<User>;
  let roleRepository: Repository<Role>;
  let app: INestApplication;
  let moduleFixture: TestingModule;
  let accessToken: string;
  const roleAdmin = -1;
  const name = 'NAME';
  const newName = 'NEW_NAME';
  const WRONG_TOKEN = 'WRONG_TOKEN';

  const createRole = async (dto: RoleCreateDto = { name }): Promise<Role> => {
    const savedRole = roleRepository.create(dto);
    return await roleRepository.save(savedRole);
  };

  beforeAll(async () => {
    [app, moduleFixture] = await initApp();
    userRepository = moduleFixture.get('UserRepository');
    roleRepository = moduleFixture.get('RoleRepository');
    await userRepository.query(`DELETE FROM users WHERE role < 0`);
    await roleRepository.query(`DELETE FROM roles WHERE id < 0`);
    await roleRepository.query(`DELETE FROM roles WHERE name IN ('${name}','${newName}')`);
    await roleRepository.query(`INSERT INTO roles (id, name, auth) VALUES (${roleAdmin}, 'testAdminRole', '{}')`);

    const authService = app.select(AuthModule).get(AuthService);
    const savedUser = userRepository.create({
      email: 'admin.test@test.test',
      password: '123',
      role: roleAdmin,
      isSuperUser: true,
    });
    await userRepository.save(savedUser);

    accessToken = (await authService.login(savedUser.email, '123')).access_token;
  });

  afterAll(async () => {
    await roleRepository.query(`DELETE FROM roles WHERE name IN ('${name}','${newName}')`);
    await roleRepository.query(`DELETE FROM roles WHERE id < 0`);
    await userRepository.query(`DELETE FROM users WHERE role < 0`);
    await app.close();
  });

  afterEach(async () => {
    await roleRepository.query(`DELETE FROM roles WHERE name IN ('${name}','${newName}')`);
  });

  // ------------------------------ tests ------------------------------

  it('[POST] /role/{roleId}: Response is OK if conditions are right', async () => {
    const dto = plainToInstance(RoleCreateDto, { name });
    const result = await request(app.getHttpServer())
      .post('/role')
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(dto)
      .expect(HttpStatus.CREATED);

    const response = result.body.data as Role;
    expect(response.name).toBe(name);
    expect(typeof response.id).toBe('number');
  });

  it('[POST] /role: Response is BAD_REQUEST if email is missing', async () => {
    const dto = plainToInstance(RoleCreateDto, {});
    const result = await request(app.getHttpServer())
      .post('/role')
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(dto);
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('[GET] /role/{roleId} : Response is OK if roleId exists.', async () => {
    const savedRole = await createRole();
    const roleId = savedRole.id;
    const result = await request(app.getHttpServer())
      .get(`/role/${roleId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(result.status).toBe(HttpStatus.OK);

    const response = result.body.data as Role;
    expect(response.id).toBe(roleId);
    expect(response.name).toBe(name);
  });

  it('[GET] /role/{roleId} : Response is NOT_FOUND if roleId does not exist', async () => {
    const result = await request(app.getHttpServer())
      .get('/role/-11')
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(result.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('[GET] /role/{roleId} : Response is BAD_REQUEST if authorization header is missing', async () => {
    const result = await request(app.getHttpServer()).get('/role/-1');
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('[GET] /role/{roleId} : Response is UNAUTHOZIRED if token is malformed', async () => {
    const savedRole = await createRole();
    const roleId = savedRole.id;
    const result = await request(app.getHttpServer())
      .get(`/role/${roleId}`)
      .set('Cookie', [`access_token=Bearer ${WRONG_TOKEN}`]);
    expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('[PUT] /role/{roleId} : Response is OK if all conditions are right', async () => {
    const savedRole = await createRole();
    const roleId = savedRole.id;

    const updateDto = plainToInstance(RoleUpdateDto, { name: newName });

    const result = await request(app.getHttpServer())
      .put(`/role/${roleId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(updateDto);

    expect(result.status).toBe(HttpStatus.OK);
    const updatedRole = await roleRepository.findOneBy({ id: roleId });
    expect(updatedRole.name).toBe(newName);
  });

  it('[PUT] /role/{roleId} : Response is UNAUTHOZIRED if token is malformed.', async () => {
    const result = await request(app.getHttpServer())
      .put(`/role/-11`)
      .set('Cookie', [`access_token=Bearer ${WRONG_TOKEN}`]);
    expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('[PUT] /role/{roleId} : Response is BAD_REQUEST if authorization header is missing', async () => {
    const savedRole = await createRole();
    const roleId = savedRole.id;
    const updateDto = plainToInstance(RoleUpdateDto, { name: newName });
    const result = await request(app.getHttpServer()).put(`/role/${roleId}`).send(updateDto);
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('[PUT] /role{roleId} : Response is NOT_FOUND if roleId is invalid', async () => {
    const updateDto = plainToInstance(RoleUpdateDto, { name: newName });
    const result = await request(app.getHttpServer())
      .put(`/role/-11`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`])
      .send(updateDto);
    expect(result.status).toBe(HttpStatus.NOT_FOUND);
  });

  it('[DELETE] /role/{roleId} : Response is OK if all conditions are right', async () => {
    const savedRole = await createRole();
    const roleId = savedRole.id;
    const result = await request(app.getHttpServer())
      .delete(`/role/${roleId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(result.status).toBe(HttpStatus.OK);

    const roleDeleteCheck = await request(app.getHttpServer())
      .get(`/role/${roleId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(roleDeleteCheck.status).toBe(HttpStatus.NOT_FOUND);

    const roleRestore = await request(app.getHttpServer())
      .patch(`/role/${roleId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(roleRestore.status).toBe(HttpStatus.OK);

    const roleRestoreCheck = await request(app.getHttpServer())
      .get(`/role/${roleId}`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(roleRestoreCheck.status).toBe(HttpStatus.OK);
  });

  it('[DELETE MANY] /role : Response is OK if all conditions are right', async () => {
    const savedRole = await createRole();
    const savedRole2 = await createRole({ name: newName });
    const roleIds = [savedRole.id, savedRole2.id];
    const result = await request(app.getHttpServer())
      .delete(`/role`)
      .send({ id__in: roleIds })
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(result.status).toBe(HttpStatus.OK);

    let roleDeleteCheck = await roleRepository.findBy({ id: savedRole.id });
    expect(roleDeleteCheck.length).toBe(0);
    roleDeleteCheck = await roleRepository.findBy({ id: savedRole2.id });
    expect(roleDeleteCheck.length).toBe(0);

    const roleRestore = await request(app.getHttpServer())
      .patch(`/role`)
      .send({ id__in: roleIds })
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(roleRestore.status).toBe(HttpStatus.OK);

    roleDeleteCheck = await roleRepository.findBy({ id: savedRole.id });
    expect(roleDeleteCheck.length).toBe(1);
    roleDeleteCheck = await roleRepository.findBy({ id: savedRole2.id });
    expect(roleDeleteCheck.length).toBe(1);
  });

  it('[DELETE] /role/{roleId} : Response is BAD_REQUEST if authorization header is missing', async () => {
    const savedRole = await createRole();
    const roleId = savedRole.id;
    const result = await request(app.getHttpServer()).delete(`/role/${roleId}`);
    expect(result.status).toBe(HttpStatus.BAD_REQUEST);
  });

  it('[DELETE] /role/{roleId} : Response is UNAUTHORIZED if token is malformed', async () => {
    const savedRole = await createRole();
    const roleId = savedRole.id;
    const result = await request(app.getHttpServer())
      .delete(`/role/${roleId}`)
      .set('Cookie', [`access_token=Bearer ${WRONG_TOKEN}`]);
    expect(result.status).toBe(HttpStatus.UNAUTHORIZED);
  });

  it('[DELETE] /role/{roleId} : Response is NOT_FOUND if roleId is invalid', async () => {
    const result = await request(app.getHttpServer())
      .delete(`/role/-11`)
      .set('Cookie', [`access_token=Bearer ${accessToken}`]);
    expect(result.body.data).toBe(0);
  });
});
