import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.admin.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@helenafit.uz',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
    },
  });

  console.log('✅ Created admin user:', admin.username);

  const workoutCollection = await prisma.workoutCollection.create({
    data: {
      title: 'Программа для начинающих',
      description: 'Комплекс упражнений для новичков в фитнесе',
      price: 150000,
      discount: 20,
      discountType: 'PERCENTAGE',
      order: 1,
      workouts: {
        create: [
          {
            title: 'Разминка и растяжка',
            description: 'Базовая разминка перед тренировкой',
            calories: 150,
            duration: 15,
            order: 1,
          },
          {
            title: 'Кардио тренировка',
            description: 'Интенсивная кардио сессия',
            calories: 300,
            duration: 30,
            order: 2,
          },
        ],
      },
    },
  });

  console.log('✅ Created workout collection:', workoutCollection.title);

  const recipeCollection = await prisma.recipeCollection.create({
    data: {
      title: 'Здоровое питание на неделю',
      description: 'Сбалансированные рецепты на каждый день',
      price: 100000,
      order: 1,
      recipes: {
        create: [
          {
            title: 'Овсяная каша с ягодами',
            category: 'BREAKFAST',
            cookingTime: 10,
            ingredients: [
              { name: 'Овсяные хлопья', amount: '50г' },
              { name: 'Молоко', amount: '200мл' },
              { name: 'Ягоды', amount: '100г' },
              { name: 'Мёд', amount: '1 ч.л.' },
            ],
            instructions: '1. Залить овсяные хлопья молоком\n2. Варить 5 минут\n3. Добавить ягоды и мёд',
            caloriesPer100g: 120,
            proteinPer100g: 4.5,
            fatPer100g: 3.2,
            carbsPer100g: 18.5,
            caloriesPerServing: 350,
            proteinPerServing: 12.0,
            fatPerServing: 8.5,
            carbsPerServing: 55.0,
            order: 1,
          },
          {
            title: 'Греческий салат',
            category: 'SALAD',
            cookingTime: 15,
            ingredients: [
              { name: 'Помидоры', amount: '200г' },
              { name: 'Огурцы', amount: '150г' },
              { name: 'Фета', amount: '100г' },
              { name: 'Оливки', amount: '50г' },
              { name: 'Оливковое масло', amount: '2 ст.л.' },
            ],
            instructions: '1. Нарезать овощи\n2. Добавить фету и оливки\n3. Заправить маслом',
            caloriesPer100g: 95,
            proteinPer100g: 3.8,
            fatPer100g: 7.2,
            carbsPer100g: 4.5,
            caloriesPerServing: 280,
            proteinPerServing: 11.0,
            fatPerServing: 21.0,
            carbsPerServing: 13.0,
            order: 2,
          },
        ],
      },
    },
  });

  console.log('✅ Created recipe collection:', recipeCollection.title);

  // Создаем тестового пользователя с доступом
  const testUser = await prisma.user.upsert({
    where: { telegramId: '123456789' },
    update: {},
    create: {
      telegramId: '123456789',
      firstName: 'Test',
      lastName: 'User',
      username: 'testuser',
      status: 'ACTIVE',
    },
  });

  // Даем доступ к тренировкам
  await prisma.workoutCollectionAccess.create({
    data: {
      userId: testUser.id,
      collectionId: workoutCollection.id,
    },
  });

  // Даем доступ к рецептам
  await prisma.recipeCollectionAccess.create({
    data: {
      userId: testUser.id,
      collectionId: recipeCollection.id,
    },
  });

  console.log('✅ Created test user with full access:', testUser.telegramId);

  const news = await prisma.news.create({
    data: {
      title: 'Специальное предложение!',
      excerpt: 'Скидка 20% на все программы тренировок',
      content: 'Только в этом месяце - скидка 20% на все программы тренировок! Успейте воспользоваться предложением.',
      status: 'PUBLISHED',
      publishedAt: new Date(),
      workoutLinks: {
        create: {
          collectionId: workoutCollection.id,
        },
      },
    },
  });

  console.log('✅ Created news:', news.title);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
