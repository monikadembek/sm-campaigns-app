import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { User } from '@sm-campaigns-app/datatypes';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private configService: ConfigService,
  ) {}

  @Get()
  getData(): User {
    console.log('node_env: ', this.configService.get<string>('NODE_ENV'));
    return this.appService.getData();
  }
}
