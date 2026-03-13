import { afterAll } from 'vitest';
import { prisma } from '@/lib/prisma';

// 所有测试结束后清理并关闭连接
afterAll(async () => {
  await prisma.invoice.deleteMany({});
  await prisma.reimbursementItem.deleteMany({});
  await prisma.$disconnect();
});
