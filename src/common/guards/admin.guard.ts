import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';

export interface UserWithRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest<UserWithRequest>();
    const user = request.user;

    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }

    return true;
  }
}
