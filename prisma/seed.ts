import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV !== 'production') {
    const organization = await prisma.organization.upsert({
      where: {
        name: 'Default',
      },
      create: {
        name: 'Default',
      },
      update: {},
    });

    await prisma.project.upsert({
      where: {
        email: 'My project',
      },
      create: {
        email: 'My project',
        organizationId: organization.id,
      },
      update: {},
    });

    console.info('🌱  Database has been seeded. 🌱');
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('⚠️  Seeding failed', e);
    await prisma.$disconnect();
    process.exit(1);
  });
