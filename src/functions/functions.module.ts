import { Module } from '@nestjs/common';
import { FunctionService } from './functions.service';

@Module({
  providers: [FunctionService],
  exports: [FunctionService],
})
export class FunctionModule {}
