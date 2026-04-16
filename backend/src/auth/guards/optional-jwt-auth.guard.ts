import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // Если ошибка или нет пользователя, просто возвращаем null
    // Не выбрасываем исключение
    return user || null;
  }

  canActivate(context: ExecutionContext) {
    // Всегда разрешаем доступ
    return super.canActivate(context) as Promise<boolean> | boolean;
  }
}
