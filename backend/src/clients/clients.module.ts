import { BadRequestException, Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { ClientsService, PRIVATE_UPLOAD_DIR } from './clients.service';
import { ClientsController } from './clients.controller';
import { AdminClientsController } from './admin-clients.controller';
import { ClientRemindersService } from './client-reminders.service';

// Фото прогресса — только изображения, в приватное хранилище
const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};

// Клиентская зона тренера: изолированный модуль, существующие фичи не трогает.
@Module({
  imports: [
    MulterModule.register({
      storage: diskStorage({
        destination: (req, file, cb) => {
          if (!existsSync(PRIVATE_UPLOAD_DIR)) {
            mkdirSync(PRIVATE_UPLOAD_DIR, { recursive: true });
          }
          cb(null, PRIVATE_UPLOAD_DIR);
        },
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          // Расширение из доверенного mime-типа, не из имени клиента
          const ext = ALLOWED_MIME[file.mimetype] || '.jpg';
          cb(null, `${randomName}${ext}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (ALLOWED_MIME[file.mimetype]) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException('Допустимы только фото (jpeg, png, webp, heic)'),
            false,
          );
        }
      },
      limits: { fileSize: 15 * 1024 * 1024 },
    }),
  ],
  controllers: [ClientsController, AdminClientsController],
  providers: [ClientsService, ClientRemindersService],
})
export class ClientsModule {}
