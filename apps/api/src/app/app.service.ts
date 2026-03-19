import { Injectable } from '@nestjs/common';
import { User } from '@sm-campaigns-app/datatypes';

@Injectable()
export class AppService {
  getData(): User {
    return {
      id: '1',
      supabaseId: '94367e9f-9e4f-4b2f-91f6-dfe8083293c2',
      email: 'monika.dembek@gmail.com',
      createdAt: '2026-03-12T16:06:31.013917Z',
      updatedAt: '2026-03-12T16:06:31.013917Z',
    };
  }
}
