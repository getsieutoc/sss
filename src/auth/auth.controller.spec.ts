import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, HttpException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreateApiKeyDto } from './dto/api-key.dto';

jest.mock('@/utils/error-handler', () => ({
  handleError: (err: Error, msg: string) => {
    if (err instanceof HttpException) {
      return {
        statusCode: err.getStatus(),
        message: err.message,
      };
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: msg,
      error: err.message,
    };
  },
}));

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    generateGenesisApiKey: jest.fn(),
    createApiKey: jest.fn(),
    listApiKeys: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  describe('createFirstApiKey', () => {
    const mockGenesisResponse = {
      statusCode: HttpStatus.OK,
      data: {
        id: 'genesis-key-id',
        publicKey: 'genesis-public-key',
      },
      apiKey: 'genesis-public-key.genesis-secret-key',
    };

    it('should create genesis API key successfully', async () => {
      mockAuthService.generateGenesisApiKey.mockResolvedValue(
        mockGenesisResponse
      );

      const result = await controller.createFirstApiKey();

      expect(result).toBe(mockGenesisResponse);
      expect(mockAuthService.generateGenesisApiKey).toHaveBeenCalled();
    });

    it('should handle error when creating genesis API key fails', async () => {
      const error = new Error('Database error');
      mockAuthService.generateGenesisApiKey.mockRejectedValue(error);

      const result = await controller.createFirstApiKey();

      expect(result).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Issues at creating genesis API key',
        error: error.message,
      });
    });

    it('should handle HttpException when creating genesis API key fails', async () => {
      const error = new HttpException('Custom error', HttpStatus.BAD_REQUEST);
      mockAuthService.generateGenesisApiKey.mockRejectedValue(error);

      const result = await controller.createFirstApiKey();

      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Custom error',
      });
    });
  });

  describe('createApiKey', () => {
    const mockCreateKeyResponse = {
      statusCode: HttpStatus.OK,
      data: {
        id: 'new-key-id',
        publicKey: 'new-public-key',
      },
      apiKey: 'new-public-key.new-secret-key',
    };

    const createKeyDto: CreateApiKeyDto = {
      projectId: 'test-project',
      expiresAt: '2024-12-08T10:01:37+02:00',
    };

    it('should create new API key successfully', async () => {
      mockAuthService.createApiKey.mockResolvedValue(mockCreateKeyResponse);

      const result = await controller.createApiKey(createKeyDto);

      expect(result).toBe(mockCreateKeyResponse);
      expect(mockAuthService.createApiKey).toHaveBeenCalledWith(createKeyDto);
    });

    it('should handle error when creating API key fails', async () => {
      const error = new Error('Invalid project ID');
      mockAuthService.createApiKey.mockRejectedValue(error);

      const result = await controller.createApiKey(createKeyDto);

      expect(result).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Issues at creating API key',
        error: error.message,
      });
    });

    it('should handle HttpException when creating API key fails', async () => {
      const error = new HttpException('Custom error', HttpStatus.BAD_REQUEST);
      mockAuthService.createApiKey.mockRejectedValue(error);

      const result = await controller.createApiKey(createKeyDto);

      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Custom error',
      });
    });
  });

  describe('listApiKeys', () => {
    const mockListKeysResponse = {
      statusCode: HttpStatus.OK,
      data: [
        {
          id: 'key-1',
          publicKey: 'public-key-1',
        },
        {
          id: 'key-2',
          publicKey: 'public-key-2',
        },
      ],
    };

    it('should list API keys successfully', async () => {
      mockAuthService.listApiKeys.mockResolvedValue(mockListKeysResponse);

      const result = await controller.listApiKeys();

      expect(result).toBe(mockListKeysResponse);
      expect(mockAuthService.listApiKeys).toHaveBeenCalled();
    });

    it('should handle error when listing API keys fails', async () => {
      const error = new Error('Database connection error');
      mockAuthService.listApiKeys.mockRejectedValue(error);

      const result = await controller.listApiKeys();

      expect(result).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Issues at listing API keys',
        error: error.message,
      });
    });

    it('should handle HttpException when listing API keys fails', async () => {
      const error = new HttpException('Custom error', HttpStatus.BAD_REQUEST);
      mockAuthService.listApiKeys.mockRejectedValue(error);

      const result = await controller.listApiKeys();

      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Custom error',
      });
    });
  });
});
