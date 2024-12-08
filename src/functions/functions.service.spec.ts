import { Test, TestingModule } from '@nestjs/testing';
import { FunctionService } from './functions.service';
import { PrismaService } from '@/prisma/prisma.service';
import { HttpStatus } from '@nestjs/common';
import { quickJS } from '@sebastianwessel/quickjs';
import { type UnknownData } from '@/types';

// Mock QuickJS
jest.mock('@sebastianwessel/quickjs', () => ({
  quickJS: jest.fn(),
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
        update: jest.fn(),
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

      mockPrismaService.client.function.create.mockResolvedValue(
        expectedResponse
      );

      const result = await service.registerFunction(createFunctionDto);

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        data: expectedResponse,
      });
      expect(mockPrismaService.client.function.create).toHaveBeenCalledWith({
        data: {
          code: createFunctionDto.code,
          name: createFunctionDto.name,
          language: createFunctionDto.language,
          metadata: expectedResponse.metadata,
          project: {
            connect: { id: createFunctionDto.projectId },
          },
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

      mockPrismaService.client.function.create.mockResolvedValue(
        expectedResponse
      );

      const result = await service.registerFunction(dtoWithMetadata);

      expect(result).toEqual({
        statusCode: HttpStatus.CREATED,
        data: expectedResponse,
      });
      expect(mockPrismaService.client.function.create).toHaveBeenCalledWith({
        data: {
          code: dtoWithMetadata.code,
          name: dtoWithMetadata.name,
          language: dtoWithMetadata.language,
          metadata: dtoWithMetadata.metadata,
          project: {
            connect: { id: dtoWithMetadata.projectId },
          },
        },
      });
    });
  });

  describe('updateFunction', () => {
    const updateFunctionDto = {
      name: 'updatedFunction',
      code: 'function updated() { return "updated"; }',
      language: 'javascript' as const,
    };

    it('should successfully update a function', async () => {
      const functionId = 'test-id';
      const expectedResponse = {
        id: functionId,
        ...updateFunctionDto,
      };

      mockPrismaService.client.function.update.mockResolvedValue(
        expectedResponse
      );

      const result = await service.updateFunction(
        functionId,
        updateFunctionDto
      );

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: expectedResponse,
      });
      expect(mockPrismaService.client.function.update).toHaveBeenCalledWith({
        where: { id: functionId },
        data: updateFunctionDto,
        include: expect.any(Object),
      });
    });

    it('should handle errors during function update', async () => {
      const functionId = 'test-id';
      const error = new Error('Update failed');
      mockPrismaService.client.function.update.mockRejectedValue(error);

      await expect(
        service.updateFunction(functionId, updateFunctionDto)
      ).rejects.toThrow('Update failed');
    });
  });

  describe('deleteFunction', () => {
    it('should successfully delete a function', async () => {
      const functionId = 'test-id';
      const deletedFunction = {
        id: functionId,
        name: 'testFunction',
      };

      mockPrismaService.client.function.delete.mockResolvedValue(
        deletedFunction
      );

      const result = await service.deleteFunction(functionId);

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: deletedFunction,
      });
      expect(mockPrismaService.client.function.delete).toHaveBeenCalledWith({
        where: { id: functionId },
      });
    });

    it('should handle errors during function deletion', async () => {
      const functionId = 'test-id';
      const error = new Error('Delete failed');
      mockPrismaService.client.function.delete.mockRejectedValue(error);

      await expect(service.deleteFunction(functionId)).rejects.toThrow(
        'Delete failed'
      );
    });
  });

  describe('executeFunction', () => {
    const mockFunction = {
      id: '1',
      name: 'testFunction',
      code: 'function testFunction() { return "hello"; }',
      language: 'javascript',
    };

    const mockValue = { dispose: jest.fn() };
    const mockContext = {
      evalCode: jest.fn().mockReturnValue({ value: mockValue, error: null }),
      getProp: jest.fn().mockReturnValue(mockValue),
      callFunction: jest
        .fn()
        .mockReturnValue({ value: mockValue, error: null }),
      dump: jest.fn().mockReturnValue('hello'),
      dispose: jest.fn(),
      global: {},
      undefined: undefined,
      newString: jest.fn().mockReturnValue(mockValue),
      newNumber: jest.fn().mockReturnValue(mockValue),
      newArray: jest.fn().mockReturnValue(mockValue),
      newObject: jest.fn().mockReturnValue(mockValue),
      true: true,
      false: false,
      null: null,
      setProp: jest.fn(),
    };

    const mockQuickJS = {
      newContext: jest.fn().mockReturnValue(mockContext),
    };

    beforeEach(() => {
      (quickJS as jest.Mock).mockResolvedValue(mockQuickJS);
      jest.clearAllMocks();
    });

    it('should execute a JavaScript function successfully', async () => {
      mockPrismaService.client.function.findFirstOrThrow.mockResolvedValue(
        mockFunction
      );

      const input = { args: [{ value: 'test' }] as UnknownData[] };
      const result = await service.executeFunction('testFunction', input);

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: 'hello',
      });

      expect(mockContext.evalCode).toHaveBeenCalledWith(mockFunction.code);
      expect(mockContext.getProp).toHaveBeenCalledWith(
        mockContext.global,
        'testFunction'
      );
      expect(mockContext.callFunction).toHaveBeenCalled();
      expect(mockValue.dispose).toHaveBeenCalled();
      expect(mockContext.dispose).toHaveBeenCalled();
    });

    it('should handle JavaScript eval errors', async () => {
      mockPrismaService.client.function.findFirstOrThrow.mockResolvedValue(
        mockFunction
      );
      mockContext.evalCode.mockReturnValue({
        value: null,
        error: { dispose: jest.fn() },
      });

      const result = await service.executeFunction('testFunction', {
        args: [],
      });

      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Failed to eval function',
      });
    });

    it('should handle function not found in context', async () => {
      mockPrismaService.client.function.findFirstOrThrow.mockResolvedValue(
        mockFunction
      );

      // First mock successful eval
      mockContext.evalCode.mockReturnValueOnce({
        value: mockValue,
        error: null,
      });
      // Then mock function not found
      mockContext.getProp.mockReturnValue(null);

      const result = await service.executeFunction('testFunction', {
        args: [],
      });

      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Function not found in context',
      });
    });

    it('should handle JavaScript runtime errors', async () => {
      mockPrismaService.client.function.findFirstOrThrow.mockResolvedValue(
        mockFunction
      );

      // Mock successful eval and getProp
      mockContext.evalCode.mockReturnValueOnce({
        value: mockValue,
        error: null,
      });
      mockContext.getProp.mockReturnValueOnce(mockValue);
      // Then mock runtime error
      mockContext.callFunction.mockReturnValue({
        value: null,
        error: { dispose: jest.fn() },
      });

      const result = await service.executeFunction('testFunction', {
        args: [],
      });

      expect(result).toEqual({
        statusCode: HttpStatus.BAD_REQUEST,
        message: 'Runtime error in function execution: testFunction',
      });
    });

    it('should handle complex input arguments', async () => {
      mockPrismaService.client.function.findFirstOrThrow.mockResolvedValue(
        mockFunction
      );

      // Mock successful eval and getProp
      mockContext.evalCode.mockReturnValueOnce({
        value: mockValue,
        error: null,
      });
      mockContext.getProp.mockReturnValueOnce(mockValue);
      // Mock successful function call
      mockContext.callFunction.mockReturnValue({
        value: mockValue,
        error: null,
      });

      const complexInput = {
        args: [
          {
            string: 'test',
            number: 42,
            boolean: true,
            array: [1, 'two', { nested: true }],
            object: { key: 'value' },
            null: null,
          },
        ] as UnknownData[],
      };

      const result = await service.executeFunction(
        'testFunction',
        complexInput
      );

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: 'hello',
      });

      // Verify proper disposal of resources
      expect(mockValue.dispose).toHaveBeenCalled();
      expect(mockContext.dispose).toHaveBeenCalled();
    });

    it('should handle function not found error', async () => {
      mockPrismaService.client.function.findFirstOrThrow.mockRejectedValue(
        new Error()
      );

      const result = await service.executeFunction('nonexistent', { args: [] });

      expect(result).toEqual({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Function execution failed',
      });
    });

    it('should handle unsupported language', async () => {
      mockPrismaService.client.function.findFirstOrThrow.mockResolvedValue({
        ...mockFunction,
        language: 'python',
      });

      const result = await service.executeFunction('testFunction', {
        args: [],
      });

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

      mockPrismaService.client.function.findMany.mockResolvedValue(
        mockFunctions
      );

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

      mockPrismaService.client.function.findUnique.mockResolvedValue(
        mockFunction
      );

      const result = await service.getFunction('1');

      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        data: mockFunction,
      });
      expect(mockPrismaService.client.function.findUnique).toHaveBeenCalledWith(
        {
          where: { id: '1' },
          include: expect.any(Object),
        }
      );
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
});
