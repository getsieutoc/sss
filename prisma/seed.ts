import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV !== 'production') {
    const organization = await prisma.organization.create({
      data: {
        name: 'Default',
      },
    });

    await prisma.project.create({
      data: {
        name: 'My project',
        organizationId: organization.id,
      },
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
