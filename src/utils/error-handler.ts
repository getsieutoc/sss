import { HttpException, HttpStatus } from '@nestjs/common';

export const handleError = (err: Error, msg = 'Something wrong') => {
  if ('response' in err) {
    console.error(err.response ?? msg);
  }

  throw new HttpException(msg, HttpStatus.INTERNAL_SERVER_ERROR, {
    cause: err,
  });
};
