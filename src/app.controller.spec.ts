import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController;
  let appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('health', () => {
    it('should return health status', () => {
      const result = appController.checkHealth();
      expect(result).toEqual({
        statusCode: HttpStatus.OK,
        message: 'OK',
      });
    });

    it('should call appService.checkHealth()', () => {
      const checkHealthSpy = jest.spyOn(appService, 'checkHealth');
      appController.checkHealth();
      expect(checkHealthSpy).toHaveBeenCalled();
    });
  });
});
