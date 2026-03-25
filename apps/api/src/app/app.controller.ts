import { Controller, Get, UseGuards } from '@nestjs/common';
import { User } from '@sm-campaigns-app/datatypes';
import { AuthGuard } from './auth/auth.guard';
import { CurrentUser } from './shared/current-user.decorator';

@Controller()
export class AppController {
  @UseGuards(AuthGuard)
  @Get()
  getData(@CurrentUser() user: User): User {
    return user;
  }
}
