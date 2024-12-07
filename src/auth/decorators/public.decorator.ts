import { Keys } from '@/utils/constants';
import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata(Keys.IS_PUBLIC, true);
