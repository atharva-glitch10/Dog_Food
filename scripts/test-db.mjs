import { PrismaClient } from '@prisma/client';

const passwords = ['postgres', 'admin', 'root', '1234', 'Dogfood2026!', '123456', '12345678', 'password', ''];
for (const pw of passwords) {
  const url = `postgresql://postgres:${encodeURIComponent(pw)}@localhost:5432/postgres?schema=public`;
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    await prisma.$connect();
    console.log('SUCCESS_PASSWORD:', pw);
    await prisma.$disconnect();
    process.exit(0);
  } catch (e) {
    console.log('FAIL:', pw, e.message.substring(0, 80));
    await prisma.$disconnect();
  }
}
process.exit(1);
