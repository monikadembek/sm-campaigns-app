import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  supabaseId!: string;

  @IsString()
  @IsNotEmpty()
  @IsEmail({}, { message: 'Email must be valid email address' })
  email!: string;

  @IsString()
  @IsOptional()
  displayName?: string | null;

  @IsString()
  @IsOptional()
  avatarUrl?: string | null;
}
