import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RequestWithUser } from 'src/oauth/oauth.controller';
import { SCOPES_KEY } from '../decorators/scopes.decorator';

@Injectable()
export class ScopesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredScopes = this.reflector.get<string[]>(
      SCOPES_KEY,
      context.getHandler(),
    );

    if (!requiredScopes || requiredScopes.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<RequestWithUser>();

    if (!user) {
      return false;
    }

    if (!user.scopes) {
      return false;
    }

    return requiredScopes.every((scope) => user.scopes.includes(scope));
  }
}
