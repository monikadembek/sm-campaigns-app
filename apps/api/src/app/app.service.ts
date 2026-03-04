import { Injectable } from '@nestjs/common';
import { User } from '@sm-campaigns-app/datatypes';

@Injectable()
export class AppService {
  getData(): User {
    return {
      id: '1',
      name: 'John Doe',
      email: 'john.doe@gmail.com',
      password: 'password',
    };
  }
}
