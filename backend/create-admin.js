const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    const admin = await prisma.admin.create({
      data: {
        username: 'admin',
        password: hashedPassword,
      },
    });
    
    console.log('✅ Admin created successfully!');
    console.log('Username:', admin.username);
    console.log('Password: admin123');
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('⚠️  Admin already exists!');
    } else {
      console.error('❌ Error:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
