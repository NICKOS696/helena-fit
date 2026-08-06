import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard, AdminGuard)
export class UploadController {
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(@UploadedFile() file: Express.Multer.File) {
    // Относительный путь: работает с любого домена (хелена-фит.рф,
    // helena-fit.ru), браузер сам подставляет текущий origin
    return {
      url: `/uploads/${file.filename}`,
      filename: file.filename,
    };
  }
}
