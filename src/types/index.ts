import { HttpStatus } from '@nestjs/common';

import {
  organizationIncludes,
  projectIncludes,
  apiKeyIncludes,
  functionIncludes,
} from '@/utils/rich-includes';

import { Prisma } from '@prisma/client';

export * from '@prisma/client';

export type File = Express.Multer.File;

export type UnknownData = string | number | null | Record<string, unknown>;

export type Metadata = UnknownData;

export type ChatOptions = {
  stream?: boolean /* Enable streaming response */;
  context?: 'history' | 'document' /* Context aware */;
};

// Like keyof, but for nested objects.
export type NestedKeyOf<T extends object> = {
  [K in keyof T & (string | number)]: T[K] extends object
    ? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
    : `${K}`;
}[keyof T & (string | number)];

// Like Partial<T>, but for nested objects.
export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends Record<string, unknown>
      ? RecursivePartial<T[P]>
      : T[P];
};

/**
 * @T is the interface we want to reuse.
 * @R is the part we want to force.
 * The rest of T will be optional.
 */
export type OptionalExcept<T, R extends keyof T> = Partial<T> & Pick<T, R>;

export type RequiredProperty<T extends object> = {
  [P in keyof T]-?: Required<NonNullable<T[P]>>;
};

// Look like this one is recursive
// export type NoUndefinedField<T> = {
//   [P in keyof T]-?: NoUndefinedField<NonNullable<T[P]>>;
// };

// Still not sure we want to use this
type Neverify<T> = { [P in keyof T]?: never };
type Left<A, B> = A & Neverify<B>;
type Right<A, B> = B & Neverify<A>;

export type Either<A, B> = RequiredProperty<Left<A, B> | Right<A, B>>;

export type ApiKeyResponse = {
  key: string;
  status: HttpStatus;
};

export type OrganizationWithPayload = Prisma.OrganizationGetPayload<{
  include: typeof organizationIncludes;
}>;

export type ProjectWithPayload = Prisma.ProjectGetPayload<{
  include: typeof projectIncludes;
}>;

export type ApiKeyWithPayload = Prisma.ApiKeyGetPayload<{
  include: typeof apiKeyIncludes;
}>;

export type FunctionWithPayload = Prisma.FunctionGetPayload<{
  include: typeof functionIncludes;
}>;
