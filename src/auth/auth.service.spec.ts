import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@/config';
import { DELIMITER } from '@/utils/constants';
import { addYears } from 'date-fns';

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('mocked-hash'),
  verify: jest.fn().mockResolvedValue(true),
}));

// Mock the current date for consistent testing
const NOW = new Date('2024-12-08T09:59:48+02:00');

jest.mock('date-fns', () => ({
  ...jest.requireActual('date-fns'),
  addYears: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let prismaService: jest.Mocked<PrismaService>;
  let configService: jest.Mocked<ConfigService>;

  const mockPrismaService = {
    client: {
      apiKey: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      organization: {
        count: jest.fn(),
      },
      project: {
        count: jest.fn(),
        findFirstOrThrow: jest.fn(),
      },
    },
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string) => {
      if (key === 'auth') {
        return {
          secret: 'test-secret',
          hashLength: 32,
          timeCost: 2,
        };
      }
      if (key === 'apiKey') {
        return {
          expiresInYears: 1,
        };
      }
      return undefined;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prismaService = module.get(PrismaService);
    configService = module.get(ConfigService);

    // Mock date
    jest.spyOn(global, 'Date').mockImplementation(() => NOW);
    (addYears as jest.Mock).mockImplementation(
      (date, years) =>
        new Date(date.getTime() + years * 365 * 24 * 60 * 60 * 1000)
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listApiKeys', () => {
    it('should return active API keys', async () => {
      const mockApiKeys = [
        { id: 1, publicKey: 'key1' },
        { id: 2, publicKey: 'key2' },
      ];
      mockPrismaService.client.apiKey.findMany.mockResolvedValue(mockApiKeys);

      const result = await service.listApiKeys();

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: mockApiKeys,
      });
      expect(mockPrismaService.client.apiKey.findMany).toHaveBeenCalledWith({
        where: { expiresAt: { gt: NOW } },
      });
    });
  });

  describe('createApiKey', () => {
    const mockConfig = {
      apiKey: {
        expiresInYears: 1,
      },
    };

    beforeEach(() => {
      mockConfigService.get.mockReturnValue(mockConfig.apiKey);
    });

    it('should create a new API key with default expiration', async () => {
      const projectId = 'project-1';
      const mockCreatedKey = {
        id: 1,
        publicKey: 'pub-key',
        hashedSecretKey: 'hashed-secret',
      };
      mockPrismaService.client.apiKey.create.mockResolvedValue(mockCreatedKey);

      const result = await service.createApiKey({ projectId });

      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.data).toBe(mockCreatedKey);
      expect(result.apiKey).toContain(DELIMITER);
      expect(mockPrismaService.client.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            project: { connect: { id: projectId } },
          }),
        })
      );
    });

    it('should create a new API key with custom expiration', async () => {
      const projectId = 'project-1';
      const customExpiresAt = '2025-12-08T00:00:00Z';
      const mockCreatedKey = {
        id: 1,
        publicKey: 'pub-key',
        hashedSecretKey: 'hashed-secret',
      };
      mockPrismaService.client.apiKey.create.mockResolvedValue(mockCreatedKey);

      const result = await service.createApiKey({
        projectId,
        expiresAt: customExpiresAt,
      });

      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(mockPrismaService.client.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: customExpiresAt,
          }),
        })
      );
    });
  });

  describe('generateGenesisApiKey', () => {
    it('should generate genesis API key for first project', async () => {
      mockPrismaService.client.organization.count.mockResolvedValue(1);
      mockPrismaService.client.project.count.mockResolvedValue(1);
      mockPrismaService.client.apiKey.count.mockResolvedValue(0);
      mockPrismaService.client.project.findFirstOrThrow.mockResolvedValue({
        id: 'first-project',
      });

      const mockCreatedKey = {
        id: 1,
        publicKey: 'genesis-key',
      };
      mockPrismaService.client.apiKey.create.mockResolvedValue(mockCreatedKey);

      const result = await service.generateGenesisApiKey();

      expect(result.statusCode).toBe(HttpStatus.OK);
      expect(result.data).toBe(mockCreatedKey);
    });

    it('should throw error if multiple organizations exist', async () => {
      mockPrismaService.client.organization.count.mockResolvedValue(2);

      await expect(service.generateGenesisApiKey()).rejects.toThrow(
        'Can only generate Genesis API key for the first organization'
      );
    });

    it('should throw error if multiple projects exist', async () => {
      mockPrismaService.client.organization.count.mockResolvedValue(1);
      mockPrismaService.client.project.count.mockResolvedValue(2);

      await expect(service.generateGenesisApiKey()).rejects.toThrow(
        'Can only generate Genesis API key for the first project'
      );
    });

    it('should throw error if API key already exists', async () => {
      mockPrismaService.client.organization.count.mockResolvedValue(1);
      mockPrismaService.client.project.count.mockResolvedValue(1);
      mockPrismaService.client.apiKey.count.mockResolvedValue(1);

      await expect(service.generateGenesisApiKey()).rejects.toThrow(
        'Genesis API key already exists'
      );
    });
  });

  describe('validateApiKey', () => {
    it('should validate and update last used timestamp for valid API key', async () => {
      const mockApiKey = {
        id: 1,
        hashedSecretKey: 'hashed-secret',
      };
      const mockUpdatedKey = {
        ...mockApiKey,
        lastUsedAt: NOW,
      };

      mockPrismaService.client.apiKey.findUnique.mockResolvedValue(mockApiKey);
      mockPrismaService.client.apiKey.update.mockResolvedValue(mockUpdatedKey);

      // Mock the private verify method
      jest.spyOn(service as any, 'verify').mockResolvedValue(true);

      const result = await service.validateApiKey(
        'public-key' + DELIMITER + 'secret-key'
      );

      expect(result).toEqual(mockUpdatedKey);
      expect(mockPrismaService.client.apiKey.update).toHaveBeenCalledWith({
        where: { id: mockApiKey.id },
        data: { lastUsedAt: NOW },
      });
    });

    it('should return null for invalid API key', async () => {
      mockPrismaService.client.apiKey.findUnique.mockResolvedValue(null);

      const result = await service.validateApiKey('invalid-key');

      expect(result).toBeNull();
    });

    it('should return null for expired API key', async () => {
      mockPrismaService.client.apiKey.findUnique.mockResolvedValue(null);

      const result = await service.validateApiKey('expired-key');

      expect(result).toBeNull();
      expect(mockPrismaService.client.apiKey.findUnique).toHaveBeenCalledWith({
        omit: { hashedSecretKey: false },
        where: expect.objectContaining({
          expiresAt: { gt: NOW },
        }),
      });
    });
  });
});
