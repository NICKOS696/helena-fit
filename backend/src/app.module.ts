import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { RecipesModule } from './recipes/recipes.module';
import { NewsModule } from './news/news.module';
import { AdminModule } from './admin/admin.module';
import { UploadModule } from './upload/upload.module';
import { PaymeModule } from './payme/payme.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkoutsModule,
    RecipesModule,
    NewsModule,
    AdminModule,
    UploadModule,
    PaymeModule,
  ],
})
export class AppModule {}
