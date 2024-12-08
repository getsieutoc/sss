import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('API E2E Test', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let genesisApiKey: string;
  let secondApiKey: string;
  let projectId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    prisma = app.get(PrismaService);

    // Clean up database before tests
    await prisma.client.apiKey.deleteMany();
    await prisma.client.project.deleteMany();
    await prisma.client.organization.deleteMany();

    await app.init();
  });

  afterAll(async () => {
    await prisma.client.apiKey.deleteMany();
    await prisma.client.project.deleteMany();
    await prisma.client.organization.deleteMany();
    await app.close();
  });

  describe('Authentication Flow', () => {
    it('should get genesis API key with blank setup', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/setup')
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('apiKey');
      genesisApiKey = response.body.data.apiKey;
      expect(typeof genesisApiKey).toBe('string');
      expect(genesisApiKey.length).toBeGreaterThan(0);

      // Get the project ID from the genesis setup
      const project = await prisma.client.project.findFirst({
        where: { id: 'genesis-project' },
      });
      projectId = project!.id;
    });

    it('should generate a new API key using genesis key', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/api-key')
        .set('x-api-key', genesisApiKey)
        .send({ projectId, description: 'Test API Key' })
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('apiKey');
      secondApiKey = response.body.data.apiKey;
      expect(typeof secondApiKey).toBe('string');
      expect(secondApiKey.length).toBeGreaterThan(0);
    });

    it('should list all API keys', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/api-key')
        .set('x-api-key', secondApiKey)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThanOrEqual(2); // At least genesis and second key
    });
  });

  describe('Functions Flow', () => {
    it('should register a new function', async () => {
      const testFunction = {
        name: 'add',
        code: 'function add(a, b) { return a + b; }',
        projectId,
      };

      const response = await request(app.getHttpServer())
        .post('/functions')
        .set('x-api-key', secondApiKey)
        .send(testFunction)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('name', testFunction.name);
    });

    it('should execute the registered function with simple args', async () => {
      const args = { a: 5, b: 3 };

      const response = await request(app.getHttpServer())
        .post('/functions/add/execute')
        .set('x-api-key', secondApiKey)
        .send(args)
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('result', 8); // 5 + 3 = 8
    });
  });
});
