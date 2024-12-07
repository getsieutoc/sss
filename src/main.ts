import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      // validator will strip validated (returned) object of any properties that do not use any validation decorators.
      whitelist: true,
      // automatically transform payloads to be objects typed according to their DTO classes
      transform: true,
    })
  );

  await app.listen(3000);
}
bootstrap();
