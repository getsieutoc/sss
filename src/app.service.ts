import { HttpStatus, Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  checkHealth() {
    return {
      statusCode: HttpStatus.OK,
      message: 'OK',
    };
  }
}
