import { Test, TestingModule } from '@nestjs/testing';
import { FunctionService } from './functions.service';
import { PrismaService } from '@/prisma/prisma.service';
import { HttpStatus } from '@nestjs/common';
import { getQuickJS } from 'quickjs-emscripten';

// Mock QuickJS
jest.mock('quickjs-emscripten', () => ({
  getQuickJS: jest.fn(),
}));

describe('FunctionService', () => {
  let service: FunctionService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    client: {
      function: {
        create: jest.fn(),
        findFirstOrThrow: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FunctionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FunctionService>(FunctionService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerFunction', () => {
    const createFunctionDto = {
      projectId: 'test-project',
      name: 'testFunction',
      code: 'function test() { return "hello"; }',
      language: 'javascript' as const,
    };

    it('should create a function with default metadata when none provided', async () => {
      const expectedResponse = {
        id: '1',
        ...createFunctionDto,
        metadata: {
          tags: [],
          dependencies: [],
          permissions: {
            public: false,
            allowedUsers: [],
            executionRoles: [],
          },
        },
      };

      mockPrismaService.client.function.create.mockResolvedValue(expectedResponse);

      const result = await service.registerFunction(createFunctionDto);

      expect(result).toEqual({
        status: HttpStatus.OK,
        data: expectedResponse,
      });
      expect(mockPrismaService.client.function.create).toHaveBeenCalledWith({
        data: {
          ...createFunctionDto,
          metadata: expectedResponse.metadata,
        },
      });
    });

    it('should create a function with provided metadata', async () => {
      const customMetadata = {
        tags: ['test'],
        dependencies: ['lodash'],
        permissions: {
          public: true,
          allowedUsers: ['user1'],
          executionRoles: ['admin'],
        },
      };

      const dtoWithMetadata = {
        ...createFunctionDto,
        metadata: customMetadata,
      };

      const expectedResponse = {
        id: '1',
        ...dtoWithMetadata,
      };

      mockPrismaService.client.function.create.mockResolvedValue(expectedResponse);

      const result = await service.registerFunction(dtoWithMetadata);

      expect(result).toEqual({
        status: HttpStatus.OK,
        data: expectedResponse,
      });
      expect(mockPrismaService.client.function.create).toHaveBeenCalledWith({
        data: dtoWithMetadata,
      });
    });
  });

  describe('executeFunction', () => {
    const mockFunction = {
      id: '1',
      name: 'testFunction',
      code: 'function testFunction() { return "hello"; }',
      language: 'javascript',
    };

    const mockQuickJSContext = {
      newContext: jest.fn().mockReturnValue({
        evalCode: jest.fn(),
        getProp: jest.fn(),
        callFunction: jest.fn(),
        dump: jest.fn(),
        dispose: jest.fn(),
        global: {},
      }),
    };

    beforeEach(() => {
      (getQuickJS as jest.Mock).mockResolvedValue(mockQuickJSContext);
    });

    it('should execute a JavaScript function successfully', async () => {
      mockPrismaService.client.function.findFirstOrThrow.mockResolvedValue(mockFunction);

      const input = { args: [] };
      const result = await service.executeFunction('testFunction', input);

      expect(mockPrismaService.client.function.findFirstOrThrow).toHaveBeenCalledWith({
        where: {
          OR: [{ id: 'testFunction' }, { name: 'testFunction' }],
        },
      });
    });

    it('should handle function not found error', async () => {
      mockPrismaService.client.function.findFirstOrThrow.mockRejectedValue({
        code: 'P2025',
      });

      const result = await service.executeFunction('nonexistent', { args: [] });

      expect(result).toEqual({
        statusCode: HttpStatus.NOT_FOUND,
        message: 'Function not found: nonexistent',
      });
    });

    it('should handle unsupported language', async () => {
      mockPrismaService.client.function.findFirstOrThrow.mockResolvedValue({
        ...mockFunction,
        language: 'python',
      });

      const result = await service.executeFunction('testFunction', { args: [] });

      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Unsupported language',
      });
    });
  });

  describe('listFunctions', () => {
    it('should return all functions for a project', async () => {
      const mockFunctions = [
        { id: '1', name: 'function1' },
        { id: '2', name: 'function2' },
      ];

      mockPrismaService.client.function.findMany.mockResolvedValue(mockFunctions);

      const result = await service.listFunctions('test-project');

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: mockFunctions,
      });
      expect(mockPrismaService.client.function.findMany).toHaveBeenCalledWith({
        where: { projectId: 'test-project' },
        include: expect.any(Object),
      });
    });
  });

  describe('getFunction', () => {
    it('should return a specific function', async () => {
      const mockFunction = { id: '1', name: 'testFunction' };

      mockPrismaService.client.function.findUnique.mockResolvedValue(mockFunction);

      const result = await service.getFunction('1');

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: mockFunction,
      });
      expect(mockPrismaService.client.function.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: expect.any(Object),
      });
    });

    it('should return null when function not found', async () => {
      mockPrismaService.client.function.findUnique.mockResolvedValue(null);

      const result = await service.getFunction('nonexistent');

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: null,
      });
    });
  });

  describe('deleteFunction', () => {
    it('should delete a function', async () => {
      const mockFunction = { id: '1', name: 'testFunction' };

      mockPrismaService.client.function.delete.mockResolvedValue(mockFunction);

      const result = await service.deleteFunction('1');

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: mockFunction,
      });
      expect(mockPrismaService.client.function.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });
  });
});
