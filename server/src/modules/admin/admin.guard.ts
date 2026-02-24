import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common'
import type { AuthenticatedUser } from '../auth/auth.types'

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const user = request.user as AuthenticatedUser | undefined
    if (!user || user.role !== 'admin') {
      throw new ForbiddenException('Admin access required')
    }
    return true
  }
}
