import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class AuthService {
  constructor(private prismaService: PrismaService) {}

  getUserBySupabaseAuthId(supabaseId: string) {
    return this.prismaService.user.findUnique({
      where: { supabaseId },
    });
  }

  createUser(createUserDto: CreateUserDto) {
    return this.prismaService.user.create({
      data: {
        supabaseId: createUserDto.supabaseId,
        email: createUserDto.email,
        displayName: createUserDto.displayName ?? null,
        avatarUrl: createUserDto.avatarUrl ?? null,
      },
    });
  }
}
