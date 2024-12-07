import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService, ConfigType } from '@/config';
import { PrismaService } from '@/prisma/prisma.service';
import * as argon2 from 'argon2';

import { CreateApiKeyDto } from './dto/api-key.dto';
import { randomize } from '@/utils/randomize';
import { addYears } from 'date-fns';
import { DELIMITER } from '@/utils/constants';

@Injectable()
export class AuthService {
  @Inject(PrismaService)
  private readonly prisma: PrismaService;

  @Inject(ConfigService)
  private readonly config: ConfigService;

  async listApiKeys() {
    const apiKeys = await this.prisma.apiKey.findMany({
      where: { expiresAt: { gt: new Date() } },
    });

    return {
      statusCode: HttpStatus.OK,
      data: apiKeys,
    };
  }

  async createApiKey({
    projectId,
    expiresAt: customExpiresAt,
    ...rest
  }: CreateApiKeyDto) {
    const publicKey = randomize({ size: 16 });
    const secretKey = randomize({ size: 64 });

    const { expiresInYears } = this.config.get<ConfigType<'apiKey'>>('apiKey')!;

    const newKey = await this.prisma.apiKey.create({
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
      data: newKey,
      apiKey: [publicKey, secretKey].join(DELIMITER),
    };
  }

  /*
   * Generate API key for the first project of the first organization
   */
  async generateGenesisApiKey() {
    const numOfOrgs = await this.prisma.organization.count();

    if (numOfOrgs > 1) {
      throw new Error(
        'Can only generate Genesis API key for the first organization'
      );
    }

    const numOfProjects = await this.prisma.project.count();

    if (numOfProjects > 1) {
      throw new Error(
        'Can only generate Genesis API key for the first project'
      );
    }

    const numOfKeys = await this.prisma.apiKey.count();

    if (numOfKeys > 0) {
      throw new Error('Genesis API key already exists');
    }

    const firstProject = await this.prisma.project.findFirstOrThrow();

    return await this.createApiKey({ projectId: firstProject.id });
  }

  async validateApiKey(token: string) {
    const [publicKey, rawSecretKey] = token.split(DELIMITER);

    const foundKey = await this.prisma.apiKey.findUnique({
      omit: { hashedSecretKey: false },
      where: {
        publicKey,
        expiresAt: { gt: new Date() },
      },
    });

    if (foundKey) {
      const isValid = await this.verify(foundKey.hashedSecretKey, rawSecretKey);

      if (isValid) {
        return await this.prisma.apiKey.update({
          where: { id: foundKey.id },
          data: { lastUsedAt: new Date() },
        });
      }
    }

    return null;
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
