import { Module } from '@nestjs/common';
import { PaymeController } from './payme.controller';
import { PaymeService } from './payme.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PaymeController],
  providers: [PaymeService],
  exports: [PaymeService],
})
export class PaymeModule {}
