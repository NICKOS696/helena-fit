import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { AdminClientsController } from './admin-clients.controller';

// Клиентская зона тренера: изолированный модуль, существующие фичи не трогает.
@Module({
  controllers: [ClientsController, AdminClientsController],
  providers: [ClientsService],
})
export class ClientsModule {}
