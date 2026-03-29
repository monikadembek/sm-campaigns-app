import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@sm-campaigns-app/datatypes';

type UserDataKey = keyof User | undefined;

export const CurrentUser = createParamDecorator(
  (data: UserDataKey, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: User | undefined = request.user;

    return data ? user?.[data] : user;
  },
);
