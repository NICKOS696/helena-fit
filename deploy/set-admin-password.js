// Меняет пароль администратора панели. Пароль берётся из env NEW_PW (не хардкодится).
// Запуск внутри backend-контейнера: docker exec -e NEW_PW='...' helena-fit-backend node /tmp/set-admin-password.js [username]
const bcrypt = require('bcrypt');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const pw = process.env.NEW_PW;
  const username = process.argv[2] || 'admin';
  if (!pw) {
    console.error('NEW_PW is not set');
    process.exit(1);
  }
  const hash = await bcrypt.hash(pw, 10);
  const r = await prisma.admin.updateMany({
    where: { username },
    data: { password: hash },
  });
  console.log('updated rows:', r.count, 'for username:', username);
  await prisma.$disconnect();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
