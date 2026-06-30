import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  console.log('🌱 Iniciando seed base...');

  const adminEmail = 'admin@cpq.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        name: 'Administrador CPQ',
        email: adminEmail,
        password: hashedPassword,
        role: Role.ADMIN,
        changePasswordNextLogin: true,
      },
    });
    console.log('✅ Admin criado (admin@cpq.com / admin123) — troca de senha obrigatória.');
  } else {
    console.log('⚠️ Admin já existente. Pulando.');
  }

  const defaultConfigs = [
    { key: 'session_expiry', value: '12h' },
    { key: 'search_settings', value: { algorithm: 'DICE', threshold: 0.4 } },
    { key: 'target_approval_rate', value: 60 },
    { key: 'default_markup_margin', value: 20 },
    { key: 'minimum_margin', value: 15 },
    { key: 'max_item_discount_pct', value: 25 },
    { key: 'max_total_discount_pct', value: 30 },
    { key: 'min_total_margin_pct', value: 15 },
  ];

  for (const config of defaultConfigs) {
    const existing = await prisma.systemConfig.findUnique({ where: { key: config.key } });
    if (!existing) {
      await prisma.systemConfig.create({
        data: { key: config.key, value: config.value as any },
      });
    }
  }
  console.log('✅ Configs do sistema inicializadas (sessão, busca, metas comerciais).');

  const existingCompany = await prisma.companyConfig.findUnique({ where: { id: 'default' } });
  if (!existingCompany) {
    await prisma.companyConfig.create({
      data: {
        id: 'default',
        companyName: 'Minha Metalúrgica',
        document: '',
      },
    });
    console.log('✅ Configuração da empresa criada.');
  }
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('🌱 Seed base finalizado.');
  });
