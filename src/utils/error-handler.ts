import { HttpException, HttpStatus } from '@nestjs/common';

export const handleError = (err: Error, msg = 'Something wrong') => {
  if (err instanceof HttpException) {
    throw err;
  }

  console.error(err);
  
  throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR, {
    cause: err,
  });
};
