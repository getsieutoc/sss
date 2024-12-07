import { Module } from '@nestjs/common';
import { FunctionService } from './functions.service';
import { FunctionController } from './functions.controller';

@Module({
  providers: [FunctionService],
  controllers: [FunctionController],
  exports: [FunctionService],
})
export class FunctionModule {}
