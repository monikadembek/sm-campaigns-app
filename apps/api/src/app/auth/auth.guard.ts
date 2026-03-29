import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import * as jwt from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { User } from '@sm-campaigns-app/datatypes';

@Injectable()
export class AuthGuard implements CanActivate {
  private jwksClient: JwksClient;
  private readonly logger = new Logger(AuthGuard.name);

  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    const jwksUri = this.configService.get<string>('jwks_discovery_url');
    if (!jwksUri) {
      this.logger.error('JWKS_DISCOVERY_URL is not configured');
      throw new Error('JWKS_DISCOVERY_URL is not configured');
    }
    this.jwksClient = new JwksClient({
      jwksUri,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
    });
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    return this.validateRequest(request);
  }

  private async validateRequest(request: Request): Promise<boolean> {
    const token = this.extractTokenFromHeader(request);
    if (!token) {
      throw new UnauthorizedException('No bearer token provided');
    }
    const payload = await this.validateJWT(token);
    this.logger.debug('validated token for user with id: ', payload.sub);

    const { sub: supabaseId, email } = payload;

    if (!supabaseId || !email) {
      throw new UnauthorizedException(
        'Invalid token: missing required claims (sub, email)',
      );
    }

    await this.addUserToRequest(supabaseId, email, request);

    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async validateJWT(token: string): Promise<jwt.JwtPayload> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header.kid) {
      throw new UnauthorizedException('Invalid token: missing kid');
    }

    let publicKey: string;
    try {
      const key = await this.jwksClient.getSigningKey(decoded.header.kid);
      publicKey = key.getPublicKey();
    } catch {
      throw new UnauthorizedException('Error when getting Signing Key');
    }

    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        publicKey,
        { algorithms: ['ES256'] },
        (err, payload) => {
          if (err) {
            return reject(new UnauthorizedException('Invalid token'));
          }
          resolve(payload as jwt.JwtPayload);
        },
      );
    });
  }

  private async addUserToRequest(
    supabaseId: string,
    email: string,
    request: Request,
  ): Promise<void> {
    let dbUser: User | null = null;

    try {
      dbUser = await this.authService.getUserBySupabaseAuthId(supabaseId);
    } catch (error) {
      this.logger.error('Error when searching user in db', error);
      throw new InternalServerErrorException('Error when searching user in db');
    }

    if (!dbUser) {
      dbUser = await this.addUserToDb(supabaseId, email);
    }

    request.user = dbUser;
  }

  private async addUserToDb(supabaseId: string, email: string): Promise<User> {
    try {
      const dbUser = await this.authService.createUser({
        supabaseId,
        email,
      });
      return dbUser;
    } catch (error) {
      // Handle race condition: another request may have just created this user
      const existingUser =
        await this.authService.getUserBySupabaseAuthId(supabaseId);
      if (existingUser) {
        return existingUser;
      }
      this.logger.error(
        `Failed to create user with supabaseId ${supabaseId}`,
        error,
      );
      throw new InternalServerErrorException('Error when creating user in db');
    }
  }
}
