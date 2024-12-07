import { JwtPayload as StandardJwtPayload } from 'jsonwebtoken';
import { Request as ExpressRequest } from 'express';
import { User } from '@prisma/client';

export * from '@prisma/client';

export type UserPayload = Pick<User, 'id' | 'name' | 'email'>;

export interface Request extends ExpressRequest {
  user?: JwtPayload;
}

export interface JwtPayload extends UserPayload, StandardJwtPayload {}

export type File = Express.Multer.File;

export type Metadata = Record<string, unknown>;

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
