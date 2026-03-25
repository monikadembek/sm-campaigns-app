import { User } from '@sm-campaigns-app/datatypes';

declare global {
  namespace Express {
    interface Request {
      user?: User | null;
    }
  }
}
