import { Test, TestingModule } from '@nestjs/testing';
import { FunctionController } from './functions.controller';
import { FunctionService } from './functions.service';
import { CreateFunctionDto } from './dto/create-function.dto';

describe('FunctionController', () => {
  let controller: FunctionController;
  let service: FunctionService;

  const mockFunctionService = {
    registerFunction: jest.fn(),
    executeFunction: jest.fn(),
    listFunctions: jest.fn(),
    updateFunction: jest.fn(),
    deleteFunction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FunctionController],
      providers: [
        {
          provide: FunctionService,
          useValue: mockFunctionService,
        },
      ],
    }).compile();

    controller = module.get<FunctionController>(FunctionController);
    service = module.get<FunctionService>(FunctionService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('registerFunction', () => {
    it('should register a new function', async () => {
      const createFunctionDto: CreateFunctionDto = {
        name: 'test-function',
        code: 'console.log("test")',
        projectId: 'test-project',
      };
      const expectedResult = { id: '1', ...createFunctionDto };

      mockFunctionService.registerFunction.mockResolvedValue(expectedResult);

      const result = await controller.registerFunction(createFunctionDto);
      expect(result).toEqual(expectedResult);
      expect(service.registerFunction).toHaveBeenCalledWith(createFunctionDto);
    });

    it('should handle errors during function registration', async () => {
      const createFunctionDto: CreateFunctionDto = {
        name: 'test-function',
        code: 'console.log("test")',
        projectId: 'test-project',
      };
      const error = new Error('Registration failed');

      mockFunctionService.registerFunction.mockRejectedValue(error);

      await expect(
        controller.registerFunction(createFunctionDto)
      ).rejects.toThrow('Issues at registering function');
    });
  });

  describe('executeFunction', () => {
    it('should execute a function by id or name', async () => {
      const idOrName = 'test-function';
      const input = { args: [{ value: 'test-data' }] };
      const expectedResult = { output: 'test-output' };

      mockFunctionService.executeFunction.mockResolvedValue(expectedResult);

      const result = await controller.executeFunction(idOrName, input);
      expect(result).toEqual(expectedResult);
      expect(service.executeFunction).toHaveBeenCalledWith(idOrName, input);
    });

    it('should handle errors during function execution', async () => {
      const idOrName = 'test-function';
      const input = { args: [{ value: 'test-data' }] };
      const error = new Error('Execution failed');

      mockFunctionService.executeFunction.mockRejectedValue(error);

      await expect(controller.executeFunction(idOrName, input)).rejects.toThrow(
        'Issues at executing function'
      );
    });
  });

  describe('listFunctions', () => {
    it('should list functions for a project', async () => {
      const projectId = 'test-project';
      const expectedResult = [
        { id: '1', name: 'function1' },
        { id: '2', name: 'function2' },
      ];

      mockFunctionService.listFunctions.mockResolvedValue(expectedResult);

      const result = await controller.listFunctions(projectId);
      expect(result).toEqual(expectedResult);
      expect(service.listFunctions).toHaveBeenCalledWith(projectId);
    });

    it('should handle errors when listing functions', async () => {
      const projectId = 'test-project';
      const error = new Error('Listing failed');

      mockFunctionService.listFunctions.mockRejectedValue(error);

      await expect(controller.listFunctions(projectId)).rejects.toThrow(
        'Issues at listing function'
      );
    });
  });

  describe('updateFunction', () => {
    it('should update a function', async () => {
      const functionId = 'test-id';
      const updateFunctionDto = {
        name: 'updated-function',
        code: 'console.log("updated")',
      };
      const expectedResult = { id: functionId, ...updateFunctionDto };

      mockFunctionService.updateFunction.mockResolvedValue(expectedResult);

      const result = await controller.updateFunction(
        functionId,
        updateFunctionDto
      );
      expect(result).toEqual(expectedResult);
      expect(service.updateFunction).toHaveBeenCalledWith(
        functionId,
        updateFunctionDto
      );
    });

    it('should handle errors during function update', async () => {
      const functionId = 'test-id';
      const updateFunctionDto = {
        name: 'updated-function',
        code: 'console.log("updated")',
      };
      const error = new Error('Update failed');

      mockFunctionService.updateFunction.mockRejectedValue(error);

      await expect(
        controller.updateFunction(functionId, updateFunctionDto)
      ).rejects.toThrow('Issues at updating function');
    });
  });

  describe('deleteFunction', () => {
    it('should delete a function', async () => {
      const functionId = 'test-id';
      const expectedResult = { id: functionId, deleted: true };

      mockFunctionService.deleteFunction.mockResolvedValue(expectedResult);

      const result = await controller.deleteFunction(functionId);
      expect(result).toEqual(expectedResult);
      expect(service.deleteFunction).toHaveBeenCalledWith(functionId);
    });

    it('should handle errors during function deletion', async () => {
      const functionId = 'test-id';
      const error = new Error('Delete failed');

      mockFunctionService.deleteFunction.mockRejectedValue(error);

      await expect(controller.deleteFunction(functionId)).rejects.toThrow(
        'Issues at deleting function'
      );
    });
  });
});
