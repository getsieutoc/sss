import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ConfigService, ConfigType } from '@/config';
import { PrismaService } from '@/prisma/prisma.service';
import { randomize } from '@/utils/randomize';
import { DELIMITER } from '@/utils/constants';
import { addYears } from 'date-fns';
import * as argon2 from 'argon2';

import { CreateApiKeyDto } from './dto/api-key.dto';

@Injectable()
export class AuthService {
  @Inject(PrismaService)
  private readonly prisma: PrismaService;

  @Inject(ConfigService)
  private readonly config: ConfigService;

  async listApiKeys() {
    const apiKeys = await this.prisma.client.apiKey.findMany({
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

    const newKey = await this.prisma.client.apiKey.create({
      data: {
        ...rest,
        publicKey,
        expiresAt: customExpiresAt ?? addYears(new Date(), expiresInYears),
        hashedSecretKey: await this.hash(secretKey),
        project: { connect: { id: projectId } },
      },
    });

    return {
      statusCode: HttpStatus.CREATED,
      data: newKey,
      apiKey: [publicKey, secretKey].join(DELIMITER),
    };
  }

  /*
   * Generate API key for the first project of the first organization only if both are empty
   */
  async generateGenesisApiKey() {
    // Check if there are any organizations or projects
    const orgCount = await this.prisma.client.organization.count();
    const projectCount = await this.prisma.client.project.count();

    // If either exists, silently stop
    if (orgCount > 0 || projectCount > 0) {
      return {
        statusCode: HttpStatus.NO_CONTENT,
      };
    }

    // Create first organization
    const firstOrg = await this.prisma.client.organization.create({
      data: {
        name: 'My Organization',
      },
    });

    // Create first project
    const firstProject = await this.prisma.client.project.create({
      data: {
        name: 'Default Project',
        organizationId: firstOrg.id,
      },
    });

    const result = await this.createApiKey({
      projectId: firstProject.id,
      description: 'Genesis API key created during setup',
    });

    return {
      statusCode: HttpStatus.CREATED,
      data: result.data,
      apiKey: result.apiKey,
    };
  }

  async validateApiKey(token: string) {
    const [publicKey, rawSecretKey] = token.split(DELIMITER);

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
