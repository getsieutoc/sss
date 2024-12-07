import {
  ConflictException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ExtendedPrismaService } from '@/database/prisma.client';
import { ConfigService, ConfigType } from '@/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@/types';
import * as argon2 from 'argon2';

import { CreateApiKeyDto, LoginDto, SignUpDto } from './dto';
import { randomize } from '@/utils/randomize';
import { addYears } from 'date-fns';

@Injectable()
export class AuthService {
  constructor(
    @Inject('ExtendedPrismaService')
    private readonly prisma: ExtendedPrismaService,

    private readonly config: ConfigService,
    private readonly jwtService: JwtService
  ) {}

  async signup({ name, email, password: rawPassword }: SignUpDto) {
    const foundUser = await this.prisma.client.user.findUnique({
      where: { email },
    });

    if (foundUser) {
      throw new ConflictException('Email is already used');
    }

    const hashedPassword = await this.hash(rawPassword);

    const newUser = await this.prisma.client.user.create({
      data: {
        name,
        email,
        hashedPassword,
      },
    });

    const accessToken = await this.generateAccessToken({
      id: newUser.id,
      name,
      email,
    });

    // await this.mailService.sendConfirmEmail({ email, confirmCode });
    return {
      statusCode: HttpStatus.OK,
      accessToken,
      user: newUser,
    };
  }

  async login({ email, password }: LoginDto) {
    const foundUser = await this.validateUser({ email, password });

    if (!foundUser) {
      throw new UnauthorizedException('No user found or wrong password');
    }

    const { id, name } = foundUser;

    const accessToken = await this.generateAccessToken({
      id,
      name,
      email,
    });

    return {
      statusCode: HttpStatus.OK,
      accessToken,
      user: foundUser,
    };
  }

  async validateUser({ email, password: rawPassword }: LoginDto) {
    const foundUser = await this.prisma.client.user.findUnique({
      omit: { hashedPassword: false },
      where: { email },
    });

    if (!foundUser) {
      return null;
    }

    const isValid = await this.verify(foundUser.hashedPassword, rawPassword);

    if (!isValid) {
      return null;
    }

    return foundUser;
  }

  async generateApiKey({
    projectId,
    expiresAt: customExpiresAt,
    ...rest
  }: CreateApiKeyDto) {
    const publicKey = randomize({ size: 16 });
    const secretKey = randomize({ size: 64 });

    const { expiresInYears } = this.config.get<ConfigType<'apiKey'>>('apiKey')!;

    await this.prisma.client.apiKey.create({
      data: {
        ...rest,
        publicKey,
        expiresAt: customExpiresAt ?? addYears(new Date(), expiresInYears),
        hashedSecretKey: await this.hash(secretKey),
        project: { connect: { id: projectId } },
      },
    });

    return {
      statusCode: HttpStatus.OK,
      apiKey: `${publicKey}-${secretKey}`,
    };
  }

  async validateApiKey(token: string) {
    const [publicKey, rawSecretKey] = token.split('-');

    const foundKey = await this.prisma.client.apiKey.findUnique({
      omit: { hashedSecretKey: false },
      where: {
        publicKey,
        expiresAt: { gt: new Date() },
      },
    });

    if (foundKey) {
      const isValid = await this.verify(foundKey.hashedSecretKey, rawSecretKey);

      if (isValid) {
        return await this.prisma.client.apiKey.update({
          where: { id: foundKey.id },
          data: { lastUsedAt: new Date() },
        });
      }
    }

    return null;
  }

  private async generateAccessToken(payload: JwtPayload) {
    const jwtOptions = this.config.get<ConfigType<'jwt'>>('jwt')!;

    const { secret, accessTokenExpiresIn: expiresIn } = jwtOptions;

    return await this.jwtService.signAsync(payload, { secret, expiresIn });
  }

  private async hash(rawPassword: string) {
    const authConfigs = this.config.get<ConfigType<'auth'>>('auth')!;
    const { secret, hashLength, timeCost } = authConfigs;

    return await argon2.hash(rawPassword, { hashLength, timeCost, secret });
  }

  private async verify(hashed: string, raw: string) {
    const authConfigs = this.config.get<ConfigType<'auth'>>('auth')!;
    const { secret } = authConfigs;

    return await argon2.verify(hashed, raw, { secret });
  }
}
