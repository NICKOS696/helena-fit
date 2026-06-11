import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { WorkoutsModule } from './workouts/workouts.module';
import { RecipesModule } from './recipes/recipes.module';
import { NewsModule } from './news/news.module';
import { AdminModule } from './admin/admin.module';
import { UploadModule } from './upload/upload.module';
import { PaymeModule } from './payme/payme.module';
import { AnalyticsModule } from './analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    // Статика /uploads раздаётся через useStaticAssets в main.ts (один механизм).
    PrismaModule,
    AuthModule,
    UsersModule,
    WorkoutsModule,
    RecipesModule,
    NewsModule,
    AdminModule,
    UploadModule,
    PaymeModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
