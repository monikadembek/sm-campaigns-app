import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { User } from '@sm-campaigns-app/datatypes';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getData(): User {
    return this.appService.getData();
  }
}
