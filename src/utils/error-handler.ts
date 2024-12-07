import { HttpException, HttpStatus } from '@nestjs/common';

export const handleError = (error: Error, message?: string) => {
  if ('response' in error) {
    return error.response;
  }

  throw new HttpException(
    message ?? 'Something wrong',
    HttpStatus.INTERNAL_SERVER_ERROR,
    { cause: error }
  );
};
