import { Module } from '@nestjs/common';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { APP_GUARD } from '@nestjs/core';
import { configuration } from '../../config/configuration';
import { validationSchema } from '../../config/validation';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { AiContentModule } from './ai-content/ai-content.module';

@Module({
  imports: [
    AuthModule,
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `${process.cwd()}/apps/api/config/env/${process.env.NODE_ENV}.env`,
      load: [configuration],
      validationSchema,
    }),
    ThrottlerModule.forRoot([
      {
        // allow no more than 3 requests per 1s for the same client
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        // allow no more than 100 requests per 1min for the same client
        name: 'long',
        ttl: 60000,
        limit: 60,
      },
    ]),
    DatabaseModule,
    AiContentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
