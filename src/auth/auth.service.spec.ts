import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '@/prisma/prisma.service';
import { ConfigService } from '@/config';
import { DELIMITER } from '@/utils/constants';
import { addYears } from 'date-fns';
import * as argon2 from 'argon2';

// Mock argon2
jest.mock('argon2', () => ({
  hash: jest.fn().mockResolvedValue('mocked-hash'),
  verify: jest.fn().mockResolvedValue(true),
}));

// Mock the current date for consistent testing
const NOW = new Date('2024-12-08T11:08:45+02:00');

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
        delete: jest.fn(),
        count: jest.fn(),
      },
      organization: {
        count: jest.fn(),
        create: jest.fn(),
      },
      project: {
        count: jest.fn(),
        create: jest.fn(),
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

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        data: mockCreatedKey,
        apiKey: expect.stringContaining(DELIMITER),
      });

      const createCall =
        mockPrismaService.client.apiKey.create.mock.calls[0][0];
      expect(createCall.data.project).toEqual({ connect: { id: projectId } });
      expect(createCall.data.publicKey).toBeTruthy();
      expect(createCall.data.hashedSecretKey).toBe('mocked-hash');
      expect(createCall.data.expiresAt).toBeDefined();
      expect(
        new Date(createCall.data.expiresAt).getTime()
      ).toBeGreaterThanOrEqual(NOW.getTime());
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

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        data: mockCreatedKey,
        apiKey: expect.stringContaining(DELIMITER),
      });
      expect(mockPrismaService.client.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            expiresAt: customExpiresAt,
            project: { connect: { id: projectId } },
          }),
        })
      );
    });
  });

  describe('updateApiKey', () => {
    it('should update an API key successfully', async () => {
      const keyId = 'test-key-id';
      const updateDto = { description: 'Updated description' };
      const mockUpdatedKey = {
        id: keyId,
        description: 'Updated description',
      };

      mockPrismaService.client.apiKey.update.mockResolvedValue(mockUpdatedKey);

      const result = await service.updateApiKey(keyId, updateDto);

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: mockUpdatedKey,
      });
      expect(mockPrismaService.client.apiKey.update).toHaveBeenCalledWith({
        where: { id: keyId },
        data: updateDto,
      });
    });
  });

  describe('deleteApiKey', () => {
    it('should delete an API key successfully', async () => {
      const keyId = 'test-key-id';
      const mockDeletedKey = {
        id: keyId,
        publicKey: 'deleted-key',
      };

      mockPrismaService.client.apiKey.delete.mockResolvedValue(mockDeletedKey);

      const result = await service.deleteApiKey(keyId);

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: mockDeletedKey,
      });
      expect(mockPrismaService.client.apiKey.delete).toHaveBeenCalledWith({
        where: { id: keyId },
      });
    });
  });

  describe('generateGenesisApiKey', () => {
    it('should generate genesis API key when no organizations and projects exist', async () => {
      // Mock empty database
      mockPrismaService.client.organization.count.mockResolvedValue(0);
      mockPrismaService.client.project.count.mockResolvedValue(0);

      // Mock organization creation
      const mockOrg = { id: 'org-1', name: 'Genesis Organization' };
      mockPrismaService.client.organization.create.mockResolvedValue(mockOrg);

      // Mock project creation
      const mockProject = {
        id: 'proj-1',
        name: 'Genesis Project',
        organizationId: mockOrg.id,
      };
      mockPrismaService.client.project.create.mockResolvedValue(mockProject);

      // Mock API key creation
      const mockApiKey = {
        id: 1,
        publicKey: 'genesis-key',
        hashedSecretKey: 'hashed-secret',
      };
      mockPrismaService.client.apiKey.create.mockResolvedValue(mockApiKey);

      const result = await service.generateGenesisApiKey();

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        data: mockApiKey,
        apiKey: expect.stringContaining(DELIMITER),
      });

      // Verify organization was created
      expect(mockPrismaService.client.organization.create).toHaveBeenCalledWith(
        {
          data: { name: 'My Organization' },
        }
      );

      // Verify project was created
      expect(mockPrismaService.client.project.create).toHaveBeenCalledWith({
        data: {
          name: 'Default Project',
          organizationId: mockOrg.id,
        },
      });

      // Verify API key was created
      expect(mockPrismaService.client.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: 'Genesis API key created during setup',
            project: { connect: { id: mockProject.id } },
          }),
        })
      );
    });

    it('should not generate genesis API key if organizations exist', async () => {
      mockPrismaService.client.organization.count.mockResolvedValue(1);
      mockPrismaService.client.project.count.mockResolvedValue(0);

      const result = await service.generateGenesisApiKey();

      expect(result).toEqual({ statusCode: HttpStatus.NO_CONTENT });
      expect(
        mockPrismaService.client.organization.create
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.client.project.create).not.toHaveBeenCalled();
      expect(mockPrismaService.client.apiKey.create).not.toHaveBeenCalled();
    });

    it('should not generate genesis API key if projects exist', async () => {
      mockPrismaService.client.organization.count.mockResolvedValue(0);
      mockPrismaService.client.project.count.mockResolvedValue(1);

      const result = await service.generateGenesisApiKey();

      expect(result).toEqual({ statusCode: HttpStatus.NO_CONTENT });
      expect(
        mockPrismaService.client.organization.create
      ).not.toHaveBeenCalled();
      expect(mockPrismaService.client.project.create).not.toHaveBeenCalled();
      expect(mockPrismaService.client.apiKey.create).not.toHaveBeenCalled();
    });
  });

  describe('validateApiKey', () => {
    const mockPublicKey = 'test-public';
    const mockSecretKey = 'test-secret';
    const mockToken = `${mockPublicKey}${DELIMITER}${mockSecretKey}`;

    beforeEach(() => {
      mockPrismaService.client.apiKey.findUnique.mockReset();
      mockPrismaService.client.apiKey.update.mockReset();
    });

    it('should validate and update lastUsedAt for a valid API key', async () => {
      const mockApiKey = {
        id: 'test-id',
        publicKey: mockPublicKey,
        hashedSecretKey: 'hashed-secret',
      };
      const mockUpdatedKey = { ...mockApiKey, lastUsedAt: NOW };

      mockPrismaService.client.apiKey.findUnique.mockResolvedValue(mockApiKey);
      mockPrismaService.client.apiKey.update.mockResolvedValue(mockUpdatedKey);

      const result = await service.validateApiKey(mockToken);

      expect(result).toEqual(mockUpdatedKey);
      expect(mockPrismaService.client.apiKey.findUnique).toHaveBeenCalledWith({
        omit: { hashedSecretKey: false },
        where: {
          publicKey: mockPublicKey,
          expiresAt: { gt: NOW },
        },
      });
      expect(mockPrismaService.client.apiKey.update).toHaveBeenCalledWith({
        where: { id: mockApiKey.id },
        data: { lastUsedAt: NOW },
      });
    });

    it('should return null for invalid token format', async () => {
      mockPrismaService.client.apiKey.findUnique.mockResolvedValue(null);

      const result = await service.validateApiKey('invalid-token');

      expect(result).toBeNull();
      expect(mockPrismaService.client.apiKey.findUnique).toHaveBeenCalledWith({
        omit: { hashedSecretKey: false },
        where: {
          publicKey: 'invalid-token',
          expiresAt: { gt: NOW },
        },
      });
    });

    it('should return null when API key is not found', async () => {
      mockPrismaService.client.apiKey.findUnique.mockResolvedValue(null);

      const result = await service.validateApiKey(mockToken);

      expect(result).toBeNull();
      expect(mockPrismaService.client.apiKey.update).not.toHaveBeenCalled();
    });

    it('should return null when secret key verification fails', async () => {
      const mockApiKey = {
        id: 'test-id',
        publicKey: mockPublicKey,
        hashedSecretKey: 'hashed-secret',
      };

      mockPrismaService.client.apiKey.findUnique.mockResolvedValue(mockApiKey);
      (argon2.verify as jest.Mock).mockResolvedValueOnce(false);

      const result = await service.validateApiKey(mockToken);

      expect(result).toBeNull();
      expect(mockPrismaService.client.apiKey.update).not.toHaveBeenCalled();
    });
  });
});
