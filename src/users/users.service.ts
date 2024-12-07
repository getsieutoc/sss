import { HttpException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { ExtendedPrismaService } from '@/database/prisma.client';

import { CreateUserDto, UpdateUserDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject('ExtendedPrismaService')
    private readonly prisma: ExtendedPrismaService
  ) {}

  async create(createDto: CreateUserDto) {
    try {
      const response = await this.prisma.client.user.create({
        data: createDto,
      });

      return response;
    } catch (err) {
      throw new HttpException(
        'Failed to create user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: err }
      );
    }
  }

  async update(id: string, updateDto: UpdateUserDto) {
    try {
      const response = await this.prisma.client.user.update({
        where: { id },
        data: updateDto,
      });

      return response;
    } catch (err) {
      throw new HttpException(
        'Failed to update user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: err }
      );
    }
  }

  async findOne(id: string) {
    try {
      return await this.prisma.client.user.findUnique({
        where: { id },
      });
    } catch (err) {
      throw new HttpException(
        'Failed to find User',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: err }
      );
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.client.user.delete({ where: { id } });

      return {
        statusCode: HttpStatus.OK,
        message: 'Deleted user successful',
      };
    } catch (err) {
      throw new HttpException(
        'Failed to delete user',
        HttpStatus.INTERNAL_SERVER_ERROR,
        { cause: err }
      );
    }
  }
}
