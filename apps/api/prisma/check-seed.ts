import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const total = await prisma.quote.count();
  const sample = await prisma.quote.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { quoteNumber: true, revision: true, createdAt: true, deliveryDate: true },
  });
  console.log('Total quotes:', total);
  console.log('Sample:', JSON.stringify(sample, null, 2));
  const noDelivery = await prisma.quote.count({ where: { deliveryDate: null } });
  console.log('Sem deliveryDate:', noDelivery);
  const types = await prisma.standardDrawing.findMany({
    select: { code: true, type: true, basePrice: true },
  });
  console.log('Drawings:', JSON.stringify(types, null, 2));
  await prisma.$disconnect();
}
main();
