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
    // Возвращаем полный URL для использования в админке и приложении
    const baseUrl = process.env.BASE_URL || 'https://helena-fit.ru';
    return {
      url: `${baseUrl}/uploads/${file.filename}`,
      filename: file.filename,
    };
  }
}
